/**
 * missionEvents.ts
 * ----------------
 * MARS: OUTPOST ZERO — mission-specific crisis events.
 *
 * These events make the three mission sites mechanically different. Each event
 * belongs to exactly ONE site and is only eligible to fire on that site (see
 * MISSION_EVENTS_BY_SITE + the eligibility check in eventTriggers.ts).
 *
 * This file is CONTENT only, exactly like chapter1Events.ts / eventCatalog.ts:
 * it declares GameEvents and their actions. The simulation engine validates and
 * applies the effects; nothing here mutates state.
 *
 * OCCUPATION INTERACTION (reuses the existing "append an action" pattern from
 * chapter1Events.ts): `missionEventVariant(event, occupation)` returns a copy of
 * the event with ONE extra mitigation action appended when the character's
 * occupation is a good fit for that crisis. The advantage is meaningful but not
 * overwhelming (a modestly better trade-off), and never makes one occupation
 * universally superior — each mitigation is tied to a specific crisis theme.
 *
 * DETERMINISM: these are plain data. The engine applies fixed deltas, so the
 * same state + mission + occupation + choice always yields the same result.
 *
 * SURVIVABILITY: every event offers at least one low-risk survival path. No
 * single choice instantly kills the player or destroys large resource amounts.
 */

import type { GameEvent } from './eventTypes';
import type { MissionType, Occupation } from '../simulation/simulationTypes';

// ───────────────────────────────────────────────────────────────────────────
// LUNAR events
// ───────────────────────────────────────────────────────────────────────────

const LUNAR_POWER_INSTABILITY: GameEvent = {
  id: 'mission-lunar-power-instability',
  title: '🌙 LUNAR POWER INSTABILITY',
  description:
    'The 14-day lunar night and sharp thermal swings are destabilising power generation. Exposed connectors are contracting in the cold, and output is flickering. You must decide how to ride it out.',
  severity: 'major',
  availableActions: [
    {
      id: 'mission-lunar-power-instability--conserve',
      label: 'Conserve Power',
      description:
        'Shed non-essential loads and ride out the instability. Safe, but stored power still dips a little while systems re-stabilise.',
      effect: {
        immediateResources: { power: -3 },
        immediateCrew: { morale: -2 },
      },
    },
    {
      id: 'mission-lunar-power-instability--push',
      label: 'Push Systems',
      description:
        'Keep generation at full output through the instability. Avoids slowdown now, but the strain risks damaging the array over the next days.',
      effect: {
        immediateSystems: { powerGeneration: 3 },
        delayed: [
          {
            delayInDays: 2,
            description: 'Strained connectors degrade the power array.',
            parameters: { kind: 'system', changes: { powerGeneration: -8 } },
          },
        ],
      },
    },
  ],
};

