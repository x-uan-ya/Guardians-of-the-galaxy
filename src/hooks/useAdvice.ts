/**
 * useAdvice.ts
 * ------------
 * React hook that gives a component the advisor's advice for the current state.
 *
 *  - With no AI provider configured (the default) the advice is computed
 *    instantly from the rules, so there is no loading state.
 *  - With a provider, the rule-based advice is shown immediately and replaced
 *    by the provider's answer if it arrives in time. If the provider fails the
 *    advice switches to the Mission Safety Protocol and carries a notice.
 *
 * The hook only reads state. It never makes a decision for the player.
 */

import { useEffect, useMemo, useState } from 'react';
import { buildAdvice } from '../features/ai-advisor/adviceBuilder';
import { getAdvice, resolveProvider, type AdviceProvider } from '../features/ai-advisor/adviceService';
import type { Advice } from '../features/ai-advisor/advisorTypes';
import type { GameState } from '../features/simulation/simulationTypes';

export interface UseAdviceResult {
  advice: Advice | null;
  /** True while waiting for an AI provider (rule-based advice is already usable). */
  loading: boolean;
}

/** Resolved once per page load. */
let cachedProvider: AdviceProvider | null | undefined;
function sessionProvider(): AdviceProvider | null {
  if (cachedProvider === undefined) cachedProvider = resolveProvider();
  return cachedProvider;
}

/** Test helper: forget the cached provider so resolveProvider runs again. */
export function resetAdviceProviderCache(): void {
  cachedProvider = undefined;
}

export function useAdvice(
  gameState: GameState | undefined,
  eventId?: string,
  options: { enabled?: boolean; provider?: AdviceProvider | null } = {}
): UseAdviceResult {
  // With no game state there is nothing to advise on.
  const enabled = (options.enabled ?? true) && gameState !== undefined;
  const state = gameState as GameState;
  const provider = options.provider !== undefined ? options.provider : sessionProvider();

  // Instant, deterministic advice. Never throws: bad data just means no advice.
  const local = useMemo<Advice | null>(() => {
    if (!enabled) return null;
    try {
      return buildAdvice({ state, eventId }, 'rules');
    } catch {
      return null;
    }
  }, [state, eventId, enabled]);

  // A key that changes only when the question being asked changes.
  const key = enabled
    ? `${state.gameId}|${state.day}|${eventId ?? ''}|${state.history.length}|${state.activeEvents.length}`
    : 'disabled';
  const [remote, setRemote] = useState<{ key: string; advice: Advice | null } | null>(null);

  useEffect(() => {
    if (!enabled || !provider) return;
    let cancelled = false;
    getAdvice({ state, eventId }, { provider })
      .then((advice) => {
        if (!cancelled) setRemote({ key, advice });
      })
      .catch(() => {
        // getAdvice never rejects, but keep the UI safe if that ever changes.
        if (!cancelled) setRemote({ key, advice: null });
      });
    return () => {
      cancelled = true;
    };
    // `state` is intentionally omitted: `key` captures every change that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, provider, eventId]);

  if (!enabled) return { advice: null, loading: false };
  if (!provider) return { advice: local, loading: false };
  if (remote && remote.key === key && remote.advice) return { advice: remote.advice, loading: false };
  if (remote && remote.key === key) return { advice: local, loading: false };
  return { advice: local, loading: true };
}
