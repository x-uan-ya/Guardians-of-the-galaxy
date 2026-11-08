
import type { EventAction, ActionEffect } from '../events/eventTypes';
import { METRIC_THRESHOLDS } from '../mission/missionDefaults';
import { calculateDerivedStatus } from '../simulation/simulationSelectors';
import { RESOURCE_KEYS } from '../simulation/simulationTypes';
import type { Advisor, AdvisorContext, Recommendation } from './advisorTypes';

/** Mission Safety Protocol: power below this triggers "reduce non-essential systems". */
export const LOW_POWER_LIMIT = 20;
/** Mission Safety Protocol: health at or below this triggers "avoid extra strain". */
const LOW_HEALTH_LIMIT = 25;
/** A maintenance shift costs power, so only suggest it with some reserve. */
const MAINTENANCE_MIN_POWER = 30;

type MetricGroup = 'resource' | 'crew' | 'system';

function urgencyWeight(group: MetricGroup, key: string, current: number): number {
  if (group === 'crew' && key === 'radiationExposure') {
    return current >= 60 ? 4 : current >= 40 ? 2.5 : 1.2;
  }

  if (group === 'crew' && key === 'health') {
    return current <= 25 ? 4 : current <= 50 ? 2.5 : 1.2;
  }

  if (group === 'crew' && key === 'morale') {
    return current <= 25 ? 2.2 : current <= 45 ? 1.5 : 0.8;
  }

  if (group === 'resource') {
    return current <= 20 ? 3 : current <= 40 ? 2 : 1;
  }

  if (group === 'system' && key === 'lifeSupportEfficiency') {
    return current <= 40 ? 2.4 : 1.2;
  }

  if (group === 'system' && key === 'shieldingIntegrity') {
    return current <= 35 ? 2.4 : 1.1;
  }

  return 1;
}

function scoreMetric(
  current: number,
  delta: number,
  higherIsBetter: boolean,
  weight: number
): number {
  const next = Math.max(0, Math.min(100, current + delta));
  const actualChange = next - current;
  return (higherIsBetter ? actualChange : -actualChange) * weight;
}

function scoreChanges(
  changes: object | undefined,
  currentValues: object,
  group: MetricGroup
): number {  
if (!changes) return 0;

  let score = 0;

  for (const [key, delta] of Object.entries(changes ?? {})) {
  const current = (currentValues as Record<string, number>)[key];    if (current === undefined || typeof delta !== 'number') continue;

    const higherIsBetter = !(group === 'crew' && key === 'radiationExposure');

    score += scoreMetric(
      current,
      delta,
      higherIsBetter,
      urgencyWeight(group, key, current)
    );
  }

  return score;
}


export function scoreEffect(effect: ActionEffect, context: AdvisorContext): number {
  const { state } = context;

  // Calculate the immediate impact first.
  const immediate =
    scoreChanges(effect.immediateResources, state.resources, 'resource') +
    scoreChanges(effect.immediateCrew, state.crew, 'crew') +
    scoreChanges(effect.immediateSystems, state.systems, 'system');

  // Project the state after immediate changes.
  const projectedResources = {
    ...state.resources,
    ...(effect.immediateResources ?? {}),
  };

  const projectedCrew = {
    ...state.crew,
    ...(effect.immediateCrew ?? {}),
  };

  const projectedSystems = {
    ...state.systems,
    ...(effect.immediateSystems ?? {}),
  };

  // Evaluate delayed consequences against the projected state.
  const delayed = (effect.delayed ?? []).reduce((total, item) => {
    const parameters = item.parameters;
    let futureScore = 0;

    if (parameters.kind === 'resource') {
      futureScore = scoreChanges(
        parameters.changes,
        projectedResources,
        'resource'
      );
    } else if (parameters.kind === 'crew') {
      futureScore = scoreChanges(
        parameters.changes,
        projectedCrew,
        'crew'
      );
    } else if (parameters.kind === 'system') {
      futureScore = scoreChanges(
        parameters.changes,
        projectedSystems,
        'system'
      );
    } else if (parameters.kind === 'status') {
      if (parameters.status === 'failed') futureScore = -100;
      else if (parameters.status === 'critical') futureScore = -30;
      else if (parameters.status === 'completed') futureScore = 15;
    }

    const timeDiscount = 0.7 / (1 + item.delayInDays * 0.1);

    return total + futureScore * timeDiscount;
  }, 0);

  return immediate + delayed;
}

