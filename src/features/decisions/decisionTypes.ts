/**
 * decisionTypes.ts
 * ----------------
 * Types describing a player decision and its recorded form in history.
 *
 * A "decision" is the player's selection of an action — either a free action
 * (e.g. "advance day", a routine allocation) or a response to an active event.
 * The simulation engine validates every decision before applying it. Only
 * accepted decisions become DecisionRecords in GameState.history.
 *
 * Import ResourceChanges etc. from simulationTypes — do not redefine them.
 */

import type { ResourceChanges } from '../simulation/simulationTypes';

/**
 * Whether the player accepted the AI advisor's recommendation or overrode it.
 * In the foundation there is no live advisor, but the field exists so the
 * debrief can later build a "leadership profile" from override patterns.
 */
export type PlayerChoice = 'accepted-recommendation' | 'overrode-recommendation' | 'self-directed';

/**
 * Input a caller passes to the engine to request a decision. The engine fills
 * in id/day/timestamp/resourceChanges when it records the decision, so the
 * caller only supplies intent.
 */
export interface DecisionInput {
  /** The event this responds to, if any. Omit/undefined for free actions. */
  eventId?: string;
  /** The action id being taken. Must be a known action for the context. */
  actionId: string;
  /** Whether the player followed or overrode the advisor. */
  playerChoice: PlayerChoice;
}

/**
 * The immutable record stored in GameState.history after the engine accepts a
 * decision. The debrief reads these; it must never rewrite them.
 */
export interface DecisionRecord {
  id: string;
  /** Simulation day on which the decision was made. */
  day: number;
  /** Source event id, if the decision responded to an event. */
  eventId?: string;
  actionId: string;
  /** Human-readable label for the action (snapshotted for the timeline). */
  actionLabel: string;
  playerChoice: PlayerChoice;
  /** The immediate resource deltas the engine actually applied. */
  resourceChanges: ResourceChanges;
  /** Plain-language reason the engine recorded for this outcome. */
  explanation: string;
  /** ms since epoch when recorded. */
  timestamp: number;
}
