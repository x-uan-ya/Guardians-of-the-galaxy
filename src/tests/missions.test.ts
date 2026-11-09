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
import {
  advanceSimulationDay,
  createInitialGameState,
  RESUPPLY_AMOUNT,
  resolveEvent,
  validateGameState,
} from '../features/simulation/simulationEngine';
import { MISSION_CATALOG } from '../features/mission/missions';
import { MISSION_TYPES, type GameState } from '../features/simulation/simulationTypes';
import { advanceTestDay, FIXED_CONFIG, freshGame } from './helpers';
import { applyResourceChanges } from '../features/simulation/resourceCalculations';

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
  it('does not grant resources on Sol 1 or Sol 15', () => {
    let state = createInitialGameState({ ...FIXED_CONFIG, missionType: 'deep-space' });
    const sol1Event = state.activeEvents[0]!;
    state = resolveEvent(state, sol1Event.id, sol1Event.availableActions[0]!.id);
    const beforeSol2 = state.resources;
    const sol2 = advanceSimulationDay(state);
    expect(sol2.resupplyFired).toBe(false);
    expect(sol2.state.mission.resupplyDelivered).toBe(false);
    expect(sol2.state.resources).toEqual(applyResourceChanges(beforeSol2, sol2.dailyDelta));

    state = {
      ...freshGame({ missionType: 'deep-space' }),
      day: 14,
      activeEvents: [],
      resources: { power: 40, water: 40, food: 40, oxygen: 40 },
      crew: { health: 90, morale: 80, radiationExposure: 0 },
    };
    const beforeSol15 = state.resources;
    const sol15 = advanceSimulationDay(state);
    expect(sol15.state.day).toBe(15);
    expect(sol15.resupplyFired).toBe(false);
    expect(sol15.state.mission.resupplyDelivered).toBe(false);
    expect(sol15.state.resources).toEqual(applyResourceChanges(beforeSol15, sol15.dailyDelta));
    expect(sol15.state.activeEvents[0]?.id).toBe('story-sol-15-no-resupply-isolation-test');
  });

  it('never delivers the Sol-15 resupply', () => {
    let state = keepAlive(freshGame({ missionType: 'deep-space' }));
    let anyResupply = false;
    for (let i = 0; i < 20 && state.mission.status !== 'completed'; i++) {
      state = keepAlive(state);
      const res = advanceTestDay(state);
      if (res.resupplyFired) anyResupply = true;
      state = res.state;
    }
    expect(anyResupply).toBe(false);
    expect(state.mission.resupplyDelivered).toBe(false);
  });
});

describe('resupply delivery by mission', () => {
  it('delivers +25 once on Sol 15 for Lunar and Mars, not again after acknowledgement', () => {
    for (const missionType of ['lunar', 'mars'] as const) {
      const state: GameState = {
        ...freshGame({ missionType }),
        day: 14,
        activeEvents: [],
        resources: { power: 40, water: 40, food: 40, oxygen: 40 },
        crew: { health: 90, morale: 80, radiationExposure: 0 },
      };
      const before = state.resources;
      const arrival = advanceSimulationDay(state);
      expect(arrival.resupplyFired).toBe(true);
      expect(arrival.state.mission.resupplyDelivered).toBe(true);
      expect(arrival.state.resources).toEqual(
        applyResourceChanges(
          applyResourceChanges(before, arrival.dailyDelta),
          { power: RESUPPLY_AMOUNT, water: RESUPPLY_AMOUNT, food: RESUPPLY_AMOUNT, oxygen: RESUPPLY_AMOUNT }
        )
      );

      const acknowledgment = arrival.state.activeEvents[0]!;
      const resolved = resolveEvent(arrival.state, acknowledgment.id, acknowledgment.availableActions[0]!.id);
      expect(resolved.resources).toEqual(arrival.state.resources);
      const nextDay = advanceSimulationDay(resolved);
      expect(nextDay.resupplyFired).toBe(false);
      expect(nextDay.state.mission.resupplyDelivered).toBe(true);
    }
  });
});

describe('radiation hazard (mars)', () => {
  it('raises radiation exposure over several sols', () => {
    let state = freshGame({ missionType: 'mars' });
    const before = state.crew.radiationExposure;
    for (let i = 0; i < 5; i++) {
      state = keepAlive(state);
      state = advanceTestDay(state).state;
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

  it('applies power penalties to gross generation even when net power is negative', () => {
    const stateFor = (missionType: 'mars' | 'lunar' | 'deep-space') => ({
      ...freshGame({ missionType, occupation: 'scientist' }),
      resources: { power: 50, water: 50, food: 50, oxygen: 50 },
      crew: { health: 90, morale: 100, radiationExposure: 0 },
      systems: {
        powerGeneration: 50,
        lifeSupportEfficiency: 80,
        foodProduction: 80,
        shieldingIntegrity: 80,
      },
    });

    const mars = advanceSimulationDay(stateFor('mars')).dailyDelta.power;
    const lunar = advanceSimulationDay(stateFor('lunar')).dailyDelta.power;
    const deepSpace = advanceSimulationDay(stateFor('deep-space')).dailyDelta.power;

    // Mission factors scale power-system output but not the 9-point drain.
    expect(mars ?? 0).toBeCloseTo((50 / 100) * 12 * 0.92 - 9);
    expect(lunar ?? 0).toBeCloseTo((50 / 100) * 12 * 0.85 - 9);
    expect(deepSpace ?? 0).toBeCloseTo((50 / 100) * 12 * 0.8 * 0.8 - 9);
    expect(mars ?? 0).toBeLessThan(-3);
    expect(lunar ?? 0).toBeLessThan(mars ?? 0);
    expect(deepSpace ?? 0).toBeLessThan(lunar ?? 0);
  });

  it('applies the mission power factor to occupation production bonuses', () => {
    const stateFor = (missionType: 'mars' | 'lunar' | 'deep-space') => ({
      ...freshGame({ missionType, occupation: 'pilot' }),
      resources: { power: 50, water: 50, food: 50, oxygen: 50 },
      crew: { health: 90, morale: 100, radiationExposure: 0 },
      systems: {
        powerGeneration: 0,
        lifeSupportEfficiency: 80,
        foodProduction: 80,
        shieldingIntegrity: 80,
      },
    });

    // Pilot power output is 2.5 points/Sol. It is scaled alongside system
    // output, while the 9-point baseline consumption remains unchanged.
    const mars = advanceSimulationDay(stateFor('mars')).dailyDelta.power;
    const lunar = advanceSimulationDay(stateFor('lunar')).dailyDelta.power;
    const deepSpace = advanceSimulationDay(stateFor('deep-space')).dailyDelta.power;

    expect(mars ?? 0).toBeCloseTo(2.5 * 0.92 - 9);
    expect(lunar ?? 0).toBeCloseTo(2.5 * 0.85 - 9);
    expect(deepSpace ?? 0).toBeCloseTo(2.5 * 0.8 * 0.8 - 9);
  });
});
