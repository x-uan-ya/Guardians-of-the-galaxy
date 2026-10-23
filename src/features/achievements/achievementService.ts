/**
 * achievementService.ts
 * ---------------------
 * Tracks which badges the player has earned (kept across missions) and checks
 * for new ones. Stored in localStorage under its own key.
 */

import {
  ACHIEVEMENTS,
  type AchievementContext,
  type AchievementDef,
  type AchievementId,
} from './achievementData';

const STORAGE_KEY = 'mars-achievements-v2';

/** Earned badges: id -> the Sol it was earned on. */
export interface AchievementStore {
  unlocked: Partial<Record<AchievementId, number>>;
}

export function emptyAchievements(): AchievementStore {
  return { unlocked: {} };
}

export function loadAchievements(): AchievementStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAchievements();
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'unlocked' in parsed) {
      const unlocked: AchievementStore['unlocked'] = {};
      const stored = (parsed as { unlocked: Record<string, unknown> }).unlocked;
      // Keep only known badges so old/corrupt data cannot inflate the count.
      for (const def of ACHIEVEMENTS) {
        const sol = stored[def.id];
        if (typeof sol === 'number') unlocked[def.id] = sol;
      }
      return { unlocked };
    }
  } catch {
    // Unavailable or corrupt storage: start with no badges.
  }
  return emptyAchievements();
}

function saveAchievements(store: AchievementStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable: badges just will not persist.
  }
}

export function isUnlocked(store: AchievementStore, id: AchievementId): boolean {
  return store.unlocked[id] !== undefined;
}

export function countUnlocked(store: AchievementStore): number {
  return ACHIEVEMENTS.filter((a) => isUnlocked(store, a.id)).length;
}

/** Check every badge against the current game. Returns any newly earned ones. */
export function evaluateAchievements(
  store: AchievementStore,
  ctx: AchievementContext,
  sol: number
): { store: AchievementStore; newlyUnlocked: AchievementDef[] } {
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => !isUnlocked(store, a.id) && a.isUnlocked(ctx));
  if (newlyUnlocked.length === 0) return { store, newlyUnlocked };

  const unlocked = { ...store.unlocked };
  for (const a of newlyUnlocked) unlocked[a.id] = sol;
  const next: AchievementStore = { unlocked };
  saveAchievements(next);
  return { store: next, newlyUnlocked };
}
