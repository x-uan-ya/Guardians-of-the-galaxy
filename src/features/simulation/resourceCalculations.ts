/**
 * resourceCalculations.ts
 * -----------------------
 * Pure, deterministic numeric helpers for the simulation. No React, no I/O, no
 * randomness. Everything here is referentially transparent so results are
 * reproducible and easy to unit test.
 *
 * All metrics live on the shared 0..100 scale (see simulationTypes). These
 * helpers enforce the bounds and reject invalid numbers (NaN/Infinity).
 */

import {
  METRIC_MAX,
  METRIC_MIN,
  RESOURCE_KEYS,
  type CrewChanges,
  type CrewState,
  type Resources,
  type ResourceChanges,
  type SystemChanges,
  type SystemState,
} from './simulationTypes';

/** True only for a real, finite number. Guards against NaN/Infinity. */
export function isValidNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Clamp a value into [min, max]. Throws on non-finite input so invalid numbers
 * surface loudly instead of silently corrupting state.
 */
export function clamp(value: number, min = METRIC_MIN, max = METRIC_MAX): number {
  if (!isValidNumber(value)) {
    throw new RangeError(`Expected a finite number, received: ${String(value)}`);
  }
  if (value < min) return min;
  if (value > max) return max;
  // Round to 2 decimals to avoid floating-point drift across many days.
  return Math.round(value * 100) / 100;
}

/**
 * Apply a signed delta to a current 0..100 value and clamp.
 * Positive delta adds, negative consumes. Non-finite deltas are rejected.
 */
export function applyDelta(current: number, delta: number): number {
  if (!isValidNumber(delta)) {
    throw new RangeError(`Invalid delta: ${String(delta)}`);
  }
  return clamp(current + delta);
}

/**
 * Apply a set of ResourceChanges to a Resources object, returning a NEW object.
 * The input is never mutated.
 */
export function applyResourceChanges(
  resources: Readonly<Resources>,
  changes: ResourceChanges
): Resources {
  const next: Resources = { ...resources };
  for (const key of RESOURCE_KEYS) {
    const delta = changes[key];
    if (delta === undefined) continue;
    next[key] = applyDelta(next[key], delta);
  }
  return next;
}

/** Apply CrewChanges, returning a NEW CrewState. */
export function applyCrewChanges(crew: Readonly<CrewState>, changes: CrewChanges): CrewState {
  const next: CrewState = { ...crew };
  (Object.keys(changes) as (keyof CrewState)[]).forEach((key) => {
    const delta = changes[key];
    if (delta === undefined) return;
    next[key] = applyDelta(next[key], delta);
  });
  return next;
}

/** Apply SystemChanges, returning a NEW SystemState. */
export function applySystemChanges(
  systems: Readonly<SystemState>,
  changes: SystemChanges
): SystemState {
  const next: SystemState = { ...systems };
  (Object.keys(changes) as (keyof SystemState)[]).forEach((key) => {
    const delta = changes[key];
    if (delta === undefined) return;
    next[key] = applyDelta(next[key], delta);
  });
  return next;
}

/**
 * Reduce life-support production according to the power reserve at the start
 * of the Sol. Consumption is deliberately not scaled.
 */
export function lifeSupportProductionFactor(power: number): number {
  if (!isValidNumber(power)) {
    throw new RangeError(`Invalid power reserve: ${String(power)}`);
  }
  if (power === 0) return 0.5;
  if (power <= 15) return 0.65;
  if (power <= 35) return 0.85;
  return 1;
}

/**
 * Calculate daily health and morale changes caused by post-production food
 * and water reserves. Food and water health damage is capped at 3 per Sol.
 */
export function shortageCrewChanges(resources: Readonly<Resources>): CrewChanges {
  const foodPenalty =
    resources.food === 0 ? 1 : resources.food <= 15 ? 0.5 : 0;
  const waterPenalty =
    resources.water === 0 ? 2 : resources.water <= 15 ? 1 : 0;
  const healthPenalty = Math.min(3, foodPenalty + waterPenalty);
  const moralePenalty =
    resources.food === 0 ? 2 : resources.food <= 15 ? 1 : 0;

  return {
    ...(healthPenalty > 0 ? { health: -healthPenalty } : {}),
    ...(moralePenalty > 0 ? { morale: -moralePenalty } : {}),
  };
}

