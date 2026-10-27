/**
 * eventTriggers.ts
 * ----------------
 * Event trigger system that determines when events should fire based on
 * game state conditions. Uses weighted probabilities and deterministic seeded
 * randomness for reproducible gameplay.
 */

import type { GameState, MissionType } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';
import { EVENT_CATALOG, findEvent } from './eventCatalog';
import { chapter1EventForMission } from './chapter1Events';
import { chapter2EventForState } from './chapter2Events';
import { chapter3EventForState } from './chapter3Events';
import { MISSION_EVENTS_BY_SITE, MISSION_EVENT_IDS, missionEventVariant } from './missionEvents';
import { seededRandom } from '../../lib/random';

/** Fixed event IDs for Chapter 1, indexed by the Sol on which they appear. */
const CHAPTER_1_EVENT_IDS: Record<number, string> = {
  1: 'story-sol-01-supply-inspection',
  2: 'story-sol-02-water-recycling',
  3: 'story-sol-03-power-instability',
  4: 'story-sol-04-greenhouse-contamination',
  5: 'story-sol-05-environmental-crisis',
};

/** Fixed Chapter 2 event IDs, indexed by the Sol on which they appear. */
const CHAPTER_2_EVENT_IDS: Record<number, string> = {
  6: 'story-sol-06-aftermath-assessment',
  7: 'story-sol-07-communication-array-failure',
  8: 'story-sol-08-narrow-window',
  9: 'story-sol-09-repairs-under-pressure',
  10: 'story-sol-10-unexpected-transmission',
};

/** Main Chapter 3 story events, indexed by Sol; Sol 15 is selected by site. */
const CHAPTER_3_EVENT_IDS: Record<number, string> = {
  11: 'story-sol-11-life-support-warning',
  12: 'story-sol-12-medical-radiation-concerns',
  13: 'story-sol-13-emergency-resource-allocation',
  14: 'story-sol-14-midpoint-preparation',
};

/**
 * Find the fixed Chapter 1 event for a Sol. Throw if a scheduled event is
 * missing from the catalogue, rather than silently skipping part of the story.
 */
export function chapter1EventForDay(day: number, missionType: MissionType): GameEvent | undefined {
  const eventId = CHAPTER_1_EVENT_IDS[day];
  if (!eventId) return undefined;

  const event = findEvent(eventId);
  if (!event) {
    throw new Error(`Scheduled Chapter 1 event "${eventId}" is missing from the event catalogue.`);
  }
  return chapter1EventForMission(event, missionType);
}

/**
 * Build the scheduled Chapter 2 variant from the current mission and state.
 * Missing scheduled catalogue entries are errors, never silently skipped.
 */
export function chapter2EventForDay(day: number, state: GameState): GameEvent | undefined {
  const eventId = CHAPTER_2_EVENT_IDS[day];
  if (!eventId) return undefined;

  const event = findEvent(eventId);
  if (!event) {
    throw new Error(`Scheduled Chapter 2 event "${eventId}" is missing from the event catalogue.`);
  }
  return chapter2EventForState(event, state);
}

/**
 * Return the scheduled Chapter 3 event. Sol 15 uses the standard acknowledgement
 * for resupplied sites and the isolation decision for Deep Space.
 */
export function chapter3EventForDay(day: number, state: GameState): GameEvent | undefined {
  const eventId =
    day === 15
      ? state.mission.missionType === 'deep-space'
        ? 'story-sol-15-no-resupply-isolation-test'
        : 'story-sol-15-midpoint-turning-point'
      : CHAPTER_3_EVENT_IDS[day];
  if (!eventId) return undefined;

  const event = findEvent(eventId);
  if (!event) {
    throw new Error(`Scheduled Chapter 3 event "${eventId}" is missing from the event catalogue.`);
  }
  return chapter3EventForState(event, state);
}

