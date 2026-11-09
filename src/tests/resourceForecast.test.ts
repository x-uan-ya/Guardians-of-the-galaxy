/**
 * The dashboard's per-Sol production / consumption / days-remaining figures must
 * come from the engine's own daily calculation and never disagree with what a
 * Sol actually does.
 */
import { describe, expect, it } from 'vitest';
import {
  SHORTAGE_CRITICAL_SOLS,
  SHORTAGE_WARNING_SOLS,
  calculateResourceForecast,
} from '../features/simulation/resourceForecast';
import { advanceSimulationDay, projectDailyResources } from '../features/simulation/simulationEngine';
import { MISSION_TYPES, OCCUPATIONS, RESOURCE_KEYS, type GameState } from '../features/simulation/simulationTypes';
import { freshGame } from './helpers';

function withResources(state: GameState, resources: Partial<GameState['resources']>): GameState {
  return { ...state, resources: { ...state.resources, ...resources } };
}

describe('projectDailyResources', () => {
  it.each(
    MISSION_TYPES.flatMap((missionType) => OCCUPATIONS.map((occupation) => [missionType, occupation] as const))
  )('matches the change a Sol really applies (%s, %s)', (missionType, occupation) => {
    const state = freshGame({ missionType, occupation });
    const projected = projectDailyResources(state).dailyDelta;
    const advanced = advanceSimulationDay(state);
    expect(advanced.dailyDelta).toEqual(projected);
  });

  it('production minus consumption equals the net change', () => {
    for (const occupation of OCCUPATIONS) {
      const { production, consumption, dailyDelta } = projectDailyResources(freshGame({ occupation }));
      for (const key of RESOURCE_KEYS) {
        expect((production[key] ?? 0) - (consumption[key] ?? 0)).toBeCloseTo(dailyDelta[key] ?? 0, 1);
      }
    }
  });
});

describe('calculateResourceForecast', () => {
  it('does not change the state it is given', () => {
    const state = freshGame();
    const before = JSON.stringify(state);
    calculateResourceForecast(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('reports no shortage when a store is not running down', () => {
    const state = withResources(freshGame(), { power: 90, water: 90, food: 90, oxygen: 90 });
    const forecast = calculateResourceForecast(state);
    for (const key of RESOURCE_KEYS) {
      if (forecast[key].net >= 0) {
        expect(forecast[key].daysRemaining).toBeNull();
        expect(forecast[key].warning).toBeNull();
        expect(forecast[key].level).toBe('ok');
      }
    }
  });

  it('counts whole Sols until a falling store reaches zero', () => {
    const base = freshGame({ occupation: 'engineer' });
    // Force a clear deficit by emptying the greenhouse.
    const starved: GameState = { ...base, systems: { ...base.systems, foodProduction: 0 } };
    const forecast = calculateResourceForecast(withResources(starved, { food: 20 }));
    expect(forecast.food.net).toBeLessThan(0);
    expect(forecast.food.daysRemaining).toBe(Math.ceil(20 / -forecast.food.net));
  });

  it('warns "<Resource> shortage in N Sols" inside the warning window', () => {
    const base = freshGame({ occupation: 'engineer' });
    const starved: GameState = { ...base, systems: { ...base.systems, foodProduction: 0 } };
    const forecast = calculateResourceForecast(withResources(starved, { food: 30 }));
    const days = forecast.food.daysRemaining ?? 0;
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(SHORTAGE_WARNING_SOLS);
    expect(forecast.food.warning).toBe(`Food shortage in ${days} Sol${days === 1 ? '' : 's'}`);
    expect(forecast.food.level).toBe(days <= SHORTAGE_CRITICAL_SOLS ? 'critical' : 'warn');
  });

  it('is critical when a store is empty', () => {
    const state = withResources(freshGame(), { food: 0 });
    const forecast = calculateResourceForecast(state);
    expect(forecast.food.level).toBe('critical');
    expect(forecast.food.daysRemaining).toBe(0);
    expect(forecast.food.warning).toBe('Food has run out');
  });

  it('does not warn about a shortage that would arrive after the mission ends', () => {
    const base = freshGame({ occupation: 'engineer' });
    const starved: GameState = { ...base, day: 29, systems: { ...base.systems, foodProduction: 0 } };
    const forecast = calculateResourceForecast(withResources(starved, { food: 40 }));
    expect(forecast.food.daysRemaining).toBeGreaterThan(1);
    expect(forecast.food.warning).toBeNull();
  });
});
