/**
 * stateApi.ts
 * -----------
 * Thin client for the server's per-user state API (`/api/state`), which is
 * backed by Neon Postgres (see server/userStateDb.ts). Every per-user blob the
 * app keeps in localStorage is mirrored through here so it syncs across devices.
 *
 * Design rules (same as the leaderboard):
 *  - localStorage stays the synchronous source for instant render.
 *  - The DB is loaded asynchronously and hydrates over the local value.
 *  - Writes are dual: local synchronous write + fire-and-forget to the DB.
 *  - Any API failure (static build with no server, offline, DB down) returns
 *    null / resolves silently, so the app keeps working on localStorage alone.
 */

/** The per-user blob kinds, mirroring the server's USER_STATE_KINDS. */
export type UserStateKind = 'save' | 'chapters' | 'achievements' | 'progression' | 'history';

const STATE_API = '/api/state';

function stateUrl(userId: string, kind: UserStateKind): string {
  return `${STATE_API}?userId=${encodeURIComponent(userId)}&kind=${encodeURIComponent(kind)}`;
}

/**
 * Fetch a per-user blob from the DB.
 *  - Returns the parsed payload when the DB has one.
 *  - Returns null when the DB is reachable but has nothing stored.
 *  - Returns undefined when the API is unavailable, so callers can tell
 *    "empty" (null) apart from "no server" (undefined) and keep the local value.
 */
export async function fetchState<T>(
  userId: string,
  kind: UserStateKind
): Promise<T | null | undefined> {
  try {
    const res = await fetch(stateUrl(userId, kind), { headers: { Accept: 'application/json' } });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { payload?: unknown };
    return (data.payload ?? null) as T | null;
  } catch {
    return undefined;
  }
}

/**
 * Persist a per-user blob to the DB. Fire-and-forget: resolves to true on
 * success, false on any failure. Never throws.
 */
export async function putState(userId: string, kind: UserStateKind, payload: unknown): Promise<boolean> {
  try {
    const res = await fetch(stateUrl(userId, kind), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
