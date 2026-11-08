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

import type {
  CrewState,
  MissionStatus,
  ResourceChanges,
  Resources,
} from '../simulation/simulationTypes';

/**
 * Whether the player accepted the AI advisor's recommendation or overrode it.
 * "self-directed" means the player decided without consulting the advisor.
 */
export type PlayerChoice = 'accepted-recommendation' | 'overrode-recommendation' | 'self-directed';

/** How an advice snapshot was produced. */
export type AdviceMode = 'rules' | 'ai' | 'fallback';

/** Which of the three advisor options the player picked, if any. */
export type AdviceRole = 'recommended' | 'alternative' | 'risky';

/**
 * A compact, serialisable copy of what the advisor said when the player
 * decided. Stored on the DecisionRecord so the debrief can show the
 * recommendation, the player's decision and the outcome side by side.
 */
export interface AdviceSnapshot {
  /** The action the advisor recommended. */
  recommendedActionId: string;
  recommendedLabel: string;
  confidence: 'low' | 'medium' | 'high';
  /** 'rules' = rule-based, 'ai' = remote model, 'fallback' = Mission Safety Protocol. */
  mode: AdviceMode;
  reason: string;
  risk: string;
  expectedConsequence: string;
  /** The role of the option the player picked (recommended / alternative / risky). */
  chosenRole?: AdviceRole;
}

/** What the state looked like right after a decision was applied. */
export interface DecisionOutcome {
  /** Plain-language list of what changed, e.g. "Power −4, Life support +3". */
  summary: string;
  statusAfter: MissionStatus;
  resourcesAfter: Resources;
  crewAfter: CrewState;
}

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
  /** What the advisor said at the time (optional; older callers omit it). */
  advice?: AdviceSnapshot;
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
  /** Advisor snapshot at decision time. Absent on old saves or unadvised choices. */
  advice?: AdviceSnapshot;
  /** State right after the decision. Absent on old saves. */
  outcome?: DecisionOutcome;
}
