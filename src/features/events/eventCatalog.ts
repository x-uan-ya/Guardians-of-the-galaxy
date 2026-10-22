/**
 * eventCatalog.ts
 * ---------------
 * CONTENT for events and the free "routine operations" actions. Owned by the
 * Events teammate. This module only declares data; the simulation engine reads
 * it, validates it, and applies the effects.
 *
 * To add a new event: append a GameEvent to EVENT_CATALOG with a unique id and
 * at least one EventAction. To add a free (always-available) action: append to
 * FREE_ACTIONS. See README "How to add new events and actions".
 */

import type { EventAction, GameEvent } from './eventTypes';

/**
 * Free actions are always valid as a player decision, independent of any
 * event. The dashboard's "routine day" controls map to these. Keep effects
 * modest so the baseline daily simulation stays the main driver.
 */
export const FREE_ACTIONS: EventAction[] = [
  {
    id: 'routine-operations',
    label: 'Routine operations',
    description: 'Run the outpost on standard protocols for the day.',
    effect: {
      // No extra deltas; the daily simulation handles baseline production/use.
    },
  },
  {
    id: 'ration-supplies',
    label: 'Ration supplies',
    description: 'Tighten consumption to preserve food and water today.',
    effect: {
      immediateResources: { food: 3, water: 2 },
      immediateCrew: { morale: -3 },
    },
  },
  {
    id: 'maintenance-shift',
    label: 'Maintenance shift',
    description: 'Divert the crew to repairs, improving systems at a power cost.',
    effect: {
      immediateResources: { power: -4 },
      immediateSystems: { lifeSupportEfficiency: 3, powerGeneration: 2 },
      immediateCrew: { morale: -2 },
    },
  },
];

/**
 * Comprehensive event catalog covering critical, major, minor, and info events.
 * Events create unpredictability and force difficult decisions.
 */
