import { useRef, useEffect, useState } from "react";
import { Tooltip } from "impact-ui-v3";
const OverflowTooltip = (props) => {
  const { value } = props;
  const spanRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = spanRef.current;
      if (el) {
        setIsOverflowed(el.scrollWidth > props?.column?.actualWidth-32);
      }
    }
    checkOverflow();
    const gridApi = props?.api;
    gridApi?.addEventListener("columnResized", checkOverflow);
    return () => {
      gridApi?.removeEventListener("columnResized", checkOverflow);
    };
  }, [value, props?.column?.actualWidth, spanRef?.current?.clientWidth]);
  return (
    <>
      {isOverflowed ? (
        <Tooltip title={value} orientation="right" arrow variant="tertiary">
          <span
            ref={spanRef}
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              display: "inline-block",
              width: "100%",
            }}
          >
            {value === undefined || value === null ? "" : String(value)}
          </span>
        </Tooltip>
      ) : (
        <span
          ref={spanRef}
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "inline-block",
            width: "100%",
          }}
        >
          {value === undefined || value === null ? "" : String(value)}
        </span>
      )}
    </>
  );
};

export default OverflowTooltip;
