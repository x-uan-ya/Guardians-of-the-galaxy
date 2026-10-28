
import type { EventAction, ActionEffect } from '../events/eventTypes';
import { calculateDerivedStatus } from '../simulation/simulationSelectors';
import { RESOURCE_KEYS } from '../simulation/simulationTypes';
import type { Advisor, AdvisorContext, Recommendation } from './advisorTypes';

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

function scoreEffect(effect: ActionEffect, context: AdvisorContext): number {
  const { state } = context;

  const immediate =
    scoreChanges(effect.immediateResources, state.resources, 'resource') +
    scoreChanges(effect.immediateCrew, state.crew, 'crew') +
    scoreChanges(effect.immediateSystems, state.systems, 'system');

  const delayed = (effect.delayed ?? []).reduce((total, item) => {
    const parameters = item.parameters;
    let futureScore = 0;

    if (parameters.kind === 'resource') {
      futureScore = scoreChanges(parameters.changes, state.resources, 'resource');
    } else if (parameters.kind === 'crew') {
      futureScore = scoreChanges(parameters.changes, state.crew, 'crew');
    } else if (parameters.kind === 'system') {
      futureScore = scoreChanges(parameters.changes, state.systems, 'system');
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
  const confidence = margin >= 5 ? 'high' : margin >= 1.5 ? 'medium' : 'low';

  return {
    actionId: best.action.id,
    eventId,
    confidence,
    rationale:
      `Rule-based: "${best.action.label}" has the strongest weighted balance ` +
      `of immediate effects and delayed consequences for the current state ` +
      `(estimated score ${best.score.toFixed(1)}). ` +
      `This is a heuristic, not a guarantee of the best outcome.`,
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

    const derived = calculateDerivedStatus(state);

    const lowestResource = RESOURCE_KEYS.reduce((lowest, key) =>
      state.resources[key] < state.resources[lowest] ? key : lowest
    );

    if (
      (lowestResource === 'food' || lowestResource === 'water') &&
      derived.resources[lowestResource].level !== 'ok'
    ) {
      return {
        actionId: 'ration-supplies',
        confidence:
          derived.resources[lowestResource].level === 'critical' ? 'high' : 'medium',
        rationale:
          `Rule-based: ${lowestResource} is the tightest resource ` +
          `(${state.resources[lowestResource].toFixed(0)}%). Rationing preserves it, ` +
          `at a morale cost.`,
      };
    }

    if (derived.systems.lifeSupportEfficiency.level !== 'ok') {
      return {
        actionId: 'maintenance-shift',
        confidence: 'medium',
        rationale:
          'Rule-based: life-support efficiency is below target. A maintenance shift ' +
          'restores some efficiency, spending a little power.',
      };
    }

    return {
      actionId: 'routine-operations',
      confidence: 'low',
      rationale:
        'Rule-based: key metrics are within tolerance. Routine operations are reasonable.',
    };
  },
};

export const defaultAdvisor: Advisor = ruleBasedAdvisor;
