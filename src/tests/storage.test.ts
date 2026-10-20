/**
 * storage.test.ts
 * ---------------
 * Covers persistence safety (spec 9): invalid saved data is handled safely, and
 * a valid save round-trips. Uses jsdom's localStorage.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, clearGame, loadGame, saveGame } from '../lib/storage';
import { parseGameState } from '../lib/validation';
import { freshGame } from './helpers';

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

  it('reports empty when nothing is stored', () => {
    expect(loadGame().status).toBe('empty');
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
