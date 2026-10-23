/**
 * missions.test.ts
 * ----------------
 * Covers mission selection and its modifiers:
 *  - each mission seeds its modifiers + missionType onto the run,
 *  - deep-space ('noResupply') never delivers the Sol-15 drop,
 *  - the Mars radiation hazard raises radiation over time,
 *  - a power-penalty mission produces less power than a neutral one,
 *  - startingResourceDelta shifts the opening reserves,
 *  - states remain valid.
 */

import { describe, expect, it } from 'vitest';
import { advanceSimulationDay, validateGameState } from '../features/simulation/simulationEngine';
import { MISSION_CATALOG } from '../features/mission/missions';
import { MISSION_TYPES, type GameState } from '../features/simulation/simulationTypes';
import { freshGame } from './helpers';

function keepAlive(state: GameState): GameState {
  return {
    ...state,
    crew: { ...state.crew, health: 90 },
    resources: { power: 60, water: 60, food: 60, oxygen: 60 },
  };
}

describe('mission seeding', () => {
  it('seeds missionType + modifiers from the catalog for every mission', () => {
    for (const type of MISSION_TYPES) {
      const state = freshGame({ missionType: type });
      expect(state.mission.missionType).toBe(type);
      expect(state.mission.modifiers).toEqual(MISSION_CATALOG[type].modifiers);
      expect(validateGameState(state).valid).toBe(true);
    }
  });

  it('applies startingResourceDelta once at creation (lunar starts lower)', () => {
    const lunar = freshGame({ missionType: 'lunar' });
    const mars = freshGame({ missionType: 'mars' });
    // Lunar has startingResourceDelta -8, Mars has 0, same base condition.
    expect(lunar.resources.power).toBeLessThan(mars.resources.power);
  });
});

describe('noResupply (deep-space)', () => {
  it('never delivers the Sol-15 resupply', () => {
    let state = keepAlive(freshGame({ missionType: 'deep-space' }));
    let anyResupply = false;
    for (let i = 0; i < 20 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceSimulationDay(state);
      if (res.resupplyFired) anyResupply = true;
      state = res.state;
    }
    expect(anyResupply).toBe(false);
    expect(state.mission.resupplyDelivered).toBe(false);
  });
});

describe('radiation hazard (mars)', () => {
  it('raises radiation exposure over several sols', () => {
    let state = freshGame({ missionType: 'mars' });
    const before = state.crew.radiationExposure;
    for (let i = 0; i < 5; i++) {
      state = keepAlive(state);
      state = advanceSimulationDay(state).state;
    }
    expect(state.crew.radiationExposure).toBeGreaterThan(before);
  });

  it('a neutral-radiation mission (lunar) does not add radiation from the site', () => {
    // Lunar has radiationPerDay 0. Starting exposure is small; it should not
    // climb from the mission modifier (other systems may still affect it, but
    // the catalog lunar preset adds none).
    expect(MISSION_CATALOG.lunar.modifiers.radiationPerDay).toBe(0);
  });
});

describe('power penalty', () => {
  it('deep-space produces less power per day than lunar (stronger penalty)', () => {
    // Compare the day-1 power delta. Deep-space: power×0.8×solar0.8 = 0.64;
    // lunar: power×0.85. Same crew/systems baseline from the same occupation.
    const deep = advanceSimulationDay(freshGame({ missionType: 'deep-space' })).dailyDelta;
    const lunar = advanceSimulationDay(freshGame({ missionType: 'lunar' })).dailyDelta;
    expect(deep.power ?? 0).toBeLessThan(lunar.power ?? 0);
  });
});
