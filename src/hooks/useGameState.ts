/**
 * useGameState.ts
 * ---------------
 * The single React entry point to the simulation. Components NEVER call the
 * engine directly or mutate state; they use this hook. It:
 *  - holds the authoritative GameState in React state,
 *  - restores a saved game on mount (with safe fallback),
 *  - exposes intent-level actions (advance day, decide, resolve event,
 *    new mission, reset, save),
 *  - maintains an in-memory activity feed for the UI,
 *  - routes every state change through the engine so invariants hold.
 *
 * All engine calls return NEW state; we just hand that to setState.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  advanceSimulationDay,
  applyPlayerDecision,
  createInitialGameState,
  getSimulationSummary,
  InvalidDecisionError,
  withTimestamp,
} from '../features/simulation/simulationEngine';
import type { GameState } from '../features/simulation/simulationTypes';
import type { DecisionInput, PlayerChoice } from '../features/decisions/decisionTypes';
import type { MissionConfig } from '../features/mission/missionTypes';
import { clearGame, isStorageAvailable, loadGame, saveGame } from '../lib/storage';

/** A single human-readable entry in the mission activity feed. */
export interface ActivityEntry {
  id: string;
  day: number;
  message: string;
  tone: 'info' | 'good' | 'bad' | 'warn';
  timestamp: number;
}

/** Status of the last persistence interaction, surfaced to the UI. */
export type PersistenceNotice =
  | { kind: 'idle' }
  | { kind: 'restored' }
  | { kind: 'restore-failed'; reason: string }
  | { kind: 'saved' }
  | { kind: 'save-failed'; reason: string }
  | { kind: 'unavailable' };

/**
 * The default mission used so the app always boots with a valid state (e.g.
 * before the player has picked an occupation). The occupation picker lets the
 * player choose a real one for an actual run.
 */
export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  occupation: 'engineer',
  objective: 'survival',
  operatingPhilosophy: 'balanced',
  startingCondition: 'standard',
};

export interface UseGameState {
  state: GameState;
  activity: ActivityEntry[];
  storageAvailable: boolean;
  notice: PersistenceNotice;
  /** Advance the simulation one day through the engine. */
  advanceDay: () => void;
  /** Apply a validated player decision; surfaces errors via the activity feed. */
  decide: (input: DecisionInput) => void;
  /** Resolve an active event by action id. */
  resolveActiveEvent: (eventId: string, actionId: string, choice?: PlayerChoice) => void;
  /** Start a brand-new mission from config (discards current in-memory game). */
  startNewMission: (config: MissionConfig) => void;
  /** Persist the current game to localStorage. */
  save: () => void;
  /** Clear the saved game AND reset to a fresh default mission. */
  reset: () => void;
  /** Clear the transient persistence notice. */
  dismissNotice: () => void;
}

let activityCounter = 0;
function makeActivity(
  day: number,
  message: string,
  tone: ActivityEntry['tone'],
  timestamp: number
): ActivityEntry {
  activityCounter += 1;
  return { id: `act_${timestamp}_${activityCounter}`, day, message, tone, timestamp };
}

