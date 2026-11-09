/**
 * CrisisModal.tsx
 * ---------------
 * Reviews a selected event response before the game applies its effects.
 * The parent owns the pending choice; this component only presents it and
 * reports whether the player confirms or reconsiders.
 */

import { useEffect, useRef, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { EventAction, GameEvent } from './eventTypes';

interface CrisisModalProps {
  event: GameEvent;
  action: EventAction;
  onConfirm: () => void;
  onReconsider: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  power: 'Power',
  water: 'Water',
  food: 'Food',
  oxygen: 'Oxygen',
  health: 'Health',
  morale: 'Morale',
  radiationExposure: 'Radiation',
  powerGeneration: 'Power Generation',
  lifeSupportEfficiency: 'Life Support',
  foodProduction: 'Food Production',
  shieldingIntegrity: 'Shielding',
};

function immediateConsequences(action: EventAction): { label: string; value: number }[] {
  const changes = [
    action.effect.immediateResources,
    action.effect.immediateCrew,
    action.effect.immediateSystems,
  ];
  return changes.flatMap((group) =>
    Object.entries(group ?? {}).map(([key, value]) => ({
      label: METRIC_LABELS[key] ?? key,
      value,
    })),
  );
}

export function CrisisModal({
  event,
  action,
  onConfirm,
  onReconsider,
}: CrisisModalProps): ReactElement {
  const confirmedRef = useRef(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    confirmButtonRef.current?.focus();
    const handleKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === 'Escape') onReconsider();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onReconsider]);

  const confirmChoice = (): void => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  };

  const consequences = immediateConsequences(action);
  const delayedCount = action.effect.delayed?.length ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-review-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-orange-500 bg-orange-950/95 shadow-2xl shadow-orange-500/30"
      >
        <div className="border-b border-orange-400/20 px-5 py-4 sm:px-7">
          <div className="mb-1 font-mono text-xs tracking-wider text-orange-300">
            RESPONSE REVIEW · {event.title}
          </div>
          <h2 id="event-review-title" className="text-xl font-bold leading-tight text-white">
            Review your decision
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
            <h3 className="mb-1 text-base font-bold text-white">{action.label}</h3>
            <p className="text-sm leading-relaxed text-gray-300">{action.description}</p>
          </div>

          <section aria-label="Immediate effects">
            <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
              Immediate effects
            </h3>
            {consequences.length > 0 ? (
              <ul className="space-y-1.5 font-mono text-sm">
                {consequences.map(({ label, value }) => (
                  <li key={label} className="flex justify-between gap-4">
                    <span className="text-gray-300">{label}</span>
                    <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {value >= 0 ? '+' : ''}{value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No immediate changes this Sol.</p>
            )}
          </section>

          {delayedCount > 0 ? (
            <p className="rounded-md border border-yellow-500/30 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-300">
              {delayedCount} delayed consequence{delayedCount === 1 ? '' : 's'} will be scheduled.
              Details are withheld until they are relevant.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-orange-400/20 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onReconsider}
            className="btn-secondary min-h-10 min-w-32 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-950 sm:flex-none"
          >
            Reconsider
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={confirmChoice}
            className="min-h-10 min-w-36 flex-1 rounded-lg border-2 border-emerald-600 bg-emerald-900/40 px-5 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-950 sm:flex-none"
          >
            Confirm choice
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
