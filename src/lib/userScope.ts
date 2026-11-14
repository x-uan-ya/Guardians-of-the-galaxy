/**
 * userScope.ts
 * ------------
 * Makes saved data belong to the signed-in account.
 *
 * Everything the game saves in the browser (the mission, XP, badges) used to use
 * one shared key, so a second account on the same browser opened the first
 * account's game. Now each key gets the account's id added to it, so every
 * account has its own saves.
 *
 * Guest data uses its own browser-local namespace. With neither a registered
 * session nor a guest identity the plain key remains available to tests/tools.
 */

import { getCurrentSession } from '../features/auth/authService';
import { getActiveGuestId, isGuestSessionActive } from '../features/auth/guestSession';

/** The id of the signed-in account, or null when nobody is signed in. */
export function getActiveUserId(): string | null {
  try {
    return getCurrentSession()?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The storage key to use for `baseKey` right now. Call it every time you read or
 * write (not once at load) so it follows whoever is signed in.
 */
export function scopedKey(baseKey: string): string {
  const userId = getActiveUserId();
  if (userId) return `${baseKey}:user:${userId}`;
  if (isGuestSessionActive()) {
    const guestId = getActiveGuestId();
    if (!guestId) {
      throw new Error('Active guest session has no guest ID; refusing unscoped storage access.');
    }
    return `${baseKey}:guest:${guestId}`;
  }
  return baseKey;
}
