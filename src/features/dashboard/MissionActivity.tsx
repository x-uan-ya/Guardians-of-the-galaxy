/**
 * MissionActivity.tsx
 * -------------------
 * Three read-only panels: recent decision history, pending delayed effects,
 * and the live activity feed. All data is read via decisionHistory selectors
 * and the activity list from useGameState — nothing is computed here.
 */

import type { ReactElement } from 'react';
import { Clock, History, Radio } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { recentDecisions, upcomingEffects } from '../decisions/decisionHistory';
import type { GameState } from '../simulation/simulationTypes';
import type { ActivityEntry } from '../../hooks/useGameState';

interface MissionActivityProps {
  state: GameState;
  activity: ActivityEntry[];
}

const TONE_DOT: Record<ActivityEntry['tone'], string> = {
  info: 'bg-accent-blue',
  good: 'bg-status-ok',
  warn: 'bg-status-warn',
  bad: 'bg-status-critical',
};

export function MissionActivity({ state, activity }: MissionActivityProps): ReactElement {
  const decisions = recentDecisions(state, 6);
  const pending = upcomingEffects(state);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Recent decisions */}
      <section className="panel p-4">
        <SectionHeader title="Recent Decisions" icon={History} />
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-400">No decisions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {decisions.map((d, index) => (
              <li key={`${d.id}-${index}`} className="rounded-md border border-space-600 bg-space-700/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">{d.actionLabel}</span>
                  <span className="tnum text-xs text-slate-400">Sol {d.day}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{d.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending delayed effects */}
      <section className="panel p-4">
        <SectionHeader title="Pending Effects" icon={Clock} subtitle="Delayed consequences" />
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">No pending delayed effects.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((eff) => (
              <li key={eff.id} className="rounded-md border border-space-600 bg-space-700/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-mars-orange">
                    {eff.type}
                  </span>
                  <span className="tnum text-xs text-slate-400">
                    Sol {eff.scheduledDay} (in {Math.max(0, eff.scheduledDay - state.day)})
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-300">{eff.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activity feed */}
      <section className="panel p-4">
        <SectionHeader title="Activity Feed" icon={Radio} />
        {activity.length === 0 ? (
          <p className="text-sm text-slate-400">Mission log is quiet.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[entry.tone]}`} aria-hidden />
                <div>
                  <p className="text-xs text-slate-300">{entry.message}</p>
                  <span className="tnum text-[10px] uppercase tracking-wide text-slate-500">
                    Sol {entry.day}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
