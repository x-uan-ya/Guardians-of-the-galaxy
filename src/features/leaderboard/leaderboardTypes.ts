/**
 * leaderboardTypes.ts
 * -------------------
 * Types + seed data for the survival leaderboard. Players are ranked by days
 * survived (score breaks ties). The seed entries are PLACEHOLDER demo data so
 * the board looks alive before real scores are submitted.
 */

import type { MissionType, Occupation } from '../simulation/simulationTypes';

/** How a run ended, shown next to the entry. */
export type RunOutcome = 'completed' | 'failed';

/** A single leaderboard record. */
export interface LeaderboardEntry {
  /** Stable id (so React keys + de-dupe are easy). */
  id: string;
  /** Display name of the player. */
  name: string;
  /** Primary ranking metric: sols survived. Higher is better. */
  daysSurvived: number;
  /** Final mission score (tiebreaker). */
  score: number;
  missionType: MissionType;
  occupation: Occupation;
  outcome: RunOutcome;
  /** ms since epoch when recorded (secondary tiebreaker: earlier wins). */
  timestamp: number;
  /** True for placeholder demo rows (so the UI can label them). */
  seed?: boolean;
}

/** How many entries the board shows. */
export const LEADERBOARD_SIZE = 10;

/**
 * Placeholder demo leaderboard. Names are obvious placeholders. Timestamps are
 * fixed (not Date.now()) so the seed order is deterministic. Real submissions
 * will out-rank most of these over time.
 */
export const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'seed-1', name: 'Commander Vega', daysSurvived: 30, score: 412, missionType: 'mars', occupation: 'commander', outcome: 'completed', timestamp: 1_700_000_000_001, seed: true },
  { id: 'seed-2', name: 'Dr. Okafor', daysSurvived: 30, score: 388, missionType: 'deep-space', occupation: 'scientist', outcome: 'completed', timestamp: 1_700_000_000_002, seed: true },
  { id: 'seed-3', name: 'Engineer Ramos', daysSurvived: 27, score: 354, missionType: 'mars', occupation: 'engineer', outcome: 'failed', timestamp: 1_700_000_000_003, seed: true },
  { id: 'seed-4', name: 'Medic Lindqvist', daysSurvived: 24, score: 331, missionType: 'lunar', occupation: 'medicalOfficer', outcome: 'failed', timestamp: 1_700_000_000_004, seed: true },
  { id: 'seed-5', name: 'Botanist Mwangi', daysSurvived: 22, score: 318, missionType: 'lunar', occupation: 'botanist', outcome: 'failed', timestamp: 1_700_000_000_005, seed: true },
  { id: 'seed-6', name: 'Pilot Castellano', daysSurvived: 19, score: 276, missionType: 'deep-space', occupation: 'pilot', outcome: 'failed', timestamp: 1_700_000_000_006, seed: true },
  { id: 'seed-7', name: 'Chemist Adeyemi', daysSurvived: 17, score: 250, missionType: 'mars', occupation: 'chemist', outcome: 'failed', timestamp: 1_700_000_000_007, seed: true },
  { id: 'seed-8', name: 'Geologist Petrov', daysSurvived: 14, score: 208, missionType: 'lunar', occupation: 'geologist', outcome: 'failed', timestamp: 1_700_000_000_008, seed: true },
  { id: 'seed-9', name: 'Cadet Nakamura', daysSurvived: 11, score: 170, missionType: 'mars', occupation: 'scientist', outcome: 'failed', timestamp: 1_700_000_000_009, seed: true },
  { id: 'seed-10', name: 'Rookie Silva', daysSurvived: 8, score: 132, missionType: 'deep-space', occupation: 'engineer', outcome: 'failed', timestamp: 1_700_000_000_010, seed: true },
];
