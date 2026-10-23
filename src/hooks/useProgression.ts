/**
 * useProgression.ts
 * -----------------
 * Keeps XP, rank, mood and badges in sync with the live game. It observes
 * GameState (read-only) and never changes the simulation.
 */

import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '../features/simulation/simulationTypes';
import { loadAchievements, type AchievementStore } from '../features/achievements/achievementService';
import {
  createRun,
  markEventsSeen,
  reconcile,
  silenceRun,
  type ProgressionState,
} from '../features/progression/progressionEngine';
import { loadRun, saveRun } from '../features/progression/progressionStorage';

/** Load (or create) the run for this game, silently crediting past progress. */
function resolveRun(state: GameState, achievements: AchievementStore): ProgressionState {
  const stored = loadRun(state.gameId);
  if (stored) return { achievements, run: stored };

  const seeded = reconcile({ achievements, run: createRun(state) }, state);
  // Anything credited retroactively should not pop up as a fresh notification.
  return { achievements: seeded.achievements, run: silenceRun(seeded.run) };
}

export interface UseProgression {
  progression: ProgressionState;
  /** Mark notifications as seen. */
  dismissNotifications: () => void;
}

export function useProgression(state: GameState): UseProgression {
  const [progression, setProgression] = useState<ProgressionState>(() =>
    resolveRun(state, loadAchievements())
  );

  // Keep progression in sync with the game as it changes.
  useEffect(() => {
    setProgression((prev) => {
      const base = prev.run.gameId === state.gameId ? prev : resolveRun(state, prev.achievements);
      return reconcile(base, state);
    });
    // Only the fields that can change progression are tracked on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.gameId,
    state.day,
    state.history.length,
    state.mission.status,
    state.crew.morale,
    state.crew.health,
    state.crew.radiationExposure,
  ]);

  // Persist the run whenever it changes.
  useEffect(() => {
    saveRun(progression.run);
  }, [progression.run]);

  const dismissNotifications = useCallback(
    () => setProgression((prev) => markEventsSeen(prev)),
    []
  );

  return { progression, dismissNotifications };
}
