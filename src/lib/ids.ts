/**
 * ids.ts
 * ------
 * Deterministic id generation for game entities.
 *
 * We avoid crypto.randomUUID()/Math.random() inside the simulation so that a
 * fixed gameId + fixed decision sequence always yields the same ids. Ids are
 * built from a prefix, the game id, and a monotonic counter the engine owns.
 */

/** Build a stable, human-readable id. */
export function makeId(prefix: string, gameId: string, counter: number): string {
  return `${prefix}_${gameId}_${counter}`;
}

/**
 * Generate a new game id. This is the ONE place a non-deterministic value is
 * allowed, and only when the caller did not supply a fixed gameId/config.
 */
export function generateGameId(): string {
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  return `mars_${Date.now().toString(36)}_${rand}`;
}
