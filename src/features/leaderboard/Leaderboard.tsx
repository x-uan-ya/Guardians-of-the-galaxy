/**
 * Leaderboard.tsx
 * ---------------
 * The top-10 survival leaderboard, ranked by days survived. Reads the board
 * from the leaderboard service. Pure presentational beyond reading the store;
 * it optionally highlights the player's most recent entry.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { Medal, Trophy } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { getActiveUserId } from '../../lib/userScope';
import { getLeaderboard, fetchLeaderboardFromApi } from './leaderboardService';
import type { LeaderboardEntry } from './leaderboardTypes';
import { getMission } from '../mission/missions';
import { getOccupation } from '../mission/occupations';

interface LeaderboardProps {
  /** Highlight this entry id (the player's just-submitted run), if present. */
  highlightId?: string;
}

const RANK_COLOR = ['text-mars-orange', 'text-slate-300', 'text-amber-600'];

export function Leaderboard({ highlightId }: LeaderboardProps): ReactElement {
  // Start from the instant local board so the panel renders immediately, then
  // replace it with the Postgres-backed board once the API responds. If the API
  // is unavailable (static build / offline), the local board stays.
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [source, setSource] = useState<'local' | 'database'>('local');
  const me = getActiveUserId();

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboardFromApi().then((remote) => {
      if (!cancelled && remote) {
        setEntries(remote);
        setSource('database');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel mx-auto max-w-3xl p-5">
      <SectionHeader
        title="Survival Leaderboard"
        icon={Trophy}
        subtitle="Top 10 operators, ranked by sols survived. Each operator appears once, with their best run."
      />

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No runs recorded yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {/* Header row */}
          <li className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>#</span>
            <span>Operator</span>
            <span className="text-right">Score</span>
            <span className="text-right">Sols</span>
          </li>

          {entries.map((entry, index) => {
            const rank = index + 1;
            // Defensive lookups: a persisted entry with an unknown/missing
            // missionType or occupation must not crash the whole board.
            const mission = getMission(entry.missionType) as
              | ReturnType<typeof getMission>
              | undefined;
            const occupation = getOccupation(entry.occupation) as
              | ReturnType<typeof getOccupation>
              | undefined;
            const missionLabel = mission?.label ?? 'Unknown site';
            const missionGlyph = mission?.glyph ?? '🛰️';
            const occupationLabel = occupation?.label ?? 'Unknown role';
            // Your own row is marked. Each player appears once, with their best run.
            const highlighted = entry.id === highlightId || (me !== null && entry.userId === me);
            return (
              <li
                key={entry.id}
                className={`grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-md border px-2 py-2 transition-colors ${
                  highlighted
                    ? 'border-mars-orange/60 bg-mars-red/10 ring-1 ring-mars-orange/40'
                    : 'border-space-600/60 bg-space-700/40'
                }`}
              >
                {/* Rank */}
                <span className="flex items-center justify-center">
                  {rank <= 3 ? (
                    <Medal className={`h-4 w-4 ${RANK_COLOR[rank - 1]}`} aria-hidden />
                  ) : (
                    <span className="tnum text-xs text-slate-400">{rank}</span>
                  )}
                </span>

                {/* Operator + context */}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-100">{entry.name}</span>
                    {entry.seed ? (
                      <span className="rounded bg-space-600 px-1 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
                        demo
                      </span>
                    ) : null}
                    {highlighted ? (
                      <span className="rounded bg-mars-orange/20 px-1 py-0.5 text-[9px] uppercase tracking-wide text-mars-orange">
                        you
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    <span aria-hidden>{missionGlyph} </span>
                    {missionLabel} · {occupationLabel} ·{' '}
                    <span className={entry.outcome === 'completed' ? 'text-status-ok' : 'text-status-critical'}>
                      {entry.outcome === 'completed' ? 'Survived' : 'Lost'}
                    </span>
                  </span>
                </span>

                {/* Score */}
                <span className="tnum text-right text-sm text-slate-300">{Math.round(entry.score)}</span>

                {/* Days survived (primary metric) */}
                <span className="tnum text-right text-sm font-semibold text-slate-100">
                  {entry.daysSurvived}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-4 text-[10px] text-slate-500">
        {source === 'database'
          ? 'Live leaderboard — backed by Neon Postgres. Finish a run to post your score.'
          : 'Local demo board. Finish a run to post your own score.'}
      </p>
    </section>
  );
}
