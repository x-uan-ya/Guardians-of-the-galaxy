/**
 * advisorInterface.ts
 * -------------------
 * The integration seam for the AI Mission Controller.
 *
 * ⚠️ No AI model is connected in the foundation phase, and we do NOT fabricate
 * AI-sounding output. What ships here is a transparent, RULE-BASED advisor that
 * inspects the current state with simple deterministic heuristics. It is
 * clearly labelled as rule-based so nobody mistakes it for a real model.
 *
 * When the AI teammate adds a real advisor, they implement the `Advisor`
 * interface (from advisorTypes) and swap it in. The simulation engine still
 * validates whatever action the advisor recommends, so the advisor can never
 * corrupt game state.
 */

import { findEvent } from '../events/eventCatalog';
import { calculateDerivedStatus } from '../simulation/simulationSelectors';
import { RESOURCE_KEYS } from '../simulation/simulationTypes';
import type { Advisor, AdvisorContext, Recommendation } from './advisorTypes';

/**
 * A deterministic, rule-based advisor. It does not call any external service.
 * Its recommendations are derived purely from the passed-in state, so they are
 * reproducible and safe to use as a stable integration target.
 */
export const ruleBasedAdvisor: Advisor = {
  id: 'rule-based-placeholder',

  recommend(context: AdvisorContext): Recommendation | null {
    const { state, eventId } = context;

    // Terminal missions get no advice.
    if (state.mission.status === 'failed' || state.mission.status === 'completed') {
      return null;
    }

    // Event-specific heuristics.
    if (eventId !== undefined) {
      return recommendForEvent(context);
    }

    // Free-action heuristics: look at the weakest life-support metric.
    const derived = calculateDerivedStatus(state);

    const lowestResource = RESOURCE_KEYS.reduce((lowest, key) =>
      state.resources[key] < state.resources[lowest] ? key : lowest
    );

    // If food or water is the tightest, rationing buys time.
    if (
      (lowestResource === 'food' || lowestResource === 'water') &&
      derived.resources[lowestResource].level !== 'ok'
    ) {
      return {
        actionId: 'ration-supplies',
        confidence: derived.resources[lowestResource].level === 'critical' ? 'high' : 'medium',
        rationale:
          `Rule-based: ${lowestResource} is the tightest resource ` +
          `(${state.resources[lowestResource].toFixed(0)}%). Rationing preserves it, ` +
          `at a small morale cost.`,
      };
    }

    // If life support is sagging, a maintenance shift helps.
    if (derived.systems.lifeSupportEfficiency.level !== 'ok') {
      return {
        actionId: 'maintenance-shift',
        confidence: 'medium',
        rationale:
          'Rule-based: life-support efficiency is below target. A maintenance shift ' +
          'restores some efficiency, spending a little power.',
      };
    }

    // Otherwise, steady as she goes.
    return {
      actionId: 'routine-operations',
      confidence: 'low',
      rationale: 'Rule-based: all key metrics are within tolerance. Routine operations are fine.',
    };
  },
};

/** Heuristic for picking an action in response to a known event. */
function recommendForEvent(context: AdvisorContext): Recommendation | null {
  const { state, eventId } = context;
  if (eventId === undefined) return null;

  const event = findEvent(eventId);
  if (!event || event.availableActions.length === 0) return null;

  const derived = calculateDerivedStatus(state);

  // Simple rule: if the crew is already irradiated, avoid EVA-style actions and
  // prefer the first "shelter/stable" style option (the first listed action in
  // our catalog is the conservative one by convention). Otherwise take the
  // investment option when resources allow.
  const radiationStressed = derived.crew.radiationExposure.level !== 'ok';
  const chosen = radiationStressed
    ? event.availableActions[0]
    : (event.availableActions[event.availableActions.length - 1] ?? event.availableActions[0]);

  if (!chosen) return null;

  return {
    actionId: chosen.id,
    eventId,
    confidence: radiationStressed ? 'high' : 'medium',
    rationale: radiationStressed
      ? 'Rule-based: crew radiation exposure is elevated, so the conservative option is safer.'
      : 'Rule-based: metrics allow for the higher-upside option here.',
  };
}

/** The advisor the app wires in by default during the foundation phase. */
export const defaultAdvisor: Advisor = ruleBasedAdvisor;
