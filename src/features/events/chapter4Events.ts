
/**
 * Chapter 4: Secrets Beyond the Outpost
 * Covers Sols 16–23.
 *
 * Storyline events are data-driven.
 * The existing simulation engine handles effects and decisions.
 */

import type { GameState, MissionType } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';

// Mission-specific descriptions for every Chapter 4 Sol.
const CHAPTER_4_DESCRIPTIONS: Record<
  number,
  Record<MissionType, string>
> = {
  16: {
    lunar:
      'After the midpoint resupply, Mission Control requests a review of the lunar habitat. Thermal stress and regolith continue to challenge equipment. Decide whether to maintain systems, recover or continue routine operations.',
    mars:
      'The midpoint resupply provides breathing room, but dust and variable sunlight still threaten the Mars habitat. Reassess the mission and prepare for the next phase.',
    'deep-space':
      'The mission has passed its midpoint without resupply. Every component and reserve remains precious. Reassess the isolated habitat before entering the next phase.',
  },
  17: {
    lunar:
      'Lunar sensors detect unusual readings beneath the nearby regolith. The signal could indicate a geological feature or instrument interference. Decide how much power to spend investigating.',
    mars:
      'Sensors register an unusual subsurface pattern beneath the Martian terrain. It may be a geological formation or a measurement anomaly. Decide whether to investigate.',
    'deep-space':
      'The outpost scanner detects an unusual signature from a nearby object. Its composition is uncertain, and detailed scans will consume precious power.',
  },
  18: {
    lunar:
      'Further readings suggest a potentially significant subsurface formation. A closer investigation could reveal useful information, but the lunar environment makes exploration hazardous.',
    mars:
      'The sensor anomaly appears connected to a previously unidentified subsurface formation. Investigating could advance the mission, but dust and radiation exposure increase the risks.',
    'deep-space':
      'The unusual object may contain scientifically valuable materials. Investigation requires careful use of limited equipment and exposes the isolated mission to additional risk.',
  },
  19: {
    lunar:
      'The outpost has a brief opportunity to pursue research, strengthen food production or allow the astronaut to recover. Choose how to use the available time.',
    mars:
      'Between demanding operations, the crew can analyse findings, improve the greenhouse or recover from accumulated strain.',
    'deep-space':
      'The isolated habitat has a short operational window. Research may improve morale, but maintaining food production and crew health remains essential.',
  },
  20: {
    lunar:
      'Diagnostics reveal a hidden vulnerability in the habitat support network. Temperature cycling may worsen the fault unless the astronaut repairs or isolates the affected equipment.',
    mars:
      'Dust exposure and accumulated wear reveal a weakness in the habitat support network. A temporary patch could fail later.',
    'deep-space':
      'A previously undetected weakness threatens the closed-loop support network. Replacement parts are limited, so every repair decision carries consequences.',
  },
  21: {
    lunar:
      'The earlier exploration effort has placed additional demands on equipment. Decide whether to recover its operational capacity, withdraw or continue remotely.',
    mars:
      'The exploration effort has created additional operational pressure. Decide whether recovering equipment is worth the risk.',
    'deep-space':
      'The investigation has strained equipment that cannot easily be replaced. Decide how much more the isolated habitat should commit to the discovery.',
  },
  22: {
    lunar:
      'A short recovery window allows the astronaut to reclaim stored water, improve food production or continue routine operations.',
    mars:
      'With conditions temporarily manageable, the crew can reclaim water from existing reserves, maintain the greenhouse or continue essential work.',
    'deep-space':
      'The closed-loop habitat has a narrow opportunity to recover water or improve food production. There will be no external resupply.',
  },
  23: {
    lunar:
      'Analysis points towards a subsurface ice-bearing formation. Extracting usable water may help the mission, but the operation demands power and exposes the astronaut to risk.',
    mars:
      'The investigation identifies a potentially useful water-ice formation beneath the Martian surface. Extraction could improve reserves at a significant operational cost.',
    'deep-space':
      'The nearby object appears to contain recoverable materials. A collection attempt may support the habitat, but its composition and the risks of retrieval remain uncertain.',
  },
};

// Read earlier decisions from the existing decision history.
// This changes story descriptions, not the player's saved effects.
function choseAction(state: GameState, actionId: string): boolean {
  return state.history.some((record) => record.actionId === actionId);
}

/**
 * Adapt a Chapter 4 event to the selected mission and previous decisions.
 * Keep IDs and actions unchanged so the event resolver can recognise them.
 */
