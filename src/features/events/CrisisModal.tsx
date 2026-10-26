/**
 * CrisisModal.tsx
 * ---------------
 * Dramatic, full-screen modal for presenting critical events and choices.
 * Creates urgency and impact for major decision moments.
 */

import React, { useEffect, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { GameEvent } from './eventTypes';
import type { PlayerChoice } from '../decisions/decisionTypes';
import { EventDescription } from './EventDescription';

interface CrisisModalProps {
  event: GameEvent;
  onChoose: (actionId: string, choice: PlayerChoice) => void;
  onDismiss?: () => void;
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

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  const handleAction = (actionId: string) => {
    onChoose(actionId, 'self-directed');
  };

  // Lock body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Render outside the animated app layout so its transform cannot trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 backdrop-blur-sm bg-black/60 animate-fadeIn overflow-y-auto">
      {/* Crisis Container - Fits within viewport with scroll */}
      <div
        className={`
          relative w-full max-w-5xl
          ${style.bg} ${style.border} border-2 rounded-lg
          shadow-2xl ${style.glow}
          ${style.pulse ? 'animate-pulse-slow' : ''}
          overflow-visible mb-6
        `}
      >
        {/* Scrollable content wrapper - wider padding for tooltip space */}
        <div className="overflow-y-auto overflow-x-visible max-h-[70vh]">
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

          {/* Action Choices */}
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

          {/* Footer hint */}
          {event.severity === 'critical' && (
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
