/**
 * comparisonBuilder.ts
 * --------------------
 * Pure, deterministic functions that derive DecisionComparison[] from a
 * GameState. READ-ONLY: never mutates state, never calls the simulation
 * engine's write APIs.
 *
 * Data sources (all existing, no teammate files modified):
 *  - state.history          → the player's recorded decisions
 *  - state.pendingEffects   → consequences not yet fired
 *  - state.day              → current sol (for confirming fired effects)
 *  - EVENT_CATALOG          → event definitions with alternative actions
 *
 * RULES:
 *  - The chosen action's immediate effects use RECORDED data from
 *    DecisionRecord.resourceChanges (provenance: 'recorded').
 *  - Alternative actions' effects use DECLARED data from the event catalog
 *    (provenance: 'declared'). These are never presented as outcomes.
 *  - Delayed effects for the chosen action carry a `confirmed` flag: true
 *    only when the game has actually processed the effect (scheduledDay <=
 *    state.day AND no longer in pendingEffects).
 *  - Delayed effects for alternatives are always declared/hypothetical.
 *  - Takeaways are template-driven, grounded in the declared effect data.
 *    They never claim to predict an alternative mission path.
 */

import { findEvent } from '../events/eventCatalog';
import type { EventAction, GameEvent } from '../events/eventTypes';
import { RESOURCE_LABELS } from '../dashboard/labels';
import { RESOURCE_KEYS, type GameState, type ResourceKey } from '../simulation/simulationTypes';
import type {
  AlternativeActionSummary,
  ChosenActionSummary,
  ChosenDelayedEffect,
  ComparisonEventContext,
  DecisionComparison,
  DeclaredDelayedEffect,
  EffectSummary,
} from './comparisonTypes';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build an EffectSummary for the chosen action using RECORDED resource data. */
function buildChosenEffects(
  record: { resourceChanges: Partial<Record<ResourceKey, number>> },
  catalogAction: EventAction | undefined,
): EffectSummary {
  return {
    provenance: 'recorded',
    resources: { ...record.resourceChanges },
    // The engine does not persist crew/system deltas on the DecisionRecord —
    // only resource deltas. For crew and system we fall back to the catalog's
    // declared values (same values the engine used) but the provenance stays
    // 'recorded' because the engine DID apply them for this action.
    crew: catalogAction?.effect.immediateCrew ?? {},
    systems: catalogAction?.effect.immediateSystems ?? {},
  };
}

/** Build an EffectSummary for an alternative action using DECLARED catalog data. */
function buildDeclaredEffects(action: EventAction): EffectSummary {
  return {
    provenance: 'declared',
    resources: action.effect.immediateResources ?? {},
    crew: action.effect.immediateCrew ?? {},
    systems: action.effect.immediateSystems ?? {},
  };
}

/** Map catalog delayed effects for the CHOSEN action with confirmation status. */
function buildChosenDelayedEffects(
  decisionDay: number,
  catalogAction: EventAction | undefined,
  state: GameState,
  decisionId: string,
): ChosenDelayedEffect[] {
  if (!catalogAction?.effect.delayed) return [];

  return catalogAction.effect.delayed.map((d) => {
    const scheduledDay = decisionDay + d.delayInDays;
    // Confirmed = scheduledDay has passed AND the effect is no longer pending
    // (meaning the engine processed and removed it).
    const stillPending = state.pendingEffects.some(
      (pe) =>
        pe.sourceDecisionId === decisionId &&
        pe.scheduledDay === scheduledDay &&
        pe.description === d.description,
    );
    const confirmed = scheduledDay <= state.day && !stillPending;

    return {
      delayInDays: d.delayInDays,
      description: d.description,
      kind: d.parameters.kind,
      confirmed,
      scheduledDay,
    };
  });
}

/** Map catalog delayed effects for an ALTERNATIVE action (always declared). */
function buildDeclaredDelayedEffects(action: EventAction): DeclaredDelayedEffect[] {
  if (!action.effect.delayed) return [];
  return action.effect.delayed.map((d) => ({
    delayInDays: d.delayInDays,
    description: d.description,
    kind: d.parameters.kind,
  }));
}

// ---------------------------------------------------------------------------
// Takeaway generation (template-driven, grounded in declared data)
// ---------------------------------------------------------------------------

/** Compute net signed sum of resource deltas. */
function netResourceSum(changes: Partial<Record<string, number>>): number {
  let sum = 0;
  for (const key of RESOURCE_KEYS) {
    sum += (changes[key as ResourceKey] ?? 0);
  }
  return sum;
}

/** Find the single largest absolute resource delta and its label. */
function dominantResourceDelta(
  changes: Partial<Record<string, number>>,
): { label: string; delta: number } | null {
  let best: { label: string; delta: number } | null = null;
  for (const key of RESOURCE_KEYS) {
    const v = changes[key as ResourceKey] ?? 0;
    if (v === 0) continue;
    if (!best || Math.abs(v) > Math.abs(best.delta)) {
      best = { label: RESOURCE_LABELS[key as ResourceKey], delta: v };
    }
  }
  return best;
}

