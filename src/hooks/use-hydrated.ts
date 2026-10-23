import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server HTML and until React has taken over the page, true afterwards.
 * Forms use it to stay unsubmittable while their JavaScript is still loading (slow networks),
 * so a click never falls back to the browser's native submit.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
