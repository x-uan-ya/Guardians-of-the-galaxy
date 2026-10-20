/**
 * simulationTypes.ts
 * ------------------
 * THE single shared game-state contract for MARS: OUTPOST ZERO.
 *
 * Every module imports these types. Do NOT redefine copies of GameState,
 * Resources, CrewState, etc. in feature folders. If a shape needs to change,
 * change it here so all six teammates stay in sync.
 *
 * UNITS & BOUNDS (read this before touching numbers):
 * ---------------------------------------------------
 * All four primary resources (power, water, food, oxygen) are stored as a
 * STORED PERCENTAGE of maximum capacity on a 0..100 scale. 100 means "tanks
 * full", 0 means "depleted". We use percentages (not absolute litres/kWh) so
 * that UI progress bars and simulation math share one consistent scale.
 *
 * Crew metrics (health, morale) are 0..100 percentages. radiationExposure is a
 * 0..100 accumulation index (0 = none, 100 = lethal dose reached).
 *
 * System metrics (powerGeneration, lifeSupportEfficiency, foodProduction,
 * shieldingIntegrity) are 0..100 efficiency percentages that scale how much a
 * system contributes each simulation day.
 *
 * These are GAMEPLAY ASSUMPTIONS for an educational simulation. They are NOT
 * real NASA engineering specifications.
 */

/** Schema version for persisted game state. Bump when the shape changes. */
export const SCHEMA_VERSION = 1;

/** Shared numeric bounds for every 0..100 metric in the game. */
export const METRIC_MIN = 0;
export const METRIC_MAX = 100;

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

/** The four primary life-support resources, each a 0..100 stored percentage. */
export interface Resources {
  /** Electrical power reserve, 0..100 %. */
  power: number;
  /** Potable + recyclable water reserve, 0..100 %. */
  water: number;
  /** Food stores, 0..100 %. */
  food: number;
  /** Breathable oxygen reserve, 0..100 %. */
  oxygen: number;
}

/** A resource key, useful for iterating the four resources generically. */
export type ResourceKey = keyof Resources;

/** The canonical, ordered list of resource keys (stable for UI + tests). */
export const RESOURCE_KEYS: readonly ResourceKey[] = ['power', 'water', 'food', 'oxygen'];

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

/** Aggregate crew condition. All values 0..100. */
export interface CrewState {
  /** Average crew physical health, 0..100 %. */
  health: number;
  /** Accumulated radiation exposure index, 0 (none) .. 100 (lethal). */
  radiationExposure: number;
  /** Crew morale, 0..100 %. */
  morale: number;
}

// ---------------------------------------------------------------------------
// Systems
// ---------------------------------------------------------------------------

/** Outpost engineering systems. All values are 0..100 efficiency %. */
export interface SystemState {
  /** Solar/RTG power generation efficiency, 0..100 %. */
  powerGeneration: number;
  /** Life-support (air/water recycling) efficiency, 0..100 %. */
  lifeSupportEfficiency: number;
  /** Greenhouse food production efficiency, 0..100 %. */
  foodProduction: number;
  /** Radiation shielding integrity, 0..100 %. */
  shieldingIntegrity: number;
}

// ---------------------------------------------------------------------------
// Mission
// ---------------------------------------------------------------------------

/** High-level mission goal. */
export type MissionObjective = 'survival' | 'science' | 'settlement';

/** How aggressively the outpost consumes/invests resources. */
export type OperatingPhilosophy = 'conservative' | 'balanced' | 'ambitious';

/** Starting-condition preset. */
export type StartingCondition = 'standard' | 'resource-constrained';

/** Lifecycle status of the mission. */
export type MissionStatus = 'active' | 'critical' | 'completed' | 'failed';

export interface MissionState {
  objective: MissionObjective;
  operatingPhilosophy: OperatingPhilosophy;
  /** Preset that generated the starting values (kept for the debrief). */
  startingCondition: StartingCondition;
  status: MissionStatus;
  /** Running mission score (higher is better). */
  score: number;
}

// ---------------------------------------------------------------------------
// Resource changes (shared by decisions, events, effects)
// ---------------------------------------------------------------------------

/**
 * A partial set of signed deltas applied to resources. Values are in the same
 * 0..100 percentage space. Positive adds, negative consumes. Omitted keys are
 * treated as 0.
 */
