import { useCallback, useEffect, useRef, useState } from "react";

const useResizeGrandTotal = ({ cssPropertyName, offset = 56 }) => {
  const containerRef = useRef(null);
  const [gridInstance, setGridInstance] = useState(null);

  const loadTableInstance = useCallback((instance) => {
    setGridInstance(instance);
  }, []);

  useEffect(() => {
    const api = gridInstance?.api;
    const columnApi = gridInstance?.columnApi;
    if (!api || !columnApi) return;

    const onColumnResized = () => {
      const column = columnApi.getAllColumns()?.[1];
      if (column && containerRef.current) {
        const width = column.getActualWidth() + offset;
        containerRef.current.style.setProperty(cssPropertyName, `${width}px`);

        // Directly style the pinned top cell for this specific table instance
        const gridEl = containerRef.current.querySelector(
          ".ag-floating-top .ag-pinned-left-floating-top .ag-row:first-child .ag-cell[aria-colindex='2']"
        );
        if (gridEl) {
          gridEl.style.setProperty("width", `${width}px`, "important");
          gridEl.style.setProperty("left", "0", "important");
          gridEl.style.setProperty("background", "#F4F1F9", "important");
        }
      }
    };

    // Set initial width (with small delay to ensure DOM is ready)
    const initTimer = setTimeout(onColumnResized, 100);

    const events = [
      "columnResized",
      "columnMoved",
      "columnVisible",
      "columnPinned",
      "displayedColumnsChanged",
      "gridSizeChanged",
      "gridColumnsChanged",
    ];
    events.forEach((event) => api.addEventListener(event, onColumnResized));
    return () => {
      clearTimeout(initTimer);
      events.forEach((event) =>
        api.removeEventListener(event, onColumnResized)
      );
    };
  }, [gridInstance, cssPropertyName, offset]);

  return { containerRef, loadTableInstance };
};

export default useResizeGrandTotal;