/** Probability weight for an event. Higher = more likely. */
interface EventWeight {
  eventId: string;
  weight: number;
}

/**
 * Calculate dynamic event probabilities based on current game state.
 * Events become more likely when related resources/metrics are stressed.
 */
export function calculateEventWeights(state: GameState): EventWeight[] {
  const weights: EventWeight[] = [];
  const { resources, crew, systems, mission, day } = state;

  // Skip events if mission is terminal or we already have active events
  if (mission.status === 'failed' || mission.status === 'completed') {
    return weights;
  }
  if (state.activeEvents.length > 0) {
    return weights; // Only one event at a time
  }

  // Base probability for all events (can be triggered anytime)
  const BASE_WEIGHT = 10;
  
  // ═══════════════════════════════════════════════════════════════════════
  // CRITICAL EVENTS - Higher probability when systems are stressed
  // ═══════════════════════════════════════════════════════════════════════
  
  // Solar Storm - more likely when radiation is already elevated
  let solarStormWeight = BASE_WEIGHT;
  if (crew.radiationExposure > 50) solarStormWeight += 30;
  if (crew.radiationExposure > 70) solarStormWeight += 50;
  if (systems.shieldingIntegrity < 50) solarStormWeight += 20;
  // Solar storms more common in certain mission phases
  if (day >= 10 && day <= 20) solarStormWeight += 15;
  weights.push({ eventId: 'solar-storm', weight: solarStormWeight });

  // Catastrophic System Failure - more likely when systems are degraded
  let systemFailureWeight = BASE_WEIGHT;
  const avgSystems = (
    systems.powerGeneration + 
    systems.lifeSupportEfficiency + 
    systems.foodProduction + 
    systems.shieldingIntegrity
  ) / 4;
  if (avgSystems < 50) systemFailureWeight += 40;
  if (avgSystems < 30) systemFailureWeight += 60;
  if (resources.power < 30) systemFailureWeight += 30;
  weights.push({ eventId: 'catastrophic-system-failure', weight: systemFailureWeight });

  // ═══════════════════════════════════════════════════════════════════════
  // MAJOR EVENTS - Context-sensitive probabilities
  // ═══════════════════════════════════════════════════════════════════════
  
  // Dust Storm - base probability, slightly more common early game
  let dustStormWeight = BASE_WEIGHT + 20;
  if (day < 10) dustStormWeight += 10;
  weights.push({ eventId: 'dust-storm', weight: dustStormWeight });

  // Equipment Failure - more likely when power is low or systems degraded
  let equipmentFailureWeight = BASE_WEIGHT;
  if (resources.power < 30) equipmentFailureWeight += 40;
  if (systems.lifeSupportEfficiency < 50) equipmentFailureWeight += 30;
  weights.push({ eventId: 'equipment-failure', weight: equipmentFailureWeight });

  // Water Contamination - more likely when water system is stressed
  let waterContaminationWeight = BASE_WEIGHT;
  if (resources.water < 30) waterContaminationWeight += 35;
  if (systems.lifeSupportEfficiency < 50) waterContaminationWeight += 25;
  weights.push({ eventId: 'water-contamination', weight: waterContaminationWeight });

  // Communication Failure - can happen anytime, slightly more when isolated
  let commFailureWeight = BASE_WEIGHT + 15;
  if (crew.morale < 40) commFailureWeight += 20;
  weights.push({ eventId: 'communication-failure', weight: commFailureWeight });

  // Battery Malfunction - more likely when power systems stressed
  let batteryMalfunctionWeight = BASE_WEIGHT;
  if (resources.power < 40) batteryMalfunctionWeight += 45;
  if (systems.powerGeneration < 50) batteryMalfunctionWeight += 35;
  weights.push({ eventId: 'battery-malfunction', weight: batteryMalfunctionWeight });

  // Temperature Drop - seasonal/random, more dangerous when power low
  let temperatureDropWeight = BASE_WEIGHT + 10;
  if (resources.power < 35) temperatureDropWeight += 30;
  if (systems.lifeSupportEfficiency < 50) temperatureDropWeight += 25;
  weights.push({ eventId: 'temperature-drop', weight: temperatureDropWeight });

  // ═══════════════════════════════════════════════════════════════════════
  // MINOR EVENTS - Opportunities and small challenges
  // ═══════════════════════════════════════════════════════════════════════
  
  // Hydroponics Bloom - opportunity, more likely when things are stable
  let hydroponicsWeight = BASE_WEIGHT;
  if (resources.food > 50 && systems.foodProduction > 60) hydroponicsWeight += 30;
  weights.push({ eventId: 'hydroponics-bloom', weight: hydroponicsWeight });

  // Resource Discovery - opportunity event
  let resourceDiscoveryWeight = BASE_WEIGHT + 15;
  if (resources.water < 50) resourceDiscoveryWeight += 20;
  weights.push({ eventId: 'resource-discovery', weight: resourceDiscoveryWeight });

  // Minor Airlock Leak - small problem, can happen anytime
  weights.push({ eventId: 'minor-airlock-leak', weight: BASE_WEIGHT + 20 });

  // Successful Experiment - positive event, more likely mid-game
  let experimentWeight = BASE_WEIGHT;
  if (day >= 10 && day <= 25) experimentWeight += 25;
  if (crew.morale > 50) experimentWeight += 15;
  weights.push({ eventId: 'successful-experiment', weight: experimentWeight });

  // ═══════════════════════════════════════════════════════════════════════
  // MISSION-SPECIFIC EVENTS — only eligible on their own site. These make each
  // location feel mechanically distinct. Weighted a little higher than the
  // generic pool, and nudged up further when their themed metric is stressed.
  // ═══════════════════════════════════════════════════════════════════════
  // Weighted well above the generic pool so the site's identity is actually
  // felt during the short post-story window (Sols 16-30). Still not guaranteed
  // every roll — generic events remain possible.
  const MISSION_EVENT_BASE = 80;
  for (const missionEvent of MISSION_EVENTS_BY_SITE[mission.missionType]) {
    let weight = MISSION_EVENT_BASE;
    switch (missionEvent.id) {
      case 'mission-lunar-power-instability':
        if (resources.power < 50) weight += 20;
        if (systems.powerGeneration < 60) weight += 15;
        break;
      case 'mission-lunar-thermal-emergency':
        if (systems.lifeSupportEfficiency < 60) weight += 20;
        break;
      case 'mission-mars-dust-storm':
        if (systems.powerGeneration < 70) weight += 15;
        break;
      case 'mission-mars-radiation-spike':
        if (crew.radiationExposure > 40) weight += 25;
        if (systems.shieldingIntegrity < 60) weight += 15;
        break;
      case 'mission-deep-space-anomaly':
        // Opportunity: a touch more likely when resources are tight.
        if (resources.water < 50 || resources.food < 50) weight += 15;
        break;
      case 'mission-deep-space-systems-failure':
        if (systems.lifeSupportEfficiency < 60) weight += 20;
        if (resources.power < 40) weight += 15;
        break;
    }
    weights.push({ eventId: missionEvent.id, weight });
  }

  return weights;
}

