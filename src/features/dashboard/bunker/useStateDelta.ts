/**
 * useStateDelta.ts
 * ----------------
 * Watches the GameState and remembers "what changed since the last update"
 * (e.g. food +3, morale -3). The UI uses this to show instant feedback after
 * the player acts or a day passes.
 *
 * BEGINNER NOTE: this hook is READ-ONLY. It never changes the game. It just
 * compares the previous state with the new one and stores the difference.
 * The simulation engine remains the only thing that changes resources.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CrewState,
  GameState,
  ResourceKey,
  SystemState,
} from '../../simulation/simulationTypes';

export interface StateDelta {
  /** Increases on every change; use as a React `key` to replay animations. */
  stamp: number;
  fromDay: number;
  toDay: number;
  resources: Partial<Record<ResourceKey, number>>;
  crew: Partial<Record<keyof CrewState, number>>;
  systems: Partial<Record<keyof SystemState, number>>;
}

/** Signed difference per numeric key, rounded to 1 decimal, zeros removed. */
function diff<K extends string>(before: object, after: object): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  const a = before as Record<string, number>;
  const b = after as Record<string, number>;
  for (const key of Object.keys(b)) {
    const from = a[key];
    const to = b[key];
    if (typeof from !== 'number' || typeof to !== 'number') continue;
    const d = Math.round((to - from) * 10) / 10;
    if (d !== 0) out[key as K] = d;
  }
  return out;
}

function isEmpty(o: object): boolean {
  return Object.keys(o).length === 0;
}

export function useStateDelta(state: GameState): StateDelta | null {
  const previous = useRef<GameState | null>(null);
  const counter = useRef(0);
  const [delta, setDelta] = useState<StateDelta | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (!before) return;

    // A brand-new mission (or a restored save) starts with a clean slate.
    if (before.gameId !== state.gameId) {
      setDelta(null);
      return;
    }

    const resources = diff<ResourceKey>(before.resources, state.resources);
    const crew = diff<keyof CrewState>(before.crew, state.crew);
    const systems = diff<keyof SystemState>(before.systems, state.systems);
    if (isEmpty(resources) && isEmpty(crew) && isEmpty(systems)) return;

    counter.current += 1;
    setDelta({
      stamp: counter.current,
      fromDay: before.day,
      toDay: state.day,
      resources,
      crew,
      systems,
    });
  }, [state]);

  return delta;
}
