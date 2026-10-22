/**
 * simulationEngine.ts
 * ===================
 * The authoritative, deterministic simulation engine for MARS: OUTPOST ZERO.
 * This module OWNS the game state. Nothing else may mutate resources, crew,
 * systems, mission status, history, or pending effects. React components, the
 * advisor, and event content all go THROUGH this API.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PUBLIC API (stable — teammates build on these)
 * ──────────────────────────────────────────────────────────────────────────
 *   createInitialGameState(config)        -> GameState
 *   validateGameState(state)              -> ValidationResult
 *   applyPlayerDecision(state, input)     -> GameState   (records history)
 *   advanceSimulationDay(state)           -> AdvanceResult
 *   processDelayedEffects(state)          -> GameState
 *   resolveEvent(state, eventId, actionId, choice?) -> GameState
 *   calculateDerivedStatus(state)         -> DerivedStatus   (re-exported)
 *   getSimulationSummary(state)           -> SimulationSummary
 *
 * GUARANTEES
 *  - Immutability: every function returns a NEW state; inputs are never mutated.
 *  - Determinism: same initial state + same decision sequence => same result.
 *  - Bounds: all metrics stay within [0,100]; NaN/Infinity are rejected.
 *  - Causality: delayed effects record their source decision and fire once.
 *  - Integrity: invalid action ids are rejected; history is append-only.
 */

import { generateGameId, makeId } from '../../lib/ids';
import { FREE_ACTIONS } from '../events/eventCatalog';
import { triggerEvent } from '../events/eventTriggers';
import {
  DEFAULT_CREW,
  DEFAULT_SYSTEMS,
  OBJECTIVE_SYSTEM_BONUS,
  PHILOSOPHY_CONSUMPTION,
  STARTING_SCORE,
  resourcesForCondition,
} from '../mission/missionDefaults';
import { getOccupation } from '../mission/occupations';
import type { MissionConfig } from '../mission/missionTypes';
import {
  applyDailySystemUpkeep,
  applyResearchFactor,
  dailyHealthRecovery,
  foodProductionBonus,
  initialCrewForCharacter,
} from './occupationEffects';
import type { DecisionInput, DecisionRecord, PlayerChoice } from '../decisions/decisionTypes';
import {
  processDueEffects,
  scheduleDelayedEffects,
} from './effectProcessor';
import { InvalidDecisionError, resolveDecisionAction } from './eventResolver';
import {
  applyCrewChanges,
  applyResourceChanges,
  applySystemChanges,
  clamp,
  computeDailyResourceDelta,
  isValidNumber,
  round2,
  sanitizeResourceChanges,
} from './resourceCalculations';
import { calculateDerivedStatus } from './simulationSelectors';
import {
  ATTRIBUTE_KEYS,
  METRIC_MAX,
  METRIC_MIN,
  OCCUPATIONS,
  RESOURCE_KEYS,
  SCHEMA_VERSION,
  type CharacterState,
  type DelayedEffect,
  type GameState,
  type MissionStatus,
  type Occupation,
  type ResourceChanges,
  type SystemChanges,
  type SystemState,
} from './simulationTypes';

// Re-export selectors so callers have one import surface for the engine.
export { calculateDerivedStatus } from './simulationSelectors';
export { InvalidDecisionError } from './eventResolver';

/**
 * Small starting system nudge per occupation, so the choice is felt on day 1
 * (illustrative gameplay tuning). Engineer runs tighter systems; botanist
 * starts with a greener greenhouse; medical/scientist lean elsewhere.
 */
const OCCUPATION_SYSTEM_BONUS: Record<Occupation, SystemChanges> = {
  engineer: { powerGeneration: 5, lifeSupportEfficiency: 4 },
  scientist: { powerGeneration: 3 },
  medicalOfficer: { lifeSupportEfficiency: 3, shieldingIntegrity: 2 },
  botanist: { foodProduction: 6 },
};

// ---------------------------------------------------------------------------
// createInitialGameState
// ---------------------------------------------------------------------------

/**
 * Build a fresh, valid, playable GameState from a mission config. Starting
 * values come from missionDefaults (documented gameplay assumptions).
 */
