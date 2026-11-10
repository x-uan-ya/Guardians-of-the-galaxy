/**
 * server/leaderboardDb.ts
 * -----------------------
 * SERVER-SIDE Neon Postgres access for the leaderboard. This runs in Node (the
 * Vite dev/preview server middleware), NEVER in the browser — the connection
 * string stays server-side, as the Neon skill requires for a client SPA.
 *
 * Driver: @neondatabase/serverless (HTTP transport), the recommended driver for
 * serverless/edge-style one-shot queries. Uses the POOLED DATABASE_URL for app
 * traffic (per neon-postgres guidance).
 *
 * The leaderboard table is created on first use (idempotent) so no separate
 * migration step is needed for this demo.
 */

import { neon } from '@neondatabase/serverless';

export interface DbLeaderboardEntry {
  id: string;
  name: string;
  userId?: string;
  daysSurvived: number;
  score: number;
  missionType: string;
  occupation: string;
  outcome: string;
  timestamp: number;
}

const LEADERBOARD_SIZE = 10;

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
    CREATE TABLE IF NOT EXISTS leaderboard (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      user_id       TEXT,
      days_survived INTEGER NOT NULL,
      score         INTEGER NOT NULL,
      mission_type  TEXT NOT NULL,
      occupation    TEXT NOT NULL,
      outcome       TEXT NOT NULL,
      ts            BIGINT NOT NULL
    )
  `;
  ensured = true;
}

/** Map a DB row to the API entry shape. */
function rowToEntry(r: Record<string, unknown>): DbLeaderboardEntry {
  const entry: DbLeaderboardEntry = {
    id: String(r.id),
    name: String(r.name),
    daysSurvived: Number(r.days_survived),
    score: Number(r.score),
    missionType: String(r.mission_type),
    occupation: String(r.occupation),
    outcome: String(r.outcome),
    timestamp: Number(r.ts),
  };
  if (r.user_id != null) entry.userId = String(r.user_id);
  return entry;
}

/**
 * Read the top-N leaderboard, ranked by sols survived, then score, then earliest
 * timestamp. Ranking is done in SQL so the database is the source of truth.
 */
export async function getTopEntries(): Promise<DbLeaderboardEntry[]> {
  await ensureTable();
  const sql = neon(connectionString());
  const rows = (await sql`
    SELECT id, name, user_id, days_survived, score, mission_type, occupation, outcome, ts
    FROM leaderboard
    ORDER BY days_survived DESC, score DESC, ts ASC
    LIMIT ${LEADERBOARD_SIZE}
  `) as Record<string, unknown>[];
  return rows.map(rowToEntry);
}

/**
 * Upsert a run result, then return the refreshed top-N board. Upsert on id keeps
 * a resubmission of the same run idempotent.
 */
export async function submitEntry(entry: DbLeaderboardEntry): Promise<DbLeaderboardEntry[]> {
  await ensureTable();
  const sql = neon(connectionString());
  await sql`
    INSERT INTO leaderboard (id, name, user_id, days_survived, score, mission_type, occupation, outcome, ts)
    VALUES (
      ${entry.id}, ${entry.name}, ${entry.userId ?? null}, ${entry.daysSurvived},
      ${entry.score}, ${entry.missionType}, ${entry.occupation}, ${entry.outcome}, ${entry.timestamp}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      user_id = EXCLUDED.user_id,
      days_survived = EXCLUDED.days_survived,
      score = EXCLUDED.score,
      mission_type = EXCLUDED.mission_type,
      occupation = EXCLUDED.occupation,
      outcome = EXCLUDED.outcome,
      ts = EXCLUDED.ts
  `;
  return getTopEntries();
}
