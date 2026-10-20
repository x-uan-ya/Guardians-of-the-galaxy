/**
 * labels.ts
 * ---------
 * Display labels + units for metric keys. Centralised so the UI stays
 * consistent and teammates don't re-invent naming. Pure data.
 */

import type { CrewState, ResourceKey, SystemState } from '../simulation/simulationTypes';

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  power: 'Power',
  water: 'Water',
  food: 'Food',
  oxygen: 'Oxygen',
};

export const CREW_LABELS: Record<keyof CrewState, string> = {
  health: 'Crew Health',
  morale: 'Morale',
  radiationExposure: 'Radiation Exposure',
};

export const SYSTEM_LABELS: Record<keyof SystemState, string> = {
  powerGeneration: 'Power Generation',
  lifeSupportEfficiency: 'Life Support',
  foodProduction: 'Food Production',
  shieldingIntegrity: 'Shielding',
};

/** All metrics in this game are stored as a 0..100 percentage. */
export const PERCENT_UNIT = '%';
