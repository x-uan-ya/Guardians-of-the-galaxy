/**
 * historyService.ts
 * -----------------
 * The signed-in player's play history: one row for every run they finished or
 * left, with the score they reached. Stored in the browser under a key that
 * belongs to the account (see lib/userScope), so each account sees only its own
 * runs.
 *
 * Rows are written by `recordRun`. It is safe to call repeatedly for the same
 * run: a run has one row, and a finished run is never turned into a different
 * result later.
 */

import { scopedKey, getActiveUserId } from '../../lib/userScope';
import { fetchState, putState } from '../../lib/stateApi';
import { MISSION_TYPES, OCCUPATIONS, type GameState } from '../simulation/simulationTypes';
import type { MissionType, Occupation } from '../simulation/simulationTypes';

const STORAGE_KEY = 'mars-outpost-zero:play-history:v1';

/** Keep the newest rows only, so storage never grows without limit. */
export const MAX_HISTORY_ROWS = 100;

/** How a run ended. `abandoned` = the player reset or started a new mission. */
export type HistoryOutcome = 'completed' | 'failed' | 'abandoned';

export interface PlayHistoryEntry {
  /** One row per run (derived from the run's game id). */
  id: string;
  /** ms since epoch when the row was written. */
  timestamp: number;
  score: number;
  /** The Sol the run reached. */
  sols: number;
  outcome: HistoryOutcome;
  missionType: MissionType;
  occupation: Occupation;
  /** How many decisions the player made. */
  decisions: number;
}

function isEntry(value: unknown): value is PlayHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.timestamp === 'number' &&
    Number.isFinite(e.timestamp) &&
    typeof e.score === 'number' &&
    Number.isFinite(e.score) &&
    typeof e.sols === 'number' &&
    Number.isFinite(e.sols) &&
    typeof e.decisions === 'number' &&
    (e.outcome === 'completed' || e.outcome === 'failed' || e.outcome === 'abandoned') &&
    MISSION_TYPES.includes(e.missionType as MissionType) &&
    OCCUPATIONS.includes(e.occupation as Occupation)
  );
}

function readAll(): PlayHistoryEntry[] {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PlayHistoryEntry[]): void {
  const capped = entries.slice(0, MAX_HISTORY_ROWS);
  try {
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(capped));
  } catch {
    // Storage unavailable or full: the history just will not be saved.
  }
  // Mirror to Neon (fire-and-forget; no-op when signed out / API unavailable).
  const userId = getActiveUserId();
  if (userId) void putState(userId, 'history', capped);
}

/**
 * Pull the signed-in player's play history from Neon into the local mirror so a
 * synchronous getPlayHistory() afterwards sees the cross-device value. No-op
 * when signed out or the API is unavailable (keeps the local copy).
 */
export async function hydrateHistoryFromApi(): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  const remote = await fetchState<PlayHistoryEntry[]>(userId, 'history');
  if (Array.isArray(remote)) {
    try {
      localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(remote.filter(isEntry)));
    } catch {
      /* ignore */
    }
  }
}

/** The signed-in player's runs, newest first. */
export function getPlayHistory(): PlayHistoryEntry[] {
  return readAll().sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Write (or update) the row for a run. Returns the stored row.
 *  - Runs that never got going (no decision made) are not recorded.
 *  - A run that already has a finished result keeps it.
 */
export function recordRun(
  state: GameState,
  outcome: HistoryOutcome,
  now: number = Date.now()
): PlayHistoryEntry | null {
  if (state.history.length === 0 && outcome === 'abandoned') return null;

  const id = `run_${state.gameId}`;
  const all = readAll();
  const existing = all.find((e) => e.id === id);
  if (existing && existing.outcome !== 'abandoned') return existing;

  const entry: PlayHistoryEntry = {
    id,
    timestamp: now,
    score: Math.round(state.mission.score),
    sols: state.day,
    outcome,
    missionType: state.mission.missionType,
    occupation: state.character.occupation,
    decisions: state.history.length,
  };

  const next = [entry, ...all.filter((e) => e.id !== id)].sort((a, b) => b.timestamp - a.timestamp);
  writeAll(next);
  return entry;
}

export interface HistorySummary {
  runs: number;
  best: number;
  average: number;
  survived: number;
  /** Id of the highest-scoring row (first one wins a tie), if any. */
  bestId: string | null;
}

/** Totals shown at the top of the History page. */
export function summariseHistory(entries: readonly PlayHistoryEntry[]): HistorySummary {
  if (entries.length === 0) return { runs: 0, best: 0, average: 0, survived: 0, bestId: null };
  let best = entries[0]!;
  let total = 0;
  let survived = 0;
  for (const e of entries) {
    total += e.score;
    if (e.outcome === 'completed') survived += 1;
    if (e.score > best.score) best = e;
  }
  return {
    runs: entries.length,
    best: best.score,
    average: Math.round(total / entries.length),
    survived,
    bestId: best.id,
  };
}
