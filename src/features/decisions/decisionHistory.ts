/**
 * decisionHistory.ts
 * ------------------
 * Read-only query helpers over GameState.history and pendingEffects.
 *
 * History is append-only and owned by the simulation engine. NOTHING in this
 * module mutates state — these are pure selectors used by the activity feed,
 * the decisions panel, and the debrief.
 */

import type { DecisionRecord } from './decisionTypes';
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
