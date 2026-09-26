import { useLayoutEffect, useRef } from "react";

/**
 * Runs `onRefresh` when `token` changes, skipping the mount run. A view that
 * mounts after an earlier bump already loaded fresh data through its own mount
 * effect, so firing on mount would double-fetch.
 *
 * Layout effect, not passive: `onRefresh` raises the view's loader, and a
 * passive effect runs after paint, so the stale rows would show uncovered for
 * a frame before the loader appeared.
 */
const useRefreshSignal = (token, onRefresh) => {
  const seenTokenRef = useRef(token);
  const handlerRef = useRef(onRefresh);
  handlerRef.current = onRefresh;

  useLayoutEffect(() => {
    if (seenTokenRef.current === token) return;
    seenTokenRef.current = token;
    handlerRef.current?.();
  }, [token]);
};

export default useRefreshSignal;
