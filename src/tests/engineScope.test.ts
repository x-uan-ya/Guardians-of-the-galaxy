/**
 * Simulation-engine scope checks: radiation and shielding, validation of
 * impossible actions, multi-Sol projects (delayed effects), the single turn
 * pathway, and death.
 */
import { describe, expect, it } from 'vitest';
import { PROJECT_ACTIONS } from '../features/events/projectActions';
import { calculatePowerDraw, calculateRadiationForecast } from '../features/simulation/resourceForecast';
import {
  BASELINE_SHIELDING,
  dailyRadiationDose,
  radiationHealthChange,
  radiationShieldingFactor,
  splitPowerDraw,
} from '../features/simulation/resourceCalculations';
import {
  InvalidDecisionError,
  advanceSimulationDay,
  applyPlayerDecision,
  getGameOverReason,
  isGameOver,
  processTurn,
  projectDailyResources,
  unavailableReason,
  getFreeActions,
} from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { freshGame, withActiveEvent } from './helpers';

function marsGame(overrides: Partial<GameState['resources']> = {}): GameState {
  const base = freshGame({ missionType: 'mars', occupation: 'engineer' });
  return { ...base, resources: { power: 60, water: 60, food: 60, oxygen: 60, ...overrides } };
}

function withSystems(state: GameState, systems: Partial<GameState['systems']>): GameState {
  return { ...state, systems: { ...state.systems, ...systems } };
}

function withCrew(state: GameState, crew: Partial<GameState['crew']>): GameState {
  return { ...state, crew: { ...state.crew, ...crew } };
}

const free = (id: string) => {
  const action = getFreeActions().find((a) => a.id === id);
  if (!action) throw new Error(`No free action ${id}`);
  return action;
};

describe('radiation and shielding', () => {
  it('lets the mission dose through unchanged while shielding is intact', () => {
    expect(radiationShieldingFactor(BASELINE_SHIELDING)).toBe(1);
    expect(radiationShieldingFactor(100)).toBe(1);
    expect(dailyRadiationDose(1.5, 95)).toBe(1.5);
  });

  it('lets more through as shielding is damaged, up to 3x', () => {
    expect(radiationShieldingFactor(63)).toBeCloseTo(2, 5);
    expect(dailyRadiationDose(1.5, 63)).toBeCloseTo(3, 5);
    expect(radiationShieldingFactor(0)).toBe(3);
  });

  it('adds no dose on a mission without radiation', () => {
    expect(dailyRadiationDose(0, 10)).toBe(0);
  });

  it('exposure builds up faster each Sol when shielding is damaged', () => {
    const intact = advanceSimulationDay(withSystems(marsGame(), { shieldingIntegrity: 95 })).state;
    const damaged = advanceSimulationDay(withSystems(marsGame(), { shieldingIntegrity: 40 })).state;
    expect(damaged.crew.radiationExposure).toBeGreaterThan(intact.crew.radiationExposure);
  });

  it('accumulates over Sols (cumulative exposure)', () => {
    let state = withSystems(marsGame(), { shieldingIntegrity: 60 });
    const start = state.crew.radiationExposure;
    for (let i = 0; i < 3; i += 1) {
      state = advanceSimulationDay(state).state;
      while (state.activeEvents.length > 0) {
        state = { ...state, activeEvents: [] };
      }
    }
    expect(state.crew.radiationExposure).toBeGreaterThan(start + 3);
  });

  it('has no health effect at low exposure, mild at the warning level, severe at the critical level', () => {
    expect(radiationHealthChange(10)).toBe(0);
    expect(radiationHealthChange(60)).toBe(-0.5);
    expect(radiationHealthChange(80)).toBe(-1.5);
  });

  it('wears health down each Sol when exposure is high', () => {
    const calm = advanceSimulationDay(withCrew(marsGame(), { radiationExposure: 10 })).state;
    const sick = advanceSimulationDay(withCrew(marsGame(), { radiationExposure: 85 })).state;
    expect(sick.crew.health).toBeLessThan(calm.crew.health);
  });

  it('ends the mission when exposure reaches the lethal level', () => {
    const state = advanceSimulationDay(withCrew(marsGame(), { radiationExposure: 99.5 })).state;
    expect(state.mission.status).toBe('failed');
    expect(getGameOverReason(state)).toBe('radiation-lethal');
  });
});