export function chapter4EventForState(
  event: GameEvent,
  state: GameState,
): GameEvent {
  const day = Number(event.id.match(/^story-sol-(\d{2})-/)?.[1]);

  let description =
    CHAPTER_4_DESCRIPTIONS[day]?.[state.mission.missionType] ??
    event.description;

  // Sol 10: Earlier transmission analysis influences the Sol 17 narrative.
  if (day === 17) {
    if (choseAction(state, 'story-sol-10-analyse-transmission')) {
      description +=
        ' The signal resembles patterns identified during the earlier transmission analysis.';
    } else if (choseAction(state, 'story-sol-10-verify-transmission')) {
      description +=
        ' Earlier verification records offer a possible reference for comparing the readings.';
    }
  }

  // Sol 17: Earlier scanning influences the Sol 18 narrative.
  if (day === 18 && choseAction(state, 'story-sol-17-detailed-scans')) {
    description +=
      ' Detailed scans from the previous Sol have helped narrow the area of interest.';
  }

  // Sol 18: Sol 21 acknowledges whether the player investigated.
  if (day === 21) {
    if (choseAction(state, 'story-sol-18-direct-investigation')) {
      description +=
        ' The earlier direct investigation has left equipment needing attention.';
    } else if (choseAction(state, 'story-sol-18-remote-investigation')) {
      description +=
        ' Remote investigation records can guide the next recovery decision.';
    } else {
      description =
        'With the discovery left undisturbed, the outpost can redirect its limited capacity towards recovering equipment and preparing for the final mission phase.';
    }
  }

  // Sol 18: Remote investigation provides a narrative link to Sol 23.
  if (
    day === 23 &&
    choseAction(state, 'story-sol-18-remote-investigation')
  ) {
    description +=
      ' Earlier remote observations provide useful reference data for the operation.';
  }

  return { ...event, description };
}

