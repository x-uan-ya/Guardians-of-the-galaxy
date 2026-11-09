/**
 * leadershipTypes.ts
 * ------------------
 * Types for the five-profile leadership scoring system.
 *
 * The system analyses a player's recorded decisions and assigns scores for
 * five leadership traits. The highest-scoring trait becomes the player's
 * leadership profile. All scoring is deterministic and derived from the
 * immutable decision history — no randomness, no invented data.
 */

/** The five leadership traits the system evaluates. */
export type LeadershipTrait =
  | 'riskTaker'
  | 'survivor'
  | 'optimiser'
  | 'humanitarian'
  | 'explorer';

/** Canonical ordered list of traits (stable for UI iteration). */
export const LEADERSHIP_TRAITS: readonly LeadershipTrait[] = [
  'riskTaker',
  'survivor',
  'optimiser',
  'humanitarian',
  'explorer',
];

/**
 * The set of trait signals an action can carry. An action may contribute to
 * zero, one, or several traits simultaneously. For example, an action that
 * shelters the crew during a storm could signal both 'survivor' and
 * 'humanitarian'.
 */
export type TraitSignals = Partial<Record<LeadershipTrait, true>>;

/** The five leadership scores, each 0..100. */
export type LeadershipScores = Record<LeadershipTrait, number>;

/**
 * The result of scoring a player's decision history. Contains the five
 * individual scores, the assigned profile (if any), and whether there was
 * enough data to make a reliable assignment.
 */
export interface LeadershipProfileResult {
  /** Individual 0..100 score for each of the five traits. */
  scores: LeadershipScores;
  /** The trait with the highest score, or null if data is insufficient. */
  assignedTrait: LeadershipTrait | null;
  /** True when the player has too few decisions for a meaningful profile. */
  insufficientData: boolean;
  /** Total decisions analysed. */
  totalDecisions: number;
}

/** Minimum number of decisions required for a profile assignment. */
export const MIN_DECISIONS_FOR_PROFILE = 3;