export type ResourceChanges = Partial<Record<ResourceKey, number>>;

/** A partial set of signed deltas applied to crew metrics (0..100 space). */
export type CrewChanges = Partial<Record<keyof CrewState, number>>;

/** A partial set of signed deltas applied to system metrics (0..100 space). */
export type SystemChanges = Partial<Record<keyof SystemState, number>>;

// ---------------------------------------------------------------------------
// Decisions (full type lives in decisions/decisionTypes.ts, imported here)
// ---------------------------------------------------------------------------

export type { DecisionRecord, PlayerChoice } from '../decisions/decisionTypes';

// ---------------------------------------------------------------------------
// Delayed effects
// ---------------------------------------------------------------------------

/** Categories of delayed effect the engine knows how to process. */
export type DelayedEffectType = 'resource' | 'crew' | 'system' | 'status';

/**
 * A consequence scheduled to apply on a future day. Delayed effects are how we
 * model "decisions create immediate AND delayed consequences". The engine
 * applies these only when `day >= scheduledDay`, exactly once.
 */
export interface DelayedEffect {
  id: string;
  /** The DecisionRecord.id that caused this effect (causal tracking). */
  sourceDecisionId: string;
  /** Simulation day on which this effect becomes active. */
  scheduledDay: number;
  type: DelayedEffectType;
  description: string;
  /**
   * Type-specific payload. Interpretation depends on `type`:
   *  - 'resource' -> { changes: ResourceChanges }
   *  - 'crew'     -> { changes: CrewChanges }
   *  - 'system'   -> { changes: SystemChanges }
   *  - 'status'   -> { status: MissionStatus }
   */
  parameters: DelayedEffectParameters;
}

export type DelayedEffectParameters =
  | { kind: 'resource'; changes: ResourceChanges }
  | { kind: 'crew'; changes: CrewChanges }
  | { kind: 'system'; changes: SystemChanges }
  | { kind: 'status'; status: MissionStatus };

// ---------------------------------------------------------------------------
// Events (full catalog lives in events/eventTypes.ts, imported here)
// ---------------------------------------------------------------------------

export type { GameEvent, EventAction, EventSeverity } from '../events/eventTypes';

// ---------------------------------------------------------------------------
// GameState — the authoritative root object
// ---------------------------------------------------------------------------

import type { DecisionRecord } from '../decisions/decisionTypes';
import type { GameEvent } from '../events/eventTypes';

/**
 * The complete, serialisable game state. The simulation engine owns this; it is
 * the ONLY thing persisted to localStorage. Treat every instance as immutable —
 * engine functions return a new GameState rather than mutating in place.
 */
export interface GameState {
  /** Persisted schema version. Equals SCHEMA_VERSION for current saves. */
  schemaVersion: number;
  /** Stable unique id for this playthrough. */
  gameId: string;
  /** Current simulation day. Starts at 1. */
  day: number;
  resources: Resources;
  crew: CrewState;
  systems: SystemState;
  mission: MissionState;
  /** Events currently awaiting a player response. */
  activeEvents: GameEvent[];
  /** Immutable, append-only log of every decision the player made. */
  history: DecisionRecord[];
  /** Consequences scheduled to fire on future days. */
  pendingEffects: DelayedEffect[];
  /** ISO timestamp (ms since epoch stored as number) of creation. */
  createdAt: number;
  /** ISO timestamp (ms since epoch stored as number) of last update. */
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Derived status (computed, never persisted) — see simulationSelectors.ts
// ---------------------------------------------------------------------------

/** Qualitative level for a single metric, used for UI colour coding. */
export type StatusLevel = 'ok' | 'warn' | 'critical';

/** A derived readout for one metric: its value plus its qualitative level. */
export interface MetricStatus {
  value: number;
  level: StatusLevel;
}

/** Fully derived view of the game used by the UI. Computed, not stored. */
export interface DerivedStatus {
  resources: Record<ResourceKey, MetricStatus>;
  crew: Record<keyof CrewState, MetricStatus>;
  systems: Record<keyof SystemState, MetricStatus>;
  /** The worst level across all critical life-support metrics. */
  overall: StatusLevel;
}
