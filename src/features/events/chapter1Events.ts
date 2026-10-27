
/**
 * chapter1Events.ts
 * -----------------
 * MARS: OUTPOST ZERO
 *
 * Chapter 1: A Fragile Beginning
 * Covers Sols 1–5.
 *
 * Each incident contains:
 * - A unique event ID
 * - A player-facing title and description
 * - A severity level
 * - Three shared player choices, plus a location-specific Sol 5 response
 * - Immediate and optional delayed effects
 *
 * The simulation engine is responsible for applying
 * the effects. This file only defines event content.
 */

import type { GameEvent } from './eventTypes';
import type { MissionType } from '../simulation/simulationTypes';

const CHAPTER_1_DESCRIPTIONS: Record<string, Record<MissionType, string>> = {
  'story-sol-01-supply-inspection': {
    lunar:
      'Your lunar outpost has begun operations, but the initial inspection finds dust around equipment seals and discrepancies in the supply records. Before the mission can proceed safely, you must decide how to handle the uncertainty.',
    mars:
      'Your Mars outpost has begun operations, but the initial inspection finds fine dust around equipment and discrepancies in the supply records. Before the mission can proceed safely, you must decide how to handle the uncertainty.',
    'deep-space':
      'Your deep-space outpost has begun operations, but the initial inspection finds discrepancies in equipment and supply records. With no nearby support or resupply, you must decide how to handle the uncertainty.',
  },
  'story-sol-02-water-recycling': {
    lunar:
      'The water recycling unit is producing irregular filtration readings, and abrasive lunar dust may be affecting its seals. If the problem continues, the outpost may struggle to maintain a safe water supply.',
    mars:
      'The water recycling unit is producing irregular filtration readings, and fine Martian dust may be stressing its filters. If the problem continues, the outpost may struggle to maintain a safe water supply.',
    'deep-space':
      'The water recycling unit is producing irregular filtration readings. In this closed-loop outpost, contaminated water is difficult to replace, so you must choose how to protect the limited supply.',
  },
  'story-sol-03-power-instability': {
    lunar:
      'The outpost power supply is fluctuating dangerously. Repeated lunar temperature swings may be stressing exposed connections, and essential equipment could shut down if the instability continues.',
    mars:
      'The outpost power supply is fluctuating dangerously. Martian dust and radiation are stressing exposed equipment, and essential systems could shut down if the instability continues.',
    'deep-space':
      'The isolated outpost power supply is fluctuating dangerously. With limited solar input and no nearby support, essential equipment could shut down if the instability continues.',
  },
  'story-sol-04-greenhouse-contamination': {
    lunar:
      'A contamination warning has appeared in the greenhouse. Lunar dust may have entered through the habitat systems and affected the crops. You must decide whether to harvest, isolate or treat them.',
    mars:
      'A contamination warning has appeared in the greenhouse. Fine Martian dust may have entered the growing area and affected the crops. You must decide whether to harvest, isolate or treat them.',
    'deep-space':
      'A contamination warning has appeared in the greenhouse. In this tightly recycled habitat, the cause is uncertain and replacement supplies are limited. You must decide whether to harvest, isolate or treat the crops.',
  },
  'story-sol-05-environmental-crisis': {
    lunar:
      'Extreme temperature changes threaten exposed power equipment. Critical systems are under strain, and you must act before the temperature swing causes further damage.',
    mars:
      'A severe dust storm threatens power generation and exposed equipment. Critical systems are under strain, and you must act before the storm causes further damage.',
    'deep-space':
      'A micrometeoroid impact has damaged external power infrastructure. Critical systems are under strain, and you must act before the damage compromises the outpost.',
  },
};

/**
 * Create a mission-specific copy of a Chapter 1 event without changing its
 * shared catalogue definition or the event's stable ID.
 */
export function chapter1EventForMission(event: GameEvent, missionType: MissionType): GameEvent {
  const description = CHAPTER_1_DESCRIPTIONS[event.id]?.[missionType];
  if (!description) return event;

  const uniqueAction =
    event.id === 'story-sol-05-environmental-crisis'
      ? chapter1EnvironmentalAction(missionType)
      : undefined;

  return {
    ...event,
    description,
    availableActions: uniqueAction
      ? [...event.availableActions, uniqueAction]
      : event.availableActions,
  };
}

