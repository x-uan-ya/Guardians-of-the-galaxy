/**
 * The resource-allocation controls are ordinary engine actions: the UI only
 * sends an action id, and the engine validates it and applies the effect.
 */
import { describe, expect, it } from 'vitest';
import { ALLOCATION_ACTIONS, ALLOCATION_ACTION_IDS } from '../features/events/allocationActions';
import { FREE_ACTIONS } from '../features/events/eventCatalog';
import {
  InvalidDecisionError,
  applyPlayerDecision,
  getFreeActions,
} from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { freshGame, withActiveEvent } from './helpers';

function midGame(): GameState {
  const base = freshGame();
  return { ...base, resources: { power: 50, water: 50, food: 50, oxygen: 50 } };
}

describe('allocation actions', () => {
  it('are offered as free actions with unique ids', () => {
    const ids = FREE_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const action of ALLOCATION_ACTIONS) {
      expect(getFreeActions().some((a) => a.id === action.id)).toBe(true);
      expect(ALLOCATION_ACTION_IDS.has(action.id)).toBe(true);
    }
  });

  it('cover power, life support, food, activate/deactivate and emergency use', () => {
    const ids = ALLOCATION_ACTIONS.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'prioritise-life-support',
        'prioritise-food',
        'power-saving-mode',
        'activate-backup-generator',
        'emergency-allocation',
      ])
    );
  });

  it('each one is a trade-off: it helps something and costs something', () => {
    for (const action of ALLOCATION_ACTIONS) {
      const values = [
        ...Object.values(action.effect.immediateResources ?? {}),
        ...Object.values(action.effect.immediateCrew ?? {}),
        ...Object.values(action.effect.immediateSystems ?? {}),
      ];
      expect(values.some((v) => v > 0), `${action.id} gives something`).toBe(true);
      expect(values.some((v) => v < 0), `${action.id} costs something`).toBe(true);
    }
  });

  it.each(ALLOCATION_ACTIONS.map((a) => [a.id, a] as const))(
    'the engine applies %s and records it in the history',
    (id, action) => {
      const before = midGame();
      const frozen = JSON.stringify(before);
      const after = applyPlayerDecision(before, { actionId: id, playerChoice: 'self-directed' });

      // The input state is never changed; the engine returns a new one.
      expect(JSON.stringify(before)).toBe(frozen);
      expect(after).not.toBe(before);

      for (const [key, delta] of Object.entries(action.effect.immediateResources ?? {})) {
        const k = key as keyof GameState['resources'];
        expect(after.resources[k]).toBeCloseTo(before.resources[k] + delta, 1);
      }
      for (const [key, delta] of Object.entries(action.effect.immediateSystems ?? {})) {
        const k = key as keyof GameState['systems'];
        expect(after.systems[k]).toBeCloseTo(before.systems[k] + delta, 1);
      }
      expect(after.history[after.history.length - 1]?.actionId).toBe(id);
    }
  );

  it('cannot be used while an event is waiting for a response', () => {
    const state = withActiveEvent(midGame(), 'solar-storm');
    expect(() =>
      applyPlayerDecision(state, { actionId: 'emergency-allocation', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });
});
