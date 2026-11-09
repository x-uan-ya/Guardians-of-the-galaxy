/**
 * timelineTypes.ts
 * ----------------
 * Types for the enhanced Decision Timeline. All data here is READ-ONLY and
 * derived from the existing GameState — no shared types are modified.
 *
 * The timeline displays three kinds of entries:
 *  - milestones: synthetic markers for mission start, resupply, outcome
 *  - decisions: one per DecisionRecord in state.history
 *  - (future) fired-effects: blocked until Person 2 adds a firedEffects log
 */

import type { DecisionRecord } from '../../decisions/decisionTypes';
import type { EventSeverity } from '../../events/eventTypes';
import type { DelayedEffect, ResourceChanges } from '../../simulation/simulationTypes';

// ---------------------------------------------------------------------------
// Consequence link (decision → pending delayed effect)
// ---------------------------------------------------------------------------

/** A delayed effect that is still pending, linked back to the decision that caused it. */
export interface TimelineConsequence {
  /** The DelayedEffect id. */
  effectId: string;
  /** Sol on which the effect is scheduled to fire. */
  scheduledDay: number;
  /** Human-readable description from the effect definition. */
  description: string;
  /** The effect type (resource / crew / system / status). */
  effectType: DelayedEffect['type'];
}

// ---------------------------------------------------------------------------
// Timeline entry variants
// ---------------------------------------------------------------------------

/** A synthetic milestone marker (not from history — derived from state). */
export interface MilestoneEntry {
  kind: 'milestone';
  /** Unique key for React. */
  id: string;
  day: number;
  /** Sort tiebreaker: milestones render before decisions on the same Sol. */
  sortOrder: number;
  label: string;
  description: string;
  icon: 'rocket' | 'package' | 'flag' | 'skull';
}

/** A decision the player actually made (one per DecisionRecord). */
export interface DecisionEntry {
  kind: 'decision';
  id: string;
  day: number;
  sortOrder: number;
  /** The original immutable record. */
  record: DecisionRecord;
  /** Human-readable action label (from the record). */
  actionLabel: string;
  /** Engine-recorded explanation (from the record). */
  explanation: string;
  /** Immediate resource deltas applied by this decision. */
  resourceChanges: ResourceChanges;
  /**
   * Advisor relationship:
   * - 'followed' — player accepted the recommendation
   * - 'overrode' — player chose a different action
   * - 'self-directed' — no advisor recommendation was active
   */
  advisorRelation: 'followed' | 'overrode' | 'self-directed';
  /** If this decision responded to a crisis/event: catalog lookup data. */
  eventContext: EventContext | null;
  /** Pending delayed effects caused by THIS decision (via sourceDecisionId). */
  pendingConsequences: TimelineConsequence[];
}

/** Event context looked up from the catalog at render time. */
export interface EventContext {
  eventId: string;
  /** Title from the event catalog (if the event is found). */
  title: string | null;
  /** Severity from the event catalog (if the event is found). */
  severity: EventSeverity | null;
}

// ---------------------------------------------------------------------------
// The union
// ---------------------------------------------------------------------------

/** Any entry that appears on the enhanced timeline. */
export type EnhancedTimelineEntry = MilestoneEntry | DecisionEntry;
