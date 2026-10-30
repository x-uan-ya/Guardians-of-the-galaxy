/**
 * MissionResultsPanel.tsx
 * ------------------------
 * Displays the mission results: status banner, headline stats, final resource
 * levels, crew condition, and life-support status. Pure presentational —
 * receives pre-computed MissionResults and renders them.
 */

import type { ReactElement } from 'react';
import { Activity, Heart, Shield, Zap } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ProgressBar } from '../../components/ui/ProgressBar';
import type { MissionResults } from './outcomeTypes';
import type { StatusLevel } from '../simulation/simulationTypes';

interface MissionResultsPanelProps {
  results: MissionResults;
}

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  completed: {
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
    text: 'text-status-ok',
    label: 'MISSION COMPLETE',
  },
  failed: {
    bg: 'bg-status-critical/10',
    border: 'border-status-critical/40',
    text: 'text-status-critical',
    label: 'MISSION FAILED',
  },
  active: {
    bg: 'bg-mars-orange/10',
    border: 'border-mars-orange/40',
    text: 'text-mars-orange',
    label: 'MISSION ACTIVE',
  },
  critical: {
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
    text: 'text-status-warn',
    label: 'MISSION CRITICAL',
  },
};

const LEVEL_TEXT: Record<StatusLevel, string> = {
  ok: 'text-status-ok',
  warn: 'text-status-warn',
  critical: 'text-status-critical',
};

export function MissionResultsPanel({ results }: MissionResultsPanelProps): ReactElement {
  const style = STATUS_STYLE[results.status] ?? STATUS_STYLE.active;

  return (
    <section className="panel p-5 space-y-5">
      <SectionHeader title="Mission Results" icon={Activity} />

      {/* Status banner */}
      <div
        className={`rounded-lg border ${style.border} ${style.bg} p-4 text-center`}
        role="status"
        aria-label={`Mission outcome: ${style.label}`}
      >
        <p className={`font-mono text-xl font-bold tracking-tight ${style.text}`}>
          {style.label}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {results.missionTypeLabel} &middot; {results.daysSurvived} sols survived
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sols Survived" value={String(results.daysSurvived)} />
        <StatCard label="Final Score" value={String(Math.round(results.finalScore))} />
        <StatCard label="Decisions Made" value={String(results.totalDecisions)} />
        <StatCard
          label="Character Status"
          value={results.crew.survived ? 'Survived' : 'Lost'}
          tone={results.crew.survived ? 'ok' : 'critical'}
        />
      </div>

      {/* Final resource levels */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Remaining Resources
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {results.resources.map((r) => (
            <div
              key={r.key}
              className="rounded-md border border-space-600 bg-space-700/40 p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {r.label}
                </span>
                <span className={`text-xs font-semibold tnum ${LEVEL_TEXT[r.level]}`}>
                  {Math.round(r.value)}%
                </span>
              </div>
              <ProgressBar value={r.value} level={r.level} label={r.label} />
            </div>
          ))}
        </div>
      </div>

      {/* Crew condition */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Crew Condition
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            icon={Heart}
            label="Health"
            value={results.crew.health}
            level={results.crew.healthLevel}
          />
          <MetricCard
            icon={Zap}
            label="Morale"
            value={results.crew.morale}
            level={results.crew.moraleLevel}
          />
          <MetricCard
            icon={Shield}
            label="Radiation"
            value={results.crew.radiationExposure}
            level={results.crew.radiationLevel}
            inverted
          />
        </div>
      </div>

      {/* Life-support status */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Life-Support Status
        </h3>
        <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-slate-300">Efficiency</span>
            <span className={`text-sm font-semibold tnum ${LEVEL_TEXT[results.lifeSupport.level]}`}>
              {Math.round(results.lifeSupport.efficiency)}%
            </span>
          </div>
          <ProgressBar
            value={results.lifeSupport.efficiency}
            level={results.lifeSupport.level}
            label="Life-support efficiency"
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'critical';
}): ReactElement {
  const valueColor =
    tone === 'ok'
      ? 'text-status-ok'
      : tone === 'critical'
        ? 'text-status-critical'
        : 'text-slate-100';
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  level,
  inverted = false,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
  level: StatusLevel;
  inverted?: boolean;
}): ReactElement {
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${LEVEL_TEXT[level]}`} aria-hidden />
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`ml-auto text-sm font-semibold tnum ${LEVEL_TEXT[level]}`}>
          {Math.round(value)}%
        </span>
      </div>
      <ProgressBar value={value} level={level} label={label} />
      {inverted && value >= 50 ? (
        <p className="mt-1 text-[10px] text-status-warn">Elevated exposure</p>
      ) : null}
    </div>
  );
}