export function describeActionEffects(effect: ActionEffect): string {
  const benefits: string[] = [];
  const tradeoffs: string[] = [];
  const delayedEffects: string[] = [];

  const collectChanges = (
    changes: object | undefined,
    group: MetricGroup
  ) => {
    if (!changes) return;

    for (const [key, delta] of Object.entries(changes)) {
      if (typeof delta !== 'number' || delta === 0) continue;

      const higherIsBetter =
        !(group === 'crew' && key === 'radiationExposure');

      const isBenefit = higherIsBetter ? delta > 0 : delta < 0;

      const description =
        `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ` +
        `${delta > 0 ? '+' : ''}${delta}`;

      if (isBenefit) {
        benefits.push(description);
      } else {
        tradeoffs.push(description);
      }
    }
  };

  collectChanges(effect.immediateResources, 'resource');
  collectChanges(effect.immediateCrew, 'crew');
  collectChanges(effect.immediateSystems, 'system');

  for (const item of effect.delayed ?? []) {
    const parameters = item.parameters;

    if (parameters.kind === 'status') {
      const statusLabel =
        parameters.status === 'failed' || parameters.status === 'critical'
          ? 'Potential risk'
          : parameters.status === 'completed'
            ? 'Potential benefit'
            : 'Status update';

      delayedEffects.push(
        `${statusLabel}: mission becomes ${parameters.status} after ${item.delayInDays} days`
      );
      continue;
    }

    const group = parameters.kind as MetricGroup;

    for (const [key, delta] of Object.entries(parameters.changes)) {
      if (typeof delta !== 'number' || delta === 0) continue;

      const higherIsBetter =
        !(group === 'crew' && key === 'radiationExposure');

      const isBenefit = higherIsBetter ? delta > 0 : delta < 0;

      const description =
        `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ` +
        `${delta > 0 ? '+' : ''}${delta} ` +
        `after ${item.delayInDays} days`;

      delayedEffects.push(
        `${isBenefit ? 'Potential benefit' : 'Potential risk'}: ${description}`
      );
    }
  }
  const parts: string[] = [];

  if (benefits.length > 0) {
    parts.push(`Benefits: ${benefits.join(', ')}.`);
  }

  if (tradeoffs.length > 0) {
    parts.push(`Trade-offs: ${tradeoffs.join(', ')}.`);
  }

  if (delayedEffects.length > 0) {
    parts.push(`Delayed effects: ${delayedEffects.join('; ')}.`);
  }

  if (parts.length === 0) {
    return 'No measurable resource, crew, or system changes are defined for this action.';
  }

  return parts.join(' ');
}

