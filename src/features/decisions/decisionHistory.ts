/**
 * decisionHistory.ts
 * ------------------
 * Read-only query helpers over GameState.history and pendingEffects.
 *
 * History is append-only and owned by the simulation engine. NOTHING in this
 * module mutates state — these are pure selectors used by the activity feed,
 * the decisions panel, and the debrief.
 */

import { sanitizeAdviceSnapshot } from './decisionOutcome';
import type { AdviceSnapshot, DecisionRecord, PlayerChoice } from './decisionTypes';
import type { DelayedEffect, GameState } from '../simulation/simulationTypes';

/** Most recent decisions first, limited to `limit` entries. */
export function recentDecisions(state: GameState, limit = 8): DecisionRecord[] {
  // Copy before reversing so we never mutate the stored history array.
  return [...state.history].slice(-limit).reverse();
}

/** All decisions made on a specific day, in the order they occurred. */
export function decisionsOnDay(state: GameState, day: number): DecisionRecord[] {
  return state.history.filter((d) => d.day === day);
}

/** Pending delayed effects, soonest first. */
export function upcomingEffects(state: GameState): DelayedEffect[] {
  return [...state.pendingEffects].sort((a, b) => a.scheduledDay - b.scheduledDay);
}

/** The decision that caused a given delayed effect, if still in history. */
export function sourceDecisionFor(
  state: GameState,
  effect: DelayedEffect
): DecisionRecord | undefined {
  return state.history.find((d) => d.id === effect.sourceDecisionId);
}

/** Count of decisions where the player overrode the advisor. */
export function overrideCount(state: GameState): number {
  return state.history.filter((d) => d.playerChoice === 'overrode-recommendation').length;
}

// ---------------------------------------------------------------------------
// AI advisor history (for the debrief)
// ---------------------------------------------------------------------------

/** One decision as the debrief shows it: recommendation, decision, outcome. */
export interface AdvisorHistoryEntry {
  id: string;
  day: number;
  /** What the player did. */
  actionLabel: string;
  playerChoice: PlayerChoice;
  /** What the advisor said at the time. Undefined for old saves or unadvised choices. */
  advice: AdviceSnapshot | undefined;
  /** What happened right after. Undefined for old saves. */
  outcomeSummary: string | undefined;
}

/**
 * Every decision with its advisor recommendation and outcome, oldest first.
 * Reads defensively so an old or hand-edited save can never break the debrief.
 */
export function advisorHistory(state: GameState): AdvisorHistoryEntry[] {
  return state.history.map((record) => ({
    id: record.id,
    day: record.day,
    actionLabel: record.actionLabel,
    playerChoice: record.playerChoice,
    advice: sanitizeAdviceSnapshot(record.advice),
    outcomeSummary:
      typeof record.outcome?.summary === 'string' ? record.outcome.summary : undefined,
  }));
}

export interface AdvisorStats {
  total: number;
  accepted: number;
  overridden: number;
  selfDirected: number;
  /** Decisions made while the advisor was in Mission Safety Protocol (fallback) mode. */
  fallbackAdvice: number;
  /** Decisions advised by a remote AI model. */
  aiAdvice: number;
}

/** Summary counts of how the player used the advisor. */
export function advisorStats(state: GameState): AdvisorStats {
  const stats: AdvisorStats = {
    total: state.history.length,
    accepted: 0,
    overridden: 0,
    selfDirected: 0,
    fallbackAdvice: 0,
    aiAdvice: 0,
  };
  for (const entry of advisorHistory(state)) {
    if (entry.playerChoice === 'accepted-recommendation') stats.accepted += 1;
    else if (entry.playerChoice === 'overrode-recommendation') stats.overridden += 1;
    else stats.selfDirected += 1;
    if (entry.advice?.mode === 'fallback') stats.fallbackAdvice += 1;
    if (entry.advice?.mode === 'ai') stats.aiAdvice += 1;
  }
  return stats;
}
