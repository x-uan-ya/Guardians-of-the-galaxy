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
 * A lightweight, derived "leadership profile" summarising decision patterns.
 * Values are 0..100 descriptive scores, not psychometric claims.
 */
export interface LeadershipProfile {
  /** Share of decisions that followed the advisor (0..100). */
  advisorTrust: number;
  /** Tendency toward resource-preserving choices (0..100). */
  caution: number;
  /** Tendency toward growth/science-investment choices (0..100). */
  ambition: number;
}

/** The complete debrief payload rendered by Debrief.tsx. */
export interface DebriefSummary {
  finalStatus: MissionStatus;
  finalScore: number;
  daysSurvived: number;
  totalDecisions: number;
  /** Net change per resource across the whole mission. */
  netResourceChange: Record<ResourceKey, number>;
  timeline: TimelineEntry[];
  leadershipProfile: LeadershipProfile;
}