export function createInitialGameState(config: MissionConfig): GameState {
  const gameId = config.gameId ?? generateGameId();
  const now = config.now ?? Date.now();

  const resources = resourcesForCondition(config.startingCondition);

  // Resolve the chosen occupation and seed the character.
  const occupationDef = getOccupation(config.occupation);
  const character: CharacterState = {
    occupation: config.occupation,
    attributes: { ...occupationDef.attributes },
  };

  // Apply the objective's small system bonus on top of the defaults, then a
  // small occupation-based nudge so the choice matters from day 1.
  const bonus = OBJECTIVE_SYSTEM_BONUS[config.objective];
  let systems: SystemState = applySystemChanges({ ...DEFAULT_SYSTEMS }, bonus);
  systems = applySystemChanges(systems, OCCUPATION_SYSTEM_BONUS[config.occupation]);

  // The character's starting live health comes from their health attribute.
  const crew = initialCrewForCharacter(DEFAULT_CREW, character.attributes);

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    gameId,
    day: 1,
    resources,
    character,
    crew,
    systems,
    mission: {
      objective: config.objective,
      operatingPhilosophy: config.operatingPhilosophy,
      startingCondition: config.startingCondition,
      status: 'active',
      score: STARTING_SCORE,
    },
    activeEvents: [],
    history: [],
    pendingEffects: [],
    createdAt: now,
    updatedAt: now,
  };

  return state;
}

// ---------------------------------------------------------------------------
// validateGameState
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function checkMetric(errors: string[], label: string, value: number): void {
  if (!isValidNumber(value)) {
    errors.push(`${label} is not a finite number (${String(value)}).`);
    return;
  }
  if (value < METRIC_MIN || value > METRIC_MAX) {
    errors.push(`${label} is out of bounds [${METRIC_MIN}, ${METRIC_MAX}]: ${value}.`);
  }
}

/**
 * Validate the structural and numeric integrity of a GameState. Used after
 * loading from storage and in tests. Does not throw; returns a result so the
 * caller can decide how to recover.
 */
