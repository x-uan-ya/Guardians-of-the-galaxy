/**
 * occupations.ts
 * --------------
 * CONTENT + TUNING for the eight playable occupations. This is the single source
 * of truth for each occupation's starting attributes, its documented
 * strengths/weaknesses, and its unique passive ability.
 *
 * ⚠️ All numbers are GAMEPLAY ASSUMPTIONS for an educational game, tuned for
 * trade-offs — NOT real data. Design rule: no occupation is best at everything.
 * Every occupation is strong in two attributes and weak in at least one.
 *
 * Attributes are on the shared 0..100 scale. The passive is a small, documented
 * modifier that the simulation reads (see occupationEffects.ts). Keeping the
 * data here and the math in occupationEffects keeps content separate from rules.
 */

import type { Attributes, Occupation, ResourceChanges } from '../simulation/simulationTypes';

/**
 * A passive ability expressed as tunable, dimensionless modifiers the engine
 * applies each day. Defaults (1 for multipliers, 0 for deltas) mean "no effect"
 * so every field is optional and additive occupations stay comparable.
 */
export interface PassiveAbility {
  /** Short player-facing name of the unique ability. */
  name: string;
  /** One-line description of what the passive does. */
  description: string;

  /**
   * Multiplier on daily system EFFICIENCY upkeep. >1 means systems degrade
   * slower / are maintained better each day. Engineer's speciality.
   */
  systemUpkeepFactor?: number;
  /**
   * Flat bonus added to daily food production delta (percentage points/day).
   * Botanist's speciality.
   */
  foodProductionBonus?: number;
  /**
   * Flat bonus to daily health recovery (percentage points/day) when the
   * character is not in immediate danger. Medical Officer's speciality.
   */
  healthRecoveryBonus?: number;
  /**
   * Multiplier on mission score growth (research/analysis output). >1 is faster
   * progress. Scientist's speciality.
   */
  researchFactor?: number;
  /**
   * Multiplier on how much radiation exposure accrues from events/effects.
   * <1 means better resistance. General survivability lever.
   */
  radiationResistanceFactor?: number;
  /**
   * Flat bonus added to the daily change of a resource (percentage points per
   * day). Only positive values are used. Geologist: water. Chemist: oxygen.
   * Pilot: power.
   */
  dailyResourceBonus?: ResourceChanges;
  /**
   * Flat morale recovery per day (percentage points). Commander's speciality.
   */
  moraleRecoveryBonus?: number;
}

/** Full definition of an occupation: identity, stats, trade-offs, passive. */
export interface OccupationDef {
  id: Occupation;
  label: string;
  /** One-line role summary. */
  summary: string;
  /** Starting attribute spread (0..100). */
  attributes: Attributes;
  /** Human-readable strengths (for the setup screen). */
  strengths: string[];
  /** Human-readable weaknesses / trade-offs (for the setup screen). */
  weaknesses: string[];
  passive: PassiveAbility;
  /**
   * Accent colour for the portrait's glow and ring. The animated portrait
   * itself is drawn in code (see OccupationArt.tsx).
   */
  accent: string;
}

/**
 * The occupation catalog. Attribute spreads are balanced so each occupation
 * totals a similar amount but distributes it differently.
 */
