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
 * Sample event catalog. Two events are enough to exercise the engine
 * (immediate + delayed effects, multiple severities). Teammates extend this.
 */
export const EVENT_CATALOG: GameEvent[] = [
  {
    id: 'dust-storm',
    title: 'Regional dust storm',
    description:
      'A dust storm is cutting solar output and coating the array. Choose how to respond before it worsens.',
    severity: 'major',
    availableActions: [
      {
        id: 'dust-storm--shelter',
        label: 'Shelter and conserve',
        description: 'Power down non-essentials and wait it out.',
        effect: {
          immediateResources: { power: 4 },
          immediateCrew: { morale: -4 },
          delayed: [
            {
              delayInDays: 2,
              description: 'Dust accumulation keeps generation suppressed.',
              parameters: { kind: 'system', changes: { powerGeneration: -6 } },
            },
          ],
        },
      },
      {
        id: 'dust-storm--clear-array',
        label: 'Send crew to clear the array',
        description: 'Risk radiation exposure to keep power generation up.',
        effect: {
          immediateResources: { power: -3 },
          immediateCrew: { radiationExposure: 6 },
          immediateSystems: { powerGeneration: 5 },
          delayed: [
            {
              delayInDays: 3,
              description: 'EVA exertion catches up with the crew.',
              parameters: { kind: 'crew', changes: { health: -4 } },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'hydroponics-bloom',
    title: 'Hydroponics bloom',
    description:
      'The greenhouse is thriving. Invest now for a delayed food boost, or bank the stability.',
    severity: 'minor',
    availableActions: [
      {
        id: 'hydroponics-bloom--invest',
        label: 'Invest power in the bloom',
        description: 'Spend power now for a food surge in a few days.',
        effect: {
          immediateResources: { power: -5 },
          immediateSystems: { foodProduction: 4 },
          delayed: [
            {
              delayInDays: 3,
              description: 'The hydroponics bloom yields a harvest.',
              parameters: { kind: 'resource', changes: { food: 12 } },
            },
          ],
        },
      },
      {
        id: 'hydroponics-bloom--stabilise',
        label: 'Keep it stable',
        description: 'Take a small immediate food gain and move on.',
        effect: {
          immediateResources: { food: 4 },
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