export function useGameState(): UseGameState {
  const storageAvailable = useMemo(() => isStorageAvailable(), []);

  // Lazy initial state: try to restore, otherwise start the default mission.
  const [state, setState] = useState<GameState>(() => createInitialGameState(DEFAULT_MISSION_CONFIG));
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [notice, setNotice] = useState<PersistenceNotice>({ kind: 'idle' });

  const pushActivity = useCallback(
    (day: number, message: string, tone: ActivityEntry['tone']) => {
      setActivity((prev) => [makeActivity(day, message, tone, Date.now()), ...prev].slice(0, 40));
    },
    []
  );

  // Restore once on mount.
  useEffect(() => {
    const result = loadGame();
    switch (result.status) {
      case 'loaded':
        setState(result.state);
        setNotice({ kind: 'restored' });
        pushActivity(result.state.day, 'Saved mission restored from local storage.', 'info');
        break;
      case 'corrupted':
        // Do NOT discard the corrupt save automatically; just fall back to a
        // fresh default mission in memory and tell the player.
        setNotice({ kind: 'restore-failed', reason: result.reason });
        pushActivity(1, `Could not restore save: ${result.reason} Starting a fresh mission.`, 'warn');
        break;
      case 'unavailable':
        setNotice({ kind: 'unavailable' });
        pushActivity(1, 'Local storage is unavailable. Progress will not be saved.', 'warn');
        break;
      case 'empty':
      default:
        // Keep the default mission already in state.
        break;
    }
    // Run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceDay = useCallback(() => {
    setState((prev) => {
      if (prev.mission.status === 'failed' || prev.mission.status === 'completed') {
        pushActivity(prev.day, `Mission is ${prev.mission.status}. Start a new mission to continue.`, 'warn');
        return prev;
      }
      const stamped = withTimestamp(prev, Date.now());
      const { state: next, firedEffects, dailyDelta } = advanceSimulationDay(stamped);

      const deltaSummary = Object.entries(dailyDelta)
        .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
        .join(', ');
      pushActivity(next.day, `Advanced to day ${next.day}. Net daily change: ${deltaSummary || 'none'}.`, 'info');

      for (const effect of firedEffects) {
        pushActivity(next.day, `Delayed effect: ${effect.description}`, 'warn');
      }

      // Announce new events
      if (next.activeEvents.length > prev.activeEvents.length) {
        const newEvent = next.activeEvents[next.activeEvents.length - 1];
        if (newEvent) {
          pushActivity(next.day, `🚨 EVENT: ${newEvent.title}`, 'bad');
        }
      }

      if (next.mission.status !== prev.mission.status) {
        const tone = next.mission.status === 'failed' ? 'bad' : next.mission.status === 'completed' ? 'good' : 'warn';
        pushActivity(next.day, `Mission status is now ${next.mission.status.toUpperCase()}.`, tone);
      }
      return next;
    });
  }, [pushActivity]);

  const decide = useCallback(
    (input: DecisionInput) => {
      setState((prev) => {
        try {
          const stamped = withTimestamp(prev, Date.now());
          const next = applyPlayerDecision(stamped, input);
          const last = next.history[next.history.length - 1];
          pushActivity(next.day, `Decision: ${last?.actionLabel ?? input.actionId}.`, 'good');
          if (next.mission.status !== prev.mission.status) {
            pushActivity(next.day, `Mission status is now ${next.mission.status.toUpperCase()}.`, 'warn');
          }
          return next;
        } catch (err) {
          const message = err instanceof InvalidDecisionError ? err.message : 'Decision rejected.';
          pushActivity(prev.day, message, 'bad');
          return prev; // reject invalid decision, state unchanged
        }
      });
    },
    [pushActivity]
  );

  const resolveActiveEvent = useCallback(
    (eventId: string, actionId: string, choice: PlayerChoice = 'self-directed') => {
      decide({ eventId, actionId, playerChoice: choice });
    },
    [decide]
  );

  const startNewMission = useCallback(
    (config: MissionConfig) => {
      const fresh = createInitialGameState({ ...config, now: Date.now() });
      setState(fresh);
      setActivity([]);
      pushActivity(fresh.day, `New ${config.objective} mission initialised (${config.operatingPhilosophy}).`, 'info');
      // Persist the fresh mission so a reload restores it.
      const result = saveGame(fresh);
      setNotice(result.status === 'saved' ? { kind: 'saved' } : { kind: 'unavailable' });
    },
    [pushActivity]
  );

  const save = useCallback(() => {
    setState((prev) => {
      const stamped = withTimestamp(prev, Date.now());
      const result = saveGame(stamped);
      switch (result.status) {
        case 'saved':
          setNotice({ kind: 'saved' });
          pushActivity(stamped.day, 'Mission saved.', 'good');
          break;
        case 'rejected-invalid':
          setNotice({ kind: 'save-failed', reason: result.errors[0] ?? 'Invalid state.' });
          pushActivity(stamped.day, 'Save refused: current state is invalid.', 'bad');
          break;
        case 'unavailable':
          setNotice({ kind: 'unavailable' });
          pushActivity(stamped.day, 'Save failed: local storage unavailable.', 'warn');
          break;
      }
      return stamped;
    });
  }, [pushActivity]);

  const reset = useCallback(() => {
    clearGame();
    const fresh = createInitialGameState({ ...DEFAULT_MISSION_CONFIG, now: Date.now() });
    setState(fresh);
    setActivity([]);
    setNotice({ kind: 'idle' });
    pushActivity(fresh.day, 'Mission reset. Saved game cleared.', 'info');
  }, [pushActivity]);

  const dismissNotice = useCallback(() => setNotice({ kind: 'idle' }), []);

  // Expose a compact summary for debugging in dev tools.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__marsSummary = getSimulationSummary(state);
    }
  }, [state]);

  return {
    state,
    activity,
    storageAvailable,
    notice,
    advanceDay,
    decide,
    resolveActiveEvent,
    startNewMission,
    save,
    reset,
    dismissNotice,
  };
}