/**
 * Resolve an event id to a GameEvent, applying the mission-specific occupation
 * variant when the id is a mission event. Mission events only resolve for the
 * matching site, which enforces eligibility at selection time too.
 */
export function resolveEventForState(eventId: string, state: GameState): GameEvent | undefined {
  if (MISSION_EVENT_IDS.has(eventId)) {
    const siteEvents = MISSION_EVENTS_BY_SITE[state.mission.missionType];
    const base = siteEvents.find((e) => e.id === eventId);
    if (!base) return undefined; // not eligible on this site
    return missionEventVariant(base, state.character.occupation);
  }
  return EVENT_CATALOG.find((e) => e.id === eventId);
}

/**
 * Roll for a random event using weighted probabilities.
 * Returns the selected event or undefined if no event triggers.
 * Uses seeded randomness for deterministic gameplay.
 */
export function rollForEvent(state: GameState): GameEvent | undefined {
  const weights = calculateEventWeights(state);
  
  if (weights.length === 0) {
    return undefined;
  }

  // Calculate total weight
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  
  // Base chance that ANY event fires this day (adjust for game pacing)
  // Early game: lower chance. Mid-game: higher. Late game: very high.
  let eventChancePercent = 15; // Base 15% chance per day
  if (state.day >= 10) eventChancePercent = 25;
  if (state.day >= 20) eventChancePercent = 35;
  
  // Use deterministic seeded random based on game state
  const seed = `${state.gameId}-day-${state.day}-event-roll`;
  const shouldEventFire = seededRandom(seed) < (eventChancePercent / 100);
  
  if (!shouldEventFire) {
    return undefined;
  }

  // Select which event fires based on weights
  const rollSeed = `${state.gameId}-day-${state.day}-event-select`;
  const roll = seededRandom(rollSeed) * totalWeight;
  
  let cumulative = 0;
  for (const { eventId, weight } of weights) {
    cumulative += weight;
    if (roll < cumulative) {
      // resolveEventForState applies the mission/occupation variant when the
      // selected event is a mission-specific one.
      return resolveEventForState(eventId, state);
    }
  }
  
  // Fallback: return first event if weights array exists
  const firstWeight = weights[0];
  if (firstWeight) {
    return resolveEventForState(firstWeight.eventId, state);
  }
  
  return undefined;
}

