/**
 * server/leaderboardApiPlugin.ts
 * ------------------------------
 * A tiny Vite plugin that mounts a server-side JSON API for the leaderboard
 * during `vite dev` and `vite preview`. This is the SERVER SURFACE for the
 * client SPA: the browser calls these endpoints, and only this Node-side code
 * touches Postgres (keeping DATABASE_URL off the client).
 *
 * Endpoints:
 *   GET  /api/health                       -> { ok, db }   (proves DB connectivity)
 *   GET  /api/leaderboard                  -> LeaderboardEntry[]
 *   POST /api/leaderboard                  -> LeaderboardEntry[] (body = one entry)
 *   GET  /api/users                        -> DbUser[]     (account registry)
 *   POST /api/users                        -> DbUser[]     (body = one account; upsert)
 *   GET  /api/state?userId=&kind=          -> { payload }  (per-user blob or null)
 *   POST /api/state?userId=&kind=          -> { payload }  (body = { payload })
 *
 * `kind` is one of: save | chapters | achievements | progression | history.
 *
 * It injects DATABASE_URL into process.env from Vite's loaded env so the DB
 * module can read it. If DATABASE_URL is absent, the endpoints return 503 and
 * the client falls back to localStorage — the app keeps working.
 */

import type { Connect, Plugin, ViteDevServer, PreviewServer } from 'vite';
import { loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getTopEntries, submitEntry, type DbLeaderboardEntry } from './leaderboardDb';
import { getUsers, upsertUser, type DbUser } from './usersDb';
import { getUserState, putUserState, isUserStateKind } from './userStateDb';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** Minimal validation of an incoming submission. */
function parseEntry(raw: string): DbLeaderboardEntry | null {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof v.id === 'string' &&
      typeof v.name === 'string' &&
      typeof v.daysSurvived === 'number' &&
      Number.isFinite(v.daysSurvived) &&
      typeof v.score === 'number' &&
      Number.isFinite(v.score) &&
      typeof v.missionType === 'string' &&
      typeof v.occupation === 'string' &&
      typeof v.outcome === 'string' &&
      typeof v.timestamp === 'number'
    ) {
      const entry: DbLeaderboardEntry = {
        id: v.id,
        name: v.name,
        daysSurvived: Math.trunc(v.daysSurvived),
        score: Math.trunc(v.score),
        missionType: v.missionType,
        occupation: v.occupation,
        outcome: v.outcome,
        timestamp: Math.trunc(v.timestamp),
      };
      if (typeof v.userId === 'string') entry.userId = v.userId;
      return entry;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Validate one account record coming from the client's auth layer. */
function parseUser(value: unknown): DbUser | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    typeof v.email !== 'string' ||
    typeof v.passwordHash !== 'string' ||
    typeof v.createdAt !== 'string' ||
    !Array.isArray(v.securityQuestions)
  ) {
    return null;
  }
  const securityQuestions = [];
  for (const q of v.securityQuestions) {
    if (
      typeof q === 'object' &&
      q !== null &&
      typeof (q as Record<string, unknown>).question === 'string' &&
      typeof (q as Record<string, unknown>).answer === 'string'
    ) {
      const qq = q as { question: string; answer: string };
      securityQuestions.push({ question: qq.question, answer: qq.answer });
    } else {
      return null;
    }
  }
  return {
    id: v.id,
    email: v.email,
    passwordHash: v.passwordHash,
    securityQuestions,
    createdAt: v.createdAt,
  };
}

/** Read a query-string value from a request URL (which may be path-only). */
function queryParam(url: string, name: string): string | null {
  const q = url.indexOf('?');
  if (q < 0) return null;
  return new URLSearchParams(url.slice(q + 1)).get(name);
}

/** The shared request handler used by both the dev and preview servers. */
function makeMiddleware(hasDb: boolean): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/')) return next();

    void (async () => {
      try {
        if (url.startsWith('/api/health')) {
          if (!hasDb) return sendJson(res, 200, { ok: true, db: false });
          await getTopEntries(); // touches the DB
          return sendJson(res, 200, { ok: true, db: true });
        }

        if (url.startsWith('/api/leaderboard')) {
          if (!hasDb) return sendJson(res, 503, { error: 'Database not configured' });

          if (req.method === 'GET') {
            return sendJson(res, 200, await getTopEntries());
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            const entry = parseEntry(body);
            if (!entry) return sendJson(res, 400, { error: 'Invalid leaderboard entry' });
            return sendJson(res, 200, await submitEntry(entry));
          }
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        if (url.startsWith('/api/users')) {
          if (!hasDb) return sendJson(res, 503, { error: 'Database not configured' });

          if (req.method === 'GET') {
            return sendJson(res, 200, await getUsers());
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            let parsed: unknown;
            try {
              parsed = JSON.parse(body);
            } catch {
              return sendJson(res, 400, { error: 'Invalid JSON' });
            }
            const user = parseUser(parsed);
            if (!user) return sendJson(res, 400, { error: 'Invalid user record' });
            return sendJson(res, 200, await upsertUser(user));
          }
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        if (url.startsWith('/api/state')) {
          if (!hasDb) return sendJson(res, 503, { error: 'Database not configured' });

          const userId = queryParam(url, 'userId');
          const kind = queryParam(url, 'kind');
          if (!userId) return sendJson(res, 400, { error: 'Missing userId' });
          if (!isUserStateKind(kind)) return sendJson(res, 400, { error: 'Invalid kind' });

          if (req.method === 'GET') {
            const payload = await getUserState(userId, kind);
            // 200 with {payload:null} when nothing stored, so the client can tell
            // "DB reachable but empty" from "DB unreachable".
            return sendJson(res, 200, { payload });
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            let parsed: unknown;
            try {
              parsed = (JSON.parse(body) as { payload?: unknown }).payload;
            } catch {
              return sendJson(res, 400, { error: 'Invalid JSON' });
            }
            if (parsed === undefined) return sendJson(res, 400, { error: 'Missing payload' });
            const saved = await putUserState(userId, kind, parsed);
            return sendJson(res, 200, { payload: saved });
          }
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        return next();
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : 'Server error' });
      }
    })();
  };
}

export function leaderboardApiPlugin(): Plugin {
  return {
    name: 'leaderboard-api',
    configResolved(config) {
      // Make DATABASE_URL available to the DB module via process.env.
      const env = loadEnv(config.mode, config.root, '');
      if (env.DATABASE_URL && !process.env.DATABASE_URL) {
        process.env.DATABASE_URL = env.DATABASE_URL;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(makeMiddleware(Boolean(process.env.DATABASE_URL)));
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(makeMiddleware(Boolean(process.env.DATABASE_URL)));
    },
  };
}
