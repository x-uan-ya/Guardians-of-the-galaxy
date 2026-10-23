/**
 * compatibility.ts
 * ----------------
 * CONTENT you own: an advisory Occupation × Mission compatibility matrix.
 *
 * For a given (mission, occupation) pairing this says whether the role is a
 * 🟢 Strong / 🟡 Neutral / 🔴 Challenging fit, with a one-line reason shown on
 * the occupation picker.
 *
 * IMPORTANT: this is ADVISORY ONLY. It never locks an occupation to a mission —
 * the player can always pick anything. The idea is the tension: "do I pick the
 * safe fit, or the interesting challenge?"
 *
 * OWNERSHIP SPLIT (same model as mission modifiers):
 *   - THIS FILE owns which pairings are strong/neutral/challenging + the reason.
 *   - IF a teammate later wants compatibility to also affect the simulation
 *     (e.g. a small penalty on 🔴), that math is the simulation owner's call;
 *     they can read getCompatibility(mission, occupation).rating from state.
 *
 * Any pairing not explicitly listed falls back to NEUTRAL, so adding a new
 * occupation or mission never breaks — it just reads "neutral" until filled in.
 */

import type { MissionType, Occupation } from '../simulation/simulationTypes';

/** How well an occupation fits a mission. */
export type CompatRating = 'strong' | 'neutral' | 'challenging';

export interface Compatibility {
  rating: CompatRating;
  /** One-line, player-facing reason for the rating. */
  reason: string;
}

/** The neutral fallback used for any unlisted pairing. */
export const NEUTRAL_COMPAT: Compatibility = {
  rating: 'neutral',
  reason: 'A workable fit for this site.',
};

/**
 * The matrix: MISSION_COMPATIBILITY[missionType][occupation]. Only interesting
 * (non-neutral) pairings need an entry; omit a pairing to inherit NEUTRAL.
 */
export const MISSION_COMPATIBILITY: Record<
  MissionType,
  Partial<Record<Occupation, Compatibility>>
> = {
  lunar: {
    engineer: { rating: 'strong', reason: 'Keeps fragile machinery alive through brutal temperature swings.' },
    pilot: { rating: 'strong', reason: 'Thrives on EVA upkeep of the solar array in harsh light.' },
    botanist: { rating: 'challenging', reason: 'Growing food is hard with such limited starting resources.' },
    scientist: { rating: 'neutral', reason: 'Plenty to study, little that eases the resource crunch.' },
  },

  mars: {
    engineer: { rating: 'strong', reason: 'Better at maintaining dust-damaged machinery.' },
    chemist: { rating: 'strong', reason: 'Scrubs the air and offsets the radiation strain on life support.' },
    medicalOfficer: { rating: 'neutral', reason: 'Can manage the health effects of radiation exposure.' },
    scientist: { rating: 'neutral', reason: 'Can analyse the storm and radiation data, but it does not stop it.' },
    botanist: { rating: 'challenging', reason: 'Dust storms and radiation make food production harder.' },
  },

  'deep-space': {
    chemist: { rating: 'strong', reason: 'Recycles air superbly where every molecule counts.' },
    engineer: { rating: 'strong', reason: 'Vital upkeep when nothing can be replaced or resupplied.' },
    medicalOfficer: { rating: 'neutral', reason: 'Keeps the crew alive, but cannot conjure resources.' },
    botanist: { rating: 'challenging', reason: 'Feeble solar power cripples the greenhouse.' },
    pilot: { rating: 'challenging', reason: 'Little sunlight to harvest; the solar speciality underperforms.' },
  },
};

/** Resolve the compatibility for a pairing, falling back to NEUTRAL. */
export function getCompatibility(mission: MissionType, occupation: Occupation): Compatibility {
  return MISSION_COMPATIBILITY[mission][occupation] ?? NEUTRAL_COMPAT;
}

/** UI metadata for each rating (label, emoji, colour classes). */
export const COMPAT_META: Record<
  CompatRating,
  { label: string; emoji: string; className: string }
> = {
  strong: {
    label: 'Strong',
    emoji: '🟢',
    className: 'border-status-ok/40 bg-status-ok/10 text-status-ok',
  },
  neutral: {
    label: 'Neutral',
    emoji: '🟡',
    className: 'border-status-warn/40 bg-status-warn/10 text-status-warn',
  },
  challenging: {
    label: 'Challenging',
    emoji: '🔴',
    className: 'border-status-critical/40 bg-status-critical/10 text-status-critical',
  },
};
