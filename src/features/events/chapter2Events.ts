/**
 * Chapter 2: Signals in the Storm
 * Covers Sols 6–10. Event content is data; the simulation engine applies it.
 */

import type { GameState, MissionType } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';

const CHAPTER_2_DESCRIPTIONS: Record<
  string,
  Record<MissionType, { standard: string; preventive?: string }>
> = {
  'story-sol-06-aftermath-assessment': {
    lunar: {
      standard:
        'Mission Control requests a full assessment after the temperature crisis. Lunar dust and extreme thermal swings still threaten exposed systems; use this review to stabilise operations.',
    },
    mars: {
      standard:
        'Mission Control requests a full assessment after the environmental crisis. Dust and exposure continue to test equipment reliability; use this review to stabilise operations.',
    },
    'deep-space': {
      standard:
        'Mission Control requests a full assessment after the environmental crisis, though the long communication delay limits its guidance. With no nearby resupply, stabilise the outpost for the next mission stage.',
    },
  },
  'story-sol-07-communication-array-failure': {
    lunar: {
      standard:
        'Extreme temperature swings and lunar dust have disrupted the communication array. Contact with Mission Control is unreliable, leaving you unsure whether critical instructions or assistance can get through.',
    },
    mars: {
      standard:
        'Dust interference has destabilised the communication array. Contact with Mission Control is unreliable, leaving you unsure whether critical instructions or assistance can get through.',
    },
    'deep-space': {
      standard:
        'The distant communication link has failed again. Long signal delays and scarce replacement components leave you uncertain whether instructions or emergency assistance can reach the outpost.',
    },
  },
  'story-sol-08-narrow-window': {
    lunar: {
      standard:
        'A brief period of favourable operating conditions offers a chance to deploy recovery equipment despite low gravity and limited supplies. Stored and reclaimed reserves may be recovered before conditions change.',
    },
    mars: {
      standard:
        'A temporary lull in the harsh conditions opens a narrow recovery window. Use it to reclaim stored supplies or check equipment before dust and exposure worsen.',
    },
    'deep-space': {
      standard:
        'The outpost enters a brief stable operating window. Recycling and recovery equipment can run now to reclaim stored supplies before the isolated systems face further strain.',
    },
  },
  'story-sol-09-repairs-under-pressure': {
    lunar: {
      standard:
        'Thermal stress and exposed lunar equipment are consuming limited maintenance time and power. Choose which systems to prioritise.',
      preventive:
        'Power generation and life support are holding steady despite lunar thermal stress. Use this window for preventive maintenance before exposed equipment degrades.',
    },
    mars: {
      standard:
        'Dust accumulation and environmental exposure continue to wear on outpost systems. With power and maintenance time limited, choose which systems to prioritise.',
      preventive:
        'Power generation and life support are holding steady despite dust and environmental exposure. Use this window for preventive maintenance before equipment reliability slips.',
    },
    'deep-space': {
      standard:
        'Outpost components are degrading, and replacement parts are far away. With power and maintenance time limited, choose which systems to prioritise.',
      preventive:
        'Power generation and life support are holding steady, but replacement parts remain far away. Use this window for preventive maintenance while the systems are stable.',
    },
  },
  'story-sol-10-unexpected-transmission': {
    lunar: {
      standard:
        'A weak, unexpected signal reaches the outpost through the communication array. Its origin is unclear; decide whether to investigate it or prioritise survival.',
    },
    mars: {
      standard:
        'After days of communication disruption, an unusual transmission reaches the outpost. Its origin is unclear; decide whether to investigate it or prioritise survival.',
    },
    'deep-space': {
      standard:
        'A faint unidentified signal arrives from far beyond Earth. With long communication delays and no immediate support, decide whether to investigate it or prioritise survival.',
    },
  },
};