/** Fixed Chapter 4 events for Sols 16–23. */
export const CHAPTER_4_EVENTS: GameEvent[] = [
  // SOL 16 — Recovery and Reassessment
  {
    id: 'story-sol-16-recovery-reassessment',
    title: 'Recovery and Reassessment',
    description: 'Reassess the mission after its midpoint.',
    severity: 'info',
    availableActions: [
      {
        id: 'story-sol-16-routine-operations',
        label: 'Continue Routine Operations',
        description:
          'Maintain normal procedures without committing additional resources.',
        effect: {},
      },
      {
        id: 'story-sol-16-preventive-maintenance',
        label: 'Perform Preventive Maintenance',
        description:
          'Spend power to improve the reliability of power generation.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { powerGeneration: 2 },
        },
      },
      {
        id: 'story-sol-16-crew-recovery',
        label: 'Prioritise Crew Recovery',
        description:
          'Use power for medical support and recovery time.',
        effect: {
          immediateResources: { power: -3 },
          immediateCrew: { health: 4 },
        },
      },
    ],
  },

  // SOL 17 — Unusual Sensor Readings
  {
    id: 'story-sol-17-unusual-sensor-readings',
    title: 'Unusual Sensor Readings',
    description: 'Sensors detect an unexplained anomaly.',
    severity: 'minor',
    availableActions: [
      {
        id: 'story-sol-17-detailed-scans',
        label: 'Conduct Detailed Scans',
        description:
          'Spend power gathering additional sensor information. The findings may provide context for the next discovery.',
        effect: {
          immediateResources: { power: -6 },
        },
      },
      {
        id: 'story-sol-17-record-readings',
        label: 'Record and Monitor the Readings',
        description:
          'Preserve the readings for later analysis using minimal power.',
        effect: {
          immediateResources: { power: -2 },
        },
      },
      {
        id: 'story-sol-17-prioritise-survival',
        label: 'Prioritise Survival Systems',
        description:
          'Suspend nonessential scanning to conserve stored power.',
        effect: {
          immediateResources: { power: 3 },
        },
      },
    ],
  },

  // SOL 18 — Unexpected Discovery
  {
    id: 'story-sol-18-unexpected-discovery',
    title: 'Unexpected Discovery',
    description: 'A potentially valuable discovery demands a decision.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-18-direct-investigation',
        label: 'Investigate the Discovery Directly',
        description:
          'Commit power and expose the astronaut to environmental hazards while collecting detailed observations.',
        effect: {
          immediateResources: { power: -10 },
          immediateCrew: { health: -4 },
        },
      },
      {
        id: 'story-sol-18-remote-investigation',
        label: 'Use Remote Investigation Equipment',
        description:
          'Gather information remotely at a power cost while improving crew confidence.',
        effect: {
          immediateResources: { power: -7 },
          immediateCrew: { morale: 2 },
        },
      },
      {
        id: 'story-sol-18-preserve-discovery',
        label: 'Preserve the Discovery for Later',
        description:
          'Avoid immediate operational risks, but accept disappointment over the missed opportunity.',
        effect: {
          immediateCrew: { morale: -2 },
        },
      },
    ],
  },

  // SOL 19 — Research or Recovery
  {
    id: 'story-sol-19-research-or-recovery',
    title: 'Research or Recovery',
    description: 'Choose between research, food production and rest.',
    severity: 'minor',
    availableActions: [
      {
        id: 'story-sol-19-research',
        label: 'Continue Scientific Research',
        description:
          'Spend power analysing findings and improving the astronaut’s sense of progress.',
        effect: {
          immediateResources: { power: -6 },
          immediateCrew: { morale: 5 },
        },
      },
      {
        id: 'story-sol-19-greenhouse',
        label: 'Improve Greenhouse Operations',
        description:
          'Spend power maintaining food-production equipment.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { foodProduction: 5 },
        },
      },
      {
        id: 'story-sol-19-rest',
        label: 'Allow Recovery Time',
        description:
          'Reduce nonessential workload to restore health and morale.',
        effect: {
          immediateCrew: { health: 4, morale: 3 },
        },
      },
    ],
  },

  // SOL 20 — Hidden System Vulnerability
  {
    id: 'story-sol-20-hidden-system-vulnerability',
    title: 'Hidden System Vulnerability',
    description: 'A previously undetected system weakness is discovered.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-20-full-repair',
        label: 'Perform a Complete Repair',
        description:
          'Spend significant power to restore life-support reliability.',
        effect: {
          immediateResources: { power: -10 },
          immediateSystems: { lifeSupportEfficiency: 7 },
        },
      },
      {
        id: 'story-sol-20-isolate-system',
        label: 'Isolate the Affected System',
        description:
          'Reduce operational demand to preserve power, sacrificing some food-production capacity.',
        effect: {
          immediateResources: { power: 3 },
          immediateSystems: { foodProduction: -5 },
        },
      },
      {
        id: 'story-sol-20-temporary-patch',
        label: 'Apply a Temporary Patch',
        description:
          'Make a low-cost repair that improves reliability now but may deteriorate later.',
        effect: {
          immediateResources: { power: -4 },
          immediateSystems: { lifeSupportEfficiency: 3 },
          delayed: [
            {
              delayInDays: 3,
              description:
                'The temporary patch deteriorates, reducing life-support efficiency.',
              parameters: {
                kind: 'system',
                changes: { lifeSupportEfficiency: -7 },
              },
            },
          ],
        },
      },
    ],
  },

  // SOL 21 — Cost of Exploration
  {
    id: 'story-sol-21-cost-of-exploration',
    title: 'Cost of Exploration',
    description: 'Exploration has placed additional pressure on equipment.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-21-recover-equipment',
        label: 'Recover and Repair Equipment',
        description:
          'Spend power and accept some health risk to recover equipment and improve power generation.',
        effect: {
          immediateResources: { power: -8 },
          immediateCrew: { health: -3 },
          immediateSystems: { powerGeneration: 4 },
        },
      },
      {
        id: 'story-sol-21-abandon-recovery',
        label: 'Abandon Further Recovery',
        description:
          'Protect remaining reserves, but accept a loss of crew morale.',
        effect: {
          immediateCrew: { morale: -4 },
        },
      },
      {
        id: 'story-sol-21-remote-recovery',
        label: 'Attempt Remote Recovery',
        description:
          'Use remote equipment to limit personal exposure while spending power.',
        effect: {
          immediateResources: { power: -6 },
        },
      },
    ],
  },

  // SOL 22 — Brief Opportunity
  {
    id: 'story-sol-22-brief-opportunity',
    title: 'Brief Opportunity',
    description: 'A short operational window allows resource recovery.',
    severity: 'minor',
    availableActions: [
      {
        id: 'story-sol-22-water-recovery',
        label: 'Recover Stored Water',
        description:
          'Spend power retrieving recoverable water from existing storage and recycling equipment.',
        effect: {
          immediateResources: { power: -6 },
          delayed: [
            {
              delayInDays: 2,
              description:
                'The recovered water is processed and added to mission reserves.',
              parameters: {
                kind: 'resource',
                changes: { water: 10 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-22-greenhouse-maintenance',
        label: 'Maintain the Greenhouse',
        description:
          'Spend power improving food-production reliability.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { foodProduction: 5 },
        },
      },
      {
        id: 'story-sol-22-routine-operations',
        label: 'Continue Routine Operations',
        description:
          'Preserve existing resources and continue standard operations.',
        effect: {},
      },
    ],
  },

  // SOL 23 — The Outpost's Secret
  {
    id: 'story-sol-23-outpost-secret',
    title: "The Outpost's Secret",
    description: 'The discovery may provide useful mission resources.',
    severity: 'major',
    availableActions: [
      {
        id: 'story-sol-23-extract-materials',
        label: 'Attempt Resource Extraction',
        description:
          'Spend power and accept exposure risks to recover useful materials. The recovery will take time.',
        effect: {
          immediateResources: { power: -12 },
          immediateCrew: { health: -3 },
          delayed: [
            {
              delayInDays: 2,
              description:
                'Recovered materials are processed into usable water reserves.',
              parameters: {
                kind: 'resource',
                changes: { water: 15 },
              },
            },
          ],
        },
      },
      {
        id: 'story-sol-23-scientific-survey',
        label: 'Conduct a Scientific Survey',
        description:
          'Prioritise scientific understanding and crew morale over immediate extraction.',
        effect: {
          immediateResources: { power: -7 },
          immediateCrew: { morale: 5 },
        },
      },
      {
        id: 'story-sol-23-secure-discovery',
        label: 'Secure the Discovery Site',
        description:
          'Spend minimal power improving protective measures and preserving the site.',
        effect: {
          immediateResources: { power: -2 },
          immediateSystems: { shieldingIntegrity: 3 },
        },
      },
    ],
  },
];
