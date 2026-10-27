/**
 * CrisisModal.tsx
 * ---------------
 * Dramatic, full-screen modal for presenting critical events and choices.
 * Creates urgency and impact for major decision moments.
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { EventAction, GameEvent } from './eventTypes';
import type { PlayerChoice } from '../decisions/decisionTypes';
import { EventDescription } from './EventDescription';

interface CrisisModalProps {
  event: GameEvent;
  onChoose: (actionId: string, choice: PlayerChoice) => void;
  onDismiss?: () => void;
}

/** Human labels for the metrics an event can touch (for the "at stake" row). */
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

/** Collect every metric key any of the event's actions can affect. */
function affectedMetrics(event: GameEvent): string[] {
  const keys = new Set<string>();
  for (const action of event.availableActions) {
    const e = action.effect;
    Object.keys(e.immediateResources ?? {}).forEach((k) => keys.add(k));
    Object.keys(e.immediateCrew ?? {}).forEach((k) => keys.add(k));
    Object.keys(e.immediateSystems ?? {}).forEach((k) => keys.add(k));
  }
  return [...keys];
}

/** Flatten one action's immediate effects into labelled signed deltas. */
function immediateConsequences(action: EventAction): { label: string; value: number }[] {
  const e = action.effect;
  const out: { label: string; value: number }[] = [];
  const push = (obj: Record<string, number> | undefined): void => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
      out.push({ label: METRIC_LABELS[k] ?? k, value: v });
    }
  };
  push(e.immediateResources as Record<string, number> | undefined);
  push(e.immediateCrew as Record<string, number> | undefined);
  push(e.immediateSystems as Record<string, number> | undefined);
  return out;
}

/** Map severity to visual styling */
const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-950/95',
    border: 'border-red-500',
    glow: 'shadow-red-500/50',
    icon: '🚨',
    label: 'CRITICAL EVENT',
    labelColor: 'text-red-400',
    pulse: true,
  },
  major: {
    bg: 'bg-orange-950/95',
    border: 'border-orange-500',
    glow: 'shadow-orange-500/50',
    icon: '⚠️',
    label: 'MAJOR EVENT',
    labelColor: 'text-orange-400',
    pulse: false,
  },
  minor: {
    bg: 'bg-yellow-950/95',
    border: 'border-yellow-600',
    glow: 'shadow-yellow-600/50',
    icon: '📍',
    label: 'EVENT',
    labelColor: 'text-yellow-400',
    pulse: false,
  },
  info: {
    bg: 'bg-blue-950/95',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/50',
    icon: 'ℹ️',
    label: 'NOTIFICATION',
    labelColor: 'text-blue-400',
    pulse: false,
  },
};

