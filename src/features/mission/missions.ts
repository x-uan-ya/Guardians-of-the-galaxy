/**
 * missions.ts
 * -----------
 * CONTENT + TUNING for the mission sites the player picks before choosing an
 * occupation. Each preset declares a `modifiers` bag — WHAT a site changes.
 *
 * OWNERSHIP SPLIT (see docs/MISSION_MODIFIERS.md for the full guide):
 *   - THIS FILE owns "what conditions exist" + their modifier values.
 *   - The simulation engine (advanceSimulationDay) owns "how those modifier
 *     values mathematically affect the game".
 * You can add/change a mission's `modifiers` here without touching the engine;
 * the engine reads the existing keys and ignores anything it has no rule for.
 *
 * ⚠️ All numbers are GAMEPLAY ASSUMPTIONS for an educational game. Tune freely.
 * The sites reuse the same map; only the modifiers (and flavour) differ.
 *
 * The `conditions` array is flavour shown on the selection screen; the
 * `modifiers` are what actually change the simulation.
 */

import type { MissionModifiers, MissionType } from '../simulation/simulationTypes';

/** Neutral modifiers: no effect. Spread this and override only what differs. */
export const NEUTRAL_MODIFIERS: MissionModifiers = {
  powerGenerationFactor: 1,
  foodProductionFactor: 1,
  lifeSupportFactor: 1,
  solarFactor: 1,
  radiationPerDay: 0,
  startingResourceDelta: 0,
  noResupply: false,
};

export interface MissionDef {
  id: MissionType;
  label: string;
  /** One-line site summary. */
  summary: string;
  /** Flavour condition bullets shown on the selection screen. */
  conditions: string[];
  /** Relative difficulty, for the UI badge. */
  difficulty: 'Moderate' | 'Hard' | 'Extreme';
  /** Accent colour + glyph for the selection card. */
  accent: string;
  glyph: string;
  /** The simulation modifiers the engine applies for this site. */
  modifiers: MissionModifiers;
}

export const MISSION_CATALOG: Record<MissionType, MissionDef> = {
  lunar: {
    id: 'lunar',
    label: 'Lunar Outpost',
    summary: 'A foothold on the Moon — close to home but unforgiving.',
    conditions: ['Low gravity', 'Extreme temperature swings', 'Limited resources'],
    difficulty: 'Moderate',
    accent: '#9ca3af',
    glyph: '🌕',
    modifiers: {
      ...NEUTRAL_MODIFIERS,
      // Extreme temperature strains power; limited resources start lower.
      powerGenerationFactor: 0.85,
      startingResourceDelta: -8,
    },
  },

  mars: {
    id: 'mars',
    label: 'Mars Outpost',
    summary: 'The red planet. Dust, distance, and radiation.',
    conditions: ['Long communication delay', 'Dust storms', 'High radiation'],
    difficulty: 'Hard',
    accent: '#c1440e',
    glyph: '🔴',
    modifiers: {
      ...NEUTRAL_MODIFIERS,
      // High radiation accrues each day; dust storms sap power a little.
      radiationPerDay: 1.5,
      powerGenerationFactor: 0.92,
    },
  },

  'deep-space': {
    id: 'deep-space',
    label: 'Deep-Space Outpost',
    summary: 'Alone in the dark, far beyond any supply line.',
    conditions: ['No resupply', 'Extremely limited solar energy', 'Unknown anomalies'],
    difficulty: 'Extreme',
    accent: '#4a90d9',
    glyph: '🛰️',
    modifiers: {
      ...NEUTRAL_MODIFIERS,
      // No resupply drop; weak sun cripples power; some radiation.
      noResupply: true,
      solarFactor: 0.8,
      powerGenerationFactor: 0.8,
      radiationPerDay: 1,
    },
  },
};

/** Look up a mission definition. */
export function getMission(type: MissionType): MissionDef {
  return MISSION_CATALOG[type];
}

/** The catalog as an ordered array (for rendering the picker). */
export const MISSION_LIST: readonly MissionDef[] = [
  MISSION_CATALOG.lunar,
  MISSION_CATALOG.mars,
  MISSION_CATALOG['deep-space'],
];
