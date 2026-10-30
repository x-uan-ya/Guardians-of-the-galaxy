/**
 * leadershipDescriptions.ts
 * -------------------------
 * Human-readable names, short labels, explanatory descriptions, and icons for
 * each of the five leadership profiles. Also provides the insufficient-data
 * messaging shown when the player has too few decisions for a reliable profile.
 *
 * Pure data — no I/O, no React components, no game-state access.
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, ShieldCheck, BarChart3, HeartPulse, Compass } from 'lucide-react';
import type { LeadershipTrait } from './leadershipTypes';

export interface ProfileDescriptor {
  /** The profile's display title (e.g. "The Risk Taker"). */
  title: string;
  /** Short label for the score bar (e.g. "Risk Taking"). */
  barLabel: string;
  /** One-sentence explanation shown when this profile is assigned. */
  description: string;
  /** Lucide icon representing this profile. */
  icon: LucideIcon;
}

/**
 * Descriptor for each of the five leadership traits. The description explains
 * WHY the player received this profile, grounded in the kind of decisions
 * they made.
 */
export const PROFILE_DESCRIPTORS: Record<LeadershipTrait, ProfileDescriptor> = {
  riskTaker: {
    title: 'The Risk Taker',
    barLabel: 'Risk Taking',
    description:
      'You frequently chose dangerous paths — accepting crew exposure, gambling on uncertain outcomes, and pushing systems past safe limits to achieve your objectives.',
    icon: Flame,
  },
  survivor: {
    title: 'The Survivor',
    barLabel: 'Survival Focus',
    description:
      'You prioritised conservation and safety — sheltering from threats, rationing supplies, and choosing the cautious path to keep the outpost running through every crisis.',
    icon: ShieldCheck,
  },
  optimiser: {
    title: 'The Optimiser',
    barLabel: 'Optimisation',
    description:
      'You invested in systems and infrastructure — repairing equipment, improving efficiency, and making targeted trade-offs to keep the outpost performing at its best.',
    icon: BarChart3,
  },
  humanitarian: {
    title: 'The Humanitarian',
    barLabel: 'Crew Welfare',
    description:
      'You put the crew first — prioritising health, morale, and recovery over operational efficiency, and choosing protective measures whenever crew safety was at stake.',
    icon: HeartPulse,
  },
  explorer: {
    title: 'The Explorer',
    barLabel: 'Exploration',
    description:
      'You pursued discovery and long-term investment — investigating anomalies, analysing signals, and committing resources to research even when the payoff was uncertain.',
    icon: Compass,
  },
};

/** Message shown when the player has fewer than the minimum decisions. */
export const INSUFFICIENT_DATA_MESSAGE =
  'Not enough decisions recorded to determine a leadership profile. Play a few more Sols and return here to see your results.';

/** Message shown when all trait scores are zero (all actions unclassified). */
export const NO_PROFILE_MESSAGE =
  'Your decisions could not be mapped to a specific leadership style. Continue making event-driven choices to build your profile.';
