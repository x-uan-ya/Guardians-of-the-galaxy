/**
 * eventTypes.ts
 * -------------
 * Types describing crisis/opportunity events and the actions available in
 * response to them.
 *
 * Event modules (owned by the Events teammate) define CONTENT: what events
 * exist and what actions they offer. The simulation engine owns BEHAVIOUR: it
 * validates an event+action pair and applies the effects. Event content never
 * mutates game state directly.
 *
 * Effects are expressed with the shared change/effect types from
 * simulationTypes so the engine can apply them uniformly.
 */

import type {
  ResourceChanges,
  CrewChanges,
  SystemChanges,
  DelayedEffectParameters,
} from '../simulation/simulationTypes';

/** How serious an event is. Drives UI emphasis and scoring weight. */
export type EventSeverity = 'info' | 'minor' | 'major' | 'critical';

/**
 * A description of an effect an action produces, before the engine turns it
 * into concrete state changes / scheduled DelayedEffects.
 *
 * `immediate*` deltas apply the same day the action is taken.
 * `delayed` entries are scheduled `delayInDays` into the future and become
 * DelayedEffects tagged with the causing decision.
 */
export interface ActionEffect {
  immediateResources?: ResourceChanges;
  immediateCrew?: CrewChanges;
  immediateSystems?: SystemChanges;
  /** Consequences that land later, modelling delayed cause-and-effect. */
  delayed?: DelayedActionEffect[];
}

export interface DelayedActionEffect {
  /** Days from now until this effect applies (must be >= 1). */
  delayInDays: number;
  description: string;
  parameters: DelayedEffectParameters;
}

/** One choice the player can make in response to an event (or as a free action). */
export interface EventAction {
  id: string;
  label: string;
  /** Short explanation shown to the player and recorded in history. */
  description: string;
  effect: ActionEffect;
}

/** A crisis, opportunity, or informational event surfaced to the player. */
export interface GameEvent {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  /** The actions the player may choose from. Must contain at least one. */
  availableActions: EventAction[];
}
