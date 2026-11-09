/**
 * Chapter 5: The Final Countdown
 *
 * Playable storyline events cover Sols 24–29. The simulation marks a surviving
 * mission complete as it advances to Sol 30, before it can offer another
 * decision, so Sol 30 is provided as a debrief narrative rather than an event.
 */

import type { GameState, MissionType } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';

// Each playable Sol gets a description suited to the mission environment.
const CHAPTER_5_DESCRIPTIONS: Record<number, Record<MissionType, string>> = {
  24: {
    lunar:
      'With the final week approaching, review the lunar habitat after weeks of abrasive regolith and sharp temperature changes. Choose whether to service life support, rest, or conserve supplies for the last operations.',
    mars:
      'The final week begins at the Mars outpost. Dust on exposed equipment and changing sunlight continue to test the habitat, while the astronaut must balance maintenance, rest, and careful rationing.',
    'deep-space':
      'The isolated habitat enters its final week with no resupply ahead. Review the closed-loop systems and finite stores, then choose how to protect equipment, recover, or conserve supplies.',
  },
  25: {
    lunar:
      'Diagnostics show that dust and repeated thermal cycling have weakened key habitat systems. Repair power generation, restore life support, or apply a temporary patch while monitoring the equipment closely.',
    mars:
      'A new systems alert points to wear in the power and life-support network. Fine dust and variable sunlight complicate repairs; choose a targeted repair or a temporary patch with a known follow-up risk.',
    'deep-space':
      'The closed-loop habitat reports deterioration in power generation and life support. With no replacement shipment possible, choose a focused repair or a temporary patch that may degrade after several Sols.',
  },
  26: {
    lunar:
      'A survey identifies a nearby area that may hold recoverable water in subsurface ice. Lunar vacuum, abrasive regolith, and the distance from the habitat make outside recovery hazardous; a remote attempt costs more power but reduces exposure.',
    mars:
      'A surface survey points to a possible water-bearing deposit near the Mars outpost. Dust can obscure instruments and the exposed route carries health risks; compare an outside recovery attempt with slower remote equipment.',
    'deep-space':
      'A passing object or nearby material may contain recoverable water, but its composition is uncertain. In the isolated habitat, a direct collection attempt risks the astronaut, while remote recovery consumes more power and may yield less.',
  },
  27: {
    lunar:
      'A sudden habitat alarm reports cascading faults as extreme temperature swings stress power and life-support equipment. The astronaut must protect breathable air and shielding while acting before the fault spreads.',
    mars:
      'Dust-clogged external equipment and a life-support warning combine into the outpost’s last major crisis. Power generation is unstable, and the astronaut must protect oxygen reserves while limiting further system damage.',
    'deep-space':
      'The isolated habitat faces a compound emergency: closed-loop life support is faltering as stored power declines. No outside assistance can arrive, so the astronaut must choose between an intensive repair, strict conservation, or isolating damaged systems.',
  },
  28: {
    lunar:
      'The immediate crisis has eased, but the habitat needs careful stabilisation before final operations. Check power generation, life support, or the astronaut’s condition while watching for faults left by earlier repairs.',
    mars:
      'After the crisis, the Mars outpost begins stabilisation. Dust and reduced power can still disrupt operations, so decide whether to restore generation, improve life support, or give the astronaut time to recover.',
    'deep-space':
      'The emergency has passed, but the closed-loop habitat remains vulnerable. Stabilise power or life support, or prioritise the astronaut’s recovery before the last planned tasks.',
  },
  29: {
    lunar:
      'One Sol remains before mission completion. Prepare the lunar habitat for a safe handover: reinforce essential systems, conserve food and water, or conduct a final survey of the surrounding terrain.',
    mars:
      'The Mars outpost approaches its final scheduled Sol. Prepare for handover by reinforcing the habitat, conserving remaining stores, or recording a final survey of the landing area.',
    'deep-space':
      'The isolated mission reaches its final preparation window. With no resupply or rescue assumed, secure the habitat, conserve closed-loop stores, or complete a final survey for the debrief.',
  },
  30: {
    lunar:
      'Mission complete. The lunar outpost has reached the end of its planned operation. Mission Control reviews the habitat’s performance, the astronaut’s decisions, and the lessons learned from working in vacuum, regolith, and extreme temperature cycles.',
    mars:
      'Mission complete. The Mars outpost has reached the end of its planned operation. The debrief reviews the astronaut’s decisions, the performance of dust-exposed systems, and the challenges of operating far from Earth.',
    'deep-space':
      'Mission complete. The isolated habitat has reached the end of its planned operation without resupply. The debrief recognises the astronaut’s resource management and reviews the lessons learned from sustaining a closed-loop outpost far from Earth.',
  },
};

