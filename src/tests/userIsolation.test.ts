/**
 * Each account must only ever see its own saved game and badges. These tests
 * switch the signed-in account the same way the app does (the stored session)
 * and check that nothing leaks between accounts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../features/achievements/achievementData';
import { loadAchievements } from '../features/achievements/achievementService';
import {
  endGuestSession,
  getActiveGuestId,
  getOrCreateGuestId,
  startGuestSession,
} from '../features/auth/guestSession';
import { applyPlayerDecision } from '../features/simulation/simulationEngine';
import { clearGame, loadGame, saveGame, STORAGE_KEY } from '../lib/storage';
import { getActiveUserId, scopedKey } from '../lib/userScope';
import { freshGame } from './helpers';

const USERS_KEY = 'mars-outpost-users';
const SESSION_KEY = 'mars-outpost-session';

function user(id: string, email: string) {
  return { id, email, passwordHash: 'x', securityQuestions: [], createdAt: new Date().toISOString() };
}

function signInAs(id: string | null): void {
  if (id === null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, timestamp: Date.now() }));
}

beforeEach(() => {
  endGuestSession();
  localStorage.clear();
  localStorage.setItem(USERS_KEY, JSON.stringify([user('acc1', 'one@gmail.com'), user('acc2', 'two@gmail.com')]));
});

afterEach(() => {
  endGuestSession();
  localStorage.clear();
});

describe('saved data belongs to the signed-in account', () => {
  it('uses a different storage key for each account', () => {
    signInAs('acc1');
    const one = scopedKey(STORAGE_KEY);
    signInAs('acc2');
    const two = scopedKey(STORAGE_KEY);
    expect(one).not.toBe(two);
    expect(one).toContain('acc1');
    expect(two).toContain('acc2');
  });

  it("account 2 does not see account 1's game, and each keeps its own", () => {
    signInAs('acc1');
    const played = applyPlayerDecision(freshGame({ gameId: 'game-of-acc1' }), {
      actionId: 'ration-supplies',
      playerChoice: 'self-directed',
    });
    expect(saveGame(played).status).toBe('saved');
    expect(loadGame().status).toBe('loaded');

    signInAs('acc2');
    expect(loadGame().status).toBe('empty');

    // Account 2 plays its own game.
    expect(saveGame(freshGame({ gameId: 'game-of-acc2' })).status).toBe('saved');
    const two = loadGame();
    expect(two.status === 'loaded' && two.state.gameId).toBe('game-of-acc2');
    expect(two.status === 'loaded' && two.state.history.length).toBe(0);

    // Back to account 1: its decisions are still there.
    signInAs('acc1');
    const one = loadGame();
    expect(one.status === 'loaded' && one.state.gameId).toBe('game-of-acc1');
    expect(one.status === 'loaded' && one.state.history.length).toBe(1);
  });

  it('resetting one account does not erase the other', () => {
    signInAs('acc1');
    saveGame(freshGame({ gameId: 'a1' }));
    signInAs('acc2');
    saveGame(freshGame({ gameId: 'a2' }));

    clearGame(); // acc2 resets
    expect(loadGame().status).toBe('empty');
    signInAs('acc1');
    expect(loadGame().status).toBe('loaded');
  });

  it('an old shared save from before this fix is not handed to any account', () => {
    // The old versions saved everything under one shared key.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshGame({ gameId: 'legacy-shared' })));
    signInAs('acc2');
    expect(loadGame().status).toBe('empty');
  });

  it('badges are per account', () => {
    const badge = ACHIEVEMENTS[0]!.id;
    signInAs('acc1');
    localStorage.setItem(scopedKey('mars-achievements-v2'), JSON.stringify({ unlocked: { [badge]: 3 } }));
    expect(loadAchievements().unlocked[badge]).toBe(3);

    signInAs('acc2');
    expect(loadAchievements().unlocked[badge]).toBeUndefined();
  });

  it('with nobody signed in the plain key is used (tests and tools only)', () => {
    signInAs(null);
    expect(getActiveUserId()).toBeNull();
    expect(scopedKey(STORAGE_KEY)).toBe(STORAGE_KEY);
  });

  it('keeps guest saves separate from both registered accounts', () => {
    signInAs('acc1');
    saveGame(freshGame({ gameId: 'registered-save' }));
    const guestId = getOrCreateGuestId();

    signInAs(null);
    expect(startGuestSession()).toBe(guestId);
    const guestKey = scopedKey(STORAGE_KEY);
    expect(guestKey).toContain(`:guest:${guestId}`);
    expect(guestKey).not.toBe(STORAGE_KEY);
    expect(loadGame().status).toBe('empty');

    saveGame(freshGame({ gameId: 'guest-save' }));
    expect(loadGame().status).toBe('loaded');

    signInAs('acc1');
    const registered = loadGame();
    expect(registered.status === 'loaded' && registered.state.gameId).toBe('registered-save');

    endGuestSession();
    signInAs(null);
    startGuestSession();
    const guest = loadGame();
    expect(guest.status === 'loaded' && guest.state.gameId).toBe('guest-save');
  });

  it('keeps the active guest namespace if its persisted id is removed', () => {
    signInAs(null);
    const guestId = startGuestSession();
    expect(saveGame(freshGame({ gameId: 'guest-before-removal' })).status).toBe('saved');

    localStorage.removeItem('mars-outpost-guest-id');
    expect(getOrCreateGuestId()).toBe(guestId);
    expect(getActiveGuestId()).toBe(guestId);
    expect(scopedKey(STORAGE_KEY)).toBe(`${STORAGE_KEY}:guest:${guestId}`);

    expect(saveGame(freshGame({ gameId: 'guest-after-removal' })).status).toBe('saved');
    const guest = loadGame();
    expect(guest.status === 'loaded' && guest.state.gameId).toBe('guest-after-removal');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('a session for a deleted account counts as signed out', () => {
    signInAs('ghost');
    expect(getActiveUserId()).toBeNull();
  });
});
