/**
 * eventTriggers.ts
 * ----------------
 * Event trigger system that determines when events should fire based on
 * game state conditions. Uses weighted probabilities and deterministic seeded
 * randomness for reproducible gameplay.
 */

import type { GameState } from '../simulation/simulationTypes';
import type { GameEvent } from './eventTypes';
import { EVENT_CATALOG } from './eventCatalog';
import { seededRandom } from '../../lib/random';

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

  return weights;
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
      const event = EVENT_CATALOG.find(e => e.id === eventId);
      return event;
    }
  }
  
  // Fallback: return first event if weights array exists
  const firstWeight = weights[0];
  if (firstWeight) {
    return EVENT_CATALOG.find(e => e.id === firstWeight.eventId);
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
  // First check for forced critical events
  const forcedEvent = checkForcedEvent(state);
  if (forcedEvent) {
    return forcedEvent;
  }

  // Otherwise roll for a random event
  return rollForEvent(state);
}