// Decision history provides narrative continuity without adding saved state.
function choseAction(state: GameState, actionId: string): boolean {
  return state.history.some((record) => record.actionId === actionId);
}

/**
 * Adapt a Chapter 5 event to the mission environment and earlier decisions.
 * The event ID and action definitions stay unchanged for the shared resolver.
 */
export function chapter5EventForState(event: GameEvent, state: GameState): GameEvent {
  const day = Number(event.id.match(/^story-sol-(\d{2})-/)?.[1]);
  let description =
    CHAPTER_5_DESCRIPTIONS[day]?.[state.mission.missionType] ?? event.description;

  // The Sol 25 patch is due to deteriorate on Sol 28, so acknowledge it then.
  if (day === 28 && choseAction(state, 'story-sol-25-temporary-patch')) {
    description +=
      ' The temporary power-generation patch is due for inspection today; check whether it has held before relying on it.';
  }

  // Carry the Sol 26 recovery choice into the final preparations narrative.
  if (day === 29) {
    if (choseAction(state, 'story-sol-26-external-recovery')) {
      description +=
        ' The outside recovery effort has added operational strain, so include its equipment in the final safety check.';
    } else if (choseAction(state, 'story-sol-26-remote-recovery')) {
      description +=
        ' Remote recovery equipment remains part of the final systems check after its water-retrieval attempt.';
    }
  }

  return { ...event, description };
}

/**
 * Return the mission-specific Sol 30 debrief text.
 * This is intentionally not an event: the simulation completes the mission
 * before checking for events on Sol 30, and completed missions reject choices.
 */
export function chapter5CompletionNarrativeForState(state: GameState): string {
  let description = CHAPTER_5_DESCRIPTIONS[30]![state.mission.missionType];

  if (choseAction(state, 'story-sol-29-conduct-survey')) {
    description +=
      ' The final survey is included in the mission record for future crews.';
  } else if (choseAction(state, 'story-sol-29-conserve-reserves')) {
    description +=
      ' The closing review notes the supplies preserved for the final operations.';
  }

  return description;
}

/**
 * Fixed Chapter 5 decisions, one playable event per Sol from 24 to 29.
 * Sol 30 is a completion debrief, not a decision event.
 */
