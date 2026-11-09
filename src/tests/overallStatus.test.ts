/**
 * The dashboard shows one overall status: normal -> warning -> critical ->
 * emergency -> death. It must follow the engine's own metric levels.
 */
import { describe, expect, it } from 'vitest';
import { calculateOverallStatus } from '../features/simulation/simulationSelectors';
import { METRIC_THRESHOLDS } from '../features/mission/missionDefaults';
import type { GameState } from '../features/simulation/simulationTypes';
import { freshGame, withActiveEvent } from './helpers';

function calm(): GameState {
  const base = freshGame();
  return {
    ...base,
    resources: { power: 80, water: 80, food: 80, oxygen: 80 },
    crew: { health: 90, morale: 90, radiationExposure: 5 },
  };
}

describe('calculateOverallStatus', () => {
  it('is normal when every reading is stable', () => {
    expect(calculateOverallStatus(calm()).id).toBe('normal');
  });

  it('is warning when a resource drops to the warning level', () => {
    const state = calm();
    const status = calculateOverallStatus({ ...state, resources: { ...state.resources, food: METRIC_THRESHOLDS.warn } });
    expect(status.id).toBe('warning');
    expect(status.detail).toContain('Food');
  });

  it('is critical when a resource drops to the critical level', () => {
    const state = calm();
    const status = calculateOverallStatus({
      ...state,
      resources: { ...state.resources, oxygen: METRIC_THRESHOLDS.critical },
    });
    expect(status.id).toBe('critical');
    expect(status.detail).toContain('Oxygen');
  });

  it('treats high radiation as a problem, not low radiation', () => {
    const state = calm();
    expect(calculateOverallStatus({ ...state, crew: { ...state.crew, radiationExposure: 95 } }).id).toBe('critical');
    expect(calculateOverallStatus({ ...state, crew: { ...state.crew, radiationExposure: 0 } }).id).toBe('normal');
  });

  it('is emergency while a critical event waits for a response', () => {
    const state = withActiveEvent(calm(), 'solar-storm');
    const urgent = state.activeEvents.some((e) => e.severity === 'critical' || e.severity === 'major');
    expect(urgent).toBe(true);
    expect(calculateOverallStatus(state).id).toBe('emergency');
  });

  it('is death once the mission has failed, whatever else is true', () => {
    const state = calm();
    const failed: GameState = { ...state, mission: { ...state.mission, status: 'failed' } };
    expect(calculateOverallStatus(failed).id).toBe('death');
    expect(calculateOverallStatus(withActiveEvent(failed, 'solar-storm')).id).toBe('death');
  });

  it('reports a completed mission as normal', () => {
    const state = calm();
    const done: GameState = { ...state, mission: { ...state.mission, status: 'completed' } };
    expect(calculateOverallStatus(done).id).toBe('normal');
  });
});
