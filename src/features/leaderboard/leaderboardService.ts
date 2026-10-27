/**
 * leaderboardService.ts
 * ---------------------
 * Self-contained leaderboard store. Owns its own localStorage key, seeds
 * placeholder demo data on first use, and exposes pure ranking helpers.
 *
 * Ranking: by daysSurvived (desc), then score (desc), then earlier timestamp.
 * Only the top LEADERBOARD_SIZE entries are kept/shown.
 *
 * Persistence degrades gracefully: if localStorage is unavailable or corrupt,
 * callers still get a valid (seed) board and the game keeps working.
 */

import {
  LEADERBOARD_SIZE,
  SEED_LEADERBOARD,
  type LeaderboardEntry,
} from './leaderboardTypes';

/** localStorage key for the persisted leaderboard. */
export const LEADERBOARD_KEY = 'mars-outpost-zero:leaderboard:v1';

/** Access localStorage safely (SSR / private mode / disabled all return null). */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null;
    const probe = '__mars_lb_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Pure: rank entries and keep the top N. Does not mutate the input. */
export function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.daysSurvived !== a.daysSurvived) return b.daysSurvived - a.daysSurvived;
      if (b.score !== a.score) return b.score - a.score;
      return a.timestamp - b.timestamp; // earlier achiever wins ties
    })
    .slice(0, LEADERBOARD_SIZE);
}

/** Minimal runtime guard that a parsed value looks like a LeaderboardEntry. */
function isEntry(v: unknown): v is LeaderboardEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.daysSurvived === 'number' &&
    Number.isFinite(e.daysSurvived) &&
    typeof e.score === 'number' &&
    Number.isFinite(e.score) &&
    typeof e.timestamp === 'number'
  );
}

/**
 * Read the leaderboard. Seeds placeholder data on first use. Falls back to the
 * seed board if storage is unavailable or the stored data is corrupt.
 */
export function getLeaderboard(): LeaderboardEntry[] {
  const storage = getStorage();
  if (!storage) return rankEntries(SEED_LEADERBOARD);

  const raw = storage.getItem(LEADERBOARD_KEY);
  if (raw === null) {
    // First use: seed the board so the demo looks populated.
    const seeded = rankEntries(SEED_LEADERBOARD);
    try {
      storage.setItem(LEADERBOARD_KEY, JSON.stringify(seeded));
    } catch {
      /* ignore quota errors; return the seed in memory */
    }
    return seeded;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(isEntry);
      // If everything was garbage, fall back to the seed board.
      return clean.length > 0 ? rankEntries(clean) : rankEntries(SEED_LEADERBOARD);
    }
    return rankEntries(SEED_LEADERBOARD);
  } catch {
    return rankEntries(SEED_LEADERBOARD);
  }
}

/**
 * Submit a new run result. Merges it with the existing board, re-ranks, trims
 * to the top N, persists, and returns the updated board. The returned board is
 * always ranked even if persistence is unavailable.
 */
export function submitScore(entry: LeaderboardEntry): LeaderboardEntry[] {
  const current = getLeaderboard();
  const updated = rankEntries([...current, entry]);

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
    } catch {
      /* ignore quota errors; caller still gets the ranked board */
    }
  }
  return updated;
}

/** True if the given entry made it into the top N of the current board. */
export function qualifies(entry: LeaderboardEntry): boolean {
  return rankEntries([...getLeaderboard(), entry]).some((e) => e.id === entry.id);
}

/** Reset the board back to the seed data (handy for the demo). */
export function resetLeaderboard(): LeaderboardEntry[] {
  const seeded = rankEntries(SEED_LEADERBOARD);
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(LEADERBOARD_KEY, JSON.stringify(seeded));
    } catch {
      /* ignore */
    }
  }
  return seeded;
}
