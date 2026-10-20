/**
 * debriefBuilder.ts
 * -----------------
 * Pure functions that turn a finished (or in-progress) GameState into a
 * DebriefSummary. READ-ONLY: never rewrites history or mutates state.
 */

import { addResourceChanges } from '../simulation/resourceCalculations';
import { RESOURCE_KEYS, type GameState, type ResourceKey } from '../simulation/simulationTypes';
import type {
  DebriefSummary,
  LeadershipProfile,
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

/** Derive a lightweight leadership profile from decision patterns. */
export function buildLeadershipProfile(state: GameState): LeadershipProfile {
  const total = state.history.length;
  if (total === 0) {
    return { advisorTrust: 0, caution: 0, ambition: 0 };
  }

  const accepted = state.history.filter(
    (d) => d.playerChoice === 'accepted-recommendation'
  ).length;

  // Caution: share of decisions that preserved food/water (positive deltas).
  const cautiousMoves = state.history.filter((d) => {
    const f = d.resourceChanges.food ?? 0;
    const w = d.resourceChanges.water ?? 0;
    return f > 0 || w > 0;
  }).length;

  // Ambition: share of decisions that spent power to invest (negative power).
  const ambitiousMoves = state.history.filter((d) => (d.resourceChanges.power ?? 0) < 0).length;

  const pct = (n: number): number => Math.round((n / total) * 100);

  return {
    advisorTrust: pct(accepted),
    caution: pct(cautiousMoves),
    ambition: pct(ambitiousMoves),
  };
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