export const EVENT_CATALOG: GameEvent[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL EVENTS - The flagship crises that define high-stakes gameplay
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'solar-storm',
    title: '☀️ SOLAR STORM DETECTED',
    description:
      'A massive coronal mass ejection is heading toward Mars. Radiation levels are spiking, and solar panels are experiencing severe interference. The storm will last for days. You must act now to protect your crew and systems.',
    severity: 'critical',
    availableActions: [
      {
        id: 'solar-storm--activate-shielding',
        label: 'Activate Full Shielding',
        description: 'Divert all available power to radiation shielding. Reduces radiation exposure dramatically but cripples power generation.',
        effect: {
          immediateResources: { power: -30 },
          immediateSystems: { shieldingIntegrity: 15, powerGeneration: -12 },
          immediateCrew: { radiationExposure: -5, morale: -5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Storm subsides. Shielding can be powered down.',
              parameters: { kind: 'system', changes: { powerGeneration: 8 } },
            },
          ],
        },
      },
      {
        id: 'solar-storm--shutdown-systems',
        label: 'Shut Down Non-Essential Systems',
        description: 'Power down food production and non-critical equipment to preserve life support. Some radiation exposure is unavoidable.',
        effect: {
          immediateResources: { power: 10 },
          immediateSystems: { foodProduction: -15, lifeSupportEfficiency: 5 },
          immediateCrew: { radiationExposure: 12, morale: -8 },
          delayed: [
            {
              delayInDays: 3,
              description: 'Food production systems struggle to restart after extended shutdown.',
              parameters: { kind: 'system', changes: { foodProduction: -5 } },
            },
            {
              delayInDays: 1,
              description: 'Crew health deteriorates from radiation exposure.',
              parameters: { kind: 'crew', changes: { health: -8 } },
            },
          ],
        },
      },
      {
        id: 'solar-storm--risk-it',
        label: 'Maintain Operations',
        description: 'Continue normal operations and hope the storm passes quickly. High radiation risk but preserves resources and production.',
        effect: {
          immediateResources: { power: 5 },
          immediateCrew: { radiationExposure: 25, morale: -12, health: -5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Solar panels damaged by storm, reducing long-term power generation.',
              parameters: { kind: 'system', changes: { powerGeneration: -10 } },
            },
            {
              delayInDays: 3,
              description: 'Severe radiation sickness sets in.',
              parameters: { kind: 'crew', changes: { health: -15, morale: -10 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'catastrophic-system-failure',
    title: '⚠️ CATASTROPHIC SYSTEM FAILURE',
    description:
      'Multiple critical systems have failed simultaneously. Life support is compromised, power is fluctuating, and oxygen levels are dropping. This is a compound emergency requiring immediate prioritization.',
    severity: 'critical',
    availableActions: [
      {
        id: 'system-failure--emergency-repairs',
        label: 'Emergency Repair Protocol',
        description: 'Focus all efforts on emergency repairs. High crew risk but best chance to stabilize systems.',
        effect: {
          immediateResources: { power: -15, oxygen: -10 },
          immediateSystems: { lifeSupportEfficiency: 12, powerGeneration: 8 },
          immediateCrew: { health: -10, radiationExposure: 8, morale: -5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Crew exhaustion from emergency repairs catches up.',
              parameters: { kind: 'crew', changes: { health: -8, morale: -6 } },
            },
          ],
        },
      },
      {
        id: 'system-failure--conserve',
        label: 'Emergency Conservation Mode',
        description: 'Reduce all consumption to minimum levels. Buys time but systems continue degrading.',
        effect: {
          immediateResources: { oxygen: 5, power: 8, food: 5, water: 5 },
          immediateSystems: { lifeSupportEfficiency: -5, foodProduction: -8 },
          immediateCrew: { morale: -10 },
          delayed: [
            {
              delayInDays: 3,
              description: 'Systems continue to degrade without proper maintenance.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -10, powerGeneration: -8 } },
            },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR EVENTS - Significant challenges requiring careful decisions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dust-storm',
    title: 'Severe Dust Storm',
    description:
      'A massive dust storm is approaching. Solar panels will be coated with dust, drastically reducing power generation. The storm could last several days.',
    severity: 'major',
    availableActions: [
      {
        id: 'dust-storm--shelter',
        label: 'Shelter and Conserve',
        description: 'Power down non-essentials and wait it out safely.',
        effect: {
          immediateResources: { power: 4 },
          immediateCrew: { morale: -4 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Dust accumulation keeps generation suppressed.',
              parameters: { kind: 'system', changes: { powerGeneration: -8 } },
            },
          ],
        },
      },
      {
        id: 'dust-storm--clear-array',
        label: 'EVA to Clear Solar Array',
        description: 'Send crew outside during the storm to keep panels clear. Dangerous but maintains power.',
        effect: {
          immediateResources: { power: -5 },
          immediateCrew: { radiationExposure: 8, health: -3 },
          immediateSystems: { powerGeneration: 8 },
          delayed: [
            {
              delayInDays: 3,
              description: 'EVA exertion and dust exposure impacts crew health.',
              parameters: { kind: 'crew', changes: { health: -6 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'equipment-failure',
    title: 'Critical Equipment Failure',
    description:
      'Essential equipment has failed. Systems diagnostics show cascading failures possible. You need to decide how to allocate your limited repair resources.',
    severity: 'major',
    availableActions: [
      {
        id: 'equipment-failure--immediate-repair',
        label: 'Immediate Repair',
        description: 'Drop everything and fix it now. Costly but prevents escalation.',
        effect: {
          immediateResources: { power: -12 },
          immediateSystems: { lifeSupportEfficiency: 8, powerGeneration: 5 },
          immediateCrew: { morale: -3 },
        },
      },
      {
        id: 'equipment-failure--patch-job',
        label: 'Quick Patch',
        description: 'Apply temporary fixes to keep running. Saves resources but may fail again.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { lifeSupportEfficiency: 3 },
          delayed: [
            {
              delayInDays: 5,
              description: 'Temporary repairs fail. Equipment degrades further.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -10, powerGeneration: -6 } },
            },
          ],
        },
      },
      {
        id: 'equipment-failure--defer',
        label: 'Defer Repairs',
        description: 'Focus on more critical issues. Equipment continues degrading.',
        effect: {
          immediateCrew: { morale: -6 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Deferred maintenance causes systems to fail.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -12, powerGeneration: -8 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'water-contamination',
    title: 'Water System Contamination',
    description:
      'Contamination detected in the water recycling system. Crew health is at risk. The water supply needs immediate attention or must be rationed heavily.',
    severity: 'major',
    availableActions: [
      {
        id: 'water-contamination--purge-system',
        label: 'Purge and Sterilize',
        description: 'Dump contaminated water and sterilize the entire system. Large water loss but safe.',
        effect: {
          immediateResources: { water: -25, power: -10 },
          immediateSystems: { lifeSupportEfficiency: 10 },
          immediateCrew: { morale: -5 },
        },
      },
      {
        id: 'water-contamination--filter-intensive',
        label: 'Intensive Filtration',
        description: 'Run water through repeated filtration cycles. Power-intensive but preserves water.',
        effect: {
          immediateResources: { water: -8, power: -15 },
          immediateSystems: { lifeSupportEfficiency: 5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Filtration system overuse causes efficiency loss.',
              parameters: { kind: 'system', changes: { lifeSupportEfficiency: -4 } },
            },
          ],
        },
      },
      {
        id: 'water-contamination--risk-use',
        label: 'Continue Use with Caution',
        description: 'Carefully monitor and use the contaminated water. Health risk but preserves resources.',
        effect: {
          immediateResources: { water: 5 },
          immediateCrew: { health: -8, morale: -8 },
          delayed: [
            {
              delayInDays: 3,
              description: 'Waterborne illness spreads through the outpost.',
              parameters: { kind: 'crew', changes: { health: -15, morale: -10 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'communication-failure',
    title: 'Communication Array Failure',
    description:
      'The communication array with Earth has failed. You are cut off from mission control. Repairs are possible but will divert resources from other critical needs.',
    severity: 'major',
    availableActions: [
      {
        id: 'communication-failure--repair-immediately',
        label: 'Repair Immediately',
        description: 'Prioritize restoring communication. Expensive but maintains Earth support.',
        effect: {
          immediateResources: { power: -15 },
          immediateCrew: { morale: 5 },
          immediateSystems: { powerGeneration: -3 },
        },
      },
      {
        id: 'communication-failure--defer',
        label: 'Defer Repairs',
        description: 'Focus on survival systems first. Communication can wait. Morale will suffer.',
        effect: {
          immediateResources: { power: 5 },
          immediateCrew: { morale: -12 },
          delayed: [
            {
              delayInDays: 5,
              description: 'Isolation and lack of support weighs heavily on crew.',
              parameters: { kind: 'crew', changes: { morale: -8 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'battery-malfunction',
    title: 'Battery System Malfunction',
    description:
      'The main battery banks are overheating and failing. Power storage is critically compromised. Without batteries, nighttime operations will be nearly impossible.',
    severity: 'major',
    availableActions: [
      {
        id: 'battery-malfunction--emergency-cooldown',
        label: 'Emergency Cooldown',
        description: 'Shut down all systems and focus on cooling the batteries. Prevents total loss.',
        effect: {
          immediateResources: { power: -20, oxygen: -5 },
          immediateSystems: { powerGeneration: 8 },
          immediateCrew: { morale: -6 },
        },
      },
      {
        id: 'battery-malfunction--partial-isolation',
        label: 'Isolate Damaged Cells',
        description: 'Disconnect failing battery cells. Reduced capacity but prevents cascade failure.',
        effect: {
          immediateResources: { power: -10 },
          immediateSystems: { powerGeneration: -8 },
          delayed: [
            {
              delayInDays: 4,
              description: 'Reduced battery capacity creates ongoing power challenges.',
              parameters: { kind: 'resource', changes: { power: -5 } },
            },
          ],
        },
      },
      {
        id: 'battery-malfunction--push-through',
        label: 'Push Through',
        description: 'Keep systems running and hope batteries stabilize. High risk of total loss.',
        effect: {
          immediateResources: { power: 5 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Battery banks fail catastrophically.',
              parameters: { kind: 'system', changes: { powerGeneration: -20 } },
            },
            {
              delayInDays: 2,
              description: 'Power crisis impacts all systems.',
              parameters: { kind: 'resource', changes: { power: -15, oxygen: -10 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'temperature-drop',
    title: 'Severe Temperature Drop',
    description:
      'External temperatures have plummeted far below normal. Habitat insulation is being tested to its limits. Life support systems are straining to maintain livable temperatures.',
    severity: 'major',
    availableActions: [
      {
        id: 'temperature-drop--boost-heating',
        label: 'Boost Heating Systems',
        description: 'Increase power to heating. Keeps crew safe but drains power reserves.',
        effect: {
          immediateResources: { power: -18 },
          immediateCrew: { health: 5, morale: 3 },
          delayed: [
            {
              delayInDays: 3,
              description: 'Extended high-power heating depletes reserves.',
              parameters: { kind: 'resource', changes: { power: -12 } },
            },
          ],
        },
      },
      {
        id: 'temperature-drop--insulation',
        label: 'Emergency Insulation',
        description: 'Seal off sections of the habitat and improvise insulation. Reduces living space.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { lifeSupportEfficiency: -5 },
          immediateCrew: { morale: -8 },
        },
      },
      {
        id: 'temperature-drop--endure',
        label: 'Endure the Cold',
        description: 'Reduce heating to minimum safe levels. Crew will suffer but resources preserved.',
        effect: {
          immediateResources: { power: 8 },
          immediateCrew: { health: -12, morale: -10 },
          delayed: [
            {
              delayInDays: 4,
              description: 'Prolonged cold exposure causes health complications.',
              parameters: { kind: 'crew', changes: { health: -10 } },
            },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MINOR EVENTS - Smaller challenges and opportunities
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hydroponics-bloom',
    title: 'Hydroponics Bloom',
    description:
      'The greenhouse is thriving unexpectedly. Invest now for a delayed food boost, or take a small immediate gain.',
    severity: 'minor',
    availableActions: [
      {
        id: 'hydroponics-bloom--invest',
        label: 'Invest in Growth',
        description: 'Spend power now for a larger food surge in a few days.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { foodProduction: 4 },
          delayed: [
            {
              delayInDays: 3,
              description: 'The hydroponics bloom yields a bountiful harvest.',
              parameters: { kind: 'resource', changes: { food: 15 } },
            },
          ],
        },
      },
      {
        id: 'hydroponics-bloom--stabilise',
        label: 'Harvest Now',
        description: 'Take a modest immediate food gain and move on.',
        effect: {
          immediateResources: { food: 6 },
          immediateCrew: { morale: 2 },
        },
      },
    ],
  },
  {
    id: 'resource-discovery',
    title: 'Unexpected Resource Discovery',
    description:
      'A geological survey has revealed a small water-ice deposit near the outpost. Extracting it will require power and effort but could bolster reserves.',
    severity: 'minor',
    availableActions: [
      {
        id: 'resource-discovery--extract',
        label: 'Extract Resources',
        description: 'Mount an extraction operation. Power-intensive but yields valuable water.',
        effect: {
          immediateResources: { power: -10 },
          immediateCrew: { morale: 5, radiationExposure: 3 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Water extraction complete. Reserves replenished.',
              parameters: { kind: 'resource', changes: { water: 20 } },
            },
          ],
        },
      },
      {
        id: 'resource-discovery--ignore',
        label: 'Ignore Discovery',
        description: 'Focus on current operations. Save the effort for more critical needs.',
        effect: {
          immediateCrew: { morale: -2 },
        },
      },
    ],
  },
  {
    id: 'minor-airlock-leak',
    title: 'Minor Airlock Leak',
    description:
      'A small leak detected in Airlock 2. Not immediately dangerous but will gradually waste oxygen if not addressed.',
    severity: 'minor',
    availableActions: [
      {
        id: 'airlock-leak--seal',
        label: 'Seal the Leak',
        description: 'Perform maintenance to seal the leak properly.',
        effect: {
          immediateResources: { power: -4, oxygen: -2 },
          immediateSystems: { lifeSupportEfficiency: 3 },
        },
      },
      {
        id: 'airlock-leak--monitor',
        label: 'Monitor and Defer',
        description: 'Keep an eye on it but defer repairs. Gradual oxygen loss.',
        effect: {
          delayed: [
            {
              delayInDays: 4,
              description: 'Slow oxygen leak has cost significant reserves.',
              parameters: { kind: 'resource', changes: { oxygen: -8 } },
            },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO EVENTS - Positive opportunities or neutral updates
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'successful-experiment',
    title: 'Successful Research Experiment',
    description:
      'A scientific experiment has yielded breakthrough results. Morale is high and systems benefit from the new insights.',
    severity: 'info',
    availableActions: [
      {
        id: 'successful-experiment--celebrate',
        label: 'Celebrate the Success',
        description: 'Take time to acknowledge the achievement. Morale boost.',
        effect: {
          immediateCrew: { morale: 8 },
          immediateSystems: { lifeSupportEfficiency: 2, foodProduction: 2 },
        },
      },
      {
        id: 'successful-experiment--continue',
        label: 'Continue Working',
        description: 'Acknowledge briefly and return to duties.',
        effect: {
          immediateCrew: { morale: 3 },
        },
      },
    ],
  },
];

/** Look up an event by id. */
export function findEvent(eventId: string): GameEvent | undefined {
  return EVENT_CATALOG.find((e) => e.id === eventId);
}

/** Look up a free action by id. */
export function findFreeAction(actionId: string): EventAction | undefined {
  return FREE_ACTIONS.find((a) => a.id === actionId);
}

/** Resolve an action within a specific event. */
export function findEventAction(eventId: string, actionId: string): EventAction | undefined {
  return findEvent(eventId)?.availableActions.find((a) => a.id === actionId);
}
