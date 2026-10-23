/**
 * progressionEngine.ts
 * --------------------
 * Pure functions that turn what happens in the game into three simple rewards:
 *   - XP and a mission rank,
 *   - a mood readout,
 *   - badges (achievements).
 *
 * This layer only READS GameState. It never changes the simulation, so it
 * cannot break saves or the core engine. `reconcile` is idempotent: it only
 * processes what is new since the last call (see stats.lastDay/lastHistoryLen).
 */

import type { GameState } from '../simulation/simulationTypes';
import {
  evaluateAchievements,
  type AchievementStore,
} from '../achievements/achievementService';
import type { IconKey } from '../achievements/achievementData';
import { getRankInfo } from './ranks';
import { calculateMood, type Mood } from './mood';

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

export const XP_PER_DECISION = 10;
export const XP_PER_EVENT = 30;
export const XP_PER_SOL = 5;
export const XP_TEN_SOL_BONUS = 25;
const MAX_DAYS_CREDITED = 60;
const MAX_NOTIFICATIONS = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressionEvent {
  id: string;
  sol: number;
  icon: IconKey;
  title: string;
  detail: string;
  /** Has the player already been shown this? */
  seen: boolean;
}

export interface RunStats {
  /** Last Sol and history length already processed. */
  lastDay: number;
  lastHistoryLen: number;
  decisions: number;
  eventsResolved: number;
  followedAdvice: number;
  ignoredAdvice: number;
}

/** Progress for one playthrough (keyed by gameId). Resets with a new mission. */
export interface RunProgression {
  gameId: string;
  totalXp: number;
  mood: Mood;
  stats: RunStats;
  events: ProgressionEvent[];
  updatedAt: number;
}

export interface ProgressionState {
  /** Badges, kept across missions. */
  achievements: AchievementStore;
  run: RunProgression;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let eventCounter = 0;
function makeEvent(sol: number, icon: IconKey, title: string, detail: string): ProgressionEvent {
  eventCounter += 1;
  return { id: `pe_${Date.now()}_${eventCounter}`, sol, icon, title, detail, seen: false };
}

export function createRun(state: GameState): RunProgression {
  return {
    gameId: state.gameId,
    totalXp: 0,
    mood: calculateMood(state.crew),
    stats: {
      lastDay: 1,
      lastHistoryLen: 0,
      decisions: 0,
      eventsResolved: 0,
      followedAdvice: 0,
      ignoredAdvice: 0,
    },
    events: [],
    updatedAt: Date.now(),
  };
}

/** True once the run has anything worth saving. */
export function runHasProgress(run: RunProgression): boolean {
  return run.stats.lastDay > 1 || run.stats.decisions > 0;
}

// ---------------------------------------------------------------------------
// Reconcile: bring progression in line with the latest GameState
// ---------------------------------------------------------------------------

export function reconcile(prog: ProgressionState, state: GameState): ProgressionState {
  const { run } = prog;
  const added: ProgressionEvent[] = [];

  const newDecisions = state.history.slice(run.stats.lastHistoryLen);
  const daysAdvanced = Math.max(0, state.day - run.stats.lastDay);
  const stats: RunStats = { ...run.stats };
  let xp = run.totalXp;

  // 1. Decisions: more XP for answering an emergency than a routine action.
  for (const d of newDecisions) {
    stats.decisions += 1;
    if (d.eventId) {
      stats.eventsResolved += 1;
      xp += XP_PER_EVENT;
    } else {
      xp += XP_PER_DECISION;
    }
    if (d.playerChoice === 'accepted-recommendation') stats.followedAdvice += 1;
    if (d.playerChoice === 'overrode-recommendation') stats.ignoredAdvice += 1;
  }

  // 2. Sols survived (capped so loading a long old save is not absurd).
  const credited = Math.min(daysAdvanced, MAX_DAYS_CREDITED);
  for (let i = 1; i <= credited; i += 1) {
    const sol = state.day - credited + i;
    xp += XP_PER_SOL;
    if (sol % 10 === 0) xp += XP_TEN_SOL_BONUS;
  }

  stats.lastDay = Math.max(stats.lastDay, state.day);
  stats.lastHistoryLen = state.history.length;

  // 3. Rank-up notification (one, for the final rank reached).
  const before = getRankInfo(run.totalXp);
  const after = getRankInfo(xp);
  if (after.index > before.index) {
    added.push(makeEvent(state.day, 'medal', `New rank: ${after.title}`, 'Nice work, keep going.'));
  }

  // 4. Badges (only once the game has actually started).
  let achievements = prog.achievements;
  if (state.history.length > 0 || state.day > 1) {
    const result = evaluateAchievements(
      achievements,
      {
        day: state.day,
        status: state.mission.status,
        health: state.crew.health,
        systems: state.systems,
        resources: state.resources,
        eventsResolved: stats.eventsResolved,
        followedAdvice: stats.followedAdvice,
        ignoredAdvice: stats.ignoredAdvice,
      },
      state.day
    );
    achievements = result.store;
    for (const a of result.newlyUnlocked) {
      added.push(makeEvent(state.day, a.icon, `Badge earned: ${a.title}`, a.description));
    }
  }

  const events =
    added.length > 0 ? [...run.events, ...added].slice(-MAX_NOTIFICATIONS) : run.events;

  return {
    achievements,
    run: {
      ...run,
      totalXp: xp,
      mood: calculateMood(state.crew),
      stats,
      events,
      updatedAt: Date.now(),
    },
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** Mark every notification as seen (used when a toast is dismissed). */
export function markEventsSeen(prog: ProgressionState): ProgressionState {
  if (prog.run.events.every((e) => e.seen)) return prog;
  return {
    ...prog,
    run: { ...prog.run, events: prog.run.events.map((e) => (e.seen ? e : { ...e, seen: true })) },
  };
}

/** Mark all current notifications seen (for silently-seeded runs). */
export function silenceRun(run: RunProgression): RunProgression {
  return { ...run, events: run.events.map((e) => ({ ...e, seen: true })) };
}
