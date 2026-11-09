/**
 * Consequences that fire must be remembered by the engine and shown on the
 * decision timeline as their own rows, linked to the decision that caused them.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_CATALOG } from '../features/events/eventCatalog';
import { buildEnhancedTimeline } from '../features/debrief/timeline/timelineBuilder';
import { validateGameState } from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { advanceSimulationDay, resolveEvent } from '../features/simulation/simulationEngine';
import { freshGame, withActiveEvent } from './helpers';

/** The first catalog action with a delayed effect that is not about ending the mission. */
function findDelayedChoice() {
  for (const event of EVENT_CATALOG) {
    for (const action of event.availableActions) {
      const delayed = action.effect.delayed?.find((d) => d.parameters.kind !== 'status');
      if (delayed) return { event, action, delayed };
    }
  }
  throw new Error('No catalog action with a delayed effect was found.');
}

/** Resolve the event, then advance until the effect has fired (or give up). */
function playUntilFired(): { state: GameState; delayInDays: number; description: string; actionLabel: string; eventId: string } {
  const { event, action, delayed } = findDelayedChoice();
  let state = withActiveEvent(freshGame(), event.id);
  state = { ...state, resources: { power: 80, water: 80, food: 80, oxygen: 80 } };
  state = resolveEvent(state, event.id, action.id);
  for (let i = 0; i < delayed.delayInDays + 1 && (state.firedEffects ?? []).length === 0; i += 1) {
    state = advanceSimulationDay(state).state;
    while (state.activeEvents.length > 0) {
      const next = state.activeEvents[0]!;
      state = resolveEvent(state, next.id, next.availableActions[0]!.id);
    }
  }
  return {
    state,
    delayInDays: delayed.delayInDays,
    description: delayed.description,
    actionLabel: action.label,
    eventId: event.id,
  };
}

describe('fired effects log', () => {
  it('starts empty and stays empty until something fires', () => {
    const state = freshGame();
    expect(state.firedEffects ?? []).toEqual([]);
    expect(buildEnhancedTimeline(state).some((e) => e.kind === 'effect')).toBe(false);
  });

  it('records each effect once, on the Sol it fired, and removes it from pending', () => {
    const { state, delayInDays, description } = playUntilFired();
    const fired = (state.firedEffects ?? []).filter((e) => e.description === description);
    expect(fired).toHaveLength(1);
    expect(fired[0]!.firedDay).toBeGreaterThanOrEqual(fired[0]!.scheduledDay);
    expect(fired[0]!.scheduledDay).toBeGreaterThan(0);
    expect(delayInDays).toBeGreaterThan(0);
    expect(state.pendingEffects.some((e) => e.id === fired[0]!.id)).toBe(false);
  });

  it('shows up as a timeline row linked to the causing decision', () => {
    const { state, description, actionLabel } = playUntilFired();
    const rows = buildEnhancedTimeline(state).filter((e) => e.kind === 'effect');
    const row = rows.find((e) => e.kind === 'effect' && e.description === description);
    expect(row).toBeDefined();
    if (row?.kind !== 'effect') throw new Error('expected an effect row');
    expect(row.cause?.actionLabel).toBe(actionLabel);
    expect(row.day).toBe(state.firedEffects!.find((e) => e.description === description)!.firedDay);
  });

  it('is ordered between earlier decisions and the decisions of its own Sol', () => {
    const { state } = playUntilFired();
    const timeline = buildEnhancedTimeline(state);
    const days = timeline.map((e) => e.day);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('keeps the save format valid, and old saves without the log still load', () => {
    const { state } = playUntilFired();
    expect(validateGameState(state).valid).toBe(true);
    const legacy: Partial<GameState> = { ...state };
    delete legacy.firedEffects;
    expect(validateGameState(legacy).valid).toBe(true);
    expect(buildEnhancedTimeline(legacy as GameState).some((e) => e.kind === 'effect')).toBe(false);
  });
});
