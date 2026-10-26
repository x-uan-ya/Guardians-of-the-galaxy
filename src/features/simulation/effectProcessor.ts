/**
 * effectProcessor.ts
 * ------------------
 * Pure helpers for scheduling and applying DelayedEffects.
 *
 * Rules enforced here:
 *  - A delayed effect applies only when day >= scheduledDay.
 *  - Each delayed effect applies exactly once (it is removed after applying).
 *  - Every delayed effect records the decision that caused it.
 *  - Applying an effect never mutates the input state.
 */

import { applyCrewChanges, applyResourceChanges, applySystemChanges } from './resourceCalculations';
import type {
  DelayedEffect,
  GameState,
  MissionStatus,
} from './simulationTypes';
import type { DelayedActionEffect } from '../events/eventTypes';
import { makeId } from '../../lib/ids';

/**
 * Turn an action's declared delayed effects into scheduled DelayedEffect
 * records tagged with the causing decision id. Returns NEW DelayedEffect
 * objects; does not touch state.
 */
export function scheduleDelayedEffects(
  gameId: string,
  currentDay: number,
  sourceDecisionId: string,
  declared: DelayedActionEffect[] | undefined,
  decisionCounter: number
): DelayedEffect[] {
  if (!declared || declared.length === 0) return [];
  return declared.map((d, index) => {
    if (!Number.isInteger(d.delayInDays) || d.delayInDays < 1) {
      throw new RangeError(`delayInDays must be an integer >= 1, got ${String(d.delayInDays)}`);
    }
    return {
      // The decision counter is unique, and the index distinguishes effects
      // declared by the same decision, even after earlier effects are removed.
      id: `${makeId('eff', gameId, decisionCounter)}_${index}`,
      sourceDecisionId,
      scheduledDay: currentDay + d.delayInDays,
      type: d.parameters.kind,
      description: d.description,
      parameters: d.parameters,
    };
  });
}

/** Result of processing due effects for a day. */
export interface ProcessEffectsResult {
  state: GameState;
  /** The effects that fired this call (for the activity feed). */
  applied: DelayedEffect[];
}

/**
 * Apply every pending effect whose scheduledDay has been reached (<= state.day)
 * exactly once, returning a NEW state with those effects removed from
 * pendingEffects. Effects scheduled for the future are left untouched.
 */
export function processDueEffects(state: GameState): ProcessEffectsResult {
  const due: DelayedEffect[] = [];
  const remaining: DelayedEffect[] = [];

  for (const effect of state.pendingEffects) {
    if (effect.scheduledDay <= state.day) {
      due.push(effect);
    } else {
      remaining.push(effect);
    }
  }

  if (due.length === 0) {
    return { state, applied: [] };
  }

  let resources = state.resources;
  let crew = state.crew;
  let systems = state.systems;
  let missionStatus: MissionStatus = state.mission.status;

  for (const effect of due) {
    const p = effect.parameters;
    switch (p.kind) {
      case 'resource':
        resources = applyResourceChanges(resources, p.changes);
        break;
      case 'crew':
        crew = applyCrewChanges(crew, p.changes);
        break;
      case 'system':
        systems = applySystemChanges(systems, p.changes);
        break;
      case 'status':
        missionStatus = p.status;
        break;
      default: {
        // Exhaustiveness guard: if a new kind is added, TS flags this.
        const _never: never = p;
        throw new Error(`Unknown delayed effect kind: ${JSON.stringify(_never)}`);
      }
    }
  }

  const nextState: GameState = {
    ...state,
    resources,
    crew,
    systems,
    mission: { ...state.mission, status: missionStatus },
    // The due effects are consumed; only future effects remain. This is what
    // guarantees an effect never fires twice.
    pendingEffects: remaining,
  };

  return { state: nextState, applied: due };
}
