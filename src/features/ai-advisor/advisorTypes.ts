/**
 * advisorTypes.ts
 * ---------------
 * Typed inputs and outputs for the Mission Controller ("advisor").
 *
 * IMPORTANT BOUNDARY: the advisor NEVER mutates game state and NEVER decides.
 * It receives a read-only snapshot and returns advice. The simulation engine
 * validates the chosen action exactly like any player decision. The human
 * always makes the final call: accept the recommendation, or override it.
 *
 * No AI model is bundled. advisorInterface.ts ships a deterministic rule set
 * (the "Mission Safety Protocol") that also serves as the fallback whenever an
 * optional remote AI provider is unavailable (see adviceService.ts).
 */

import type { AdviceMode, AdviceRole } from '../decisions/decisionTypes';
import type { GameState } from '../simulation/simulationTypes';

export type { AdviceMode, AdviceRole };

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

// ---------------------------------------------------------------------------
// Rich advice (what the player sees)
// ---------------------------------------------------------------------------

/** How worrying the downside of an option is. */
export type RiskLevel = 'low' | 'moderate' | 'high';

/** One of the (up to three) options the advisor puts in front of the player. */
export interface AdviceOption {
  role: AdviceRole;
  actionId: string;
  label: string;
  /** Why this option is worth considering. */
  reason: string;
  /** What could go wrong, explained (never just "don't do this"). */
  risk: string;
  riskLevel: RiskLevel;
  /** What is expected to happen if the player picks it. */
  consequence: string;
  /** Internal ranking score (higher is better). */
  score: number;
}

/**
 * Full advice for one decision: a recommendation plus its reason, risk and
 * expected consequence, and the Recommended / Alternative / Risky options.
 */
export interface Advice extends Recommendation {
  /** Short headline, e.g. "Prioritise Life Support". */
  headline: string;
  reason: string;
  risk: string;
  expectedConsequence: string;
  /** Recommended first, then alternative, then risky (when they exist). */
  options: AdviceOption[];
  /** 'rules' = rule-based, 'ai' = remote model, 'fallback' = safety protocol. */
  mode: AdviceMode;
  /** Short label for who produced this advice. */
  source: string;
  /** Shown to the player when the advisor had to switch modes. */
  notice?: string;
}
