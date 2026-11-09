/**
 * storage.test.ts
 * ---------------
 * Covers persistence safety (spec 9): invalid saved data is handled safely, and
 * a valid save round-trips. Uses jsdom's localStorage.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAPTER_INTRODUCTIONS_KEY,
  STORAGE_KEY,
  clearGame,
  completeChapterIntroduction,
  loadCompletedChapterIntroductions,
  loadGame,
  saveGame,
} from '../lib/storage';
import { parseGameState } from '../lib/validation';
import { freshGame, withActiveEvent } from './helpers';
import { chapter2EventForDay, chapter3EventForDay } from '../features/events/eventTriggers';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  getGameOverReason,
  resolveEvent,
} from '../features/simulation/simulationEngine';
import type { MissionType } from '../features/simulation/simulationTypes';

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadGame / saveGame round trip', () => {
  it('saves a valid game and loads it back', () => {
    const state = freshGame();
    const saveResult = saveGame(state);
    expect(saveResult.status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status === 'loaded') {
      expect(loaded.state.gameId).toBe(state.gameId);
      expect(loaded.state.day).toBe(state.day);
    }
  });

  it('preserves a completed mission and its debrief data after restoring', () => {
    let state = applyPlayerDecision(freshGame(), {
      actionId: 'routine-operations',
      playerChoice: 'self-directed',
    });
    state = {
      ...state,
      day: 29,
      activeEvents: [],
      mission: { ...state.mission, status: 'active' },
    };
    const completed = advanceSimulationDay(state).state;

    expect(completed.mission.status).toBe('completed');
    expect(saveGame(completed).status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.mission.status).toBe('completed');
    expect(loaded.state.mission.score).toBe(completed.mission.score);
    expect(loaded.state.resources).toEqual(completed.resources);
    expect(loaded.state.history).toEqual(completed.history);
  });

  it('preserves a failed mission and its debrief data after restoring', () => {
    const base = freshGame();
    const withHistory = applyPlayerDecision(base, {
      actionId: 'routine-operations',
      playerChoice: 'self-directed',
    });
    const atSol29 = {
      ...withHistory,
      day: 29,
      resources: { ...withHistory.resources, oxygen: 0.1 },
      systems: { ...withHistory.systems, lifeSupportEfficiency: 0 },
      activeEvents: [],
      mission: { ...withHistory.mission, status: 'active' as const },
    };
    const failed = advanceSimulationDay(atSol29).state;

    expect(failed.mission.status).toBe('failed');
    expect(getGameOverReason(failed)).toBe('oxygen-depleted');
    expect(saveGame(failed).status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.mission.status).toBe('failed');
    expect(getGameOverReason(loaded.state)).toBe('oxygen-depleted');
    expect(loaded.state.mission.score).toBe(failed.mission.score);
    expect(loaded.state.resources).toEqual(failed.resources);
    expect(loaded.state.history).toEqual(failed.history);
  });

  it('restores location-specific active event content and resolves its saved choice', () => {
    const locations: MissionType[] = ['lunar', 'mars', 'deep-space'];

    for (const missionType of locations) {
      const state = createInitialGameState({
        missionType,
        occupation: 'engineer',
        objective: 'survival',
        operatingPhilosophy: 'balanced',
        startingCondition: 'standard',
        gameId: `save-${missionType}`,
        now: 1_700_000_000_000,
      });
      expect(saveGame(state).status).toBe('saved');

      const loaded = loadGame();
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') return;
      expect(loaded.state.activeEvents[0]?.description).toBe(
        state.activeEvents[0]?.description
      );
      expect(loaded.state.activeEvents[0]?.availableActions.map((action) => action.id)).toEqual(
        state.activeEvents[0]?.availableActions.map((action) => action.id)
      );

      const resolved = resolveEvent(
        loaded.state,
        'story-sol-01-supply-inspection',
        'story-sol-01-begin'
      );
      expect(resolved.history).toHaveLength(1);
      expect(resolved.pendingEffects).toHaveLength(1);
      expect(resolved.pendingEffects[0]?.sourceDecisionId).toBe(resolved.history[0]?.id);
    }
  });

  it('restores and resolves a saved active Chapter 2 event', () => {
    const base = freshGame({ missionType: 'deep-space' });
    const withoutEvent = { ...base, day: 6, activeEvents: [] };
    const event = chapter2EventForDay(6, withoutEvent);
    expect(event).toBeDefined();
    const state = { ...withoutEvent, activeEvents: [event!] };
    expect(saveGame(state).status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.activeEvents[0]?.description).toBe(event?.description);
    expect(loaded.state.activeEvents[0]?.availableActions.map((action) => action.id)).toEqual(
      event?.availableActions.map((action) => action.id)
    );

    const resolved = resolveEvent(
      loaded.state,
      'story-sol-06-aftermath-assessment',
      'story-sol-06-prioritise-maintenance'
    );
    expect(resolved.history[0]).toMatchObject({
      eventId: 'story-sol-06-aftermath-assessment',
      actionId: 'story-sol-06-prioritise-maintenance',
    });
    expect(resolved.systems.powerGeneration).toBe(base.systems.powerGeneration + 2);
    expect(resolved.systems.lifeSupportEfficiency).toBe(base.systems.lifeSupportEfficiency + 3);
  });

  it('restores and resolves the saved Deep Space Sol 15 event with its stored effects', () => {
    const base = freshGame({ missionType: 'deep-space' });
    const atMidpoint = { ...base, day: 15, activeEvents: [] };
    const event = chapter3EventForDay(15, atMidpoint);
    expect(event?.id).toBe('story-sol-15-no-resupply-isolation-test');
    const state = { ...atMidpoint, activeEvents: [event!] };
    expect(saveGame(state).status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.activeEvents[0]?.description).toBe(event?.description);

    const resolved = resolveEvent(
      loaded.state,
      event!.id,
      'story-sol-15-recover-emergency-equipment'
    );
    expect(resolved.history[0]).toMatchObject({
      eventId: 'story-sol-15-no-resupply-isolation-test',
      actionId: 'story-sol-15-recover-emergency-equipment',
    });
    expect(resolved.resources).toMatchObject({
      water: base.resources.water + 5,
      oxygen: base.resources.oxygen + 5,
    });
    expect(resolved.pendingEffects[0]?.parameters).toEqual({
      kind: 'system',
      changes: { lifeSupportEfficiency: -3 },
    });
  });

  it('continues decision IDs uniquely after restoring a saved history', () => {
    let state = withActiveEvent(freshGame(), 'story-sol-01-supply-inspection');
    state = resolveEvent(state, 'story-sol-01-supply-inspection', 'story-sol-01-begin');
    const processedEffectId = state.pendingEffects[0]!.id;
    state = advanceSimulationDay(state).state;
    state = resolveEvent(state, 'story-sol-02-water-recycling', 'story-sol-02-repair');
    const sol3Advance = advanceSimulationDay(state);
    expect(sol3Advance.firedEffects.map((effect) => effect.id)).toEqual([processedEffectId]);
    state = sol3Advance.state;
    expect(state.pendingEffects).toHaveLength(0);
    expect(saveGame(state).status).toBe('saved');

    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.history).toEqual(state.history);
    expect(loaded.state.pendingEffects).toHaveLength(0);

    const next = resolveEvent(loaded.state, 'story-sol-03-power-instability', 'story-sol-03-bypass');
    const decisionIds = next.history.map((record) => record.id);
    expect(next.history).toHaveLength(3);
    expect(new Set(decisionIds).size).toBe(3);
    expect(next.pendingEffects).toHaveLength(1);
    expect(next.pendingEffects[0]!.id).not.toBe(processedEffectId);
    expect(decisionIds[2]).not.toBe(decisionIds[1]);
  });

  it('reports empty when nothing is stored', () => {
    expect(loadGame().status).toBe('empty');
  });
});

describe('chapter introduction progress', () => {
  it('persists completed chapters by playthrough and restores them with the saved game', () => {
    const state = freshGame({ gameId: 'intro-save-restore' });
    expect(saveGame(state).status).toBe('saved');
    expect(completeChapterIntroduction(state.gameId, 1)).toBe(true);

    const restored = loadGame();
    expect(restored.status).toBe('loaded');
    expect(loadCompletedChapterIntroductions(state.gameId)).toEqual([1]);
    expect(loadCompletedChapterIntroductions('a-different-run')).toEqual([]);
  });

  it('allows the same chapter introduction in a restarted run with a new gameId', () => {
    const original = createInitialGameState({
      missionType: 'mars',
      occupation: 'engineer',
      objective: 'survival',
      operatingPhilosophy: 'balanced',
      startingCondition: 'standard',
      gameId: 'intro-original-run',
    });
    const restarted = createInitialGameState({
      missionType: original.mission.missionType,
      occupation: original.character.occupation,
      objective: original.mission.objective,
      operatingPhilosophy: original.mission.operatingPhilosophy,
      startingCondition: original.mission.startingCondition,
      gameId: 'intro-restarted-run',
    });

    expect(completeChapterIntroduction(original.gameId, 1)).toBe(true);
    expect(loadCompletedChapterIntroductions(original.gameId)).toEqual([1]);
    expect(loadCompletedChapterIntroductions(restarted.gameId)).toEqual([]);
  });

  it('keeps progress separate from the simulation save and safely handles malformed progress', () => {
    const state = freshGame({ gameId: 'intro-progress-separate' });
    expect(saveGame(state).status).toBe('saved');
    completeChapterIntroduction(state.gameId, 3);

    const restored = loadGame();
    expect(restored.status).toBe('loaded');
    if (restored.status === 'loaded') expect(restored.state).toEqual(state);
    expect(loadCompletedChapterIntroductions(state.gameId)).toEqual([3]);

    window.localStorage.setItem(CHAPTER_INTRODUCTIONS_KEY, '{bad-json');
    expect(loadCompletedChapterIntroductions(state.gameId)).toEqual([]);
  });
});

describe('invalid saved data (spec 9)', () => {
  it('treats non-JSON as corrupted without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json');
    const loaded = loadGame();
    expect(loaded.status).toBe('corrupted');
  });

  it('treats structurally invalid JSON as corrupted', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 999, day: -3 }));
    const loaded = loadGame();
    expect(loaded.status).toBe('corrupted');
  });

  it('does NOT overwrite storage when asked to save an invalid state', () => {
    const good = freshGame();
    saveGame(good);

    // Attempt to save a corrupted state.
    const bad = { ...good, resources: { power: Number.POSITIVE_INFINITY, water: 1, food: 1, oxygen: 1 } };
    const result = saveGame(bad as typeof good);
    expect(result.status).toBe('rejected-invalid');

    // The previously-good save is still intact.
    const loaded = loadGame();
    expect(loaded.status).toBe('loaded');
  });

  it('clearGame removes the save', () => {
    saveGame(freshGame());
    clearGame();
    expect(loadGame().status).toBe('empty');
  });
});

describe('parseGameState', () => {
  it('returns ok:false for null/empty input', () => {
    expect(parseGameState(null).ok).toBe(false);
    expect(parseGameState('').ok).toBe(false);
  });

  it('returns ok:true for a serialised valid game', () => {
    const state = freshGame();
    const result = parseGameState(JSON.stringify(state));
    expect(result.ok).toBe(true);
  });
});
