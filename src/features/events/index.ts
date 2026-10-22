/**
 * events/index.ts
 * ---------------
 * Barrel export for the events module.
 */

export { EVENT_CATALOG, FREE_ACTIONS, findEvent, findEventAction, findFreeAction } from './eventCatalog';
export { CrisisModal } from './CrisisModal';
export { triggerEvent, calculateEventWeights, rollForEvent, checkForcedEvent } from './eventTriggers';
export type { GameEvent, EventAction, EventSeverity, ActionEffect } from './eventTypes';
