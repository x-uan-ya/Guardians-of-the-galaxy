/**
 * leadershipScorer.ts
 * -------------------
 * Pure, deterministic scoring functions that analyse a player's recorded
 * decision history and produce five leadership trait scores (0..100) plus an
 * assigned leadership profile.
 *
 * SCORING RULES
 * =============
 *
 * 1. Every DecisionRecord in GameState.history is classified by its actionId
 *    using the static action classifier (actionClassifier.ts). The classifier
 *    returns zero or more trait signals per action based on the action's
 *    narrative meaning in the event catalog — NOT based on resource cost,
 *    NOT based on whether the player overrode the AI advisor.
 *
 * 2. For each of the five traits, the raw score is:
 *
 *        rawScore(trait) = decisionsSignalling(trait) / totalDecisions
 *
 *    where decisionsSignalling(trait) is the count of decisions whose actionId
 *    carries a signal for that trait, and totalDecisions is the total number
 *    of decisions in the history.
 *
 *    A decision that signals multiple traits (e.g. survivor + humanitarian)
 *    contributes +1 to EACH of those traits. This means trait scores are
 *    independent and may all be high if the player consistently chose
 *    multi-signal actions.
 *
 * 3. The raw score (a 0..1 ratio) is converted to a 0..100 integer:
 *
 *        score(trait) = round(rawScore(trait) * 100)
 *
 * 4. The assigned profile is the trait with the HIGHEST score. In case of a
 *    tie, the first trait in the canonical LEADERSHIP_TRAITS order wins. This
 *    order is: riskTaker, survivor, optimiser, humanitarian, explorer. This
 *    is arbitrary but deterministic — the same history always produces the
 *    same profile.
 *
 * 5. If the player has fewer than MIN_DECISIONS_FOR_PROFILE decisions (3),
 *    the scores are still computed but no profile is assigned. The result
 *    sets `insufficientData = true` and `assignedTrait = null`.
 *
 * 6. If every trait scores 0 (e.g. all decisions had unclassified actionIds),
 *    no profile is assigned regardless of decision count.
 *
 * DETERMINISM GUARANTEE
 * =====================
 * The same GameState.history always produces the same LeadershipProfileResult.
 * There is no randomness, no dependency on wall-clock time, and no external
 * state. The only inputs are the decision records and the static classifier.
 *
 * This module is pure: no I/O, no React, no mutation of any game state.
 */

import type { GameState } from '../simulation/simulationTypes';
import { classifyAction } from './actionClassifier';
import {
  LEADERSHIP_TRAITS,
  MIN_DECISIONS_FOR_PROFILE,
  type LeadershipProfileResult,
  type LeadershipScores,
  type LeadershipTrait,
} from './leadershipTypes';

/**
 * Score the player's decision history and assign a leadership profile.
 *
 * @param state - The current (or final) GameState. Only `state.history` is
 *   read; the rest of the state is ignored.
 * @returns A LeadershipProfileResult with five scores and the assigned trait.
 */
export function scoreLeadershipProfile(state: GameState): LeadershipProfileResult {
  const { history } = state;
  const total = history.length;

  // Initialise all scores to zero.
  const counts: Record<LeadershipTrait, number> = {
    riskTaker: 0,
    survivor: 0,
    optimiser: 0,
    humanitarian: 0,
    explorer: 0,
  };

  // Tally trait signals across all decisions.
  for (const record of history) {
    const signals = classifyAction(record.actionId);
    for (const trait of LEADERSHIP_TRAITS) {
      if (signals[trait]) {
        counts[trait] += 1;
      }
    }
  }

  // Convert counts to 0..100 percentage scores.
  const scores: LeadershipScores = {
    riskTaker: 0,
    survivor: 0,
    optimiser: 0,
    humanitarian: 0,
    explorer: 0,
  };

  if (total > 0) {
    for (const trait of LEADERSHIP_TRAITS) {
      scores[trait] = Math.round((counts[trait] / total) * 100);
    }
  }

  // Determine the assigned trait.
  const insufficientData = total < MIN_DECISIONS_FOR_PROFILE;
  const maxScore = Math.max(...LEADERSHIP_TRAITS.map((t) => scores[t]));
  const allZero = maxScore === 0;

  let assignedTrait: LeadershipTrait | null = null;
  if (!insufficientData && !allZero) {
    // First trait in canonical order with the highest score wins ties.
    assignedTrait = LEADERSHIP_TRAITS.find((t) => scores[t] === maxScore) ?? null;
  }

  return {
    scores,
    assignedTrait,
    insufficientData,
    totalDecisions: total,
  };
}
