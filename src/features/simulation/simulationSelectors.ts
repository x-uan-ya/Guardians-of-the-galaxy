/**
 * simulationSelectors.ts
 * ----------------------
 * Pure, read-only selectors that derive UI-facing views from a GameState.
 * Selectors never mutate state and never run simulation steps. Components use
 * these instead of computing resource status themselves.
 */

import { METRIC_THRESHOLDS, RADIATION_THRESHOLDS } from '../mission/missionDefaults';
import type {
  CrewState,
  DerivedStatus,
  GameState,
  MetricStatus,
  ResourceKey,
  StatusLevel,
  SystemState,
} from './simulationTypes';
import { RESOURCE_KEYS } from './simulationTypes';

/** Classify a "higher is better" metric (resources, systems, health, morale). */
export function classifyMetric(value: number): StatusLevel {
  if (value <= METRIC_THRESHOLDS.critical) return 'critical';
  if (value <= METRIC_THRESHOLDS.warn) return 'warn';
  return 'ok';
}

/** Classify radiationExposure, where HIGH is bad (inverted thresholds). */
export function classifyRadiation(value: number): StatusLevel {
  if (value >= RADIATION_THRESHOLDS.critical) return 'critical';
  if (value >= RADIATION_THRESHOLDS.warn) return 'warn';
  return 'ok';
}

function metric(value: number, level: StatusLevel): MetricStatus {
  return { value, level };
}

/** The worst of a set of levels (critical > warn > ok). */
export function worstLevel(levels: StatusLevel[]): StatusLevel {
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('warn')) return 'warn';
  return 'ok';
}

/**
 * Compute the full derived status for the UI. Pure: depends only on `state`.
 */
export function calculateDerivedStatus(state: GameState): DerivedStatus {
  const resources = {} as Record<ResourceKey, MetricStatus>;
  for (const key of RESOURCE_KEYS) {
    const v = state.resources[key];
    resources[key] = metric(v, classifyMetric(v));
  }

  const crew: Record<keyof CrewState, MetricStatus> = {
    health: metric(state.crew.health, classifyMetric(state.crew.health)),
    morale: metric(state.crew.morale, classifyMetric(state.crew.morale)),
    radiationExposure: metric(
      state.crew.radiationExposure,
      classifyRadiation(state.crew.radiationExposure)
    ),
  };

  const systems: Record<keyof SystemState, MetricStatus> = {
    powerGeneration: metric(state.systems.powerGeneration, classifyMetric(state.systems.powerGeneration)),
    lifeSupportEfficiency: metric(
      state.systems.lifeSupportEfficiency,
      classifyMetric(state.systems.lifeSupportEfficiency)
    ),
    foodProduction: metric(state.systems.foodProduction, classifyMetric(state.systems.foodProduction)),
    shieldingIntegrity: metric(
      state.systems.shieldingIntegrity,
      classifyMetric(state.systems.shieldingIntegrity)
    ),
  };

  // Overall level is driven by the life-support critical metrics (the four
  // resources + crew health + radiation). Systems degrade slowly and are not
  // immediately fatal, so they inform but do not dominate the headline status.
  const overall = worstLevel([
    ...RESOURCE_KEYS.map((k) => resources[k].level),
    crew.health.level,
    crew.radiationExposure.level,
  ]);

  return { resources, crew, systems, overall };
}

/** Convenience: the list of resource metric keys in display order. */
export const RESOURCE_DISPLAY_ORDER: readonly ResourceKey[] = RESOURCE_KEYS;
