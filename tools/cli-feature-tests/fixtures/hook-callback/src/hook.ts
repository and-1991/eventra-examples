import { useCallback, useMemo } from "react";
import { Eventra } from "@eventra_dev/eventra-sdk";

const tracker = new Eventra({ apiKey: "x" });

export function useTrack() {
  const viaCallback = useCallback((n: string) => tracker.track(n), []);
  const viaMemo = useMemo(() => (n: string) => tracker.track(n), []);
  return { viaCallback, viaMemo };
}

// 2.6.4: a hook that returns the function as a property value
export function useProp() {
  return { propCallback: useCallback((n: string) => tracker.track(n), []) };
}
export function useHolder() {
  const api = { holderCallback: useCallback((n: string) => tracker.track(n), []) };
  return api;
}