export function validateGameState(state: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof state !== 'object' || state === null) {
    return { valid: false, errors: ['State is not an object.'] };
  }
  const s = state as Partial<GameState>;

  if (s.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${String(s.schemaVersion)} (expected ${SCHEMA_VERSION}).`);
  }
  if (typeof s.gameId !== 'string' || s.gameId.length === 0) {
    errors.push('Missing or invalid gameId.');
  }
  if (!Number.isInteger(s.day) || (s.day ?? 0) < 1) {
    errors.push(`Invalid day: ${String(s.day)}.`);
  }

  if (!s.resources) {
    errors.push('Missing resources.');
  } else {
    for (const key of RESOURCE_KEYS) {
      checkMetric(errors, `resources.${key}`, s.resources[key]);
    }
  }

  if (!s.crew) {
    errors.push('Missing crew.');
  } else {
    checkMetric(errors, 'crew.health', s.crew.health);
    checkMetric(errors, 'crew.morale', s.crew.morale);
    checkMetric(errors, 'crew.radiationExposure', s.crew.radiationExposure);
  }

  if (!s.character) {
    errors.push('Missing character.');
  } else {
    if (!OCCUPATIONS.includes(s.character.occupation)) {
      errors.push(`Invalid character.occupation: ${String(s.character.occupation)}.`);
    }
    if (!s.character.attributes) {
      errors.push('Missing character.attributes.');
    } else {
      for (const key of ATTRIBUTE_KEYS) {
        checkMetric(errors, `character.attributes.${key}`, s.character.attributes[key]);
      }
    }
  }

  if (!s.systems) {
    errors.push('Missing systems.');
  } else {
    checkMetric(errors, 'systems.powerGeneration', s.systems.powerGeneration);
    checkMetric(errors, 'systems.lifeSupportEfficiency', s.systems.lifeSupportEfficiency);
    checkMetric(errors, 'systems.foodProduction', s.systems.foodProduction);
    checkMetric(errors, 'systems.shieldingIntegrity', s.systems.shieldingIntegrity);
  }

  if (!s.mission) {
    errors.push('Missing mission.');
  } else {
    const validStatus: MissionStatus[] = ['active', 'critical', 'completed', 'failed'];
    if (!validStatus.includes(s.mission.status)) {
      errors.push(`Invalid mission.status: ${String(s.mission.status)}.`);
    }
    if (!isValidNumber(s.mission.score)) {
      errors.push(`Invalid mission.score: ${String(s.mission.score)}.`);
    }
  }

  if (!Array.isArray(s.history)) errors.push('history must be an array.');
  if (!Array.isArray(s.pendingEffects)) errors.push('pendingEffects must be an array.');
  if (!Array.isArray(s.activeEvents)) errors.push('activeEvents must be an array.');

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Guard against "negative consumption generating resources". An action's
 * declared immediate resource changes are taken at face value (they may add or
 * remove). What we forbid is the DAILY CONSUMPTION model producing a positive
 * value where it should be negative, and vice versa — but that is computed, not
 * player-supplied. For player/event-supplied changes we only sanitise for
 * finiteness. This helper is kept as the single documented place describing the
 * rule, and simply returns the sanitised changes.
 */
function safeImmediateResourceChanges(changes: ResourceChanges | undefined): ResourceChanges {
  if (!changes) return {};
  return sanitizeResourceChanges(changes);
}

/** Count of ids minted so far, used to keep generated ids deterministic. */
function nextCounter(state: GameState): number {
  return state.history.length + state.pendingEffects.length;
}

/** Clamp every system metric back into [0,100] after upkeep math. */
function clampSystems(systems: SystemState): SystemState {
  return {
    powerGeneration: clamp(systems.powerGeneration),
    lifeSupportEfficiency: clamp(systems.lifeSupportEfficiency),
    foodProduction: clamp(systems.foodProduction),
    shieldingIntegrity: clamp(systems.shieldingIntegrity),
  };
}

/**
 * Recompute mission status and score from the current metrics. Pure.
 *
 * STATUS RULES (documented behaviour):
 *  - failed:    oxygen OR crew.health reaches 0 (outpost is lost), or
 *               radiationExposure reaches 100. Terminal.
 *  - completed: survived to/through day 30 while still active. Terminal.
 *  - critical:  any life-support resource <= 15, or health <= 15, or
 *               radiationExposure >= 80. Recoverable — reverts to active if the
 *               metrics recover.
 *  - active:    otherwise.
 * Terminal statuses (completed/failed) are never downgraded.
 */
const CRITICAL_THRESHOLD = 15;
const RADIATION_CRITICAL = 80;
const RADIATION_LETHAL = 100;
const SURVIVAL_TARGET_DAY = 30;

function recomputeMissionStatus(state: GameState): MissionStatus {
  const current = state.mission.status;
  if (current === 'failed' || current === 'completed') {
    return current; // terminal — never change
  }

  const { oxygen, water, food, power } = state.resources;
  const { health, radiationExposure } = state.crew;

  // Failure conditions.
  if (oxygen <= 0 || health <= 0 || radiationExposure >= RADIATION_LETHAL) {
    return 'failed';
  }

  // Completion: reached the survival target day still alive.
  if (state.day >= SURVIVAL_TARGET_DAY) {
    return 'completed';
  }

  // Critical (recoverable) conditions.
  const anyResourceCritical = [oxygen, water, food, power].some((v) => v <= CRITICAL_THRESHOLD);
  if (anyResourceCritical || health <= CRITICAL_THRESHOLD || radiationExposure >= RADIATION_CRITICAL) {
    return 'critical';
  }

  return 'active';
}

/**
 * Recompute the mission score. Score rewards keeping metrics healthy and
 * penalises critical conditions. Deterministic, bounded to [0, 999].
 */
function recomputeScore(state: GameState): number {
  const r = state.resources;
  const avgResources = (r.power + r.water + r.food + r.oxygen) / 4;
  const crewScore = (state.crew.health + state.crew.morale) / 2 - state.crew.radiationExposure * 0.5;
  const sys = state.systems;
  const avgSystems =
    (sys.powerGeneration + sys.lifeSupportEfficiency + sys.foodProduction + sys.shieldingIntegrity) / 4;

  // Base survival bonus grows with days survived. The scientist's research
  // passive amplifies this progress term (faster score growth).
  const survivalBonus = applyResearchFactor(state.day * 3, state.character);

  const raw = avgResources * 0.5 + crewScore * 0.3 + avgSystems * 0.2 + survivalBonus;
  return clamp(round2(raw), 0, 999);
}

/** Apply status + score recomputation, returning a new state. */
function withDerivedMission(state: GameState): GameState {
  const status = recomputeMissionStatus(state);
  const score = recomputeScore({ ...state, mission: { ...state.mission, status } });
  return { ...state, mission: { ...state.mission, status, score } };
}

// ---------------------------------------------------------------------------
// applyPlayerDecision
// ---------------------------------------------------------------------------

/**
 * Validate and apply a player's decision. On success returns a NEW state with:
 *  - the action's immediate effects applied (resources/crew/systems),
 *  - any declared delayed effects scheduled and tagged with this decision,
 *  - a DecisionRecord appended to history,
 *  - mission status/score recomputed.
 *
 * Throws InvalidDecisionError if the action id is unknown/unavailable, or if
 * the mission is already in a terminal state.
 */
export function applyPlayerDecision(state: GameState, input: DecisionInput): GameState {
  if (state.mission.status === 'failed' || state.mission.status === 'completed') {
    throw new InvalidDecisionError(
      `Cannot make a decision while mission status is "${state.mission.status}".`
    );
  }

  // Validate & resolve the action (throws if invalid).
  const action = resolveDecisionAction(state, input);

  const counterBase = nextCounter(state);
  const decisionId = makeId('dec', state.gameId, counterBase);

  // Immediate effects.
  const immediateResources = safeImmediateResourceChanges(action.effect.immediateResources);
  const resources = applyResourceChanges(state.resources, immediateResources);
  const crew = action.effect.immediateCrew
    ? applyCrewChanges(state.crew, action.effect.immediateCrew)
    : state.crew;
  const systems = action.effect.immediateSystems
    ? applySystemChanges(state.systems, action.effect.immediateSystems)
    : state.systems;

  // Schedule delayed effects (ids continue after the decision id).
  const scheduled: DelayedEffect[] = scheduleDelayedEffects(
    state.gameId,
    state.day,
    decisionId,
    action.effect.delayed,
    counterBase + 1
  );

  const record: DecisionRecord = {
    id: decisionId,
    day: state.day,
    ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
    actionId: action.id,
    actionLabel: action.label,
    playerChoice: input.playerChoice,
    resourceChanges: immediateResources,
    explanation: action.description,
    timestamp: state.updatedAt,
  };

  // Resolving an event removes it from the active list.
  const activeEvents =
    input.eventId !== undefined
      ? state.activeEvents.filter((e) => e.id !== input.eventId)
      : state.activeEvents;

  const next: GameState = {
    ...state,
    resources,
    crew,
    systems,
    activeEvents,
    history: [...state.history, record],
    pendingEffects: [...state.pendingEffects, ...scheduled],
    updatedAt: state.updatedAt,
  };

  return withDerivedMission(next);
}

// ---------------------------------------------------------------------------
// resolveEvent (thin wrapper over applyPlayerDecision)
// ---------------------------------------------------------------------------

/**
 * Resolve an active event by choosing one of its actions. Convenience wrapper
 * so event-driven UI does not construct a DecisionInput by hand.
 */
export function resolveEvent(
  state: GameState,
  eventId: string,
  actionId: string,
  playerChoice: PlayerChoice = 'self-directed'
): GameState {
  return applyPlayerDecision(state, { eventId, actionId, playerChoice });
}

// ---------------------------------------------------------------------------
// processDelayedEffects
// ---------------------------------------------------------------------------

/**
 * Apply all delayed effects due on the current day (<= state.day), exactly
 * once each, and recompute mission status/score. Returns a NEW state.
 */
export function processDelayedEffects(state: GameState): GameState {
  const { state: afterEffects } = processDueEffects(state);
  if (afterEffects === state) return state; // nothing due
  return withDerivedMission(afterEffects);
}

// ---------------------------------------------------------------------------
// advanceSimulationDay
// ---------------------------------------------------------------------------

export interface AdvanceResult {
  state: GameState;
  /** Delayed effects that fired during this advance (for the activity feed). */
  firedEffects: DelayedEffect[];
  /** The per-resource daily delta that was applied this day. */
  dailyDelta: ResourceChanges;
}

/**
 * Advance the simulation by one day. Order of operations (documented):
 *   1. Increment the day.
 *   2. Apply the baseline daily resource delta (production - consumption).
 *   3. Process any delayed effects now due.
 *   4. Check for and trigger new events based on game state.
 *   5. Recompute mission status + score.
 *
 * Returns a NEW state; the input is never mutated. If the mission is already in
 * a terminal state, the call is a no-op that returns the same state.
 */
export function advanceSimulationDay(state: GameState): AdvanceResult {
  if (state.mission.status === 'failed' || state.mission.status === 'completed') {
    return { state, firedEffects: [], dailyDelta: {} };
  }

  const nextDay = state.day + 1;

  // 1. Occupation daily system upkeep (engineer slows/reverses system wear).
  const systems = clampSystems(applyDailySystemUpkeep(state.systems, state.character));

  // 2. Baseline daily resource delta from the (maintained) systems, plus the
  //    botanist's flat food production bonus.
  const consumptionFactor = PHILOSOPHY_CONSUMPTION[state.mission.operatingPhilosophy];
  const baseDelta = computeDailyResourceDelta(systems, state.crew, consumptionFactor);
  const foodBonus = foodProductionBonus(state.character);
  const dailyDelta: ResourceChanges = {
    ...baseDelta,
    food: round2((baseDelta.food ?? 0) + foodBonus),
  };
  const resources = applyResourceChanges(state.resources, dailyDelta);

  // 3. Medical officer's daily health recovery (only while not in danger).
  const recovery = dailyHealthRecovery(state.crew, state.character);
  const crew = recovery > 0 ? applyCrewChanges(state.crew, { health: recovery }) : state.crew;

  const advanced: GameState = {
    ...state,
    day: nextDay,
    resources,
    crew,
    systems,
    updatedAt: state.updatedAt,
  };

  // Process effects due on the new day.
  const { state: afterEffects, applied } = processDueEffects(advanced);

  // 4. Trigger new events based on current game state (crisis system)
  const newEvent = triggerEvent(afterEffects);
  const activeEvents = newEvent 
    ? [...afterEffects.activeEvents, newEvent]
    : afterEffects.activeEvents;

  const withEvents: GameState = {
    ...afterEffects,
    activeEvents,
  };

  const finalState = withDerivedMission(withEvents);

  return { state: finalState, firedEffects: applied, dailyDelta };
}

// ---------------------------------------------------------------------------
// getSimulationSummary
// ---------------------------------------------------------------------------

export interface SimulationSummary {
  day: number;
  status: MissionStatus;
  score: number;
  resources: GameState['resources'];
  decisionsMade: number;
  pendingEffects: number;
  overall: ReturnType<typeof calculateDerivedStatus>['overall'];
}

/** A compact, read-only snapshot for logging, the UI header, and tests. */
export function getSimulationSummary(state: GameState): SimulationSummary {
  const derived = calculateDerivedStatus(state);
  return {
    day: state.day,
    status: state.mission.status,
    score: state.mission.score,
    resources: state.resources,
    decisionsMade: state.history.length,
    pendingEffects: state.pendingEffects.length,
    overall: derived.overall,
  };
}

/** Exposed for the UI so it can list the free actions without importing the catalog. */
export function getFreeActions() {
  return FREE_ACTIONS;
}

/** Why a run ended, for the game-over screen. */
export type GameOverReason =
  | 'character-died'
  | 'oxygen-depleted'
  | 'radiation-lethal'
  | 'unknown';

/**
 * True when the run has ended in failure (the character's run is over).
 * `completed` is a success terminal state and is NOT game-over.
 */
export function isGameOver(state: GameState): boolean {
  return state.mission.status === 'failed';
}

/**
 * Explain why the run failed, derived from the current metrics. Pure. Returns
 * 'unknown' if called when the run is not actually failed.
 */
export function getGameOverReason(state: GameState): GameOverReason {
  if (state.mission.status !== 'failed') return 'unknown';
  if (state.crew.health <= 0) return 'character-died';
  if (state.resources.oxygen <= 0) return 'oxygen-depleted';
  if (state.crew.radiationExposure >= 100) return 'radiation-lethal';
  return 'unknown';
}

/** Touch updatedAt to a provided timestamp (used by the persistence layer). */
export function withTimestamp(state: GameState, now: number): GameState {
  return { ...state, updatedAt: now };
}
