"use client";

import { useCallback, useEffect, useState } from "react";

/** A codec keeps existing per-user/table storage formats compatible. */
export function useTablePreferences<T>({
  storageKey,
  enabled = true,
  defaults,
  sanitize,
}: {
  storageKey: string;
  enabled?: boolean;
  defaults: () => T;
  sanitize: (value: unknown) => T;
}) {
  const [state, setState] = useState(() => ({
    storageKey: "",
    isHydrated: false,
    preferences: defaults(),
  }));
  useEffect(() => {
    if (!enabled) return;
    let preferences = defaults();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) preferences = sanitize(JSON.parse(saved) as unknown);
    } catch {
      // Storage is optional, including when the saved format is obsolete.
    }
    // Storage is intentionally read after hydration to match the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ storageKey, isHydrated: true, preferences });
  }, [enabled, storageKey, defaults, sanitize]);
  useEffect(() => {
    if (!enabled || !state.isHydrated || state.storageKey !== storageKey)
      return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state.preferences));
      } catch {
        // Keep the current view usable when storage is disabled or full.
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [enabled, state, storageKey]);
  const update = useCallback(
    (change: (current: T) => T) => {
      setState((current) => {
        if (!current.isHydrated || current.storageKey !== storageKey)
          return current;
        return {
          ...current,
          preferences: sanitize(change(current.preferences)),
        };
      });
    },
    [storageKey, sanitize],
  );
  return {
    preferences:
      state.storageKey === storageKey ? state.preferences : defaults(),
    isHydrated: enabled && state.isHydrated && state.storageKey === storageKey,
    update,
  };
}
