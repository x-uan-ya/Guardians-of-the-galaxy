/**
 * debriefBuilder.ts
 * -----------------
 * Pure functions that turn a finished (or in-progress) GameState into a
 * DebriefSummary. READ-ONLY: never rewrites history or mutates state.
 */

import { addResourceChanges } from '../simulation/resourceCalculations';
import { RESOURCE_KEYS, type GameState, type ResourceKey } from '../simulation/simulationTypes';
import { scoreLeadershipProfile } from '../leadership-profile/leadershipScorer';
import type { LeadershipProfileResult } from '../leadership-profile/leadershipTypes';
import type {
  DebriefSummary,
  TimelineEntry,
} from './debriefTypes';

/** Build the ordered decision timeline from history. */
export function buildTimeline(state: GameState): TimelineEntry[] {
  return state.history.map((record) => ({
    day: record.day,
    actionLabel: record.actionLabel,
    explanation: record.explanation,
    overrodeAdvisor: record.playerChoice === 'overrode-recommendation',
    record,
  }));
}

/** Derive the five-trait leadership profile from decision patterns. */
export function buildLeadershipProfile(state: GameState): LeadershipProfileResult {
  return scoreLeadershipProfile(state);
}

/** Net resource change across the whole mission (sum of recorded deltas). */
export function netResourceChange(state: GameState): Record<ResourceKey, number> {
  let acc = {} as Partial<Record<ResourceKey, number>>;
  for (const d of state.history) {
    acc = addResourceChanges(acc, d.resourceChanges);
  }
  const out = {} as Record<ResourceKey, number>;
  for (const key of RESOURCE_KEYS) {
    out[key] = acc[key] ?? 0;
  }
  return out;
}

/** Assemble the complete debrief summary. */
export function buildDebriefSummary(state: GameState): DebriefSummary {
  return {
    finalStatus: state.mission.status,
    finalScore: state.mission.score,
    daysSurvived: state.day,
    totalDecisions: state.history.length,
    netResourceChange: netResourceChange(state),
    timeline: buildTimeline(state),
    leadershipProfile: buildLeadershipProfile(state),
  };
}
