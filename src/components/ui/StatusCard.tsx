/**
 * StatusCard.tsx
 * --------------
 * A single metric tile: icon, label, big value with unit, status dot, and a
 * progress bar. Used for resources, crew, and systems. Pure presentational —
 * the caller passes a pre-computed value + StatusLevel.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import type { StatusLevel } from '../../features/simulation/simulationTypes';
import { ProgressBar } from './ProgressBar';

interface StatusCardProps {
  label: string;
  value: number;
  /** Unit suffix shown after the value (e.g. "%"). */
  unit?: string;
  level: StatusLevel;
  icon?: LucideIcon;
  /** Optional secondary caption (e.g. a daily delta). */
  caption?: string;
  /** Hide the progress bar for metrics where it is not meaningful. */
  showBar?: boolean;
}

const LEVEL_DOT: Record<StatusLevel, string> = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  critical: 'bg-status-critical',
};

const LEVEL_TEXT: Record<StatusLevel, string> = {
  ok: 'text-slate-100',
  warn: 'text-status-warn',
  critical: 'text-status-critical',
};

export function StatusCard({
  label,
  value,
  unit = '%',
  level,
  icon: Icon,
  caption,
  showBar = true,
}: StatusCardProps): ReactElement {
  const rounded = Math.round(value);
  return (
    <div className="panel flex flex-col gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${LEVEL_DOT[level]} ${
            level === 'critical' ? 'animate-pulse-soft' : ''
          }`}
          aria-hidden
        />
      </div>

      <div className="flex items-baseline gap-1">
        {/* Keying on the rounded value replays the flash whenever it changes. */}
        <span
          key={rounded}
          className={`tnum animate-value-flash text-2xl font-semibold ${LEVEL_TEXT[level]}`}
        >
          {rounded}
        </span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>

      {showBar ? <ProgressBar value={value} level={level} label={label} /> : null}
      {caption ? <p className="text-xs text-slate-400">{caption}</p> : null}
    </div>
  );
}
