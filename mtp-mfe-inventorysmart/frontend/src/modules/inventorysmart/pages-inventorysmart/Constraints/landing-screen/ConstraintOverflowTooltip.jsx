import { useRef, useEffect, useState, useCallback } from "react";
import { Tooltip } from "impact-ui-v3";

/**
 * Constraints-specific overflow tooltip for read-only cells (e.g. min_distribution).
 * Uses element-level overflow detection so ellipsis + tooltip stay in sync in flex/link cells.
 */
const ConstraintOverflowTooltip = (props) => {
  const { value } = props;
  const spanRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = spanRef.current;
    if (!el || el.clientWidth === 0) {
      return;
    }
    setIsOverflowed(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = spanRef.current;
    if (!el) {
      return undefined;
    }

    const rafId = requestAnimationFrame(() => {
      checkOverflow();
      requestAnimationFrame(checkOverflow);
    });

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);
    if (props.eGridCell) {
      resizeObserver.observe(props.eGridCell);
    }

    const gridApi = props?.api;
    gridApi?.addEventListener("columnResized", checkOverflow);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      gridApi?.removeEventListener("columnResized", checkOverflow);
    };
  }, [value, checkOverflow, props?.api, props.eGridCell]);

  const displayValue =
    value === undefined || value === null ? "" : String(value);

  const spanStyle = {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    display: "block",
    width: "100%",
    minWidth: 0,
  };

  return (
    <Tooltip
      title={isOverflowed ? displayValue : ""}
      orientation="right"
      arrow
      variant="tertiary"
      isHoverEnabled={isOverflowed}
    >
      <span ref={spanRef} style={spanStyle}>
        {displayValue}
      </span>
    </Tooltip>
  );
};

export default ConstraintOverflowTooltip;
