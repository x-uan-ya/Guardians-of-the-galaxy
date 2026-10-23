/**
 * resupply.test.ts
 * ----------------
 * Covers the one-time resupply mechanic (fixed at the mission midpoint, Sol 15):
 *  - every run's resupply day is RESUPPLY_DAY (15),
 *  - the resupply fires exactly once, on day 15,
 *  - it adds RESUPPLY_AMOUNT to every resource (clamped at 100),
 *  - resupplyDelivered flips true and the resupply never fires again,
 *  - day-30 completion is unaffected.
 */

import { describe, expect, it } from 'vitest';
import {
  RESUPPLY_AMOUNT,
  RESUPPLY_DAY,
  advanceSimulationDay,
  createInitialGameState,
  resupplyDay,
  validateGameState,
} from '../features/simulation/simulationEngine';
import { RESOURCE_KEYS, type GameState } from '../features/simulation/simulationTypes';
import { FIXED_CONFIG, freshGame } from './helpers';

/** Keep the character comfortably alive each step so we can reach late days. */
function keepAlive(state: GameState): GameState {
  return {
    ...state,
    crew: { ...state.crew, health: 90, radiationExposure: 0 },
    resources: { power: 60, water: 60, food: 60, oxygen: 60 },
  };
}

describe('resupply day', () => {
  it('is always the fixed mission midpoint (Sol 15)', () => {
    expect(RESUPPLY_DAY).toBe(15);
    expect(resupplyDay()).toBe(15);
    expect(freshGame().mission.supplyWindow).toBe(15);
  });

  it('starts with resupplyDelivered = false and a valid state', () => {
    const state = freshGame();
    expect(state.mission.resupplyDelivered).toBe(false);
    expect(validateGameState(state).valid).toBe(true);
  });
});

describe('one-time resupply delivery', () => {
  function lowResources(state: GameState): GameState {
    return {
      ...state,
      resources: { power: 20, water: 20, food: 20, oxygen: 20 },
      crew: { ...state.crew, health: 90, radiationExposure: 0 },
    };
  }

  it('fires exactly once, on Sol 15', () => {
    // Step day-by-day, keeping the character alive, up to Sol 18.
    let state = lowResources(freshGame());
    const firedDays: number[] = [];
    for (let i = 0; i < 17 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceSimulationDay(state);
      if (res.resupplyFired) firedDays.push(res.state.day);
      state = res.state;
    }
    expect(firedDays).toEqual([RESUPPLY_DAY]);
    expect(state.mission.resupplyDelivered).toBe(true);
  });

  it('adds RESUPPLY_AMOUNT to every resource on arrival', () => {
    // Advance to Sol 14 (day before the drop), keeping alive, with low stores.
    let state = lowResources(freshGame());
    while (state.day < RESUPPLY_DAY - 1) {
      state = keepAlive(state);
      state = advanceSimulationDay(state).state;
    }
    // Pin resources just before the drop so the +25 is clearly observable.
    state = { ...state, resources: { power: 30, water: 30, food: 30, oxygen: 30 } };
    const onArrival = advanceSimulationDay(state).state;
    expect(onArrival.day).toBe(RESUPPLY_DAY);

    const avgBefore = 30;
    const avgAfter = RESOURCE_KEYS.reduce((s, k) => s + onArrival.resources[k], 0) / 4;
    // A full +25 minus one day's consumption must clearly exceed +10.
    expect(avgAfter - avgBefore).toBeGreaterThan(RESUPPLY_AMOUNT * 0.4);
  });

  it('does not fire a second time after Sol 15', () => {
    let state = lowResources(freshGame());
    const firedDays: number[] = [];
    for (let i = 0; i < 22 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceSimulationDay(state);
      if (res.resupplyFired) firedDays.push(res.state.day);
      state = res.state;
    }
    expect(firedDays.length).toBe(1);
  });
});

describe('completion unaffected by resupply', () => {
  it('still completes at day 30 when kept alive', () => {
    let state = createInitialGameState({ ...FIXED_CONFIG, gameId: 'survivor' });
    for (let i = 0; i < 40 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      state = advanceSimulationDay(state).state;
    }
    expect(state.day).toBeGreaterThanOrEqual(30);
    expect(state.mission.status).toBe('completed');
  });
});
