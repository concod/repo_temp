import { useState, useEffect, useRef } from "react";
import { Tooltip } from "impact-ui-v3";

export const EllipsisTooltipCell = ({
  value,
  tooltip,
  className,
  orientation = "right",
}) => {
  const ref = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setShowTooltip(el.scrollWidth > el.clientWidth);
    };

    check(); // run once after mount / value change

    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [value]);

  return (
    <Tooltip
      orientation={orientation}
      variant="tertiary"
      title={showTooltip ? tooltip : ""}
    >
      <div ref={ref} className={className}>
        {value}
      </div>
    </Tooltip>
  );
};