function recommendForEvent(context: AdvisorContext): Recommendation | null {
  const { state, eventId } = context;
  if (!eventId) return null;

  // Use the active event so recommendations match the actions the engine validates.
  const event = state.activeEvents.find((candidate) => candidate.id === eventId);
  if (!event || event.availableActions.length === 0) return null;

  const ranked = event.availableActions
    .map((action: EventAction) => ({
      action,
      score: scoreEffect(action.effect, context),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  const margin = best.score - (ranked[1]?.score ?? best.score);

  let confidence: 'low' | 'medium' | 'high' = 'low';

  if (ranked.length === 1) {
    confidence = 'medium';
  } else if (best.score > 0 && margin >= 5) {
    confidence = 'high';
  } else if (best.score > 0 && margin >= 1.5) {
    confidence = 'medium';
  }

  const effectExplanation = describeActionEffects(best.action.effect);
  const missionContext = state.crew.radiationExposure >= 60
    ? 'Mission context: crew radiation exposure is high (' + state.crew.radiationExposure.toFixed(0) + '/100). '
    : '';

  return {
    actionId: best.action.id,
    eventId,
    confidence,
    rationale:
      `Recommended: "${best.action.label}". ` +
      `${missionContext}${effectExplanation} ` +
      `Estimated decision score: ${best.score.toFixed(1)}. ` +
      `Confidence reflects the score difference from the next-best action. ` +
      `This is a rule-based heuristic, not a guarantee of the best outcome.`,
  };
}

export const ruleBasedAdvisor: Advisor = {
  id: 'rule-based-placeholder',

  recommend(context: AdvisorContext): Recommendation | null {
    const { state, eventId } = context;

    if (state.mission.status === 'failed' || state.mission.status === 'completed') {
      return null;
    }

    if (eventId !== undefined) {
      return recommendForEvent(context);
    }

    const rule = freeActionProtocol(state);
    return {
      actionId: rule.actionId,
      confidence: rule.confidence,
      rationale: rule.rationale,
    };
  },
};

/** The result of the Mission Safety Protocol for a day with no event. */
export interface ProtocolRule {
  actionId: string;
  confidence: 'low' | 'medium' | 'high';
  /** Short title, e.g. "Reduce non-essential systems". */
  headline: string;
  rationale: string;
}

/**
 * The Mission Safety Protocol: simple, readable IF/THEN rules for a normal day
 * (no event). First matching rule wins. These rules are also what the game
 * falls back to when an optional remote AI advisor is unavailable.
 *
 *  1. IF power < 20%           -> run routine operations (skip power-hungry work)
 *  2. IF food/water is tightest and below target -> ration supplies
 *  3. IF crew health <= 25     -> routine operations (avoid extra strain)
 *  4. IF life support is below target (and power >= 30%) -> maintenance shift
 *  5. OTHERWISE                -> routine operations
 */
export function freeActionProtocol(state: AdvisorContext['state']): ProtocolRule {
  const derived = calculateDerivedStatus(state);

  if (state.resources.power < LOW_POWER_LIMIT) {
    return {
      actionId: 'routine-operations',
      confidence: state.resources.power <= METRIC_THRESHOLDS.critical ? 'high' : 'medium',
      headline: 'Reduce non-essential systems',
      rationale:
        `Mission Safety Protocol: power is at ${state.resources.power.toFixed(0)}%, below ` +
        `${LOW_POWER_LIMIT}%. Reduce non-essential systems: run routine operations and ` +
        `avoid power-hungry work such as a maintenance shift.`,
    };
  }

  const lowestResource = RESOURCE_KEYS.reduce((lowest, key) =>
    state.resources[key] < state.resources[lowest] ? key : lowest
  );

  if (
    (lowestResource === 'food' || lowestResource === 'water') &&
    derived.resources[lowestResource].level !== 'ok'
  ) {
    return {
      actionId: 'ration-supplies',
      confidence: derived.resources[lowestResource].level === 'critical' ? 'high' : 'medium',
      headline: `Protect ${lowestResource}`,
      rationale:
        `Rule-based: ${lowestResource} is the tightest resource ` +
        `(${state.resources[lowestResource].toFixed(0)}%). Rationing preserves it, ` +
        `at a morale cost.`,
    };
  }

  if (state.crew.health <= LOW_HEALTH_LIMIT) {
    return {
      actionId: 'routine-operations',
      confidence: 'medium',
      headline: 'Avoid extra strain',
      rationale:
        `Mission Safety Protocol: crew health is ${state.crew.health.toFixed(0)}%. ` +
        `Run routine operations and avoid extra strain until health recovers.`,
    };
  }

  if (
    derived.systems.lifeSupportEfficiency.level !== 'ok' &&
    state.resources.power >= MAINTENANCE_MIN_POWER
  ) {
    return {
      actionId: 'maintenance-shift',
      confidence: 'medium',
      headline: 'Prioritise life support',
      rationale:
        'Rule-based: life-support efficiency is below target. A maintenance shift ' +
        'restores some efficiency, spending a little power.',
    };
  }

  return {
    actionId: 'routine-operations',
    confidence: 'low',
    headline: 'Hold steady with routine operations',
    rationale:
      'Rule-based: key metrics are within tolerance. Routine operations are reasonable.',
  };
}

export const defaultAdvisor: Advisor = ruleBasedAdvisor;
