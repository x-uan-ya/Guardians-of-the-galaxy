/**
 * ProgressBar.tsx
 * ---------------
 * A presentational 0..100 progress bar colour-coded by status level. Pure UI —
 * it receives a value + level and renders; it computes no game logic.
 */

import type { ReactElement } from 'react';
import type { StatusLevel } from '../../features/simulation/simulationTypes';

interface ProgressBarProps {
  /** Value on the 0..100 scale. */
  value: number;
  level: StatusLevel;
  /** Optional accessible label. */
  label?: string;
}

const LEVEL_BAR: Record<StatusLevel, string> = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  critical: 'bg-status-critical',
};

export function ProgressBar({ value, level, label }: ProgressBarProps): ReactElement {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-space-600"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${LEVEL_BAR[level]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
