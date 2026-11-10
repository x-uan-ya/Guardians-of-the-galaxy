/**
 * authSync.ts
 * -----------
 * Syncs the local account registry with the Neon-backed `/api/users` endpoint.
 *
 * Accounts are the shared, cross-device source of truth, so they live in
 * Postgres. The ACTIVE SESSION and last-email stay device-local (localStorage)
 * so authService's synchronous getCurrentSession() path — which the whole app's
 * per-user key scoping depends on — is unchanged.
 *
 * Strategy:
 *  - pullUsersFromApi(): on startup, merge DB accounts into the local mirror so
 *    a user who signed up on another device can log in here.
 *  - pushUserToApi(user): fire-and-forget upsert after signup / login / reset.
 * Any API failure is swallowed; the app keeps working on the localStorage copy.
 */

import type { User } from './authTypes';

const USERS_API = '/api/users';

/** Fetch the account registry from the DB, or null if the API is unavailable. */
export async function pullUsersFromApi(): Promise<User[] | null> {
  try {
    const res = await fetch(USERS_API, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    return data.filter(isUser);
  } catch {
    return null;
  }
}

/** Upsert one account to the DB. Fire-and-forget; resolves false on failure. */
export async function pushUserToApi(user: User): Promise<boolean> {
  try {
    const res = await fetch(USERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    typeof u.passwordHash === 'string' &&
    typeof u.createdAt === 'string' &&
    Array.isArray(u.securityQuestions)
  );
}
