/**
 * progressionStorage.ts
 * ---------------------
 * Persists per-run progression (XP, mood, stats) in its own localStorage key,
 * separate from the core game save. Badges are stored by achievementService.
 *
 * Runs are kept in a small map keyed by gameId so that the throwaway default
 * mission created at app start cannot overwrite a restored save's progress.
 */

import { runHasProgress, type RunProgression } from './progressionEngine';

import { scopedKey, getActiveUserId } from '../../lib/userScope';
import { fetchState, putState } from '../../lib/stateApi';

/** Base key. Each account gets its own progress (see lib/userScope). */
const STORAGE_KEY = 'mars-run-progression-v2';
const MAX_RUNS = 5;

type RunMap = Record<string, RunProgression>;

function readAll(): RunMap {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as RunMap;
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return {};
}

function isValidRun(run: unknown): run is RunProgression {
  if (!run || typeof run !== 'object') return false;
  const r = run as Partial<RunProgression>;
  return (
    typeof r.gameId === 'string' &&
    typeof r.totalXp === 'number' &&
    typeof r.mood === 'string' &&
    Array.isArray(r.events) &&
    typeof r.stats === 'object' &&
    r.stats !== null
  );
}

/** Load the stored progression for a playthrough, if any. */
export function loadRun(gameId: string): RunProgression | null {
  const run = readAll()[gameId];
  return isValidRun(run) ? run : null;
}

/** Save a run (only if it has real progress), pruning to the newest few. */
export function saveRun(run: RunProgression): void {
  if (!runHasProgress(run)) return;
  const all = readAll();
  all[run.gameId] = run;
  const newest = Object.values(all)
    .filter(isValidRun)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RUNS);
  const pruned: RunMap = {};
  for (const r of newest) pruned[r.gameId] = r;
  try {
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(pruned));
  } catch {
    // Storage unavailable or full: progress just will not persist.
  }
  // Mirror to Neon (fire-and-forget; no-op when signed out / API unavailable).
  const userId = getActiveUserId();
  if (userId) void putState(userId, 'progression', pruned);
}

/**
 * Pull the signed-in player's run-progression map from Neon into the local
 * mirror so a synchronous loadRun() afterwards sees the cross-device value.
 * No-op when signed out or the API is unavailable (keeps the local copy).
 */
export async function hydrateProgressionFromApi(): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  const remote = await fetchState<RunMap>(userId, 'progression');
  if (remote && typeof remote === 'object') {
    try {
      localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(remote));
    } catch {
      /* ignore */
    }
  }
}
