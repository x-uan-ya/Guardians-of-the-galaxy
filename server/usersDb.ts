/**
 * server/usersDb.ts
 * -----------------
 * SERVER-SIDE Neon Postgres access for the user account registry. Runs in Node
 * (the Vite dev/preview middleware) only — the connection string never reaches
 * the browser.
 *
 * The browser keeps its own localStorage copy of accounts as a fallback; this
 * table is the shared, cross-device source of truth. The ACTIVE SESSION is NOT
 * stored here — it stays a device-local concern (localStorage) so the app's
 * synchronous getCurrentSession() path is unaffected.
 *
 * Security answers are already hashed client-side before they get here, and the
 * password hash is likewise precomputed by the client's auth layer. This module
 * only persists whatever account blob it is handed.
 */

import { neon } from '@neondatabase/serverless';

/** One security question with a (hashed) answer, as stored by the client. */
export interface DbSecurityQuestion {
  question: string;
  answer: string;
}

/** The account record, mirrored from the client's `User` type. */
export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  securityQuestions: DbSecurityQuestion[];
  createdAt: string;
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
    CREATE TABLE IF NOT EXISTS users (
      id                 TEXT PRIMARY KEY,
      email              TEXT NOT NULL UNIQUE,
      password_hash      TEXT NOT NULL,
      security_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at         TEXT NOT NULL
    )
  `;
  ensured = true;
}

/** Map a DB row to the account shape. */
function rowToUser(r: Record<string, unknown>): DbUser {
  const rawQuestions = r.security_questions;
  let securityQuestions: DbSecurityQuestion[] = [];
  if (Array.isArray(rawQuestions)) {
    securityQuestions = rawQuestions as DbSecurityQuestion[];
  } else if (typeof rawQuestions === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawQuestions);
      if (Array.isArray(parsed)) securityQuestions = parsed as DbSecurityQuestion[];
    } catch {
      /* leave empty */
    }
  }
  return {
    id: String(r.id),
    email: String(r.email),
    passwordHash: String(r.password_hash),
    securityQuestions,
    createdAt: String(r.created_at),
  };
}

/** Read every registered account. */
export async function getUsers(): Promise<DbUser[]> {
  await ensureTable();
  const sql = neon(connectionString());
  const rows = (await sql`
    SELECT id, email, password_hash, security_questions, created_at
    FROM users
    ORDER BY created_at ASC
  `) as Record<string, unknown>[];
  return rows.map(rowToUser);
}

/**
 * Upsert one account. Upsert on id keeps re-syncs idempotent; a change to the
 * password hash or security questions (e.g. password reset) is applied.
 */
export async function upsertUser(user: DbUser): Promise<DbUser[]> {
  await ensureTable();
  const sql = neon(connectionString());
  await sql`
    INSERT INTO users (id, email, password_hash, security_questions, created_at)
    VALUES (
      ${user.id}, ${user.email}, ${user.passwordHash},
      ${JSON.stringify(user.securityQuestions)}::jsonb, ${user.createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      security_questions = EXCLUDED.security_questions,
      created_at = EXCLUDED.created_at
  `;
  return getUsers();
}