const SOL_5_CONTEXT: Record<string, string> = {
  'story-sol-05-intervene':
    'The emergency intervention on Sol 5 may have left the astronaut exhausted.',
  'story-sol-05-shelter':
    'Sheltering on Sol 5 protected the crew, but environmental damage may remain unresolved.',
  'story-sol-05-isolate':
    'The Sol 5 decision isolated vulnerable equipment, buying protection at an operational cost.',
  'story-sol-05-lunar-thermal-protection':
    'Emergency thermal protection was activated on Sol 5, but the outpost still needs a full systems assessment.',
  'story-sol-05-mars-dust-protection':
    'Emergency dust protection was deployed on Sol 5, but the outpost still needs a full systems assessment.',
  'story-sol-05-deep-space-impact-reinforcement':
    'The impact zone was reinforced on Sol 5, but the outpost still needs a full systems assessment.',
};

/**
 * Return a location- and state-specific copy of the scheduled Chapter 2 event.
 * The stable event/action IDs and shared effects remain the catalogue versions.
 */
export function chapter2EventForState(event: GameEvent, state: GameState): GameEvent {
  const descriptions = CHAPTER_2_DESCRIPTIONS[event.id];
  const variant = descriptions?.[state.mission.missionType];
  if (!variant) return event;

  let description = variant.standard;
  if (event.id === 'story-sol-06-aftermath-assessment') {
    const sol5Decision = state.history.find(
      (record) => record.day === 5 && record.eventId === 'story-sol-05-environmental-crisis'
    );
    const context = sol5Decision ? SOL_5_CONTEXT[sol5Decision.actionId] : undefined;
    if (context) description = `${context} ${description}`;
  }

  if (event.id === 'story-sol-09-repairs-under-pressure' && variant.preventive) {
    const systemsAreHealthy =
      state.systems.powerGeneration >= 70 && state.systems.lifeSupportEfficiency >= 70;
    if (systemsAreHealthy) description = variant.preventive;
  }

  return { ...event, description };
}

