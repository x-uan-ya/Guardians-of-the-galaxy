/**
 * tutorialService.ts
 * ------------------
 * Persists whether a player has completed (or skipped) the introductory
 * tutorial. The flag is keyed by user id so each account on the same browser
 * tracks its own status.
 *
 * Storage format:
 *   localStorage key:  mars-outpost-zero:tutorial-done:<userId>
 *   value:             "1"  (present = done, absent = not done)
 *
 * This module touches ONLY the tutorial flag. It does NOT modify the game save,
 * auth data, or any other localStorage keys.
 */

const PREFIX = 'mars-outpost-zero:tutorial-done:';

/** Build the localStorage key for a given user. */
function key(userId: string): string {
  return `${PREFIX}${userId}`;
}

/**
 * Mark the tutorial as completed for a user. Call this when the player
 * finishes Step 5 ("Begin Mission") OR clicks "Skip tutorial".
 */
export function markTutorialComplete(userId: string): void {
  try {
    localStorage.setItem(key(userId), '1');
  } catch {
    // Storage unavailable — silently degrade. The player will just see the
    // tutorial again next time, which is a safe fallback.
  }
}

/**
 * Returns true if the given user has already completed or skipped the
 * tutorial. Returns false when the flag is absent OR storage is unavailable
 * (safe fallback: show the tutorial).
 */
export function hasTutorialCompleted(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) === '1';
  } catch {
    return false;
  }
}
