/**
 * facilities.ts
 * -------------
 * Describes the clickable rooms ("hotspots") of the bunker scene.
 *
 * IMPORTANT FOR BEGINNERS: this file contains NO game rules. It is only a
 * lookup table that says "the Oxygen Generator room is where we show the
 * `oxygen` resource and the `lifeSupportEfficiency` system". The numbers
 * themselves always come from the simulation engine (via GameState and
 * calculateDerivedStatus). If a resource/system/action id here ever stops
 * existing, the UI simply shows less - it never invents game state.
 */

import type {
  DerivedStatus,
  ResourceKey,
  StatusLevel,
  SystemState,
} from '../../simulation/simulationTypes';
import { worstLevel } from '../../simulation/simulationSelectors';

/** The mission lasts 30 days (matches SURVIVAL_TARGET_DAY in the engine). */
export const TOTAL_DAYS = 30;

export type FacilityId =
  | 'oxygen'
  | 'greenhouse'
  | 'storage'
  | 'computer'
  | 'power'
  | 'water'
  | 'medical';

export interface FacilityDef {
  id: FacilityId;
  label: string;
  /** Short name for the small tag on the scene (keeps tags from overlapping). */
  short: string;
  /** One-sentence flavour text shown on the tablet. */
  blurb: string;
  /** Resource this room is "responsible" for (read from state.resources). */
  resource?: ResourceKey;
  /** Engineering system this room is "responsible" for (state.systems). */
  system?: keyof SystemState;
  /** Medical bay: show the character's live vitals instead. */
  vitals?: boolean;
  /**
   * Existing FREE ACTION ids (from events/eventCatalog.ts FREE_ACTIONS) that
   * make sense to plan from this room. Unknown ids are ignored at runtime.
   */
  actionIds: readonly string[];
  /**
   * Shown as a dashed, clearly-labelled PLACEHOLDER when the game has no real
   * action for this room yet. It never touches game state.
   */
  placeholderAction?: { label: string; description: string };
  /** Hotspot rectangle in scene units (the scene is 1000 x 560). */
  box: { x: number; y: number; w: number; h: number };
  /** Where the astronaut stands (scene x, 0..1000). */
  standX: number;
}

export const FACILITIES: Record<FacilityId, FacilityDef> = {
  oxygen: {
    id: 'oxygen',
    label: 'Oxygen Generator',
    short: 'Oxygen',
    blurb: 'Splits water and scrubs CO2 so the bunker stays breathable.',
    resource: 'oxygen',
    system: 'lifeSupportEfficiency',
    actionIds: ['maintenance-shift'],
    box: { x: 30, y: 150, w: 125, h: 230 },
    standX: 92,
  },
  greenhouse: {
    id: 'greenhouse',
    label: 'Greenhouse',
    short: 'Greenhouse',
    blurb: 'Hydroponic trays that turn light and water into fresh food.',
    system: 'foodProduction',
    actionIds: ['maintenance-shift'],
    placeholderAction: {
      label: 'Tend the crops',
      description: 'A dedicated crop-care action does not exist in the game yet.',
    },
    box: { x: 165, y: 180, w: 150, h: 200 },
    standX: 240,
  },
  storage: {
    id: 'storage',
    label: 'Food Storage',
    short: 'Food',
    blurb: 'Sealed rations and canned supplies. Count them carefully.',
    resource: 'food',
    actionIds: ['ration-supplies'],
    box: { x: 325, y: 205, w: 95, h: 175 },
    standX: 372,
  },
  computer: {
    id: 'computer',
    label: 'Central Computer',
    short: 'Computer',
    blurb: 'Mission control uplink, hull shielding monitor and daily planning.',
    system: 'shieldingIntegrity',
    actionIds: ['routine-operations'],
    box: { x: 430, y: 245, w: 190, h: 135 },
    standX: 525,
  },
  power: {
    id: 'power',
    label: 'Power Core',
    short: 'Power',
    blurb: 'Solar arrays and batteries. Everything else depends on this.',
    resource: 'power',
    system: 'powerGeneration',
    actionIds: ['maintenance-shift'],
    box: { x: 635, y: 185, w: 105, h: 195 },
    standX: 690,
  },
  water: {
    id: 'water',
    label: 'Water Reclaimer',
    short: 'Water',
    blurb: 'Recycles every drop. Contamination here is a serious problem.',
    resource: 'water',
    actionIds: ['ration-supplies'],
    box: { x: 750, y: 165, w: 105, h: 215 },
    standX: 802,
  },
  medical: {
    id: 'medical',
    label: 'Medical Bay',
    short: 'Medical',
    blurb: 'Monitors your health, morale and radiation dose.',
    vitals: true,
    actionIds: [],
    placeholderAction: {
      label: 'Treat injuries',
      description: 'A medical treatment action does not exist in the game yet.',
    },
    box: { x: 865, y: 225, w: 115, h: 155 },
    standX: 920,
  },
};

/** Stable display order (left to right in the scene). */
export const FACILITY_ORDER: readonly FacilityId[] = [
  'oxygen',
  'greenhouse',
  'storage',
  'computer',
  'power',
  'water',
  'medical',
];

/**
 * Which room an event belongs to, so the right part of the bunker lights up.
 * Keyed by event id from events/eventCatalog.ts. Unknown (new) events fall back
 * to the central computer, so a teammate adding an event never breaks the UI.
 */
const EVENT_FACILITY: Record<string, FacilityId> = {
  'solar-storm': 'power',
  'dust-storm': 'power',
  'battery-malfunction': 'power',
  'catastrophic-system-failure': 'computer',
  'equipment-failure': 'computer',
  'communication-failure': 'computer',
  'successful-experiment': 'computer',
  'water-contamination': 'water',
  'temperature-drop': 'oxygen',
  'minor-airlock-leak': 'oxygen',
  'hydroponics-bloom': 'greenhouse',
  'resource-discovery': 'storage',
};

export function facilityForEvent(eventId: string): FacilityId {
  return EVENT_FACILITY[eventId] ?? 'computer';
}

/** The worst status level among everything this room reports on. */
export function facilityLevel(def: FacilityDef, derived: DerivedStatus): StatusLevel {
  const levels: StatusLevel[] = [];
  if (def.resource) levels.push(derived.resources[def.resource].level);
  if (def.system) levels.push(derived.systems[def.system].level);
  if (def.vitals) {
    levels.push(
      derived.crew.health.level,
      derived.crew.morale.level,
      derived.crew.radiationExposure.level
    );
  }
  if (def.id === 'computer') levels.push(derived.overall);
  return levels.length > 0 ? worstLevel(levels) : 'ok';
}

/** Colours used by the scene (hex, so they also work inside SVG). */
export const LEVEL_HEX: Record<StatusLevel, string> = {
  ok: '#4caf72',
  warn: '#d9a93f',
  critical: '#d9533f',
};
