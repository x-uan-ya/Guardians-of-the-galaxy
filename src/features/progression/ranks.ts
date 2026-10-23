/**
 * ranks.ts
 * --------
 * Mission rank, earned with XP during a single mission. Thresholds are total XP
 * and are tuned so a normal 30-Sol run climbs several ranks.
 */

export interface Rank {
  title: string;
  /** Total XP needed to hold this rank. */
  xpRequired: number;
}

export const RANKS: readonly Rank[] = [
  { title: 'Trainee', xpRequired: 0 },
  { title: 'Technician', xpRequired: 75 },
  { title: 'Specialist', xpRequired: 200 },
  { title: 'Senior Specialist', xpRequired: 350 },
  { title: 'Commander', xpRequired: 550 },
  { title: 'Mars Legend', xpRequired: 800 },
];

export interface RankInfo {
  index: number;
  title: string;
  /** Title of the next rank, or null at the top. */
  nextTitle: string | null;
  /** XP still needed for the next rank, or 0 at the top. */
  xpToNext: number;
  /** 0..1 progress through the current rank. */
  progress: number;
}

export function getRankInfo(totalXp: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    const rank = RANKS[i];
    if (rank && totalXp >= rank.xpRequired) index = i;
  }
  const current = RANKS[index] ?? RANKS[0]!;
  const next = RANKS[index + 1];
  if (!next) {
    return { index, title: current.title, nextTitle: null, xpToNext: 0, progress: 1 };
  }
  const span = next.xpRequired - current.xpRequired;
  return {
    index,
    title: current.title,
    nextTitle: next.title,
    xpToNext: Math.max(0, next.xpRequired - totalXp),
    progress: Math.min(1, Math.max(0, (totalXp - current.xpRequired) / span)),
  };
}
