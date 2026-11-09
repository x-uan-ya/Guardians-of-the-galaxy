/**
 * PlayHistory.tsx
 * ---------------
 * The signed-in player's past runs with the score reached each time, plus the
 * run in progress. Reads the account's history from historyService; it never
 * changes anything.
 */

import type { ReactElement } from 'react';
import { History } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { getMission } from '../mission/missions';
import { getOccupation } from '../mission/occupations';
import type { GameState } from '../simulation/simulationTypes';
import {
  getPlayHistory,
  summariseHistory,
  type HistoryOutcome,
  type PlayHistoryEntry,
} from './historyService';

interface PlayHistoryProps {
  /** The run in progress, shown at the top while it is still being played. */
  state: GameState;
}

const OUTCOME_LABEL: Record<HistoryOutcome, string> = {
  completed: 'Survived',
  failed: 'Lost',
  abandoned: 'Left early',
};

const OUTCOME_TONE: Record<HistoryOutcome, string> = {
  completed: 'bg-status-ok/15 text-status-ok',
  failed: 'bg-status-critical/15 text-status-critical',
  abandoned: 'bg-space-600 text-slate-300',
};

function formatWhen(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PlayHistory({ state }: PlayHistoryProps): ReactElement {
  const entries = getPlayHistory();
  const summary = summariseHistory(entries);

  const live = state.mission.status === 'active' || state.mission.status === 'critical';
  // A run that already has a row (finished or left) is not shown twice.
  const showLive = live && !entries.some((e) => e.id === `run_${state.gameId}`);

  return (
    <section className="panel mx-auto max-w-3xl p-5" aria-label="Play history">
      <SectionHeader
        title="Play History"
        icon={History}
        subtitle="Your runs and the score you reached each time"
      />

      <div className="tnum mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Runs played" value={String(summary.runs)} />
        <Stat label="Best score" value={summary.runs > 0 ? String(summary.best) : '—'} />
        <Stat label="Average score" value={summary.runs > 0 ? String(summary.average) : '—'} />
        <Stat label="Missions survived" value={String(summary.survived)} />
      </div>

      {entries.length === 0 && !showLive ? (
        <p className="text-sm text-slate-400">
          No runs yet. Finish a mission, or leave one with Reset or New, and it will show up here with
          its score.
        </p>
      ) : (
        <ol className="space-y-1.5">
          <li
            aria-hidden
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[1fr_5rem_4rem_4rem]"
          >
            <span>Run</span>
            <span className="hidden text-right sm:block">Result</span>
            <span className="text-right">Sols</span>
            <span className="text-right">Score</span>
          </li>

          {showLive ? (
            <Row
              key="live"
              when="Now"
              missionType={state.mission.missionType}
              occupation={state.character.occupation}
              decisions={state.history.length}
              sols={state.day}
              score={Math.round(state.mission.score)}
              badge={{ label: 'In progress', tone: 'bg-accent-blue/15 text-accent-blue' }}
              highlighted
            />
          ) : null}

          {entries.map((entry) => (
            <Row
              key={entry.id}
              when={formatWhen(entry.timestamp)}
              missionType={entry.missionType}
              occupation={entry.occupation}
              decisions={entry.decisions}
              sols={entry.sols}
              score={entry.score}
              badge={{ label: OUTCOME_LABEL[entry.outcome], tone: OUTCOME_TONE[entry.outcome] }}
              best={summary.runs > 1 && entry.id === summary.bestId}
            />
          ))}
        </ol>
      )}

      {entries.length === 0 && showLive ? (
        <p className="mt-3 text-sm text-slate-400">
          Your earlier runs will appear here once you finish a mission, or leave one with Reset or New.
        </p>
      ) : null}

      <p className="mt-4 text-[10px] text-slate-500">
        History is kept in this browser for your account only. The newest 100 runs are kept.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function Row({
  when,
  missionType,
  occupation,
  decisions,
  sols,
  score,
  badge,
  best = false,
  highlighted = false,
}: {
  when: string;
  missionType: PlayHistoryEntry['missionType'];
  occupation: PlayHistoryEntry['occupation'];
  decisions: number;
  sols: number;
  score: number;
  badge: { label: string; tone: string };
  best?: boolean;
  highlighted?: boolean;
}): ReactElement {
  const mission = getMission(missionType);
  const job = getOccupation(occupation);
  return (
    <li
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border px-2 py-2 sm:grid-cols-[1fr_5rem_4rem_4rem] ${
        highlighted
          ? 'border-accent-blue/50 bg-accent-blue/5'
          : 'border-space-600/60 bg-space-700/40'
      }`}
      data-history-row
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-100">
            <span aria-hidden>{mission.glyph} </span>
            {mission.label} · {job.label}
          </span>
          {best ? (
            <span className="rounded bg-mars-orange/20 px-1 py-0.5 text-[9px] uppercase tracking-wide text-mars-orange">
              Best
            </span>
          ) : null}
          <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide sm:hidden ${badge.tone}`}>
            {badge.label}
          </span>
        </span>
        <span className="block truncate text-[11px] text-slate-400">
          {when} · {decisions} decision{decisions === 1 ? '' : 's'}
        </span>
      </span>
      <span className="hidden justify-self-end sm:block">
        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${badge.tone}`}>
          {badge.label}
        </span>
      </span>
      <span className="tnum text-right text-sm text-slate-300">{sols}</span>
      <span className="tnum text-right text-sm font-semibold text-slate-100">{score}</span>
    </li>
  );
}
