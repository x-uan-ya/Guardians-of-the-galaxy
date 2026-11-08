/**
 * EmergencyNotice.tsx
 * -------------------
 * A slim, non-blocking reminder shown on pages other than Mission Control
 * (Debrief, Badges, Leaderboard, How to Play) while an emergency is waiting.
 *
 * It does not cover the page, so players can still read, navigate, reset or
 * start a new mission. The emergency itself is answered on Mission Control.
 */

import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { GameEvent } from './eventTypes';

interface EmergencyNoticeProps {
  event: GameEvent;
  /** How many OTHER unresolved events are waiting behind this one. */
  waiting?: number;
  onRespond: () => void;
}

export function EmergencyNotice({ event, waiting = 0, onRespond }: EmergencyNoticeProps): ReactElement {
  const title = event.title.replace(/^[^\w]+/, '');
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-red-500/50 bg-red-950/50 px-3 py-2 text-sm text-red-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-white">Emergency waiting: {title}.</span>{' '}
        <span className="text-red-100/90">
          Answer it on Mission Control before you can end the Sol.
          {waiting > 0 ? ` (${waiting} more waiting)` : ''}
        </span>
      </p>
      <button type="button" className="btn-secondary shrink-0 !py-1 text-xs" onClick={onRespond}>
        Go to Mission Control
      </button>
    </div>
  );
}
