/**
 * Chapter 3: The Breaking Point
 * Covers Sols 11–15. Content remains data-driven through the shared event
 * resolver and effect processor.
 */

import type { GameState, MissionType } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';

const CHAPTER_3_DESCRIPTIONS: Record<number, Record<MissionType, string>> = {
  11: {
    lunar:
      'Life-support reliability is slipping as abrasive regolith works against seals through extreme temperature cycles. Water and oxygen reserves are finite; stabilise the habitat before the next thermal swing.',
    mars:
      'Fine dust and radiation exposure are challenging the filtration and life-support systems. Water and oxygen reserves are finite; stabilise the remote habitat before reliability falls further.',
    'deep-space':
      'The isolated habitat reports declining life-support reliability. With closed-loop water and oxygen systems, limited replacement components and no resupply, a small fault could threaten survival.',
  },
  12: {
    lunar:
      'Accumulated work and harsh thermal cycles are straining the astronaut, while shielding must protect the habitat from radiation and solar exposure. Choose how to balance recovery, protection and essential work.',
    mars:
      'Accumulated work and ongoing radiation exposure are taking a toll. The astronaut must balance medical recovery, shielding and the remaining essential tasks.',
    'deep-space':
      'Isolation, accumulated work and radiation exposure are testing the astronaut and the habitat shielding. Replacement components are limited, so choose carefully between recovery and protection.',
  },
  13: {
    lunar:
      'Finite reserves and power demands compete as the outpost manages oxygen, food and water through another cycle of extreme temperatures. Recover only what existing stores and systems can support.',
    mars:
      'Variable solar generation and exposed equipment constrain the capacity to manage oxygen, food and water. Choose how to recover reserves or improve efficiency without assuming supplies are unlimited.',
    'deep-space':
      'The closed-loop habitat must divide limited power between oxygen, food and water recovery. With no resupply, rely on recoverable reserves and incremental efficiency improvements.',
  },
  14: {
    lunar:
      'The midpoint approaches. Thermal stress and abrasive regolith continue to challenge exposed equipment, so prepare the power system, inventory or crew using finite reserves wisely.',
    mars:
      'The midpoint approaches as dust and variable sunlight test equipment reliability. Reorganise recoverable inventory or prepare the crew before the next mission phase.',
    'deep-space':
      'The midpoint approaches with no resupply in sight. Check closed-loop stores and prepare the isolated crew and systems using only recoverable inventory.',
  },
};

function sol15Description(state: GameState): string {
  if (state.mission.missionType === 'deep-space') {
    return 'Sol 15 marks the mission midpoint, but no supply vehicle can reach this isolated habitat. With closed-loop recycling, limited components and no resupply, choose how to endure the isolation test.';
  }

  if (state.mission.resupplyDelivered) {
    const location = state.mission.missionType === 'lunar' ? 'Lunar' : 'Mars';
    return `The ${location} outpost has reached Sol 15. The scheduled resupply has arrived and its resources have already been added to the mission stores. Take stock and acknowledge the midpoint before operations continue.`;
  }

  const location = state.mission.missionType === 'lunar' ? 'Lunar' : 'Mars';
  return `The ${location} outpost has reached Sol 15, but the mission state records no resupply delivery. Do not count on new stores; acknowledge the midpoint and continue managing the reserves on hand.`;
}

/**
 * Adapt a Chapter 3 event to its environment and current Sol 15 resupply state.
 * The returned event keeps stable IDs and the saved action definitions.
 */
export function chapter3EventForState(event: GameEvent, state: GameState): GameEvent {
  const day = Number(event.id.match(/^story-sol-(\d{2})-/)?.[1]);
  if (day === 15) return { ...event, description: sol15Description(state) };

  const description = day ? CHAPTER_3_DESCRIPTIONS[day]?.[state.mission.missionType] : undefined;
  return description ? { ...event, description } : event;
}

