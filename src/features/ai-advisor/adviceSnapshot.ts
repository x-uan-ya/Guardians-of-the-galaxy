/**
 * adviceSnapshot.ts
 * -----------------
 * Connects advice to the player's decision. Given the advice the player saw and
 * the action they picked, produce the snapshot + PlayerChoice that the engine
 * records in the decision history.
 */

import type { AdviceSnapshot, PlayerChoice } from '../decisions/decisionTypes';
import type { Advice } from './advisorTypes';

export interface AdvisedDecision {
  playerChoice: PlayerChoice;
  /** Undefined when the player decided without any advice on screen. */
  advice: AdviceSnapshot | undefined;
}

/** Build the decision details for picking `actionId` while `advice` was shown. */
export function decisionWithAdvice(advice: Advice | null | undefined, actionId: string): AdvisedDecision {
  if (!advice) return { playerChoice: 'self-directed', advice: undefined };

  const picked = advice.options.find((o) => o.actionId === actionId);
  const recommended = advice.options.find((o) => o.role === 'recommended');

  return {
    playerChoice: actionId === advice.actionId ? 'accepted-recommendation' : 'overrode-recommendation',
    advice: {
      recommendedActionId: advice.actionId,
      recommendedLabel: recommended?.label ?? advice.headline,
      confidence: advice.confidence,
      mode: advice.mode,
      reason: advice.reason,
      risk: advice.risk,
      expectedConsequence: advice.expectedConsequence,
      ...(picked ? { chosenRole: picked.role } : {}),
    },
  };
}
