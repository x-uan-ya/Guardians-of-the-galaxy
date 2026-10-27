/**
 * occupations.test.ts
 * -------------------
 * Covers the solo occupation-based character system:
 *  - each occupation creates the correct starting character,
 *  - occupation passives affect the intended mechanic,
 *  - death ends the run and blocks further normal updates,
 *  - starting a new run resets temporary state and allows a different occupation.
 *
 * Deterministic: fixed gameId + now via freshGame().
 */

import { describe, expect, it } from 'vitest';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  getGameOverReason,
  isGameOver,
  InvalidDecisionError,
  validateGameState,
} from '../features/simulation/simulationEngine';
import { OCCUPATION_CATALOG } from '../features/mission/occupations';
import { OCCUPATIONS, type GameState } from '../features/simulation/simulationTypes';
import { advanceTestDay, FIXED_CONFIG, freshGame } from './helpers';

/** Advance N days, returning the final state. */
function advanceDays(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = advanceTestDay(s).state;
  return s;
}

describe('starting character per occupation', () => {
  it('seeds attributes + starting health from the catalog for every occupation', () => {
    for (const occ of OCCUPATIONS) {
      const state = freshGame({ occupation: occ });
      const def = OCCUPATION_CATALOG[occ];

      expect(state.character.occupation).toBe(occ);
      expect(state.character.attributes).toEqual(def.attributes);
      // Live starting health equals the character's health attribute.
      expect(state.crew.health).toBe(def.attributes.health);
      // Still a structurally valid state.
      expect(validateGameState(state).valid).toBe(true);
    }
  });

  it('gives occupations distinct attribute spreads', () => {
    const engineer = freshGame({ occupation: 'engineer' }).character.attributes;
    const scientist = freshGame({ occupation: 'scientist' }).character.attributes;
    expect(engineer.technical).toBeGreaterThan(scientist.technical);
    expect(scientist.intelligence).toBeGreaterThan(engineer.intelligence);
  });
});

describe('occupation passives affect the intended mechanic', () => {
  it('engineer maintains systems better than the botanist over time', () => {
    // Compare average system efficiency after several days. The engineer's
    // Master Technician passive slows/reverses system wear.
    const engineerEnd = advanceDays(freshGame({ occupation: 'engineer' }), 8);
    const botanistEnd = advanceDays(freshGame({ occupation: 'botanist' }), 8);

    const avg = (s: GameState): number =>
      (s.systems.powerGeneration +
        s.systems.lifeSupportEfficiency +
        s.systems.foodProduction +
        s.systems.shieldingIntegrity) /
      4;

    expect(avg(engineerEnd)).toBeGreaterThan(avg(botanistEnd));
  });

  it('botanist produces more food per day than the engineer (same conditions)', () => {
    const engineerDelta = advanceSimulationDay(freshGame({ occupation: 'engineer' })).dailyDelta;
    const botanistDelta = advanceSimulationDay(freshGame({ occupation: 'botanist' })).dailyDelta;
    expect(botanistDelta.food ?? 0).toBeGreaterThan(engineerDelta.food ?? 0);
  });

  it('scientist accrues mission score faster than the engineer', () => {
    const scientistEnd = advanceDays(freshGame({ occupation: 'scientist' }), 5);
    const engineerEnd = advanceDays(freshGame({ occupation: 'engineer' }), 5);
    expect(scientistEnd.mission.score).toBeGreaterThan(engineerEnd.mission.score);
  });

  it('medical officer recovers health on a stable day; others do not', () => {
    // Start both at a reduced-but-safe health so recovery is observable and not
    // clamped at 100. We lower crew.health directly (allowed in a test fixture).
    const lowerHealth = (s: GameState): GameState => ({
      ...s,
      crew: { ...s.crew, health: 50 },
    });

    const medic = advanceSimulationDay(lowerHealth(freshGame({ occupation: 'medicalOfficer' }))).state;
    const engineer = advanceSimulationDay(lowerHealth(freshGame({ occupation: 'engineer' }))).state;

    expect(medic.crew.health).toBeGreaterThan(50); // healed
    expect(engineer.crew.health).toBe(50); // no passive healing
  });
});

describe('death ends the run and blocks further updates', () => {
  // Force death by zeroing health in a fixture, then recompute via a no-op-ish
  // advance. We drive health to 0 through the engine by applying a decision is
  // not possible directly, so we set it on a fixture and advance one day.
  function killCharacter(state: GameState): GameState {
    return { ...state, crew: { ...state.crew, health: 0 } };
  }

  it('marks the run failed and reports character-died when health is 0', () => {
    const dying = killCharacter(freshGame({ occupation: 'engineer' }));
    // Advancing recomputes mission status from metrics.
    const after = advanceSimulationDay(dying).state;
    expect(after.mission.status).toBe('failed');
    expect(isGameOver(after)).toBe(true);
    expect(getGameOverReason(after)).toBe('character-died');
  });

  it('blocks advancing and decisions after death', () => {
    const dying = killCharacter(freshGame({ occupation: 'engineer' }));
    const dead = advanceSimulationDay(dying).state; // -> failed
    expect(dead.mission.status).toBe('failed');

    // advanceSimulationDay is a no-op on terminal state.
    const advancedAgain = advanceSimulationDay(dead);
    expect(advancedAgain.state).toBe(dead);
    expect(advancedAgain.state.day).toBe(dead.day);

    // applyPlayerDecision throws on terminal state.
    expect(() =>
      applyPlayerDecision(dead, { actionId: 'routine-operations', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });
});

describe('new run resets temporary state and allows a different occupation', () => {
  it('creating a fresh run with a different occupation resets day/history/health', () => {
    // Play a run as engineer for a few days + a decision.
    let run = freshGame({ occupation: 'engineer' });
    run = applyPlayerDecision(run, { actionId: 'ration-supplies', playerChoice: 'self-directed' });
    run = advanceDays(run, 3);
    expect(run.day).toBeGreaterThan(1);
    expect(run.history.length).toBeGreaterThan(0);

    // Start a brand-new run as a scientist (same engine entry point the hook uses).
    const fresh = createInitialGameState({ ...FIXED_CONFIG, occupation: 'scientist', gameId: 'run-2' });
    expect(fresh.character.occupation).toBe('scientist');
    expect(fresh.day).toBe(1);
    expect(fresh.history).toHaveLength(0);
    expect(fresh.pendingEffects).toHaveLength(0);
    expect(fresh.mission.status).toBe('active');
    expect(fresh.crew.health).toBe(OCCUPATION_CATALOG.scientist.attributes.health);
  });
});
