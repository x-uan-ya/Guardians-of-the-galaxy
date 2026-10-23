/**
 * mood.ts
 * -------
 * A one-word read on how the character is holding up, worked out from the same
 * morale, health and radiation numbers already shown on the dashboard.
 */

import type { CrewState } from '../simulation/simulationTypes';

export type Mood = 'great' | 'good' | 'okay' | 'worried' | 'struggling';

export interface MoodInfo {
  label: string;
  /** Short, plain explanation shown under the label. */
  hint: string;
}

export const MOOD_INFO: Record<Mood, MoodInfo> = {
  great: { label: 'Feeling great', hint: 'Morale and health are both strong.' },
  good: { label: 'Doing well', hint: 'Things are under control.' },
  okay: { label: 'Holding up', hint: 'Keep an eye on morale and health.' },
  worried: { label: 'Worried', hint: 'Morale or health is getting low.' },
  struggling: { label: 'Struggling', hint: 'Take care of morale and health soon.' },
};

export function calculateMood(crew: CrewState): Mood {
  const score = crew.morale * 0.5 + crew.health * 0.4 + (100 - crew.radiationExposure) * 0.1;
  if (score >= 75) return 'great';
  if (score >= 60) return 'good';
  if (score >= 45) return 'okay';
  if (score >= 30) return 'worried';
  return 'struggling';
}
