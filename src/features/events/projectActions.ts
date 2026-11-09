/**
 * projectActions.ts
 * -----------------
 * Free actions whose payoff arrives LATER: a repair that finishes in two Sols,
 * crops that need three to grow, shielding work, and a recovery that takes
 * several rest days.
 *
 * You pay the cost now (checked by the engine: you cannot start a repair
 * without enough power) and the engine schedules the result as a delayed
 * effect. While one of these is under way, the same project cannot be started
 * again. Each result later appears as a "Consequence" row on the debrief
 * timeline, linked back to the decision that started it.
 */
import type { EventAction } from './eventTypes';

export const PROJECT_ACTIONS: EventAction[] = [
  {
    id: 'repair-generator',
    label: 'Repair the generator',
    description: 'Spend power and effort now. In 2 Sols the generator is back to better strength.',
    effect: {
      immediateResources: { power: -6 },
      immediateCrew: { morale: -1 },
      delayed: [
        {
          delayInDays: 2,
          description: 'Generator repair complete: power generation restored.',
          parameters: { kind: 'system', changes: { powerGeneration: 12 } },
        },
      ],
    },
  },
  {
    id: 'plant-crops',
    label: 'Plant a new crop cycle',
    description: 'Water the new trays now. In 3 Sols they are ready to harvest.',
    effect: {
      immediateResources: { water: -4 },
      delayed: [
        {
          delayInDays: 3,
          description: 'The new crop cycle is ready: fresh food harvested.',
          parameters: { kind: 'resource', changes: { food: 12 } },
        },
        {
          delayInDays: 3,
          description: 'The greenhouse trays are in better shape after replanting.',
          parameters: { kind: 'system', changes: { foodProduction: 4 } },
        },
      ],
    },
  },
  {
    id: 'reinforce-shielding',
    label: 'Reinforce the shielding',
    description: 'Add regolith and patch the hull. The work takes 3 Sols and costs power now.',
    effect: {
      immediateResources: { power: -5 },
      delayed: [
        {
          delayInDays: 3,
          description: 'Shielding reinforcement complete: less radiation gets through.',
          parameters: { kind: 'system', changes: { shieldingIntegrity: 8 } },
        },
      ],
    },
  },
  {
    id: 'rest-and-recover',
    label: 'Rest and recover',
    description: 'Take a quiet day on extra rations. Health and morale come back over the next Sols.',
    effect: {
      immediateResources: { food: -2 },
      delayed: [
        {
          delayInDays: 2,
          description: 'A couple of good rest days: health recovers.',
          parameters: { kind: 'crew', changes: { health: 6 } },
        },
        {
          delayInDays: 3,
          description: 'Rested and fed: morale recovers.',
          parameters: { kind: 'crew', changes: { morale: 6 } },
        },
      ],
    },
  },
];

/** ids of the multi-Sol projects, so the UI can group them under their own heading. */
export const PROJECT_ACTION_IDS: ReadonlySet<string> = new Set(PROJECT_ACTIONS.map((action) => action.id));
