/**
 * allocationActions.ts
 * --------------------
 * Resource-allocation controls, expressed as ordinary free actions.
 *
 * The dashboard never changes the game state itself. Choosing one of these only
 * sends an action id to the simulation engine (through the same decision path
 * as every other action), and the engine validates it and applies the effect.
 * Because they are normal actions, they are also recorded in the decision
 * history, scored by the advisor, previewed on the HUD and covered by the
 * leadership profile and the debrief lessons.
 *
 * Each one is a trade-off: it helps one resource by spending another, so there
 * is no free option. Numbers are modest gameplay values.
 */
import type { EventAction } from './eventTypes';

export const ALLOCATION_ACTIONS: EventAction[] = [
  {
    id: 'prioritise-life-support',
    label: 'Prioritise life support',
    description: 'Send spare power to the air and water recyclers.',
    effect: {
      immediateResources: { power: -3, oxygen: 3, water: 2 },
    },
  },
  {
    id: 'prioritise-food',
    label: 'Prioritise food production',
    description: 'Run the greenhouse lights at full power to grow more food.',
    effect: {
      immediateResources: { power: -3, food: 4 },
    },
  },
  {
    id: 'power-saving-mode',
    label: 'Power-saving mode',
    description: 'Switch off non-essential systems to save power. The crew gets uncomfortable.',
    effect: {
      immediateResources: { power: 4 },
      immediateCrew: { morale: -2 },
    },
  },
  {
    id: 'activate-backup-generator',
    label: 'Activate backup generator',
    description: 'Start the backup generator for extra power. It wears the main generator.',
    effect: {
      immediateResources: { power: 5 },
      immediateSystems: { powerGeneration: -2 },
    },
  },
  {
    id: 'emergency-allocation',
    label: 'Emergency allocation',
    description: 'Divert everything to keep the crew supplied today. Costs a lot of power.',
    effect: {
      immediateResources: { power: -8, oxygen: 5, water: 4, food: 4 },
      immediateCrew: { morale: -1 },
    },
  },
];

/** ids of the allocation controls, so the UI can group them under their own heading. */
export const ALLOCATION_ACTION_IDS: ReadonlySet<string> = new Set(
  ALLOCATION_ACTIONS.map((action) => action.id)
);