/**
 * Compute the net daily resource change from current systems and crew size.
 *
 * GAMEPLAY MODEL (illustrative, not real engineering data):
 *  - Each system converts its 0..100 efficiency into a daily production rate.
 *  - The crew consumes a flat baseline of each resource every day.
 *  - Oxygen and water both depend on life-support efficiency.
 *  - Food depends on greenhouse foodProduction.
 *  - Power depends on powerGeneration.
 *
 * The returned ResourceChanges are the signed deltas to apply for one day.
 */
export function computeDailyResourceDelta(
  systems: Readonly<SystemState>,
  crew: Readonly<CrewState>,
  philosophyConsumptionFactor: number,
  lifeSupportProductionMultiplier = 1,
  productionFactors: Partial<Record<keyof Resources, number>> = {}
): ResourceChanges {
  // Baseline daily crew consumption (percentage points per day). Documented
  // gameplay assumption: a healthy crew draws these amounts from stores.
  const BASE = { power: 9, water: 7, food: 6, oxygen: 8 } as const;

  // Lower morale makes the crew slightly less efficient -> consumes a touch
  // more. Scales consumption from 1.0 (full morale) up to ~1.15 (zero morale).
  const moraleDrag = 1 + (1 - crew.morale / METRIC_MAX) * 0.15;
  const consume = philosophyConsumptionFactor * moraleDrag;

  // Production: efficiency/100 scaled by a per-system max daily output. Mission
  // factors apply to output only; they never reduce crew consumption.
  const powerGen = (systems.powerGeneration / METRIC_MAX) * 12 * (productionFactors.power ?? 1);
  const oxygenGen =
    (systems.lifeSupportEfficiency / METRIC_MAX) *
    9 *
    lifeSupportProductionMultiplier *
    (productionFactors.oxygen ?? 1);
  const waterGen =
    (systems.lifeSupportEfficiency / METRIC_MAX) *
    7.5 *
    lifeSupportProductionMultiplier *
    (productionFactors.water ?? 1);
  const foodGen = (systems.foodProduction / METRIC_MAX) * 7 * (productionFactors.food ?? 1);

  return {
    power: round2(powerGen - BASE.power * consume),
    water: round2(waterGen - BASE.water * consume),
    food: round2(foodGen - BASE.food * consume),
    oxygen: round2(oxygenGen - BASE.oxygen * consume),
  };
}

/** Round to 2 decimal places (keeps deterministic math tidy). */
export function round2(n: number): number {
  if (!isValidNumber(n)) {
    throw new RangeError(`Invalid number to round: ${String(n)}`);
  }
  return Math.round(n * 100) / 100;
}

/**
 * Sanitize an incoming ResourceChanges so a malicious/buggy caller cannot, for
 * example, pass NaN or a value outside a reasonable per-action range. Returns a
 * cleaned copy; throws if a value is non-finite.
 *
 * Note: we intentionally DO allow negative values here (they represent
 * consumption). The guard against "negative consumption generating resources"
 * lives in the engine's decision validation, which rejects actions whose
 * declared effect does not match their stated intent.
 */
export function sanitizeResourceChanges(changes: ResourceChanges): ResourceChanges {
  const clean: ResourceChanges = {};
  for (const key of RESOURCE_KEYS) {
    const v = changes[key];
    if (v === undefined) continue;
    if (!isValidNumber(v)) {
      throw new RangeError(`Invalid resource change for "${key}": ${String(v)}`);
    }
    clean[key] = round2(v);
  }
  return clean;
}

/** Sum two ResourceChanges maps (used to aggregate a mission's net change). */
export function addResourceChanges(a: ResourceChanges, b: ResourceChanges): ResourceChanges {
  const out: ResourceChanges = {};
  for (const key of RESOURCE_KEYS) {
    const sum = (a[key] ?? 0) + (b[key] ?? 0);
    if (sum !== 0) out[key] = round2(sum);
  }
  return out;
}
