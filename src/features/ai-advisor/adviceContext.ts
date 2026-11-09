/**
 * adviceContext.ts
 * ----------------
 * The compact, serialisable summary of the game that is sent to an optional
 * remote AI advisor: current state, recent events/decisions, and the actions
 * the player can actually choose. Contains no personal data and no secrets.
 */

import { FREE_ACTIONS } from '../events/eventCatalog';
import { unavailableReason } from '../simulation/actionValidation';
import type { AdvisorContext } from './advisorTypes';

export interface AdviceInput {
  day: number;
  missionStatus: string;
  resources: Record<string, number>;
  crew: Record<string, number>;
  systems: Record<string, number>;
  /** The event being decided, if any. */
  event: { id: string; title: string; severity: string; description: string } | null;
  /** Actions the player may choose right now. */
  availableActions: Array<{ id: string; label: string; description: string }>;
  /** Last few decisions and what the player did with the advice. */
  recentDecisions: Array<{ day: number; action: string; playerChoice: string }>;
  /** Effects already scheduled for the coming sols. */
  upcomingEffects: Array<{ inDays: number; description: string }>;
}

const RECENT_LIMIT = 5;
const UPCOMING_LIMIT = 5;

export function adviceInputFor(context: AdvisorContext): AdviceInput {
  const { state, eventId } = context;
  const event = eventId ? state.activeEvents.find((e) => e.id === eventId) : undefined;
  const actions = event ? event.availableActions : FREE_ACTIONS.filter((a) => unavailableReason(state, a) === null);

  return {
    day: state.day,
    missionStatus: state.mission.status,
    resources: { ...state.resources },
    crew: { ...state.crew },
    systems: { ...state.systems },
    event: event
      ? { id: event.id, title: event.title, severity: event.severity, description: event.description }
      : null,
    availableActions: actions.map((a) => ({ id: a.id, label: a.label, description: a.description })),
    recentDecisions: state.history.slice(-RECENT_LIMIT).map((d) => ({
      day: d.day,
      action: d.actionLabel,
      playerChoice: d.playerChoice,
    })),
    upcomingEffects: [...state.pendingEffects]
      .sort((a, b) => a.scheduledDay - b.scheduledDay)
      .slice(0, UPCOMING_LIMIT)
      .map((e) => ({ inDays: Math.max(0, e.scheduledDay - state.day), description: e.description })),
  };
}
