/**
 * occupationEffects.ts
 * --------------------
 * Pure, deterministic helpers that translate the chosen occupation's passive
 * ability into concrete simulation modifiers. No React, no I/O, no randomness.
 *
 * Keeping this layer separate means:
 *  - occupations.ts holds CONTENT (who/what/how much),
 *  - this file holds the RULE application,
 *  - the engine just calls these with the current character.
 *
 * Every helper is total and side-effect free so results stay reproducible.
 */

import { getOccupation } from '../mission/occupations';
import type { PassiveAbility } from '../mission/occupations';
import { round2 } from './resourceCalculations';
import type {
  Attributes,
  CharacterState,
  CrewState,
  ResourceChanges,
  SystemState,
} from './simulationTypes';

/** Resolve the passive ability for a character. */
export function passiveFor(character: CharacterState): PassiveAbility {
  return getOccupation(character.occupation).passive;
}

/**
 * Daily system upkeep applied BEFORE production is computed. Occupations with a
 * systemUpkeepFactor > 1 preserve system efficiency better; without it, systems
 * drift down slightly each day (modelling wear). Returns a NEW SystemState.
 *
 * Baseline drift is small and uniform; the engineer's factor reduces it and can
 * even nudge systems upward (good maintenance), always clamped by the caller.
 */
export function applyDailySystemUpkeep(
  systems: Readonly<SystemState>,
  character: CharacterState
): SystemState {
  const passive = passiveFor(character);
  const upkeep = passive.systemUpkeepFactor ?? 1;

  // Baseline daily wear (percentage points) on each system.
  const BASE_WEAR = 1.2;
  // Net change = (upkeep benefit) - wear. upkeep 1.0 => -1.2/day drift;
  // upkeep 1.6 => +0.6/day (engineer actively improves upkeep).
  const net = round2(BASE_WEAR * upkeep - BASE_WEAR);

  if (net === 0) return { ...systems };

  return {
    powerGeneration: systems.powerGeneration + net,
    lifeSupportEfficiency: systems.lifeSupportEfficiency + net,
    foodProduction: systems.foodProduction + net,
    shieldingIntegrity: systems.shieldingIntegrity + net,
  };
}

/** Extra food produced per day from the botanist passive (0 otherwise). */
export function foodProductionBonus(character: CharacterState): number {
  return passiveFor(character).foodProductionBonus ?? 0;
}

/**
 * Extra resources produced per day by an occupation's passive (water for the
 * geologist, oxygen for the chemist, power for the pilot). Only positive
 * bonuses are honoured. Returns a NEW object; empty when there is no bonus.
 */
export function dailyResourceBonus(character: CharacterState): ResourceChanges {
  const bonus = passiveFor(character).dailyResourceBonus;
  const result: ResourceChanges = {};
  if (!bonus) return result;
  for (const key of ['power', 'water', 'food', 'oxygen'] as const) {
    const value = bonus[key];
    if (value !== undefined && value > 0) result[key] = round2(value);
  }
  return result;
}

/**
 * Daily morale recovery (percentage points) from the commander's passive.
 * 0 when the occupation has no such bonus.
 */
export function dailyMoraleRecovery(character: CharacterState): number {
  const bonus = passiveFor(character).moraleRecoveryBonus ?? 0;
  return bonus > 0 ? round2(bonus) : 0;
}

/**
 * Daily health recovery (percentage points) granted by the medical passive,
 * but only while the character is not in immediate danger. Returns 0 when there
 * is no bonus or when health/radiation are in a critical band.
 */
export function dailyHealthRecovery(
  crew: Readonly<CrewState>,
  character: CharacterState
): number {
  const bonus = passiveFor(character).healthRecoveryBonus ?? 0;
  if (bonus <= 0) return 0;
  // No passive healing while critically injured or heavily irradiated — the
  // run should still be losable.
  if (crew.health <= 10 || crew.radiationExposure >= 80) return 0;
  return round2(bonus);
}

/**
 * Scale a positive mission-score delta by the scientist's research factor.
 * Only amplifies gains (never penalises losses), so it is strictly an upside.
 */
export function applyResearchFactor(scoreDelta: number, character: CharacterState): number {
  const factor = passiveFor(character).researchFactor ?? 1;
  if (factor === 1 || scoreDelta <= 0) return round2(scoreDelta);
  return round2(scoreDelta * factor);
}

/**
 * Scale an incoming radiation-exposure increase by the character's resistance
 * factor (<1 reduces it). Only applies to increases (positive deltas); a
 * negative delta (decontamination) passes through unchanged.
 */
export function applyRadiationResistance(radiationDelta: number, character: CharacterState): number {
  const factor = passiveFor(character).radiationResistanceFactor ?? 1;
  if (factor === 1 || radiationDelta <= 0) return round2(radiationDelta);
  return round2(radiationDelta * factor);
}

/**
 * Build the starting live CrewState for a character from a baseline. The
 * character's `health` attribute seeds the starting health capacity; morale and
 * radiation come from the mission baseline. Returns a NEW CrewState.
 */
export function initialCrewForCharacter(
  baseline: Readonly<CrewState>,
  attributes: Readonly<Attributes>
): CrewState {
  return {
    ...baseline,
    // Start at the character's health attribute (their capacity for this run).
    health: attributes.health,
  };
}
