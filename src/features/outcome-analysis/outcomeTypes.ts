/**
 * outcomeTypes.ts
 * ----------------
 * Types for the Mission Outcome Analysis feature (Feature 3).
 *
 * All types here describe READ-ONLY derived data computed from the existing
 * GameState. Nothing here mutates game state or redefines shared types.
 */

import type {
  MissionStatus,
  ResourceKey,
  StatusLevel,
} from '../simulation/simulationTypes';
import type { DecisionRecord } from '../decisions/decisionTypes';

// ---------------------------------------------------------------------------
// Mission Results
// ---------------------------------------------------------------------------

/** Final resource snapshot with qualitative status level. */
export interface ResourceResult {
  key: ResourceKey;
  label: string;
  value: number;
  level: StatusLevel;
}

/** Final crew status snapshot. */
export interface CrewResult {
  health: number;
  healthLevel: StatusLevel;
  morale: number;
  moraleLevel: StatusLevel;
  radiationExposure: number;
  radiationLevel: StatusLevel;
  /** Whether the character survived the mission. */
  survived: boolean;
}

/** Life-support system snapshot. */
export interface LifeSupportResult {
  efficiency: number;
  level: StatusLevel;
}

/** Complete mission results derived from final GameState. */
export interface MissionResults {
  status: MissionStatus;
  daysSurvived: number;
  finalScore: number;
  totalDecisions: number;
  resources: ResourceResult[];
  crew: CrewResult;
  lifeSupport: LifeSupportResult;
  /** The mission type label (e.g. "Mars", "Lunar"). */
  missionTypeLabel: string;
}

// ---------------------------------------------------------------------------
// Decision impact
// ---------------------------------------------------------------------------

/** A decision ranked by its net resource impact. */
export interface RankedDecision {
  record: DecisionRecord;
  /** Absolute sum of all resource deltas — measures magnitude of impact. */
  absoluteImpact: number;
  /** Net signed sum of resource deltas — positive = net gain, negative = net drain. */
  netImpact: number;
  /** The event title if this decision responded to an event, or null. */
  eventTitle: string | null;
}

// ---------------------------------------------------------------------------
// Recorded consequences
// ---------------------------------------------------------------------------

/**
 * A delayed effect that has already fired (its scheduledDay <= current day)
 * and is no longer in pendingEffects. We derive these by finding effects whose
 * sourceDecisionId is in history and whose scheduledDay has passed.
 *
 * NOTE: The game removes fired effects from pendingEffects after processing,
 * so we cannot enumerate them directly. Instead we identify decisions that
 * had delayed effects declared in the event catalog and whose scheduled day
 * has passed. For consequences still pending (scheduledDay > state.day), we
 * read them from state.pendingEffects.
 */
export interface RecordedConsequence {
  /** The decision that caused this consequence. */
  sourceDecision: DecisionRecord;
  /** Human-readable description of the consequence. */
  description: string;
  /** The sol the consequence was scheduled for. */
  scheduledDay: number;
  /** Whether this consequence has already occurred (scheduledDay <= current day). */
  hasFired: boolean;
}

// ---------------------------------------------------------------------------
// Outcome analysis (explanations)
// ---------------------------------------------------------------------------

/** A single insight about what went well or could be improved. */
export interface AnalysisInsight {
  /** Short heading for the insight. */
  title: string;
  /** Explanatory detail grounded in recorded game data. */
  detail: string;
  /** Qualitative tone for UI styling. */
  tone: 'positive' | 'negative' | 'neutral';
}

/** Deterministic explanation of the mission outcome. */
export interface OutcomeExplanationData {
  /** Plain-language summary of why the mission ended as it did. */
  primaryReason: string;
  /** Insights about effective management. */
  wentWell: AnalysisInsight[];
  /** Insights about areas for improvement. */
  couldImprove: AnalysisInsight[];
  /** How earlier decisions influenced later outcomes (cause-effect chains). */
  causeEffectChains: CauseEffectChain[];
}

/** A chain linking an early decision to a later consequence. */
export interface CauseEffectChain {
  /** The triggering decision. */
  decision: DecisionRecord;
  /** What happened as a result. */
  consequence: string;
  /** The sol the consequence occurred or is scheduled for. */
  consequenceDay: number;
}

// ---------------------------------------------------------------------------
// Complete analysis payload
// ---------------------------------------------------------------------------

/** Everything the OutcomeAnalysis component needs to render. */
export interface FullOutcomeAnalysis {
  results: MissionResults;
  rankedDecisions: RankedDecision[];
  recordedConsequences: RecordedConsequence[];
  explanation: OutcomeExplanationData;
}
