/**
 * GameOver.tsx
 * ------------
 * A full-screen overlay shown when the player's character dies / the run fails.
 * It explains the cause, shows a short run summary, and offers two paths:
 *   - New Run:   go to occupation selection to pick a (possibly different) role.
 *   - Restart:   immediately start a fresh run with the SAME occupation.
 *
 * Pure presentational: it reads the final state and calls the handlers it is
 * given. It does not mutate state or run the engine.
 */

import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { ReactElement } from 'react';
import { ClipboardList, RotateCcw, Rocket } from 'lucide-react';
import { getGameOverReason } from '../simulation/simulationEngine';
import { getOccupation } from './occupations';
import type { GameState } from '../simulation/simulationTypes';

interface GameOverProps {
  state: GameState;
  /** Start a fresh run with the same occupation. */
  onRestartSame: () => void;
  /** Go to occupation selection for a new run. */
  onNewRun: () => void;
  /** View the debrief for this run. */
  onViewDebrief: () => void;
}

const REASON_TEXT: Record<ReturnType<typeof getGameOverReason>, string> = {
  'character-died': 'Your character succumbed to their injuries. Health reached zero.',
  'oxygen-depleted': 'The outpost ran out of breathable oxygen.',
  'radiation-lethal': 'Your character absorbed a lethal dose of radiation.',
  unknown: 'The mission failed.',
};

export function GameOver({
  state,
  onRestartSame,
  onNewRun,
  onViewDebrief,
}: GameOverProps): ReactElement {
  const reason = getGameOverReason(state);
  const occupation = getOccupation(state.character.occupation);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const reflectionId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    restartButtonRef.current?.focus();

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
      aria-describedby={`${reasonId} ${reflectionId}`}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="panel relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain border-status-critical/35 p-4 text-center shadow-2xl shadow-status-critical/20 animate-fade-in-up hover:border-status-critical/50 sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="relative">
          <div className="mx-auto mb-4 aspect-[4/1] w-full max-w-[360px] overflow-hidden rounded-lg border border-status-critical/50 sm:mb-5 sm:max-w-[480px]">
            <img
              src="/endings/mission-failure.png"
              alt="Astronaut inside a damaged habitat beneath a planet-filled sky."
              className="h-full w-full object-cover"
            />
          </div>

          <h2 id={titleId} className="font-mono text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            MISSION FAILED
          </h2>
          <p id={reasonId} className="mt-2 text-sm text-slate-300">
            {REASON_TEXT[reason]}
          </p>
          <p id={reflectionId} className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-status-critical">
            Every mission teaches you something. Review your decisions, adjust your plan, and try again.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-left sm:mt-5 sm:gap-3">
            <Stat label="Occupation" value={occupation.label} />
            <Stat label="Final Sol Reached" value={String(state.day)} />
            <Stat label="Final Score" value={String(Math.round(state.mission.score))} />
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              ref={restartButtonRef}
              type="button"
              className="btn-primary min-h-11 w-full max-w-[272px] justify-center bg-status-critical text-white hover:bg-status-critical/90 sm:w-auto"
              onClick={onRestartSame}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Retry Mission
            </button>
            <button
              type="button"
              className="btn-secondary min-h-11 w-full max-w-[272px] justify-center sm:w-auto"
              onClick={onNewRun}
            >
              <Rocket className="h-4 w-4" aria-hidden />
              Choose Occupation
            </button>
            <button
              type="button"
              onClick={onViewDebrief}
              className="btn-secondary min-h-11 w-full max-w-[272px] justify-center sm:w-auto"
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              View Debrief
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