export const OCCUPATION_CATALOG: Record<Occupation, OccupationDef> = {
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    summary: 'Specialises in repairs and keeping equipment running.',
    attributes: {
      health: 70,
      intelligence: 75,
      strength: 75,
      stamina: 70,
      technical: 95,
      medical: 40,
    },
    strengths: ['Outstanding technical skill', 'Solid strength and stamina for repairs'],
    weaknesses: ['Weak medical skill', 'Average resilience to injury'],
    passive: {
      name: 'Master Technician',
      description: 'Maintains systems far better each day, slowing their decay.',
      systemUpkeepFactor: 1.6,
    },
    accent: '#e07a3f',
  },

  scientist: {
    id: 'scientist',
    label: 'Scientist',
    summary: 'Specialises in research, analysis and problem-solving.',
    attributes: {
      health: 60,
      intelligence: 95,
      strength: 45,
      stamina: 60,
      technical: 70,
      medical: 55,
    },
    strengths: ['Exceptional intelligence', 'Faster research and score growth'],
    weaknesses: ['Low strength', 'Below-average health and stamina'],
    passive: {
      name: 'Research Breakthroughs',
      description: 'Converts analysis into mission progress faster.',
      researchFactor: 1.35,
    },
    accent: '#4a90d9',
  },

  medicalOfficer: {
    id: 'medicalOfficer',
    label: 'Medical Officer',
    summary: 'Specialises in survival, injury treatment and health.',
    attributes: {
      health: 85,
      intelligence: 80,
      strength: 55,
      stamina: 70,
      technical: 50,
      medical: 95,
    },
    strengths: ['High health and medical skill', 'Recovers health faster each day'],
    weaknesses: ['Modest strength', 'Weaker at technical repairs'],
    passive: {
      name: 'Field Medicine',
      description: 'Recovers health each stable day and resists radiation damage.',
      healthRecoveryBonus: 2.5,
      radiationResistanceFactor: 0.8,
    },
    accent: '#5fd0c8',
  },

  botanist: {
    id: 'botanist',
    label: 'Botanist',
    summary: 'Specialises in food production and biological resources.',
    attributes: {
      health: 70,
      intelligence: 80,
      strength: 60,
      stamina: 75,
      technical: 55,
      medical: 60,
    },
    strengths: ['Boosts food production every day', 'Well-rounded stamina'],
    weaknesses: ['Average technical and medical skill', 'No repair speciality'],
    passive: {
      name: 'Greenhouse Mastery',
      description: 'Coaxes extra food from the greenhouse each day.',
      foodProductionBonus: 3,
    },
    accent: '#4caf72',
  },

  geologist: {
    id: 'geologist',
    label: 'Geologist',
    summary: 'Specialises in rocks, ice and finding water on Mars.',
    attributes: {
      health: 75,
      intelligence: 70,
      strength: 85,
      stamina: 80,
      technical: 60,
      medical: 40,
    },
    strengths: ['Great strength and stamina', 'Finds extra water every day'],
    weaknesses: ['Weak medical skill', 'Only average technical skill'],
    passive: {
      name: 'Ice Prospector',
      description: 'Locates water ice near the outpost, adding extra water each day.',
      dailyResourceBonus: { water: 2.5 },
    },
    accent: '#c98a4b',
  },

  chemist: {
    id: 'chemist',
    label: 'Chemist',
    summary: 'Specialises in air quality and making oxygen.',
    attributes: {
      health: 60,
      intelligence: 90,
      strength: 45,
      stamina: 55,
      technical: 85,
      medical: 70,
    },
    strengths: ['Sharp mind and technical skill', 'Produces extra oxygen every day'],
    weaknesses: ['Low strength', 'Below-average stamina and health'],
    passive: {
      name: 'Air Alchemist',
      description: 'Tunes the air recycler, adding extra oxygen each day.',
      dailyResourceBonus: { oxygen: 2 },
    },
    accent: '#e0609c',
  },

  commander: {
    id: 'commander',
    label: 'Commander',
    summary: 'Specialises in leadership and keeping spirits high.',
    attributes: {
      health: 80,
      intelligence: 85,
      strength: 60,
      stamina: 80,
      technical: 50,
      medical: 50,
    },
    strengths: ['Sharp judgement and strong endurance', 'Morale recovers every day'],
    weaknesses: ['Weak technical and medical skill', 'No repair or research speciality'],
    passive: {
      name: 'Steady Leadership',
      description: 'Keeps morale recovering each day, even in tough times.',
      moraleRecoveryBonus: 2,
    },
    accent: '#d94f63',
  },

  pilot: {
    id: 'pilot',
    label: 'Pilot',
    summary: 'Specialises in outdoor work and keeping solar panels running.',
    attributes: {
      health: 80,
      intelligence: 65,
      strength: 70,
      stamina: 85,
      technical: 70,
      medical: 45,
    },
    strengths: ['Excellent stamina and health', 'Extra solar power every day'],
    weaknesses: ['Weak medical skill', 'Lower intelligence than the scientists'],
    passive: {
      name: 'Array Runner',
      description: 'Keeps the solar panels clear and aligned, adding extra power each day.',
      dailyResourceBonus: { power: 2.5 },
    },
    accent: '#f2c14e',
  },
};

/** Look up an occupation definition. */
export function getOccupation(occupation: Occupation): OccupationDef {
  return OCCUPATION_CATALOG[occupation];
}

/** The catalog as an ordered array (for rendering the picker). */
export const OCCUPATION_LIST: readonly OccupationDef[] = [
  OCCUPATION_CATALOG.engineer,
  OCCUPATION_CATALOG.scientist,
  OCCUPATION_CATALOG.medicalOfficer,
  OCCUPATION_CATALOG.botanist,
  OCCUPATION_CATALOG.geologist,
  OCCUPATION_CATALOG.chemist,
  OCCUPATION_CATALOG.commander,
  OCCUPATION_CATALOG.pilot,
];