const LUNAR_THERMAL_EMERGENCY: GameEvent = {
  id: 'mission-lunar-thermal-emergency',
  title: '🌙 LUNAR THERMAL EMERGENCY',
  description:
    'An extreme temperature swing is overwhelming the habitat climate loop. Life-support efficiency is dropping as the system fights to hold a stable internal temperature.',
  severity: 'major',
  availableActions: [
    {
      id: 'mission-lunar-thermal-emergency--reduce-load',
      label: 'Reduce Habitat Load',
      description:
        'Power down comfort systems and tighten the habitat envelope. Lowers consumption and protects life support, at a small morale cost.',
      effect: {
        immediateResources: { power: 4 },
        immediateSystems: { lifeSupportEfficiency: 3 },
        immediateCrew: { morale: -3 },
      },
    },
    {
      id: 'mission-lunar-thermal-emergency--full-ops',
      label: 'Maintain Full Operations',
      description:
        'Keep the habitat fully heated and comfortable. Avoids the morale hit but burns extra power and strains life support.',
      effect: {
        immediateResources: { power: -8 },
        immediateSystems: { lifeSupportEfficiency: -4 },
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// MARS events
// ───────────────────────────────────────────────────────────────────────────

const MARS_DUST_STORM: GameEvent = {
  id: 'mission-mars-dust-storm',
  title: '🔴 MARS DUST STORM',
  description:
    'A dense regional dust storm has settled over the outpost. Airborne dust is coating the solar array and solar generation has dropped sharply.',
  severity: 'major',
  availableActions: [
    {
      id: 'mission-mars-dust-storm--conservation',
      label: 'Enter Conservation Mode',
      description:
        'Throttle operations to match the reduced solar input. Preserves stored power, with a small morale dip from the slowdown.',
      effect: {
        immediateSystems: { powerGeneration: -3 },
        immediateCrew: { morale: -2 },
      },
    },
    {
      id: 'mission-mars-dust-storm--normal-ops',
      label: 'Maintain Normal Operations',
      description:
        'Keep everything running by drawing on stored power. No slowdown, but reserves take a real hit while the storm lasts.',
      effect: {
        immediateResources: { power: -12 },
      },
    },
  ],
};

const MARS_RADIATION_SPIKE: GameEvent = {
  id: 'mission-mars-radiation-spike',
  title: '🔴 MARS RADIATION SPIKE',
  description:
    'A burst of solar particles has pushed ambient radiation well above safe limits. With thin atmosphere and no magnetic field, exposure is climbing fast.',
  severity: 'critical',
  availableActions: [
    {
      id: 'mission-mars-radiation-spike--shelter',
      label: 'Shelter Immediately',
      description:
        'Move into the shielded core and halt surface activity. Exposure stops rising, but running the shelter draws extra life-support resources.',
      effect: {
        immediateResources: { power: -6, oxygen: -4 },
        immediateCrew: { radiationExposure: -6 },
      },
    },
    {
      id: 'mission-mars-radiation-spike--continue',
      label: 'Continue Operations',
      description:
        'Keep working through the spike to preserve resources. Exposure rises now and keeps climbing for a day as the burst passes.',
      effect: {
        immediateCrew: { radiationExposure: 10 },
        delayed: [
          {
            delayInDays: 1,
            description: 'Lingering particle flux adds further radiation exposure.',
            parameters: { kind: 'crew', changes: { radiationExposure: 6 } },
          },
        ],
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// DEEP-SPACE events
// ───────────────────────────────────────────────────────────────────────────

const DEEP_SPACE_ANOMALY: GameEvent = {
  id: 'mission-deep-space-anomaly',
  title: '🛰️ UNKNOWN ANOMALY',
  description:
    'Sensors detect an unexplained signature drifting near the outpost. It could be a salvageable resource cache — or a hazard. With no one to call, the decision is yours alone.',
  severity: 'major',
  availableActions: [
    {
      id: 'mission-deep-space-anomaly--investigate',
      label: 'Investigate',
      description:
        'Commit power to a close survey. It costs energy up front, but a successful scan recovers usable materials over the next days.',
      effect: {
        immediateResources: { power: -8 },
        delayed: [
          {
            delayInDays: 2,
            description: 'The survey recovers usable water and food from the anomaly.',
            parameters: { kind: 'resource', changes: { water: 10, food: 8 } },
          },
        ],
      },
    },
    {
      id: 'mission-deep-space-anomaly--ignore',
      label: 'Ignore',
      description:
        'Hold position and leave the anomaly alone. No risk and no cost — but you forgo whatever it might have offered.',
      effect: {
        // Deliberately inert: safe choice, forgoes the potential benefit.
      },
    },
  ],
};

const DEEP_SPACE_SYSTEMS_FAILURE: GameEvent = {
  id: 'mission-deep-space-systems-failure',
  title: '🛰️ CRITICAL SYSTEMS FAILURE',
  description:
    'A core subsystem has become unreliable and is browning out intermittently. With no resupply possible, every spare part and watt you spend is gone for good.',
  severity: 'critical',
  availableActions: [
    {
      id: 'mission-deep-space-systems-failure--repair',
      label: 'Attempt Repair',
      description:
        'Rebuild the failing subsystem from on-hand spares. Costs scarce power now but restores reliable life support and power generation.',
      effect: {
        immediateResources: { power: -10 },
        immediateSystems: { lifeSupportEfficiency: 6, powerGeneration: 5 },
      },
    },
    {
      id: 'mission-deep-space-systems-failure--reroute',
      label: 'Reroute Resources',
      description:
        'Bypass the failing unit instead of repairing it. Saves power now, but the workaround steadily erodes life-support efficiency.',
      effect: {
        immediateResources: { power: 3 },
        delayed: [
          {
            delayInDays: 2,
            description: 'The bypass overloads adjacent systems, degrading life support.',
            parameters: { kind: 'system', changes: { lifeSupportEfficiency: -9 } },
          },
        ],
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// Eligibility map: an event is only eligible on the site it belongs to.
// ───────────────────────────────────────────────────────────────────────────

export const MISSION_EVENTS_BY_SITE: Record<MissionType, GameEvent[]> = {
  lunar: [LUNAR_POWER_INSTABILITY, LUNAR_THERMAL_EMERGENCY],
  mars: [MARS_DUST_STORM, MARS_RADIATION_SPIKE],
  'deep-space': [DEEP_SPACE_ANOMALY, DEEP_SPACE_SYSTEMS_FAILURE],
};

/** Flat list of every mission-specific event (for catalog registration/lookup). */
export const MISSION_EVENTS: GameEvent[] = [
  ...MISSION_EVENTS_BY_SITE.lunar,
  ...MISSION_EVENTS_BY_SITE.mars,
  ...MISSION_EVENTS_BY_SITE['deep-space'],
];

/** Set of all mission-specific event ids (for quick membership checks). */
export const MISSION_EVENT_IDS = new Set(MISSION_EVENTS.map((e) => e.id));

/** The site an event belongs to, or undefined if it is not a mission event. */
export function siteForMissionEvent(eventId: string): MissionType | undefined {
  for (const site of Object.keys(MISSION_EVENTS_BY_SITE) as MissionType[]) {
    if (MISSION_EVENTS_BY_SITE[site].some((e) => e.id === eventId)) return site;
  }
  return undefined;
}

// ───────────────────────────────────────────────────────────────────────────
// Occupation interaction: append ONE extra mitigation action when the
// character's occupation is a good fit for the crisis. Reuses the existing
// "append an action to availableActions" pattern (see chapter1Events.ts).
// ───────────────────────────────────────────────────────────────────────────

type OccupationAction = GameEvent['availableActions'][number];

/**
 * The occupation-specific mitigation for each mission event, keyed by event id
 * then occupation. Only fits that make thematic sense are listed; anything not
 * listed simply gets no bonus action (so no occupation is universally best).
 */
const OCCUPATION_MITIGATIONS: Record<string, Partial<Record<Occupation, OccupationAction>>> = {
  'mission-lunar-power-instability': {
    engineer: {
      id: 'mission-lunar-power-instability--engineer',
      label: 'Engineer: Stabilise the Array',
      description:
        'Your technical training lets you re-seat the failing connectors cleanly — holding generation steady with no lasting damage.',
      effect: {
        immediateResources: { power: -2 },
        immediateSystems: { powerGeneration: 4 },
      },
    },
  },
  'mission-lunar-thermal-emergency': {
    chemist: {
      id: 'mission-lunar-thermal-emergency--chemist',
      label: 'Chemist: Rebalance Climate Loop',
      description:
        'You adjust the coolant chemistry to hold temperature efficiently, protecting life support without shutting systems down.',
      effect: {
        immediateResources: { power: -2 },
        immediateSystems: { lifeSupportEfficiency: 5 },
      },
    },
  },
  'mission-mars-dust-storm': {
    engineer: {
      id: 'mission-mars-dust-storm--engineer',
      label: 'Engineer: Keep the Array Clear',
      description:
        'You rig the array sweepers to run through the storm, restoring much of the lost generation for a modest power cost.',
      effect: {
        immediateResources: { power: -3 },
        immediateSystems: { powerGeneration: 6 },
      },
    },
    pilot: {
      id: 'mission-mars-dust-storm--pilot',
      label: 'Pilot: Manual Array Realignment',
      description:
        'You angle the panels by hand to catch what light gets through the dust, recovering some generation.',
      effect: {
        immediateResources: { power: -2 },
        immediateSystems: { powerGeneration: 3 },
      },
    },
  },
  'mission-mars-radiation-spike': {
    medicalOfficer: {
      id: 'mission-mars-radiation-spike--medic',
      label: 'Medical Officer: Managed Shelter Protocol',
      description:
        'You run an efficient shelter-and-treatment protocol, cutting exposure sharply while keeping resource use low.',
      effect: {
        immediateResources: { power: -3 },
        immediateCrew: { radiationExposure: -10 },
      },
    },
  },
  'mission-deep-space-anomaly': {
    scientist: {
      id: 'mission-deep-space-anomaly--scientist',
      label: 'Scientist: Remote Analysis First',
      description:
        'You analyse the anomaly from a safe distance, so the close survey is cheaper and the recovered yield arrives sooner.',
      effect: {
        immediateResources: { power: -4 },
        delayed: [
          {
            delayInDays: 1,
            description: 'Your targeted survey recovers materials from the anomaly.',
            parameters: { kind: 'resource', changes: { water: 10, food: 8 } },
          },
        ],
      },
    },
  },
  'mission-deep-space-systems-failure': {
    engineer: {
      id: 'mission-deep-space-systems-failure--engineer',
      label: 'Engineer: Precision Repair',
      description:
        'Your expertise makes the repair far more efficient — restoring the subsystem for a fraction of the usual power cost.',
      effect: {
        immediateResources: { power: -4 },
        immediateSystems: { lifeSupportEfficiency: 6, powerGeneration: 5 },
      },
    },
  },
};

/**
 * Return a copy of a mission event with the occupation-specific mitigation
 * appended, when one exists for this (event, occupation). The base event is
 * never mutated and its id is unchanged. If there is no fit, the event is
 * returned unchanged.
 */
export function missionEventVariant(event: GameEvent, occupation: Occupation): GameEvent {
  const bonus = OCCUPATION_MITIGATIONS[event.id]?.[occupation];
  if (!bonus) return event;
  return {
    ...event,
    availableActions: [...event.availableActions, bonus],
  };
}