/**
 * Check if conditions warrant forcing a specific event.
 * Used for critical gameplay moments that shouldn't be missed.
 */
export function checkForcedEvent(state: GameState): GameEvent | undefined {
  const { resources, crew, systems } = state;

  // Force catastrophic failure if multiple systems critically low
  const criticalSystems = [
    systems.powerGeneration < 20,
    systems.lifeSupportEfficiency < 20,
    resources.oxygen < 20,
    resources.power < 15,
  ].filter(Boolean).length;

  if (criticalSystems >= 3 && state.activeEvents.length === 0) {
    return EVENT_CATALOG.find(e => e.id === 'catastrophic-system-failure');
  }

  // Force solar storm if radiation is very high and shielding failing
  if (
    crew.radiationExposure > 70 && 
    systems.shieldingIntegrity < 30 && 
    state.activeEvents.length === 0
  ) {
    // Only if we haven't had this event recently
    const recentSolarStorm = state.history
      .slice(-5)
      .some(h => h.eventId === 'solar-storm');
    
    if (!recentSolarStorm) {
      return EVENT_CATALOG.find(e => e.id === 'solar-storm');
    }
  }

  return undefined;
}

/**
 * Main entry point: determine if an event should be added to the game state.
 * Call this during day advance to check for new events.
 */
export function triggerEvent(state: GameState): GameEvent | undefined {
  // Never add a second event or trigger anything after the mission ends.
  if (
    state.activeEvents.length > 0 ||
    state.mission.status === 'failed' ||
    state.mission.status === 'completed'
  ) {
    return undefined;
  }

  // Scheduled story events take priority over forced and random events.
  const scheduledEvent = chapter1EventForDay(state.day, state.mission.missionType);
  if (scheduledEvent) return scheduledEvent;
  const chapter2Event = chapter2EventForDay(state.day, state);
  if (chapter2Event) return chapter2Event;
  const chapter3Event = chapter3EventForDay(state.day, state);
  if (chapter3Event) return chapter3Event;

  // First check for forced critical events
  const forcedEvent = checkForcedEvent(state);
  if (forcedEvent) {
    return forcedEvent;
  }

  // Otherwise roll for a random event
  return rollForEvent(state);
}