export function CrisisModal({ event, onChoose, onDismiss }: CrisisModalProps): ReactElement {
  const style = SEVERITY_STYLES[event.severity];

  // Two-phase flow: pick an action, then review a short consequence summary
  // before it is committed to the simulation. `chosen` holds the pending action.
  const [chosen, setChosen] = useState<EventAction | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);

  const stakes = useMemo(() => affectedMetrics(event), [event]);

  // A queued event can reuse this component after the prior event is resolved.
  useEffect(() => {
    setChosen(null);
    setConfirmed(false);
    confirmedRef.current = false;
  }, [event.id]);

  // Lock body scroll when modal is open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Phase 1: player selects an action → show its consequence summary.
  const handleAction = (actionId: string): void => {
    const action = event.availableActions.find((a) => a.id === actionId);
    setChosen(action ?? null);
  };

  // Phase 2: confirm → commit the decision to the engine.
  const confirmChoice = (): void => {
    if (!chosen || confirmedRef.current) return;
    confirmedRef.current = true;
    setConfirmed(true);
    onChoose(chosen.id, 'self-directed');
  };

  // Render outside the animated app layout so its transform cannot trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div
        className={`
          relative w-full max-w-3xl max-h-[calc(100dvh-2rem)]
          ${style.bg} ${style.border} border-2 rounded-lg
          shadow-2xl ${style.glow}
          ${style.pulse ? 'animate-pulse-slow' : ''}
          overflow-hidden
        `}
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className={`sticky top-0 z-10 ${style.bg} border-b border-current/20 px-8 py-4 overflow-visible`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 overflow-visible">
                <div className={`text-xs font-mono tracking-wider ${style.labelColor} mb-1`}>
                  {style.icon} {style.label}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                  {event.title}
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  <EventDescription eventId={event.id} description={event.description} />
                </p>
                {/* What is at stake: the systems/resources this crisis can touch. */}
                {stakes.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                      Affected:
                    </span>
                    {stakes.map((key) => (
                      <span
                        key={key}
                        className="rounded border border-current/30 bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-gray-300"
                      >
                        {METRIC_LABELS[key] ?? key}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {onDismiss && event.severity !== 'critical' && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Phase 2: consequence summary after a choice, before committing. */}
          {chosen ? (
            <div className="px-8 py-5 pb-6 space-y-4">
              <div className="rounded-lg border-2 border-gray-700 bg-gray-900/50 p-4">
                <div className="mb-1 text-sm font-semibold text-emerald-400">
                  Review your decision.
                </div>
                <div className="mb-3 text-sm font-bold text-white">{chosen.label}</div>
                {(() => {
                  const consequences = immediateConsequences(chosen);
                  const delayedCount = chosen.effect.delayed?.length ?? 0;
                  return (
                    <div className="space-y-1.5 font-mono text-xs">
                      {consequences.length === 0 && delayedCount === 0 ? (
                        <div className="text-gray-400">No immediate change this Sol.</div>
                      ) : (
                        consequences.map((c, i) => (
                          <div key={`${c.label}-${i}`} className="flex justify-between gap-4">
                            <span className="text-gray-400">{c.label}</span>
                            <span className={c.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {c.value >= 0 ? '+' : ''}
                              {c.value}
                            </span>
                          </div>
                        ))
                      )}
                      {delayedCount > 0 && (
                        <div className="pt-1 text-yellow-400">
                          ⏱ {delayedCount} delayed consequence{delayedCount === 1 ? '' : 's'} scheduled.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setChosen(null)}
                  className="text-xs text-gray-400 transition-colors hover:text-white"
                >
                  ← Reconsider
                </button>
                <button
                  onClick={confirmChoice}
                  disabled={confirmed}
                  className="rounded-lg border-2 border-emerald-600 bg-emerald-900/40 px-5 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-800/60"
                >
                  Confirm choice →
                </button>
              </div>
            </div>
          ) : (
          /* Phase 1: action choices. */
          <div className="px-8 py-4 pb-6 space-y-3 overflow-visible">
            <div className="text-sm font-semibold text-gray-400 tracking-wide mb-3">
              CHOOSE YOUR RESPONSE:
            </div>
            
            {event.availableActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`
                  w-full text-left p-3 rounded-lg
                  bg-gray-900/50 border-2 border-gray-700
                  hover:border-white hover:bg-gray-800/70
                  transition-all duration-200
                  group
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-base font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                      {action.label}
                    </div>
                    <div className="text-gray-300 text-xs leading-relaxed mb-1.5">
                      {action.description}
                    </div>
                    
                    {/* Show effect preview if available */}
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      {action.effect.immediateResources && (
                        <div className="flex gap-2">
                          {Object.entries(action.effect.immediateResources).map(([key, value]) => (
                            <span
                              key={key}
                              className={value >= 0 ? 'text-green-400' : 'text-red-400'}
                            >
                              {key}: {value >= 0 ? '+' : ''}{value}
                            </span>
                          ))}
                        </div>
                      )}
                      {action.effect.immediateCrew && (
                        <div className="flex gap-2">
                          {Object.entries(action.effect.immediateCrew).map(([key, value]) => (
                            <span
                              key={key}
                              className={value >= 0 ? 'text-green-400' : 'text-red-400'}
                            >
                              {key}: {value >= 0 ? '+' : ''}{value}
                            </span>
                          ))}
                        </div>
                      )}
                      {action.effect.immediateSystems && (
                        <div className="flex gap-2">
                          {Object.entries(action.effect.immediateSystems).map(([key, value]) => (
                            <span
                              key={key}
                              className={value >= 0 ? 'text-green-400' : 'text-red-400'}
                            >
                              {key}: {value >= 0 ? '+' : ''}{value}
                            </span>
                          ))}
                        </div>
                      )}
                      {action.effect.delayed && action.effect.delayed.length > 0 && (
                        <span className="text-yellow-400">
                          ⏱ {action.effect.delayed.length} delayed effect(s)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xl opacity-50 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
          )}

          {/* Footer hint */}
          {event.severity === 'critical' && !chosen && (
            <div className={`sticky bottom-0 ${style.bg} border-t border-current/20 px-8 py-3 text-center`}>
              <p className="text-xs text-gray-500 font-mono">
                CRITICAL: You must choose before advancing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