/** Describe a crew effect in plain language. */
function crewEffectPhrase(crew: Partial<Record<string, number>>): string | null {
  const parts: string[] = [];
  if ((crew.health ?? 0) < 0) parts.push('health risk');
  if ((crew.health ?? 0) > 0) parts.push('health benefit');
  if ((crew.morale ?? 0) < 0) parts.push('lower morale');
  if ((crew.morale ?? 0) > 0) parts.push('higher morale');
  if ((crew.radiationExposure ?? 0) > 0) parts.push('radiation exposure');
  if ((crew.radiationExposure ?? 0) < 0) parts.push('reduced radiation');
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Generate a plain-language takeaway comparing the chosen action against the
 * alternatives. Grounded in declared effect data — never claims to predict
 * the full alternative mission outcome.
 */
function generateTakeaway(
  chosen: ChosenActionSummary,
  alternatives: AlternativeActionSummary[],
): string {
  if (alternatives.length === 0) return 'No alternative actions were available for comparison.';

  const chosenNet = netResourceSum(chosen.immediateEffects.resources);
  const chosenCrewPhrase = crewEffectPhrase(chosen.immediateEffects.crew);

  // Find the alternative with the highest net resource sum (the "safest" for
  // resources) and the one with the lowest (the "costliest").
  const altNets = alternatives.map((a) => ({
    label: a.label,
    net: netResourceSum(a.immediateEffects.resources),
    crewPhrase: crewEffectPhrase(a.immediateEffects.crew),
    dominant: dominantResourceDelta(a.immediateEffects.resources),
    delayedCount: a.delayedEffects.length,
  }));

  const bestAlt = altNets.reduce((a, b) => (b.net > a.net ? b : a));

  const parts: string[] = [];

  // Core trade-off sentence.
  if (chosenNet >= 0 && bestAlt.net < chosenNet) {
    parts.push(
      `You chose "${chosen.label}", which had a more favourable immediate resource outcome than the alternatives.`,
    );
  } else if (chosenNet < 0 && bestAlt.net > chosenNet) {
    const diff = Math.round(bestAlt.net - chosenNet);
    parts.push(
      `You chose "${chosen.label}" at a higher immediate resource cost. ` +
      `"${bestAlt.label}" would have cost ~${diff} fewer resource points according to the event definition.`,
    );
  } else {
    parts.push(
      `You chose "${chosen.label}". The alternatives had similar immediate resource effects.`,
    );
  }

  // Crew safety angle.
  if (chosenCrewPhrase) {
    parts.push(`Your choice involved ${chosenCrewPhrase}.`);
  }
  const saferAlt = altNets.find(
    (a) => a.crewPhrase === null || (a.crewPhrase && !a.crewPhrase.includes('risk') && !a.crewPhrase.includes('exposure')),
  );
  if (saferAlt && chosenCrewPhrase && (chosenCrewPhrase.includes('risk') || chosenCrewPhrase.includes('exposure'))) {
    parts.push(`"${saferAlt.label}" would have been a lower-risk option for crew safety.`);
  }

  // Delayed consequences note.
  const chosenDelayedCount = chosen.delayedEffects.length;
  const maxAltDelayed = Math.max(...altNets.map((a) => a.delayedCount));
  if (chosenDelayedCount > 0 && maxAltDelayed === 0) {
    parts.push('Your choice carried delayed consequences that the alternatives did not.');
  } else if (chosenDelayedCount === 0 && maxAltDelayed > 0) {
    parts.push('Your choice avoided the delayed consequences that some alternatives would have introduced.');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build comparison data for every event-based decision in the player's
 * history. Free (routine) actions are excluded because they don't have
 * meaningful event-specific alternatives.
 *
 * Returns comparisons in chronological order (earliest decision first).
 */
export function buildDecisionComparisons(state: GameState): DecisionComparison[] {
  const comparisons: DecisionComparison[] = [];

  for (const record of state.history) {
    // Only event-based decisions have meaningful alternatives.
    if (!record.eventId) continue;

    // Look up the event in the catalog.
    const catalogEvent: GameEvent | undefined = findEvent(record.eventId);
    if (!catalogEvent) continue;

    // Find the chosen action in the catalog.
    const chosenCatalogAction = catalogEvent.availableActions.find(
      (a) => a.id === record.actionId,
    );

    // Build the event context.
    const eventContext: ComparisonEventContext = {
      eventId: catalogEvent.id,
      title: catalogEvent.title,
      description: catalogEvent.description,
      severity: catalogEvent.severity,
    };

    // Build the chosen action summary.
    const chosen: ChosenActionSummary = {
      actionId: record.actionId,
      label: record.actionLabel,
      description: chosenCatalogAction?.description ?? record.explanation,
      immediateEffects: buildChosenEffects(record, chosenCatalogAction),
      delayedEffects: buildChosenDelayedEffects(
        record.day,
        chosenCatalogAction,
        state,
        record.id,
      ),
    };

    // Build alternative action summaries (every action the player did NOT pick).
    const alternatives: AlternativeActionSummary[] = catalogEvent.availableActions
      .filter((a) => a.id !== record.actionId)
      .map((action) => ({
        actionId: action.id,
        label: action.label,
        description: action.description,
        immediateEffects: buildDeclaredEffects(action),
        delayedEffects: buildDeclaredDelayedEffects(action),
      }));

    // Skip if there are no alternatives (single-action events).
    if (alternatives.length === 0) continue;

    const takeaway = generateTakeaway(chosen, alternatives);

    comparisons.push({
      id: record.id,
      day: record.day,
      record,
      eventContext,
      chosen,
      alternatives,
      takeaway,
    });
  }

  return comparisons;
}
