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
import { scopedKey, getActiveUserId } from './userScope';
import { parseGameState, serializeGameState } from './validation';
import { fetchState, putState } from './stateApi';

/** Base localStorage key for a saved game. Each account gets its own copy (see userScope). */
export const STORAGE_KEY = 'mars-outpost-zero:save:v1';
/** Separate UI progress; chapter introductions do not change simulation saves. */
export const CHAPTER_INTRODUCTIONS_KEY = 'mars-outpost-zero:chapter-introductions:v1';

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
 * Read the chapters the player has completed for this playthrough.
 * Invalid or unavailable preference data is ignored without touching the game save.
 */
export function loadCompletedChapterIntroductions(gameId: string): number[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(scopedKey(CHAPTER_INTRODUCTIONS_KEY));
    if (!raw) return [];
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return [];
    const chapters = (saved as Record<string, unknown>)[gameId];
    if (!Array.isArray(chapters)) return [];
    return [...new Set(chapters.filter(
      (chapter): chapter is number =>
        Number.isInteger(chapter) && chapter > 0,
    ))];
  } catch {
    return [];
  }
}

/**
 * Persist one completed introduction without changing the saved GameState.
 * Returns false when browser storage is unavailable or cannot be written.
 */
export function completeChapterIntroduction(gameId: string, chapterNumber: number): boolean {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) return false;
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(scopedKey(CHAPTER_INTRODUCTIONS_KEY));
    const saved: unknown = raw ? JSON.parse(raw) : {};
    const progress =
      saved && typeof saved === 'object' && !Array.isArray(saved)
        ? (saved as Record<string, unknown>)
        : {};
    const chapters = Array.isArray(progress[gameId]) ? progress[gameId] : [];
    progress[gameId] = [...new Set([...chapters, chapterNumber])];
    storage.setItem(scopedKey(CHAPTER_INTRODUCTIONS_KEY), JSON.stringify(progress));
    // Mirror to Neon (fire-and-forget; no-op when signed out / API unavailable).
    const userId = getActiveUserId();
    if (userId) void putState(userId, 'chapters', progress);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load and validate the saved game. On corrupt data returns status
 * 'corrupted' WITHOUT deleting it, so the caller can decide (we do not silently
 * discard a user's save).
 */
export function loadGame(): LoadResult {
  const storage = getStorage();
  if (!storage) return { status: 'unavailable' };

  const raw = storage.getItem(scopedKey(STORAGE_KEY));
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
    storage.setItem(scopedKey(STORAGE_KEY), serializeGameState(state));
    // Mirror the validated save to Neon (fire-and-forget).
    const userId = getActiveUserId();
    if (userId) void putState(userId, 'save', state);
    return { status: 'saved' };
  } catch {
    // Quota exceeded or similar — treat as unavailable rather than crashing.
    return { status: 'unavailable' };
  }
}

/** Remove the saved game (used by reset). Safe to call when unavailable. */
export function clearGame(): void {
  // Clear the DB copy too (null payload = no save).
  const userId = getActiveUserId();
  if (userId) void putState(userId, 'save', null);

  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(scopedKey(STORAGE_KEY));
  } catch {
    // Ignore — nothing we can do, and there is no state to corrupt.
  }
}

/**
 * Pull the signed-in player's saved game and completed chapter intros from Neon
 * into the local mirror, so the synchronous loadGame() / chapter reads that run
 * on mount see the cross-device values. No-op when signed out or the API is
 * unavailable (keeps the local copies). The save is validated before it is
 * trusted, so a corrupt remote blob cannot clobber a good local save.
 */
export async function hydrateSaveFromApi(): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  const storage = getStorage();
  if (!storage) return;

  const remoteSave = await fetchState<GameState>(userId, 'save');
  if (remoteSave && typeof remoteSave === 'object') {
    const result = validateGameState(remoteSave);
    if (result.valid) {
      try {
        storage.setItem(scopedKey(STORAGE_KEY), serializeGameState(remoteSave));
      } catch {
        /* ignore */
      }
    }
  }

  const remoteChapters = await fetchState<Record<string, number[]>>(userId, 'chapters');
  if (remoteChapters && typeof remoteChapters === 'object') {
    try {
      storage.setItem(scopedKey(CHAPTER_INTRODUCTIONS_KEY), JSON.stringify(remoteChapters));
    } catch {
      /* ignore */
    }
  }
}