export const CHAPTER_5_EVENTS: GameEvent[] = [
  // SOL 24 — Final Mission Assessment
  {
    id: 'story-sol-24-final-mission-assessment',
    title: 'Final Mission Assessment',
    description: 'Review the habitat and the astronaut’s condition before the final week.',
    severity: 'info',
    availableActions: [
      {
        id: 'story-sol-24-maintenance',
        label: 'Maintain Life Support',
        description: 'Spend power on a preventive life-support service.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { lifeSupportEfficiency: 3 },
        },
      },
      {
        id: 'story-sol-24-rest',
        label: 'Take a Recovery Period',
        description: 'Use power for a quiet rest period and basic health support.',
        effect: {
          immediateResources: { power: -3 },
          immediateCrew: { health: 4 },
        },
      },
      {
        id: 'story-sol-24-conserve',
        label: 'Conserve Food and Water',
        description: 'Recover usable stores through careful rationing, with a morale cost.',
        effect: {
          immediateResources: { food: 3, water: 3 },
          immediateCrew: { morale: -3 },
        },
      },
    ],
  },

  // SOL 25 — System Deterioration
  {
    id: 'story-sol-25-system-deterioration',
    title: 'System Deterioration',
    description: 'Wear has weakened essential habitat systems.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-25-repair-power',
        label: 'Repair Power Generation',
        description: 'Spend power and time restoring the generator’s output.',
        effect: {
          immediateResources: { power: -9 },
          immediateSystems: { powerGeneration: 8 },
        },
      },
      {
        id: 'story-sol-25-repair-life-support',
        label: 'Repair Life Support',
        description: 'Spend power to improve the reliability of air and water processing.',
        effect: {
          immediateResources: { power: -9 },
          immediateSystems: { lifeSupportEfficiency: 8 },
        },
      },
      {
        id: 'story-sol-25-temporary-patch',
        label: 'Apply a Temporary Patch',
        description: 'Make a smaller repair now, knowing power generation may decline again.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { powerGeneration: 3, lifeSupportEfficiency: 3 },
          delayed: [
            {
              delayInDays: 3,
              description: 'The temporary power-generation patch deteriorates.',
              parameters: {
                kind: 'system',
                changes: { powerGeneration: -5 },
              },
            },
          ],
        },
      },
    ],
  },

  // SOL 26 — Dangerous Opportunity
  {
    id: 'story-sol-26-dangerous-opportunity',
    title: 'Dangerous Opportunity',
    description: 'A survey suggests that a nearby source may yield recoverable water.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-26-external-recovery',
        label: 'Attempt External Recovery',
        description: 'Send the astronaut outside to collect a larger water sample at personal risk.',
        effect: {
          immediateResources: { power: -8 },
          immediateCrew: { health: -4 },
          delayed: [
            {
              delayInDays: 2,
              description: 'The external recovery effort processes the collected water.',
              parameters: {
                kind: 'resource',
                changes: { water: 12 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-26-remote-recovery',
        label: 'Use Remote Recovery Equipment',
        description: 'Spend more power operating a remote collector and avoid direct exposure.',
        effect: {
          immediateResources: { power: -10 },
          delayed: [
            {
              delayInDays: 2,
              description: 'The remote recovery system delivers a modest amount of water.',
              parameters: {
                kind: 'resource',
                changes: { water: 6 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-26-reinforce',
        label: 'Reinforce Habitat Protection',
        description: 'Protect the habitat rather than committing to the uncertain recovery.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { shieldingIntegrity: 5 },
        },
      },
    ],
  },

  // SOL 27 — Last Major Crisis
  {
    id: 'story-sol-27-last-major-crisis',
    title: 'Last Major Crisis',
    description: 'Several essential systems are under strain at once.',
    severity: 'critical',
    availableActions: [
      {
        id: 'story-sol-27-emergency-repairs',
        label: 'Perform Emergency Repairs',
        description: 'Spend power and oxygen to restore life support; the effort will exhaust the astronaut.',
        effect: {
          immediateResources: { power: -12, oxygen: -5 },
          immediateSystems: { lifeSupportEfficiency: 10 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Fatigue from the emergency repair work affects the astronaut.',
              parameters: {
                kind: 'crew',
                changes: { health: -4 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-27-conservation',
        label: 'Enter Conservation Mode',
        description: 'Reduce power demand and recover food stores, accepting a morale cost and later system strain.',
        effect: {
          immediateResources: { power: 6, food: 4 },
          immediateCrew: { morale: -8 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Prolonged conservation reduces life-support efficiency.',
              parameters: {
                kind: 'system',
                changes: { lifeSupportEfficiency: -6 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-27-isolate-damaged-systems',
        label: 'Isolate Damaged Systems',
        description: 'Spend power to strengthen shielding and isolate unstable generation equipment.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { shieldingIntegrity: 8, powerGeneration: -5 },
        },
      },
    ],
  },

  // SOL 28 — Stabilisation Efforts
  {
    id: 'story-sol-28-stabilisation-efforts',
    title: 'Stabilisation Efforts',
    description: 'Restore stability after the crisis and inspect earlier repairs.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-28-restore-power',
        label: 'Stabilise Power Generation',
        description: 'Spend power to improve the habitat’s generation capacity.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { powerGeneration: 6 },
        },
      },
      {
        id: 'story-sol-28-restore-life-support',
        label: 'Stabilise Life Support',
        description: 'Spend power to improve life-support efficiency.',
        effect: {
          immediateResources: { power: -6 },
          immediateSystems: { lifeSupportEfficiency: 6 },
        },
      },
      {
        id: 'story-sol-28-crew-recovery',
        label: 'Prioritise Crew Recovery',
        description: 'Provide medical support and recovery time after demanding operations.',
        effect: {
          immediateResources: { power: -4 },
          immediateCrew: { health: 6, morale: 3 },
        },
      },
    ],
  },

  // SOL 29 — Final Preparations
  {
    id: 'story-sol-29-final-preparations',
    title: 'Final Preparations',
    description: 'Prepare the habitat and record the final mission observations.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-29-reinforce',
        label: 'Reinforce Essential Systems',
        description: 'Spend power on final life-support and radiation-shielding improvements.',
        effect: {
          immediateResources: { power: -8 },
          immediateSystems: { lifeSupportEfficiency: 5, shieldingIntegrity: 5 },
        },
      },
      {
        id: 'story-sol-29-conserve-reserves',
        label: 'Conserve Remaining Stores',
        description: 'Recover food and water from existing stores, accepting a morale cost.',
        effect: {
          immediateResources: { food: 4, water: 4 },
          immediateCrew: { morale: -3 },
        },
      },
      {
        id: 'story-sol-29-conduct-survey',
        label: 'Conduct a Final Survey',
        description: 'Spend power documenting the area and the mission’s observations.',
        effect: {
          immediateResources: { power: -5 },
          immediateCrew: { morale: 6 },
        },
      },
    ],
  },
];
