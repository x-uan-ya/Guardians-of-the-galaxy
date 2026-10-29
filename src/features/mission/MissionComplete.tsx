/**
 * MissionComplete.tsx
 * -------------------
 * The MISSION_COMPLETE phase overlay: shown when the character survives to
 * extraction (day 30). Celebrates the win, shows a short summary, and routes to
 * the Debrief or a new run. Pure presentational.
 */

import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { ReactElement } from 'react';
import { ClipboardList, Rocket } from 'lucide-react';
import { getOccupation } from './occupations';
import type { GameState } from '../simulation/simulationTypes';

interface MissionCompleteProps {
  state: GameState;
  onViewDebrief: () => void;
  onNewRun: () => void;
}

export function MissionComplete({
  state,
  onViewDebrief,
  onNewRun,
}: MissionCompleteProps): ReactElement {
  const occupation = getOccupation(state.character.occupation);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debriefButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    debriefButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;

    const buttons = dialogRef.current.querySelectorAll<HTMLButtonElement>(
      'button:not([disabled])',
    );
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];
    if (!firstButton || !lastButton) return;

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-xl border border-status-ok/50 bg-space-900/95 p-4 text-center shadow-2xl shadow-status-ok/20 animate-fade-in-up sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="relative">
          <div className="mx-auto mb-4 aspect-[4/1] w-full max-w-[360px] overflow-hidden rounded-lg border border-status-ok/40 sm:mb-5 sm:max-w-[480px]">
            <img
              src="/endings/mission-success.png"
              alt="Astronaut looking out from a habitat over a sunlit landscape."
              className="h-full w-full object-cover"
            />
          </div>

          <h2 id={titleId} className="font-mono text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            MISSION COMPLETED
          </h2>
          <p id={messageId} className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            You made it through all 30 Sols. Review how your decisions helped the mission succeed.
          </p>
          <p className="mt-2 text-sm text-status-ok">
            Take pride in what you accomplished and what you learned along the way.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-left sm:mt-5 sm:gap-3">
            <Stat label="Occupation" value={occupation.label} />
            <Stat label="Sols Survived" value={String(state.day)} />
            <Stat label="Final Score" value={String(Math.round(state.mission.score))} />
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 sm:mt-6 sm:flex-row sm:justify-center">
            <button
              ref={debriefButtonRef}
              type="button"
              className="btn-primary min-h-11 w-full max-w-[272px] justify-center bg-status-ok text-space-950 hover:bg-status-ok/90 sm:w-auto"
              onClick={onViewDebrief}
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              View Debrief
            </button>
            <button
              type="button"
              className="btn-secondary min-h-11 w-full max-w-[272px] justify-center sm:w-auto"
              onClick={onNewRun}
            >
              <Rocket className="h-4 w-4" aria-hidden />
              New Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-md border border-space-600 bg-space-700/40 p-3">
      <div className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-slate-100 sm:text-sm">{value}</div>
    </div>
  );
}
