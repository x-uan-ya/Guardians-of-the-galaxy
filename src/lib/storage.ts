/**
 * storage.ts
 * ----------
 * The ONLY place that talks to localStorage. Everything else goes through this
 * module. Responsibilities:
 *  - Detect whether localStorage is usable at all (private mode, disabled, SSR).
 *  - Load + validate a saved game, with a safe fallback on corruption.
 *  - Save a game, but NEVER overwrite a valid save with an invalid state.
 *  - Clear a save (for reset).
 *
 * This layer contains NO simulation math. It validates via lib/validation.
 */

import { validateGameState } from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import { parseGameState, serializeGameState } from './validation';

/** The localStorage key under which the single active game is stored. */
export const STORAGE_KEY = 'mars-outpost-zero:save:v1';

/** Result of a load attempt. */
export type LoadResult =
  | { status: 'loaded'; state: GameState }
  | { status: 'empty' }
  | { status: 'corrupted'; reason: string; errors?: string[] }
  | { status: 'unavailable' };

/** Result of a save attempt. */
export type SaveResult =
  | { status: 'saved' }
  | { status: 'rejected-invalid'; errors: string[] }
  | { status: 'unavailable' };

/**
 * Feature-detect a working localStorage. Returns the Storage object or null.
 * Handles SSR (no window), disabled storage, and private-mode quota errors.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return null;
    }
    const probeKey = '__mars_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    // Access can throw in sandboxed iframes / private mode.
    return null;
  }
}

/** True when persistence is available in this environment. */
export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

/**
 * Load and validate the saved game. On corrupt data returns status
 * 'corrupted' WITHOUT deleting it, so the caller can decide (we do not silently
 * discard a user's save).
 */
export function loadGame(): LoadResult {
  const storage = getStorage();
  if (!storage) return { status: 'unavailable' };

  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { status: 'empty' };

  const parsed = parseGameState(raw);
  if (!parsed.ok) {
    return parsed.errors
      ? { status: 'corrupted', reason: parsed.reason, errors: parsed.errors }
      : { status: 'corrupted', reason: parsed.reason };
  }
  return { status: 'loaded', state: parsed.state };
}

/**
 * Save a game. Validates first and REFUSES to persist an invalid state, so a
 * bug cannot clobber a good save with garbage. Returns a result rather than
 * throwing so the UI can surface a message.
 */
export function saveGame(state: GameState): SaveResult {
  const result = validateGameState(state);
  if (!result.valid) {
    return { status: 'rejected-invalid', errors: result.errors };
  }

  const storage = getStorage();
  if (!storage) return { status: 'unavailable' };

  try {
    storage.setItem(STORAGE_KEY, serializeGameState(state));
    return { status: 'saved' };
  } catch {
    // Quota exceeded or similar — treat as unavailable rather than crashing.
    return { status: 'unavailable' };
  }
}

/** Remove the saved game (used by reset). Safe to call when unavailable. */
export function clearGame(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing we can do, and there is no state to corrupt.
  }
}
