/**
 * server/userStateDb.ts
 * ---------------------
 * SERVER-SIDE Neon Postgres access for per-user game state. Runs in Node only.
 *
 * Every per-user blob the client used to keep in localStorage (the game save,
 * completed chapter intros, achievements, run progression, play history) is
 * stored here as JSONB, keyed by (user_id, kind). The client keeps a
 * localStorage mirror as a synchronous fallback; this table is the shared,
 * cross-device source of truth.
 *
 * Storing opaque JSONB per (user_id, kind) means one table serves all five
 * features and the server never needs to know each payload's internal shape —
 * validation of a payload's contents stays in the client's typed services.
 */

import { neon } from '@neondatabase/serverless';

/** The known per-user blob kinds. */
export const USER_STATE_KINDS = [
  'save',
  'chapters',
  'achievements',
  'progression',
  'history',
] as const;

export type UserStateKind = (typeof USER_STATE_KINDS)[number];

export function isUserStateKind(value: unknown): value is UserStateKind {
  return typeof value === 'string' && (USER_STATE_KINDS as readonly string[]).includes(value);
}

let ensured = false;

/** Resolve the pooled connection string from the server environment. */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (run `neon deploy` to pull env vars).');
  }
  return url;
}

/** Lazily create the table once per process. */
async function ensureTable(): Promise<void> {
  if (ensured) return;
  const sql = neon(connectionString());
  await sql`
    CREATE TABLE IF NOT EXISTS user_state (
      user_id    TEXT NOT NULL,
      kind       TEXT NOT NULL,
      payload    JSONB NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (user_id, kind)
    )
  `;
  ensured = true;
}

/**
 * Read one per-user blob. Returns the parsed JSON payload (any shape) or null
 * when nothing is stored for that (userId, kind).
 */
export async function getUserState(userId: string, kind: UserStateKind): Promise<unknown | null> {
  await ensureTable();
  const sql = neon(connectionString());
  const rows = (await sql`
    SELECT payload FROM user_state WHERE user_id = ${userId} AND kind = ${kind}
  `) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const payload = rows[0]!.payload;
  // node-postgres/neon returns JSONB already parsed; tolerate a string too.
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  return payload ?? null;
}

/** Upsert one per-user blob. Returns the stored payload unchanged. */
export async function putUserState(
  userId: string,
  kind: UserStateKind,
  payload: unknown,
  now: number = Date.now()
): Promise<unknown> {
  await ensureTable();
  const sql = neon(connectionString());
  await sql`
    INSERT INTO user_state (user_id, kind, payload, updated_at)
    VALUES (${userId}, ${kind}, ${JSON.stringify(payload)}::jsonb, ${now})
    ON CONFLICT (user_id, kind) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `;
  return payload;
}
