/**
 * debriefTypes.ts
 * ---------------
 * Types for the end-of-mission debrief. The debrief module READS recorded
 * history + final state and produces a summary. It must never rewrite past
 * decisions — everything here is derived, read-only output.
 */

import type { DecisionRecord } from '../decisions/decisionTypes';
import type { MissionStatus, ResourceKey } from '../simulation/simulationTypes';

/** One entry on the decision timeline. */
export interface TimelineEntry {
  day: number;
  actionLabel: string;
  explanation: string;
  /** True when the player overrode the advisor's recommendation. */
  overrodeAdvisor: boolean;
  record: DecisionRecord;
}

/**
 * The five-trait leadership profile result produced by the leadership-profile
 * module. Re-exported here so DebriefSummary stays self-contained for
 * consumers that only import from debriefTypes.
 */
export type { LeadershipProfileResult } from '../leadership-profile/leadershipTypes';
import type { LeadershipProfileResult } from '../leadership-profile/leadershipTypes';

/** The complete debrief payload rendered by Debrief.tsx. */
export interface DebriefSummary {
  finalStatus: MissionStatus;
  finalScore: number;
  daysSurvived: number;
  totalDecisions: number;
  /** Net change per resource across the whole mission. */
  netResourceChange: Record<ResourceKey, number>;
  timeline: TimelineEntry[];
  /** Five-trait leadership profile with assigned profile and scores. */
  leadershipProfile: LeadershipProfileResult;
}
