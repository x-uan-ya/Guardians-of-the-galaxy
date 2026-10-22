/**
 * CrisisModal.tsx
 * ---------------
 * Dramatic, full-screen modal for presenting critical events and choices.
 * Creates urgency and impact for major decision moments.
 */

import type { ReactElement } from 'react';
import type { GameEvent } from './eventTypes';
import type { PlayerChoice } from '../decisions/decisionTypes';

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
  
  const handleAction = (actionId: string) => {
    onChoose(actionId, 'self-directed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-fadeIn">
      {/* Crisis Container */}
      <div
        className={`
          relative w-full max-w-4xl max-h-[90vh] overflow-y-auto
          ${style.bg} ${style.border} border-2 rounded-lg
          shadow-2xl ${style.glow}
          ${style.pulse ? 'animate-pulse-slow' : ''}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-inherit border-b border-current/20 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className={`text-xs font-mono tracking-wider ${style.labelColor} mb-2`}>
                {style.icon} {style.label}
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                {event.title}
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                {event.description}
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
        <div className="p-6 space-y-4">
          <div className="text-sm font-semibold text-gray-400 tracking-wide mb-4">
            CHOOSE YOUR RESPONSE:
          </div>
          
          {event.availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`
                w-full text-left p-5 rounded-lg
                bg-gray-900/50 border-2 border-gray-700
                hover:border-white hover:bg-gray-800/70
                transition-all duration-200
                group
              `}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {action.label}
                  </div>
                  <div className="text-gray-300 text-sm leading-relaxed mb-3">
                    {action.description}
                  </div>
                  
                  {/* Show effect preview if available */}
                  <div className="flex flex-wrap gap-3 text-xs font-mono">
                    {action.effect.immediateResources && (
                      <div className="space-x-2">
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
                      <div className="space-x-2">
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
                      <div className="space-x-2">
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
                
                <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {event.severity === 'critical' && (
          <div className="sticky bottom-0 bg-inherit border-t border-current/20 p-4 text-center">
            <p className="text-xs text-gray-500 font-mono">
              CRITICAL: You must choose before advancing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