/** The five shared Chapter 2 events, scheduled by eventTriggers on Sols 6–10. */
export const CHAPTER_2_EVENTS: GameEvent[] = [
  {
    id: 'story-sol-06-aftermath-assessment',
    title: 'Aftermath Assessment',
    description:
      'Following the first environmental crisis, Mission Control requests a complete assessment of the outpost. Decide how to stabilise operations and prepare for the next stage.',
    severity: 'info',
    availableActions: [
      {
        id: 'story-sol-06-prioritise-maintenance',
        label: 'Prioritise Maintenance',
        description:
          'Spend power on essential maintenance to improve power generation and life support, at a cost to crew morale.',
        effect: {
          immediateResources: { power: -4 },
          immediateCrew: { morale: -2 },
          immediateSystems: { powerGeneration: 2, lifeSupportEfficiency: 3 },
        },
      },
      {
        id: 'story-sol-06-conserve-supplies',
        label: 'Conserve Supplies',
        description:
          'Use the established rationing protocol to preserve food and water, though the restrictions weigh on morale.',
        effect: {
          immediateResources: { food: 3, water: 2 },
          immediateCrew: { morale: -3 },
        },
      },
      {
        id: 'story-sol-06-prioritise-recovery',
        label: 'Prioritise Crew Recovery',
        description:
          'Reduce the maintenance workload and let the astronaut recover, using a small amount of power.',
        effect: {
          immediateResources: { power: -3 },
          immediateCrew: { health: 4 },
        },
      },
    ],
  },
  {
    id: 'story-sol-07-communication-array-failure',
    title: 'Communication Array Failure',
    description:
      'The outpost has lost reliable communication with Mission Control. Critical instructions and emergency assistance may not reach the astronaut.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-07-postpone-repairs',
        label: 'Postpone Repairs',
        description:
          'Preserve power for immediate operations, accepting isolation and the strain it places on the crew.',
        effect: {
          immediateResources: { power: 5 },
          immediateCrew: { morale: -8 },
          delayed: [
            {
              delayInDays: 3,
              description: 'Continued isolation further reduces crew morale.',
              parameters: { kind: 'crew', changes: { morale: -6 } },
            },
          ],
        },
      },
      {
        id: 'story-sol-07-full-repairs',
        label: 'Conduct Full Repairs',
        description:
          'Spend substantial power to restore the array and reassure the crew with renewed contact.',
        effect: {
          immediateResources: { power: -12 },
          immediateCrew: { morale: 5 },
        },
      },
      {
        id: 'story-sol-07-low-power',
        label: 'Activate Low-Power Communications',
        description:
          'Restore a limited communication link with lower power use; the improvised configuration may strain power later.',
        effect: {
          immediateResources: { power: -5 },
          immediateCrew: { morale: 2 },
          delayed: [
            {
              delayInDays: 2,
              description: 'The low-power communication link draws extra stored power.',
              parameters: { kind: 'resource', changes: { power: -3 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'story-sol-08-narrow-window',
    title: 'Narrow Window of Opportunity',
    description:
      'Sensors identify a brief opportunity to recover supplies or improve system reliability before conditions deteriorate.',
    severity: 'minor',
    availableActions: [
      {
        id: 'story-sol-08-resource-recovery',
        label: 'Attempt Resource Recovery',
        description:
          'Spend power to run recovery equipment and reclaim stored or recycled water for a later use.',
        effect: {
          immediateResources: { power: -8 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Recovery equipment returns reclaimed water to usable reserves.',
              parameters: { kind: 'resource', changes: { water: 10 } },
            },
          ],
        },
      },
      {
        id: 'story-sol-08-system-diagnostics',
        label: 'Run System Diagnostics',
        description:
          'Spend power to check life-support systems and correct minor inefficiencies.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { lifeSupportEfficiency: 3 },
        },
      },
      {
        id: 'story-sol-08-routine-operations',
        label: 'Continue Routine Operations',
        description: 'Continue standard outpost protocols without additional effects.',
        effect: {},
      },
    ],
  },
  {
    id: 'story-sol-09-repairs-under-pressure',
    title: 'Repairs Under Pressure',
    description:
      'The outpost systems need attention, but available power and maintenance time are limited. Choose which systems to prioritise.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-09-restore-power',
        label: 'Restore Power Generation',
        description: 'Spend power to improve the outpost power-generation system.',
        effect: {
          immediateResources: { power: -8 },
          immediateSystems: { powerGeneration: 8 },
        },
      },
      {
        id: 'story-sol-09-restore-life-support',
        label: 'Restore Life Support',
        description: 'Spend power to improve life-support efficiency.',
        effect: {
          immediateResources: { power: -8 },
          immediateSystems: { lifeSupportEfficiency: 8 },
        },
      },
      {
        id: 'story-sol-09-balanced-repairs',
        label: 'Conduct Balanced Repairs',
        description:
          'Spend more power to improve both power generation and life-support efficiency.',
        effect: {
          immediateResources: { power: -10 },
          immediateSystems: { powerGeneration: 4, lifeSupportEfficiency: 4 },
        },
      },
    ],
  },
  {
    id: 'story-sol-10-unexpected-transmission',
    title: 'Unexpected Transmission',
    description:
      'An unusual transmission reaches the outpost. Its origin and significance are unclear. Decide whether to investigate or prioritise immediate survival.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-10-analyse',
        label: 'Analyse the Transmission',
        description:
          'Spend power analysing the signal, giving the crew a sense of purpose amid the uncertainty.',
        effect: {
          immediateResources: { power: -6 },
          immediateCrew: { morale: 3 },
        },
      },
      {
        id: 'story-sol-10-verify',
        label: 'Verify the Signal',
        description: 'Use a small amount of power to check the signal source without a full analysis.',
        effect: { immediateResources: { power: -3 } },
      },
      {
        id: 'story-sol-10-archive',
        label: 'Archive the Transmission',
        description:
          'Preserve stored power by recording the signal for later review instead of investigating now.',
        effect: { immediateResources: { power: 3 } },
      },
    ],
  },
];