/** The shared Sol 11–14 events and the mission-specific Sol 15 event. */
export const CHAPTER_3_EVENTS: GameEvent[] = [
  {
    id: 'story-sol-11-life-support-warning',
    title: 'Life-Support Warning',
    description: 'Life-support reliability is deteriorating, threatening water and oxygen management.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-11-purify-stabilise',
        label: 'Purify and Stabilise',
        description: 'Spend power to purify circulating supplies and improve life-support reliability.',
        effect: {
          immediateResources: { power: -12 },
          immediateSystems: { lifeSupportEfficiency: 8 },
        },
      },
      {
        id: 'story-sol-11-emergency-conservation',
        label: 'Emergency Conservation',
        description:
          'Recover water and oxygen from existing reserves and prevent some immediate consumption. Strict conservation strains morale and may wear on life support.',
        effect: {
          immediateResources: { water: 4, oxygen: 4 },
          immediateCrew: { morale: -6 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Extended emergency conservation adds strain to life-support systems.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -5 } },
            },
          ],
        },
      },
      {
        id: 'story-sol-11-replace-components',
        label: 'Replace Critical Components',
        description:
          'Spend power and a small amount of oxygen to replace worn components, improving life-support reliability.',
        effect: {
          immediateResources: { power: -8, oxygen: -5 },
          immediateSystems: { lifeSupportEfficiency: 10 },
        },
      },
    ],
  },
  {
    id: 'story-sol-12-medical-radiation-concerns',
    title: 'Medical and Radiation Concerns',
    description:
      'Accumulated strain and environmental radiation risks demand a response. Decide how to protect the astronaut and habitat.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-12-prioritise-recovery',
        label: 'Prioritise Recovery',
        description: 'Spend power on medical care and rest, restoring crew health.',
        effect: {
          immediateResources: { power: -5 },
          immediateCrew: { health: 7 },
        },
      },
      {
        id: 'story-sol-12-reinforce-shielding',
        label: 'Reinforce Radiation Shielding',
        description: 'Spend power and reinforce the habitat shielding against radiation exposure.',
        effect: {
          immediateResources: { power: -8 },
          immediateSystems: { shieldingIntegrity: 8 },
        },
      },
      {
        id: 'story-sol-12-essential-work',
        label: 'Continue Essential Work',
        description:
          'Reduce nonessential demand to preserve stored power, but the astronaut takes on strain that may worsen later.',
        effect: {
          immediateResources: { power: 3 },
          immediateCrew: { health: -5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'The strain from continued essential work further reduces crew health.',
              parameters: { kind: 'crew', changes: { health: -5 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'story-sol-13-emergency-resource-allocation',
    title: 'Emergency Resource Allocation',
    description:
      'Essential resources compete for limited operational capacity. Allocate power to oxygen, recoverable stores or long-term efficiency.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-13-prioritise-oxygen',
        label: 'Prioritise Oxygen Systems',
        description:
          'Spend power to recover oxygen from the habitat’s existing reserves and recycling loop.',
        effect: {
          immediateResources: { power: -8, oxygen: 8 },
        },
      },
      {
        id: 'story-sol-13-recover-reserves',
        label: 'Recover Food and Water Reserves',
        description:
          'Spend power to retrieve stored food and reclaim water from recoverable inventory.',
        effect: {
          immediateResources: { power: -6, food: 5, water: 5 },
        },
      },
      {
        id: 'story-sol-13-long-term-efficiency',
        label: 'Invest in Long-Term Efficiency',
        description:
          'Spend power to improve life-support and food-production efficiency, reducing pressure on future supplies.',
        effect: {
          immediateResources: { power: -10 },
          immediateSystems: { lifeSupportEfficiency: 6, foodProduction: 4 },
        },
      },
    ],
  },
  {
    id: 'story-sol-14-midpoint-preparation',
    title: 'Midpoint Preparation',
    description:
      'The mission midpoint is near. Prepare the systems, inventory and crew for the next phase without wasting finite supplies.',
    severity: 'minor',
    availableActions: [
      {
        id: 'story-sol-14-reinforce-power',
        label: 'Reinforce Power Generation',
        description: 'Spend power on preventive maintenance for the outpost power-generation system.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { powerGeneration: 4 },
        },
      },
      {
        id: 'story-sol-14-reorganise-supplies',
        label: 'Reorganise Emergency Supplies',
        description:
          'Recover food and water from existing inventory and reduce avoidable waste; the reorganisation tires the crew.',
        effect: {
          immediateResources: { food: 3, water: 3 },
          immediateCrew: { morale: -3 },
        },
      },
      {
        id: 'story-sol-14-crew-recovery',
        label: 'Prioritise Crew Recovery',
        description: 'Use a small amount of power to restore crew health and morale.',
        effect: {
          immediateResources: { power: -3 },
          immediateCrew: { health: 4, morale: 4 },
        },
      },
    ],
  },
  {
    id: 'story-sol-15-midpoint-turning-point',
    title: 'Midpoint Turning Point',
    description: 'The mission reaches its midpoint.',
    severity: 'info',
    availableActions: [
      {
        id: 'story-sol-15-acknowledge-midpoint',
        label: 'Acknowledge the Midpoint',
        description:
          'Take stock of the mission’s progress. The scheduled resupply, if delivered, is already reflected in the stores.',
        effect: {},
      },
    ],
  },
  {
    id: 'story-sol-15-no-resupply-isolation-test',
    title: 'No Resupply: The Isolation Test',
    description:
      'No external supplies are coming. The isolated habitat must rely on closed-loop systems and finite reserves.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-15-intensify-recycling',
        label: 'Intensify Closed-Loop Recycling',
        description:
          'Spend power to improve life-support recycling; extended high-load operation will strain the equipment.',
        effect: {
          immediateResources: { power: -10 },
          immediateSystems: { lifeSupportEfficiency: 7 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Sustained recycling load reduces stored power.',
              parameters: { kind: 'resource', changes: { power: -4 } },
            },
          ],
        },
      },
      {
        id: 'story-sol-15-reduce-operations',
        label: 'Reduce Non-Essential Operations',
        description:
          'Shut down nonessential demand to preserve stored power, accepting a morale cost and continued isolation.',
        effect: {
          immediateResources: { power: 5 },
          immediateCrew: { morale: -6 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Prolonged reduced operations further strain crew morale.',
              parameters: { kind: 'crew', changes: { morale: -3 } },
            },
          ],
        },
      },
      {
        id: 'story-sol-15-recover-emergency-equipment',
        label: 'Recover Emergency Equipment Reserves',
        description:
          'Spend power to retrieve stored water and oxygen reserves from emergency equipment; handling the stores stresses life support.',
        effect: {
          immediateResources: { power: -6, water: 5, oxygen: 5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Emergency reserve recovery adds strain to life-support systems.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -3 } },
            },
          ],
        },
      },
    ],
  },
];
