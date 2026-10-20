/**
 * advisorTypes.ts
 * ---------------
 * Typed inputs and outputs for the AI Mission Controller ("advisor").
 *
 * IMPORTANT BOUNDARY: the advisor NEVER mutates game state. It receives a
 * read-only snapshot and returns a Recommendation. The simulation engine
 * validates the recommended action exactly like any player decision before
 * anything is applied. The player can always override.
 *
 * No AI model is connected in the foundation phase. advisorInterface.ts ships
 * a deterministic placeholder that satisfies this contract so UI/other teams
 * can integrate against a stable shape.
 */

import type { GameState } from '../simulation/simulationTypes';

/** Read-only view handed to the advisor. */
export type AdvisorContext = Readonly<{
  /** Deep-readonly is enforced by convention; treat as immutable. */
  state: GameState;
  /** The event the advisor is being asked about, if any. */
  eventId?: string;
}>;

/** How strongly the advisor backs its suggestion. */
export type AdvisorConfidence = 'low' | 'medium' | 'high';

/** A single recommended action, with reasoning for the player to weigh. */
export interface Recommendation {
  /** The action id the advisor suggests. Engine still validates it. */
  actionId: string;
  /** The event id this recommendation is for, if applicable. */
  eventId?: string;
  confidence: AdvisorConfidence;
  /** Plain-language rationale shown to the player. */
  rationale: string;
}

/** What any advisor implementation must provide. */
export interface Advisor {
  /** A stable identifier (e.g. "placeholder", "bedrock-claude"). */
  readonly id: string;
  /**
   * Produce a recommendation for the given context, or null if the advisor has
   * no opinion. Must be pure with respect to the passed state (no mutation).
   */
  recommend(context: AdvisorContext): Recommendation | null;
}
