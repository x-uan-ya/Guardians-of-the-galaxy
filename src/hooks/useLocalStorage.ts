/**
 * useLocalStorage.ts
 * ------------------
 * A small, generic React hook for persisting a JSON-serialisable value to
 * localStorage with a safe fallback. Used by UI preferences (not the game save
 * itself — the game save goes through lib/storage + useGameState, which has
 * domain-specific validation).
 *
 * The hook degrades gracefully: if storage is unavailable it behaves like
 * useState with the initial value.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

function readInitial<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Like useState, but persists to localStorage under `key`.
 * Returns [value, setValue] with the same ergonomics as useState.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readInitial(key, initialValue));
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Storage unavailable or quota exceeded — keep running in-memory.
    }
  }, [value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, set];
}
