/**
 * comparisonTypes.ts
 * ------------------
 * Types for Feature 6 — Compare Decisions (What If?).
 *
 * All types here describe READ-ONLY derived data. Nothing mutates game state
 * or redefines shared types. Immediate effects for alternatives come from the
 * event catalog's declared ActionEffect — the same values the engine would
 * apply. Delayed effects come from the catalog's DelayedActionEffect array.
 *
 * IMPORTANT: Alternative effects are DECLARED, not RECORDED. The player never
 * took those actions, so we cannot confirm what would actually have happened
 * beyond the immediate deltas. All types carry explicit provenance flags so
 * the UI can distinguish "recorded result" from "declared effect (not played)".
 */

import type { DecisionRecord } from '../decisions/decisionTypes';
import type {
  CrewChanges,
  ResourceChanges,
  SystemChanges,
} from '../simulation/simulationTypes';
import type { EventSeverity } from '../events/eventTypes';

// ---------------------------------------------------------------------------
// Effect provenance — makes the recorded/declared distinction type-safe
// ---------------------------------------------------------------------------

/** Where the effect data comes from. */
export type EffectProvenance =
  | 'recorded'   // Engine actually applied this; stored in DecisionRecord.
  | 'declared';  // Defined in the event catalog; never actually applied.

// ---------------------------------------------------------------------------
// Effect summary (one column in the side-by-side comparison)
// ---------------------------------------------------------------------------

/** A set of immediate deltas with their provenance. */
export interface EffectSummary {
  provenance: EffectProvenance;
  resources: ResourceChanges;
  crew: CrewChanges;
  systems: SystemChanges;
}

/** A delayed consequence declared in the event catalog. */
export interface DeclaredDelayedEffect {
  /** Days after the decision the effect would fire. */
  delayInDays: number;
  /** Human-readable description from the catalog. */
  description: string;
  /** The type of change (resource / crew / system / status). */
  kind: 'resource' | 'crew' | 'system' | 'status';
}

/** A delayed consequence for the chosen action, with confirmation status. */
export interface ChosenDelayedEffect extends DeclaredDelayedEffect {
  /**
   * Whether the game has confirmed this consequence actually occurred.
   * true  = scheduledDay <= current day AND no longer in pendingEffects.
   * false = still pending or not yet reached.
   */
  confirmed: boolean;
  /** The sol this consequence was scheduled for. */
  scheduledDay: number;
}

// ---------------------------------------------------------------------------
// Action summaries (one per column in the comparison card)
// ---------------------------------------------------------------------------

/** The action the player actually chose. */
export interface ChosenActionSummary {
  actionId: string;
  label: string;
  description: string;
  /** Immediate effects the engine RECORDED for this action. */
  immediateEffects: EffectSummary;
  /** Delayed consequences declared in the catalog, with confirmation status. */
  delayedEffects: ChosenDelayedEffect[];
}

/** An alternative action the player did NOT choose. */
export interface AlternativeActionSummary {
  actionId: string;
  label: string;
  description: string;
  /** Immediate effects DECLARED in the event catalog (never applied). */
  immediateEffects: EffectSummary;
  /** Delayed consequences DECLARED in the catalog (never scheduled). */
  delayedEffects: DeclaredDelayedEffect[];
}

// ---------------------------------------------------------------------------
// The complete comparison for one decision point
// ---------------------------------------------------------------------------

/** Event context for the decision, looked up from the catalog. */
export interface ComparisonEventContext {
  eventId: string;
  title: string;
  description: string;
  severity: EventSeverity;
}

/** A complete What-If comparison for a single event-based decision. */
export interface DecisionComparison {
  /** Unique key (the DecisionRecord.id). */
  id: string;
  /** The sol on which the decision was made. */
  day: number;
  /** The original immutable decision record. */
  record: DecisionRecord;
  /** The event that prompted this decision. */
  eventContext: ComparisonEventContext;
  /** What the player actually chose. */
  chosen: ChosenActionSummary;
  /** The actions the player did NOT choose (1 or 2 typically). */
  alternatives: AlternativeActionSummary[];
  /** A generated plain-language takeaway summarising the core trade-off. */
  takeaway: string;
}
