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

const STORAGE_KEY = 'mars-run-progression-v2';
const MAX_RUNS = 5;

type RunMap = Record<string, RunProgression>;

function readAll(): RunMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  try {
    const all = readAll();
    all[run.gameId] = run;
    const newest = Object.values(all)
      .filter(isValidRun)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RUNS);
    const pruned: RunMap = {};
    for (const r of newest) pruned[r.gameId] = r;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Storage unavailable or full: progress just will not persist.
  }
}