describe('validation', () => {
  it('rejects spending more than is in store, and changes nothing', () => {
    const state = marsGame({ power: 5 });
    const before = JSON.stringify(state);
    expect(unavailableReason(state, free('emergency-allocation'))).toMatch(/Not enough power/);
    expect(() =>
      applyPlayerDecision(state, { actionId: 'emergency-allocation', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects using more food or water than exists', () => {
    expect(() =>
      applyPlayerDecision(marsGame({ food: 1 }), { actionId: 'rest-and-recover', playerChoice: 'self-directed' })
    ).toThrow(/Not enough food/);
    expect(() =>
      applyPlayerDecision(marsGame({ water: 2 }), { actionId: 'plant-crops', playerChoice: 'self-directed' })
    ).toThrow(/Not enough water/);
  });

  it('cannot start a repair without enough power', () => {
    expect(() =>
      applyPlayerDecision(marsGame({ power: 3 }), { actionId: 'repair-generator', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });

  it('accepts the same action once there is enough', () => {
    expect(unavailableReason(marsGame({ power: 6 }), free('repair-generator'))).toBeNull();
    expect(unavailableReason(marsGame({ power: 5.9 }), free('repair-generator'))).not.toBeNull();
  });

  it('rejects an unknown action and an action that does not belong to the event', () => {
    expect(() => applyPlayerDecision(marsGame(), { actionId: 'nope', playerChoice: 'self-directed' })).toThrow(
      InvalidDecisionError
    );
    const withEvent = withActiveEvent(marsGame(), 'solar-storm');
    expect(() =>
      applyPlayerDecision(withEvent, { eventId: 'solar-storm', actionId: 'nope', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });

  it('rejects a free action while an event is waiting', () => {
    const withEvent = withActiveEvent(marsGame(), 'solar-storm');
    expect(() =>
      applyPlayerDecision(withEvent, { actionId: 'routine-operations', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });

  it('rejects any decision after the mission has ended', () => {
    const dead: GameState = { ...marsGame(), mission: { ...marsGame().mission, status: 'failed' } };
    expect(() =>
      applyPlayerDecision(dead, { actionId: 'routine-operations', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
    expect(unavailableReason(dead, free('routine-operations'))).toMatch(/over/);
  });
});

describe('multi-Sol projects (delayed effects)', () => {
  it('every project pays now and has a result that lands at least one Sol later', () => {
    for (const action of PROJECT_ACTIONS) {
      const spends = Object.values(action.effect.immediateResources ?? {}).some((v) => v < 0);
      expect(spends, `${action.id} costs something now`).toBe(true);
      expect((action.effect.delayed ?? []).length).toBeGreaterThan(0);
      for (const delayed of action.effect.delayed ?? []) {
        expect(delayed.delayInDays).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('a generator repair is not operational until 2 Sols later, then lands exactly once', () => {
    let state = withSystems(marsGame(), { powerGeneration: 50 });
    state = applyPlayerDecision(state, { actionId: 'repair-generator', playerChoice: 'self-directed' });
    expect(state.pendingEffects).toHaveLength(1);
    expect(state.pendingEffects[0]?.scheduledDay).toBe(state.day + 2);
    const startGeneration = state.systems.powerGeneration;

    state = advanceSimulationDay({ ...state, activeEvents: [] }).state; // Sol +1: nothing yet
    expect(state.pendingEffects).toHaveLength(1);
    const midGeneration = state.systems.powerGeneration;
    expect(midGeneration).toBeLessThanOrEqual(startGeneration + 5);

    state = advanceSimulationDay({ ...state, activeEvents: [] }).state; // Sol +2: repair done
    expect(state.pendingEffects).toHaveLength(0);
    expect(state.systems.powerGeneration).toBeGreaterThan(midGeneration + 8);
    expect((state.firedEffects ?? []).filter((e) => /repair/i.test(e.description))).toHaveLength(1);

    state = advanceSimulationDay({ ...state, activeEvents: [] }).state; // never fires twice
    expect((state.firedEffects ?? []).filter((e) => /repair/i.test(e.description))).toHaveLength(1);
  });

  it('cannot be started twice while it is still in progress, but can be started again afterwards', () => {
    let state = marsGame({ power: 80 });
    state = applyPlayerDecision(state, { actionId: 'reinforce-shielding', playerChoice: 'self-directed' });
    expect(() =>
      applyPlayerDecision(state, { actionId: 'reinforce-shielding', playerChoice: 'self-directed' })
    ).toThrow(/already in progress/);
    expect(unavailableReason(state, free('reinforce-shielding'))).toMatch(/already in progress/);

    for (let i = 0; i < 3; i += 1) state = advanceSimulationDay({ ...state, activeEvents: [] }).state;
    expect(state.pendingEffects.filter((e) => /Shielding/.test(e.description))).toHaveLength(0);
    expect(unavailableReason({ ...state, resources: { ...state.resources, power: 80 } }, free('reinforce-shielding'))).toBeNull();
  });

  it('crops take 3 Sols and then add food', () => {
    let state = marsGame({ water: 60, food: 40 });
    state = applyPlayerDecision(state, { actionId: 'plant-crops', playerChoice: 'self-directed' });
    const foodBefore = state.resources.food;
    for (let i = 0; i < 2; i += 1) state = advanceSimulationDay({ ...state, activeEvents: [] }).state;
    expect(state.pendingEffects.length).toBeGreaterThan(0);
    state = advanceSimulationDay({ ...state, activeEvents: [] }).state;
    expect(state.pendingEffects.filter((e) => /crop|greenhouse/i.test(e.description))).toHaveLength(0);
    expect(state.resources.food).toBeGreaterThan(foodBefore - 6 * 3 + 6);
  });

  it('reinforced shielding cuts the radiation that reaches the crew', () => {
    const damaged = withSystems(marsGame({ power: 80 }), { shieldingIntegrity: 50 });
    let plain = damaged;
    let reinforced = applyPlayerDecision(damaged, { actionId: 'reinforce-shielding', playerChoice: 'self-directed' });
    for (let i = 0; i < 6; i += 1) {
      plain = advanceSimulationDay({ ...plain, activeEvents: [] }).state;
      reinforced = advanceSimulationDay({ ...reinforced, activeEvents: [] }).state;
    }
    expect(reinforced.systems.shieldingIntegrity).toBeGreaterThan(plain.systems.shieldingIntegrity);
    expect(reinforced.crew.radiationExposure).toBeLessThan(plain.crew.radiationExposure);
  });
});

describe('processTurn: the single pathway', () => {
  it('validates, applies the decision, advances the Sol and fires effects in one call', () => {
    const state = marsGame();
    const result = processTurn(state, { actionId: 'ration-supplies', playerChoice: 'self-directed' });
    expect(result.decision?.actionId).toBe('ration-supplies');
    expect(result.state.day).toBe(state.day + 1);
    expect(result.state.history).toHaveLength(1);
    expect(result.dailyDelta).toBeDefined();
  });

  it('matches doing the two steps by hand', () => {
    const state = marsGame();
    const input = { actionId: 'maintenance-shift', playerChoice: 'self-directed' } as const;
    const viaTurn = processTurn(state, input).state;
    const byHand = advanceSimulationDay(applyPlayerDecision(state, input)).state;
    expect(viaTurn).toEqual(byHand);
  });

  it('can end the Sol without a decision', () => {
    const state = marsGame();
    const result = processTurn(state);
    expect(result.decision).toBeNull();
    expect(result.state.day).toBe(state.day + 1);
    expect(result.state.history).toHaveLength(0);
  });

  it('does not advance the Sol when the decision is rejected', () => {
    const state = marsGame({ power: 2 });
    const before = JSON.stringify(state);
    expect(() => processTurn(state, { actionId: 'emergency-allocation', playerChoice: 'self-directed' })).toThrow(
      InvalidDecisionError
    );
    expect(JSON.stringify(state)).toBe(before);
  });

  it('refuses to advance while an event still waits for a response', () => {
    const state = withActiveEvent(marsGame(), 'solar-storm');
    expect(() => processTurn(state)).toThrow(InvalidDecisionError);
  });

  it('refuses a turn once the mission is over', () => {
    const over: GameState = { ...marsGame(), mission: { ...marsGame().mission, status: 'completed' } };
    expect(() => processTurn(over)).toThrow(InvalidDecisionError);
  });
});

describe('death', () => {
  it('health at zero kills the character, ends the mission and blocks further play', () => {
    const state = applyPlayerDecision(withCrew(marsGame(), { health: 0.5 }), {
      actionId: 'routine-operations',
      playerChoice: 'self-directed',
    });
    // Starve the crew so the next Sol takes the last of their health.
    const dying = advanceSimulationDay(
      withCrew({ ...state, resources: { ...state.resources, food: 0, water: 0 } }, { health: 1 })
    ).state;
    expect(dying.crew.health).toBe(0);
    expect(dying.mission.status).toBe('failed');
    expect(isGameOver(dying)).toBe(true);
    expect(getGameOverReason(dying)).toBe('character-died');
    expect(() => processTurn(dying)).toThrow(InvalidDecisionError);
    expect(() =>
      applyPlayerDecision(dying, { actionId: 'routine-operations', playerChoice: 'self-directed' })
    ).toThrow(InvalidDecisionError);
  });

  it('running out of oxygen also ends the mission', () => {
    const state = advanceSimulationDay(
      withSystems({ ...marsGame({ oxygen: 1 }) }, { lifeSupportEfficiency: 0 })
    ).state;
    expect(state.mission.status).toBe('failed');
    expect(getGameOverReason(state)).toBe('oxygen-depleted');
  });
});

describe('power balance and radiation readouts', () => {
  it('splits the power use by consumer, and the parts add up to the total used', () => {
    const state = marsGame();
    const { consumption, powerDraw } = projectDailyResources(state);
    const sum = powerDraw.lifeSupport + powerDraw.foodSystems + powerDraw.equipment + powerDraw.emergency;
    expect(sum).toBeCloseTo(consumption.power, 5);
    expect(splitPowerDraw(9)).toEqual({ lifeSupport: 3.6, foodSystems: 1.8, equipment: 2.7, emergency: 0.9 });
    expect(calculatePowerDraw(state)).toEqual(powerDraw);
  });

  it('power balance is generated minus consumed', () => {
    const state = marsGame();
    const { production, consumption, dailyDelta } = projectDailyResources(state);
    expect(production.power - consumption.power).toBeCloseTo(dailyDelta.power ?? 0, 1);
  });

  it('reports the radiation dose, sickness and time to a lethal dose', () => {
    const state = withCrew(withSystems(marsGame(), { shieldingIntegrity: 63 }), { radiationExposure: 70 });
    const r = calculateRadiationForecast(state);
    // The engine applies the day's upkeep to shielding before working out the dose.
    const projectedShielding = projectDailyResources(state).systems.shieldingIntegrity;
    expect(r.doseMultiplier).toBeCloseTo(radiationShieldingFactor(projectedShielding), 5);
    expect(r.doseMultiplier).toBeGreaterThan(1.8);
    expect(r.dosePerSol).toBeCloseTo(1.5 * r.doseMultiplier, 1);
    expect(r.healthPerSol).toBe(-0.5);
    expect(r.solsToLethal).toBe(Math.ceil(30 / r.dosePerSol));
  });

  it('reports no lethal countdown on a mission without radiation', () => {
    const state = freshGame({ missionType: 'lunar' });
    const r = calculateRadiationForecast(state);
    expect(r.dosePerSol).toBe(0);
    expect(r.solsToLethal).toBeNull();
  });
});
