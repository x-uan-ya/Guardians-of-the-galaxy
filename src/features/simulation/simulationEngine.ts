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
import { chapter1EventForDay, triggerEvent } from '../events/eventTriggers';
import {
  DEFAULT_CREW,
  DEFAULT_SYSTEMS,
  OBJECTIVE_SYSTEM_BONUS,
  PHILOSOPHY_CONSUMPTION,
  STARTING_SCORE,
  resourcesForCondition,
} from '../mission/missionDefaults';
import { getOccupation } from '../mission/occupations';
import { getMission } from '../mission/missions';
import type { MissionConfig } from '../mission/missionTypes';
import {
  applyDailySystemUpkeep,
  applyResearchFactor,
  dailyHealthRecovery,
  dailyMoraleRecovery,
  dailyResourceBonus,
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
  MISSION_TYPES,
  OCCUPATIONS,
  RESOURCE_KEYS,
  SCHEMA_VERSION,
  type CharacterState,
  type CrewChanges,
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
 * One-time resupply tuning (illustrative gameplay values).
 *  - The resupply arrives on a FIXED day for every run: the midpoint of the
 *    30-day mission (day 15). Survive to day 15 and you get the drop.
 *  - On arrival it adds RESUPPLY_AMOUNT to every resource, exactly once.
 *  - RESUPPLY_AMOUNT is fixed for all players.
 */
export const RESUPPLY_DAY = 15;
export const RESUPPLY_AMOUNT = 25;

/**
 * The day the one-time resupply arrives. Fixed at the mission midpoint (Sol 15)
 * for all runs.
 */
export function resupplyDay(): number {
  return RESUPPLY_DAY;
}

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
  geologist: { shieldingIntegrity: 3 },
  chemist: { lifeSupportEfficiency: 5 },
  commander: { powerGeneration: 2, lifeSupportEfficiency: 2 },
  pilot: { powerGeneration: 5 },
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

  // Resolve the chosen mission site and its difficulty modifiers.
  const missionDef = getMission(config.missionType);
  const modifiers = missionDef.modifiers;

  // Starting resources, shifted once by the mission's startingResourceDelta.
  const baseResources = resourcesForCondition(config.startingCondition);
  const resources =
    modifiers.startingResourceDelta === 0
      ? baseResources
      : applyResourceChanges(baseResources, {
          power: modifiers.startingResourceDelta,
          water: modifiers.startingResourceDelta,
          food: modifiers.startingResourceDelta,
          oxygen: modifiers.startingResourceDelta,
        });

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
  const openingEvent = chapter1EventForDay(1, config.missionType);
  if (!openingEvent) {
    throw new Error('The Sol 1 Chapter 1 event is not configured.');
  }

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    gameId,
    day: 1,
    resources,
    character,
    crew,
    systems,
    mission: {
      missionType: config.missionType,
      modifiers: { ...modifiers },
      objective: config.objective,
      operatingPhilosophy: config.operatingPhilosophy,
      startingCondition: config.startingCondition,
      status: 'active',
      score: STARTING_SCORE,
      supplyWindow: RESUPPLY_DAY,
      resupplyDelivered: false,
    },
    activeEvents: [openingEvent],
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
    if (!Number.isInteger(s.mission.supplyWindow) || (s.mission.supplyWindow ?? 0) < 1) {
      errors.push(`Invalid mission.supplyWindow: ${String(s.mission.supplyWindow)}.`);
    }
    if (typeof s.mission.resupplyDelivered !== 'boolean') {
      errors.push(`Invalid mission.resupplyDelivered: ${String(s.mission.resupplyDelivered)}.`);
    }
    if (!MISSION_TYPES.includes(s.mission.missionType)) {
      errors.push(`Invalid mission.missionType: ${String(s.mission.missionType)}.`);
    }
    const m = s.mission.modifiers;
    if (!m || typeof m !== 'object') {
      errors.push('Missing mission.modifiers.');
    } else {
      for (const key of [
        'powerGenerationFactor',
        'foodProductionFactor',
        'lifeSupportFactor',
        'solarFactor',
        'radiationPerDay',
        'startingResourceDelta',
      ] as const) {
        if (!isValidNumber(m[key])) {
          errors.push(`Invalid mission.modifiers.${key}: ${String(m[key])}.`);
        }
      }
      if (typeof m.noResupply !== 'boolean') {
        errors.push(`Invalid mission.modifiers.noResupply: ${String(m.noResupply)}.`);
      }
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

/**
 * Find the next decision ID counter, using permanent history rather than the
 * pending-effect count so processing effects cannot make the counter go back.
 */
function nextCounter(state: GameState): number {
  const decisionPrefix = `dec_${state.gameId}_`;
  return state.history.reduce((next, record) => {
    if (!record.id.startsWith(decisionPrefix)) return next;
    const counter = Number(record.id.slice(decisionPrefix.length));
    return Number.isSafeInteger(counter) && counter >= 0 ? Math.max(next, counter + 1) : next;
  }, state.history.length);
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

  // Effect IDs use this unique decision counter plus an effect index.
  const scheduled: DelayedEffect[] = scheduleDelayedEffects(
    state.gameId,
    state.day,
    decisionId,
    action.effect.delayed,
    counterBase
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
  /** True if the one-time resupply was delivered on this advance. */
  resupplyFired: boolean;
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
    return { state, firedEffects: [], dailyDelta: {}, resupplyFired: false };
  }
  if (state.activeEvents.length > 0) {
    throw new InvalidDecisionError('Resolve the active event before advancing the day.');
  }

  const nextDay = state.day + 1;

  // 1. Occupation daily system upkeep (engineer slows/reverses system wear).
  const systems = clampSystems(applyDailySystemUpkeep(state.systems, state.character));

  // 2. Baseline daily resource delta from the (maintained) systems, plus the
  //    botanist's flat food bonus and the other occupations' flat bonuses
  //    (geologist water, chemist oxygen, pilot power).
  const consumptionFactor = PHILOSOPHY_CONSUMPTION[state.mission.operatingPhilosophy];
  const baseDelta = computeDailyResourceDelta(systems, state.crew, consumptionFactor);
  const foodBonus = foodProductionBonus(state.character);
  const roleBonus = dailyResourceBonus(state.character);

  // Mission modifiers scale the POSITIVE (production) part of each daily delta
  // only, so a penalty like "power −20%" reduces generation without perversely
  // easing consumption. scaleGain(value, factor) = value * factor when value>0.
  const mod = state.mission.modifiers;
  const scaleGain = (value: number, factor: number): number =>
    value > 0 ? round2(value * factor) : value;
  const powerFactor = mod.powerGenerationFactor * mod.solarFactor;

  const dailyDelta: ResourceChanges = {
    power: scaleGain(round2((baseDelta.power ?? 0) + (roleBonus.power ?? 0)), powerFactor),
    water: scaleGain(round2((baseDelta.water ?? 0) + (roleBonus.water ?? 0)), mod.lifeSupportFactor),
    food: scaleGain(
      round2((baseDelta.food ?? 0) + foodBonus + (roleBonus.food ?? 0)),
      mod.foodProductionFactor
    ),
    oxygen: scaleGain(round2((baseDelta.oxygen ?? 0) + (roleBonus.oxygen ?? 0)), mod.lifeSupportFactor),
  };
  let resources = applyResourceChanges(state.resources, dailyDelta);

  // 2b. One-time resupply. On the day AFTER the supply window closes
  //     (day === supplyWindow + 1), a single resupply adds RESUPPLY_AMOUNT to
  //     every resource. Fires exactly once, guarded by resupplyDelivered — and
  //     never at all if the mission has `noResupply` (deep-space).
  const resupplyFired =
    !mod.noResupply && !state.mission.resupplyDelivered && nextDay === resupplyDay();
  if (resupplyFired) {
    resources = applyResourceChanges(resources, {
      power: RESUPPLY_AMOUNT,
      water: RESUPPLY_AMOUNT,
      food: RESUPPLY_AMOUNT,
      oxygen: RESUPPLY_AMOUNT,
    });
  }

  // 3. Daily crew recovery: the medical officer's health (only while not in
  //    danger) and the commander's morale.
  const recovery = dailyHealthRecovery(state.crew, state.character);
  const moraleRecovery = dailyMoraleRecovery(state.character);
  const crewChanges: CrewChanges = {};
  if (recovery > 0) crewChanges.health = recovery;
  if (moraleRecovery > 0) crewChanges.morale = moraleRecovery;
  // Mission radiation hazard (Mars / deep-space) accrues each day.
  if (mod.radiationPerDay > 0) crewChanges.radiationExposure = mod.radiationPerDay;
  const crew =
    Object.keys(crewChanges).length > 0 ? applyCrewChanges(state.crew, crewChanges) : state.crew;

  const advanced: GameState = {
    ...state,
    day: nextDay,
    resources,
    crew,
    systems,
    mission: resupplyFired
      ? { ...state.mission, resupplyDelivered: true }
      : state.mission,
    updatedAt: state.updatedAt,
  };

  // Process effects due on the new day.
  const { state: afterEffects, applied } = processDueEffects(advanced);

  // Check terminal status before selecting an event; daily changes or a due
  // delayed effect may have ended the mission on this Sol.
  const readyForEventCheck = withDerivedMission(afterEffects);

  // 4. Trigger a scheduled storyline event, or use the existing crisis system.
  const newEvent = triggerEvent(readyForEventCheck);
  const activeEvents = newEvent 
    ? [...readyForEventCheck.activeEvents, newEvent]
    : readyForEventCheck.activeEvents;

  const withEvents: GameState = {
    ...readyForEventCheck,
    activeEvents,
  };

  const finalState = withDerivedMission(withEvents);

  return { state: finalState, firedEffects: applied, dailyDelta, resupplyFired };
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
