import { useEffect, useRef } from "react";

/**
 * Scrolls a section into view whenever `openKey` changes, so the loader that
 * runs in it — and the data that replaces the loader — land on screen.
 * Sections scroll in the order they are opened, so the newest one wins.
 */
const useScrollIntoViewOnOpen = (openKey) => {
  const ref = useRef(null);

  useEffect(() => {
    // ag-Grid sizes an expanded detail row after commit, so wait one frame.
    const frame = window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openKey]);

  return ref;
};

export default useScrollIntoViewOnOpen;
