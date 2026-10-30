/**
 * timelineBuilder.ts
 * ------------------
 * Pure function that turns a GameState into a sorted array of
 * EnhancedTimelineEntry items. READ-ONLY: never mutates state.
 *
 * Reuses the existing decisionHistory.ts helpers where appropriate:
 *  - upcomingEffects() to read pending delayed effects (sorted by scheduledDay)
 *
 * Does NOT duplicate decisionHistory.ts logic. The existing module provides
 * individual query helpers (recent decisions, decisions on a day, effect→decision
 * lookup). This module does something different: it builds a COMPLETE sorted
 * timeline merging decisions with milestones and links consequences in the
 * REVERSE direction (decision→effects) for the visual timeline display.
 *
 * Data sources (all from existing GameState — no teammate files modified):
 *  - state.history       → decision entries
 *  - upcomingEffects()   → linked consequences (via sourceDecisionId)
 *  - state.character      → occupation milestone
 *  - state.mission        → start / resupply / outcome milestones
 *  - event catalog        → event title/severity lookup (best-effort)
 *
 * Anything not in the data is NOT invented. Missing catalog lookups produce
 * null fields; missing pending effects produce empty arrays.
 */

import { findEvent } from '../../events/eventCatalog';
import { getOccupation } from '../../mission/occupations';
import { getMission } from '../../mission/missions';
import { upcomingEffects } from '../../decisions/decisionHistory';
import type { GameState } from '../../simulation/simulationTypes';
import type {
  DecisionEntry,
  EnhancedTimelineEntry,
  EventContext,
  MilestoneEntry,
  TimelineConsequence,
} from './timelineTypes';

// ---------------------------------------------------------------------------
// Milestone generation
// ---------------------------------------------------------------------------

/** Build synthetic milestone entries from verifiable state data. */
function buildMilestones(state: GameState): MilestoneEntry[] {
  const milestones: MilestoneEntry[] = [];
  const occ = getOccupation(state.character.occupation);
  const mission = getMission(state.mission.missionType);

  // Sol 1: mission start
  milestones.push({
    kind: 'milestone',
    id: 'milestone-start',
    day: 1,
    sortOrder: 0,
    label: `Mission Started — ${occ.label}`,
    description: `Deployed to ${mission.label} outpost. Objective: ${state.mission.objective}. Philosophy: ${state.mission.operatingPhilosophy}.`,
    icon: 'rocket',
  });

  // Resupply (only if it actually happened)
  if (state.mission.resupplyDelivered) {
    // The resupply fires on supplyWindow + 1, but supplyWindow is a private
    // detail. We know it delivered, and the RESUPPLY_DAY constant is 15 for
    // non-deep-space. We can read the day from the mission config — but since
    // supplyWindow is on the mission state, let's use it directly.
    milestones.push({
      kind: 'milestone',
      id: 'milestone-resupply',
      day: state.mission.supplyWindow + 1,
      sortOrder: 0,
      label: 'Resupply Delivered',
      description: 'A supply drop replenished all four resources.',
      icon: 'package',
    });
  }

  // Mission outcome (only if terminal)
  if (state.mission.status === 'completed') {
    milestones.push({
      kind: 'milestone',
      id: 'milestone-outcome',
      day: state.day,
      sortOrder: 9999,
      label: 'Mission Complete',
      description: `Survived to extraction. Final score: ${Math.round(state.mission.score)}.`,
      icon: 'flag',
    });
  } else if (state.mission.status === 'failed') {
    milestones.push({
      kind: 'milestone',
      id: 'milestone-outcome',
      day: state.day,
      sortOrder: 9999,
      label: 'Mission Failed',
      description: `The mission ended on Sol ${state.day}. Final score: ${Math.round(state.mission.score)}.`,
      icon: 'skull',
    });
  }

  return milestones;
}

// ---------------------------------------------------------------------------
// Decision entry generation
// ---------------------------------------------------------------------------

/** Map a DecisionRecord to an EnhancedTimelineEntry with linked data. */
function buildDecisionEntries(state: GameState): DecisionEntry[] {
  // Use the existing upcomingEffects() helper from decisionHistory.ts to read
  // pending effects. That function returns the same pendingEffects array sorted
  // by scheduledDay — we re-index it by sourceDecisionId for O(1) lookup per
  // decision. (decisionHistory.ts provides the reverse lookup —
  // sourceDecisionFor() — which goes effect→decision. The timeline needs
  // decision→effects, so we build a Map here. This is not duplication: it is
  // the inverse direction that decisionHistory doesn't offer.)
  const pendingByDecision = new Map<string, TimelineConsequence[]>();
  for (const effect of upcomingEffects(state)) {
    const list = pendingByDecision.get(effect.sourceDecisionId) ?? [];
    list.push({
      effectId: effect.id,
      scheduledDay: effect.scheduledDay,
      description: effect.description,
      effectType: effect.type,
    });
    pendingByDecision.set(effect.sourceDecisionId, list);
  }

  return state.history.map((record, index) => {
    // Event context: best-effort catalog lookup.
    let eventContext: EventContext | null = null;
    if (record.eventId) {
      const catalogEvent = findEvent(record.eventId);
      eventContext = {
        eventId: record.eventId,
        title: catalogEvent?.title ?? null,
        severity: catalogEvent?.severity ?? null,
      };
    }

    // Advisor relationship mapping.
    const advisorRelation =
      record.playerChoice === 'accepted-recommendation'
        ? ('followed' as const)
        : record.playerChoice === 'overrode-recommendation'
          ? ('overrode' as const)
          : ('self-directed' as const);

    return {
      kind: 'decision' as const,
      id: record.id,
      day: record.day,
      // Decisions sort after milestones on the same Sol. Use index to preserve
      // chronological order among multiple decisions on the same Sol.
      sortOrder: 100 + index,
      record,
      actionLabel: record.actionLabel,
      explanation: record.explanation,
      resourceChanges: record.resourceChanges,
      advisorRelation,
      eventContext,
      pendingConsequences: pendingByDecision.get(record.id) ?? [],
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the complete enhanced timeline from the current game state.
 * Sorted chronologically by (day, sortOrder). Pure function — no side effects.
 */
export function buildEnhancedTimeline(state: GameState): EnhancedTimelineEntry[] {
  const milestones = buildMilestones(state);
  const decisions = buildDecisionEntries(state);

  const all: EnhancedTimelineEntry[] = [...milestones, ...decisions];

  // Stable sort: primary by day, secondary by sortOrder.
  all.sort((a, b) => a.day - b.day || a.sortOrder - b.sortOrder);

  return all;
}
