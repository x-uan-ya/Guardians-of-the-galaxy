/**
 * validation.ts
 * -------------
 * Safe parsing / validation helpers that sit between untrusted storage and the
 * simulation engine. Keeps "is this JSON structurally a GameState?" logic
 * separate from both the DOM storage API and the simulation math.
 */

import { validateGameState, type ValidationResult } from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';

/** Outcome of attempting to parse+validate a stored string into a GameState. */
export type ParseResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string; errors?: string[] };

/**
 * Parse a raw string (from localStorage) into a validated GameState. Never
 * throws — returns a discriminated result so the caller can fall back cleanly.
 */
export function parseGameState(raw: string | null): ParseResult {
  if (raw === null || raw.length === 0) {
    return { ok: false, reason: 'No saved game found.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Saved game is not valid JSON.' };
  }

  const result: ValidationResult = validateGameState(parsed);
  if (!result.valid) {
    return { ok: false, reason: 'Saved game failed validation.', errors: result.errors };
  }

  // Validated: the shape matches GameState (schemaVersion + all metrics in
  // bounds). Safe to assert.
  return { ok: true, state: parsed as GameState };
}

/** Serialise a GameState for storage. Kept here so (de)serialisation lives together. */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}
