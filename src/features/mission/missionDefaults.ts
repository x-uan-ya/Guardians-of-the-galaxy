/**
 * missionDefaults.ts
 * ------------------
 * Documented starting values and per-choice tuning for a new mission.
 *
 * ⚠️ These are GAMEPLAY ASSUMPTIONS for an educational simulation. They are not
 * real NASA mission data or engineering specifications. All values are on the
 * shared 0..100 scale (percentages / efficiency).
 */

import type {
  CrewState,
  MissionObjective,
  OperatingPhilosophy,
  Resources,
  StartingCondition,
  SystemState,
} from '../simulation/simulationTypes';

/** Baseline starting resources for the "standard" condition (0..100 %). */
export const STANDARD_RESOURCES: Resources = {
  power: 80,
  water: 75,
  food: 70,
  oxygen: 85,
};

/** Tighter starting resources for the "resource-constrained" condition. */
export const CONSTRAINED_RESOURCES: Resources = {
  power: 55,
  water: 50,
  food: 45,
  oxygen: 60,
};

/** Starting crew condition (same for both presets in the foundation). */
export const DEFAULT_CREW: CrewState = {
  health: 90,
  radiationExposure: 5,
  morale: 80,
};

/** Starting system efficiencies (0..100 %). */
export const DEFAULT_SYSTEMS: SystemState = {
  powerGeneration: 78,
  lifeSupportEfficiency: 82,
  foodProduction: 65,
  shieldingIntegrity: 88,
};

/**
 * How the operating philosophy scales baseline daily consumption.
 *  - conservative: ration hard, consume less, grow slower.
 *  - balanced: the reference point (1.0).
 *  - ambitious: push the outpost, consume more for faster progress.
 */
export const PHILOSOPHY_CONSUMPTION: Record<OperatingPhilosophy, number> = {
  conservative: 0.85,
  balanced: 1.0,
  ambitious: 1.2,
};

/**
 * Small objective-based tweak to starting systems. Each objective leans into a
 * different system without unbalancing the start.
 */
export const OBJECTIVE_SYSTEM_BONUS: Record<MissionObjective, Partial<SystemState>> = {
  survival: { lifeSupportEfficiency: 6, shieldingIntegrity: 4 },
  science: { powerGeneration: 6, shieldingIntegrity: 2 },
  settlement: { foodProduction: 8, powerGeneration: 2 },
};

/** Resolve the starting resources for a given condition. */
export function resourcesForCondition(condition: StartingCondition): Resources {
  return condition === 'resource-constrained'
    ? { ...CONSTRAINED_RESOURCES }
    : { ...STANDARD_RESOURCES };
}

/** Starting mission score. */
export const STARTING_SCORE = 100;

/**
 * Thresholds that classify a single 0..100 metric for UI + mission status.
 * A metric at or below `critical` is critical; at or below `warn` is a warning;
 * otherwise OK.
 */
export const METRIC_THRESHOLDS = {
  critical: 15,
  warn: 35,
} as const;

/**
 * radiationExposure is "bad when high", so it uses inverted thresholds: at or
 * above `critical` is critical, at or above `warn` is a warning.
 */
export const RADIATION_THRESHOLDS = {
  warn: 60,
  critical: 80,
} as const;
