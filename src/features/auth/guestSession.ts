/**
 * guestSession.ts
 * ---------------
 * Keeps a stable, browser-local identity for guest gameplay. This identity is
 * separate from registered authentication and is never used for API requests.
 */

const GUEST_ID_KEY = 'mars-outpost-guest-id';
let inMemoryGuestId: string | null = null;
let guestSessionActive = false;
let activeGuestId: string | null = null;

function createGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Return the existing guest id without creating one. */
export function getGuestId(): string | null {
  try {
    return localStorage.getItem(GUEST_ID_KEY);
  } catch {
    return inMemoryGuestId;
  }
}

/** Return the stable guest id, creating and persisting one on first entry. */
export function getOrCreateGuestId(): string {
  if (activeGuestId) return activeGuestId;

  const existing = getGuestId();
  if (existing) return existing;

  const guestId = createGuestId();
  try {
    localStorage.setItem(GUEST_ID_KEY, guestId);
  } catch {
    // Guest play still works when browser storage is unavailable.
    inMemoryGuestId = guestId;
  }
  return guestId;
}

/** Enter guest mode while retaining the identity for this in-memory session. */
export function startGuestSession(): string {
  const guestId = getOrCreateGuestId();
  guestSessionActive = true;
  activeGuestId = guestId;
  return guestId;
}

/** Whether guest gameplay currently owns the local storage scope. */
export function isGuestSessionActive(): boolean {
  return guestSessionActive;
}

/** Return the active guest identity, without consulting browser storage. */
export function getActiveGuestId(): string | null {
  return activeGuestId;
}

/** Leave guest mode without deleting the persistent guest id or saved data. */
export function endGuestSession(): void {
  guestSessionActive = false;
  activeGuestId = null;
}