/** Define the one extra Sol 5 response that directly addresses each setting's crisis. */
function chapter1EnvironmentalAction(missionType: MissionType): GameEvent['availableActions'][number] {
  switch (missionType) {
    case 'lunar':
      return {
        id: 'story-sol-05-lunar-thermal-protection',
        label: 'Activate Emergency Thermal Protection',
        description:
          'Use stored power to shield exposed equipment from the temperature swing, improving shielding integrity.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { shieldingIntegrity: 5 },
        },
      };
    case 'mars':
      return {
        id: 'story-sol-05-mars-dust-protection',
        label: 'Deploy Emergency Dust Protection',
        description:
          'Use stored power to cover vulnerable equipment and restore some power generation during the dust storm.',
        effect: {
          immediateResources: { power: -7 },
          immediateSystems: { powerGeneration: 5 },
        },
      };
    case 'deep-space':
      return {
        id: 'story-sol-05-deep-space-impact-reinforcement',
        label: 'Seal and Reinforce the Impact Zone',
        description:
          'Use stored power to seal the micrometeoroid breach and reinforce the damaged area, improving shielding integrity.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { shieldingIntegrity: 7 },
        },
      };
  }
}

/**
 * All five Chapter 1 storyline events.
 *
 * Note: Sol scheduling is handled separately.
 * The order here does not automatically make an
 * event appear on its corresponding Sol.
 */
