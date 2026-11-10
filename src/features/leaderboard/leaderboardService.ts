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

/**
 * Server API (Neon Postgres) base path. When the API is reachable the board is
 * backed by Postgres; otherwise the local (localStorage) board is used so the
 * app keeps working offline / in a pure static build. See server/*.
 */
const LEADERBOARD_API = '/api/leaderboard';

/**
 * Fetch the ranked board from the Postgres-backed API. Returns null if the API
 * is unavailable (static build with no server, DB not configured, or offline),
 * so callers can fall back to the local board.
 */
export async function fetchLeaderboardFromApi(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(LEADERBOARD_API, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    return data.filter(isEntry);
  } catch {
    return null;
  }
}

/**
 * Submit a run result to the Postgres-backed API, returning the refreshed board
 * or null if the API is unavailable.
 */
export async function submitScoreToApi(entry: LeaderboardEntry): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(LEADERBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    return data.filter(isEntry);
  } catch {
    return null;
  }
}

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

/** Ordering: more sols first, then higher score, then whoever got there earlier. */
function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.daysSurvived !== a.daysSurvived) return b.daysSurvived - a.daysSurvived;
  if (b.score !== a.score) return b.score - a.score;
  return a.timestamp - b.timestamp; // earlier achiever wins ties
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Pure: keep ONE entry per player, their best. A player is an account (userId).
 * Older rows saved before accounts were recorded have no userId; they count as
 * the account with the same name when there is one, and otherwise as a player
 * identified by that name.
 */
export function bestPerPlayer(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const accountByName = new Map<string, string>();
  for (const e of entries) {
    if (e.userId && !accountByName.has(nameKey(e.name))) accountByName.set(nameKey(e.name), e.userId);
  }

  const best = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    const owner = e.userId ?? accountByName.get(nameKey(e.name));
    const key = owner ? `user:${owner}` : `name:${nameKey(e.name)}`;
    const current = best.get(key);
    if (!current || compareEntries(e, current) < 0) best.set(key, e);
  }
  return [...best.values()];
}

/** Pure: one row per player (their best), ranked, top N. Does not mutate the input. */
export function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return bestPerPlayer(entries).sort(compareEntries).slice(0, LEADERBOARD_SIZE);
}

/** Minimal runtime guard that a parsed value looks like a LeaderboardEntry. */
function isEntry(v: unknown): v is LeaderboardEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    (e.userId === undefined || typeof e.userId === 'string') &&
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