export const CHAPTER_1_EVENTS: GameEvent[] = [
  // ==================================================
  // SOL 1 — EMERGENCY SUPPLY INSPECTION
  // ==================================================
  {
    id: 'story-sol-01-supply-inspection',
    title: 'Emergency Supply Inspection',
    severity: 'info',

    description:
      'Your outpost has begun operations, but the initial inspection reveals discrepancies in equipment and supply records. Before the mission can proceed safely, you must decide how to handle the uncertainty.',

    availableActions: [
      {
        id: 'story-sol-01-inspect',
        label: 'Inspect Essential Systems',
        description:
          'Spend energy checking life-support equipment for faults. This improves reliability but consumes valuable power.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: {
            lifeSupportEfficiency: 3,
          },
        },
      },
      {
        id: 'story-sol-01-organise',
        label: 'Reorganise Supplies',
        description:
          'Review storage records and recover misplaced water reserves. This uses some power but improves your available supplies.',
        effect: {
          immediateResources: {
            power: -2,
            water: 3,
          },
        },
      },
      {
        id: 'story-sol-01-begin',
        label: 'Begin Operations Immediately',
        description:
          'Skip further checks and begin normal operations. You save time and energy now, but an undetected equipment fault could cause trouble later.',
        effect: {
          // No immediate resource or system changes.
          delayed: [
            {
              delayInDays: 2,
              description:
                'An overlooked equipment fault reduces power generation.',
              parameters: {
                kind: 'system',
                changes: { powerGeneration: -4 },
              },
            },
          ],
        },
      },
    ],
  },

  // ==================================================
  // SOL 2 — WATER RECYCLING MALFUNCTION
  // ==================================================
  {
    id: 'story-sol-02-water-recycling',
    title: 'Water Recycling Malfunction',
    severity: 'minor',

    description:
      'The water recycling unit is producing irregular filtration readings. If the problem continues, the outpost may struggle to maintain a safe water supply. You must choose between filtration, repairs or conservation.',

    availableActions: [
      {
        id: 'story-sol-02-filter',
        label: 'Increase Filtration',
        description:
          'Run additional filtration cycles to maintain water quality. This improves life support immediately but places extra strain on the equipment.',
        effect: {
          immediateResources: { power: -9 },
          immediateSystems: {
            lifeSupportEfficiency: 4,
          },
          delayed: [
            {
              delayInDays: 2,
              description:
                'Extended filtration causes minor equipment deterioration.',
              parameters: {
                kind: 'system',
                changes: {
                  lifeSupportEfficiency: -2,
                },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-02-repair',
        label: 'Repair the Recycling Unit',
        description:
          'Use power and some stored water to repair the malfunctioning equipment, improving long-term life-support performance.',
        effect: {
          immediateResources: {
            power: -7,
            water: -4,
          },
          immediateSystems: {
            lifeSupportEfficiency: 6,
          },
        },
      },
      {
        id: 'story-sol-02-ration',
        label: 'Ration Water and Monitor',
        description:
          'Reduce water consumption to preserve reserves. The restrictions lower morale, while the underlying equipment fault remains unresolved.',
        effect: {
          immediateResources: { water: 3 },
          immediateCrew: { morale: -4 },
          delayed: [
            {
              delayInDays: 2,
              description:
                'The unresolved recycling malfunction worsens.',
              parameters: {
                kind: 'system',
                changes: {
                  lifeSupportEfficiency: -6,
                },
              },
            },
          ],
        },
      },
    ],
  },

  // ==================================================
  // SOL 3 — POWER SYSTEM INSTABILITY
  // ==================================================
  {
    id: 'story-sol-03-power-instability',
    title: 'Power System Instability',
    severity: 'major',

    description:
      'The outpost power supply is fluctuating dangerously. Essential equipment could shut down if the instability continues. A temporary bypass may buy time, but a permanent repair will require significantly more energy.',

    availableActions: [
      {
        id: 'story-sol-03-bypass',
        label: 'Install a Temporary Bypass',
        description:
          'Restore partial power generation at a lower immediate cost. The temporary bypass may deteriorate after continued use.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: {
            powerGeneration: 3,
          },
          delayed: [
            {
              delayInDays: 2,
              description:
                'The temporary bypass deteriorates, reducing power generation.',
              parameters: {
                kind: 'system',
                changes: { powerGeneration: -7 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-03-conserve',
        label: 'Reduce Non-Essential Operations',
        description:
          'Suspend less important activities to conserve stored energy. The restrictions reduce crew morale.',
        effect: {
          immediateResources: { power: 5 },
          immediateCrew: { morale: -4 },
        },
      },
      {
        id: 'story-sol-03-repair',
        label: 'Perform Comprehensive Repairs',
        description:
          'Invest more energy in repairing the power infrastructure. This provides a larger improvement to long-term generation.',
        effect: {
          immediateResources: { power: -11 },
          immediateSystems: {
            powerGeneration: 9,
          },
        },
      },
    ],
  },

  // ==================================================
  // SOL 4 — GREENHOUSE CONTAMINATION
  // ==================================================
  {
    id: 'story-sol-04-greenhouse-contamination',
    title: 'Greenhouse Contamination',
    severity: 'major',

    description:
      'A contamination warning has appeared in the greenhouse. Some crops may already be affected. You must decide whether to harvest immediately, isolate the damaged crops or attempt targeted treatment.',

    availableActions: [
      {
        id: 'story-sol-04-harvest',
        label: 'Continue Production',
        description:
          'Harvest usable crops immediately to preserve food supplies. However, continuing operations could allow contamination to spread.',
        effect: {
          immediateResources: { food: 4 },
          immediateCrew: { morale: -3 },
          delayed: [
            {
              delayInDays: 3,
              description:
                'Greenhouse contamination spreads and damages future food production.',
              parameters: {
                kind: 'system',
                changes: { foodProduction: -10 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-04-isolate',
        label: 'Isolate Affected Crops',
        description:
          'Remove contaminated crops and disinfect growing areas. Some food must be discarded, but the remaining greenhouse can operate more efficiently.',
        effect: {
          immediateResources: {
            food: -7,
            power: -4,
          },
          immediateSystems: {
            foodProduction: 5,
          },
        },
      },
      {
        id: 'story-sol-04-treat',
        label: 'Apply Selective Treatment',
        description:
          'Use power to treat affected growing areas while preserving as many crops as possible. The surviving crops may provide a later harvest.',
        effect: {
          immediateResources: { power: -8 },
          immediateSystems: {
            foodProduction: 2,
          },
          delayed: [
            {
              delayInDays: 2,
              description:
                'Treated crops recover and produce a small additional harvest.',
              parameters: {
                kind: 'resource',
                changes: { food: 5 },
              },
            },
          ],
        },
      },
    ],
  },

  // ==================================================
  // SOL 5 — FIRST ENVIRONMENTAL CRISIS
  // ==================================================
  {
    id: 'story-sol-05-environmental-crisis',
    title: 'First Environmental Crisis',
    severity: 'major',

    description:
      'A sudden environmental emergency threatens the outpost energy infrastructure. Critical equipment is under strain, and you must act before the situation becomes more dangerous.',

    availableActions: [
      {
        id: 'story-sol-05-intervene',
        label: 'Perform Emergency Intervention',
        description:
          'Carry out urgent repairs to protect power generation. The work consumes energy and places considerable physical strain on the astronaut.',
        effect: {
          immediateResources: { power: -7 },
          immediateCrew: { health: -4 },
          immediateSystems: {
            powerGeneration: 7,
          },
          delayed: [
            {
              delayInDays: 2,
              description:
                'Physical exhaustion from the emergency intervention affects astronaut health.',
              parameters: {
                kind: 'crew',
                changes: { health: -3 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-05-shelter',
        label: 'Shelter and Conserve',
        description:
          'Reduce operations and remain inside the habitat. This preserves stored power, but unresolved environmental damage may affect future generation.',
        effect: {
          immediateResources: { power: 4 },
          immediateCrew: { morale: -4 },
          delayed: [
            {
              delayInDays: 2,
              description:
                'Unresolved environmental damage reduces power generation.',
              parameters: {
                kind: 'system',
                changes: { powerGeneration: -6 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-05-isolate',
        label: 'Isolate Vulnerable Equipment',
        description:
          'Disconnect exposed equipment and reinforce protective systems. This improves shielding but reduces power generation.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: {
            powerGeneration: -3,
            shieldingIntegrity: 4,
          },
        },
      },
    ],
  },
];
