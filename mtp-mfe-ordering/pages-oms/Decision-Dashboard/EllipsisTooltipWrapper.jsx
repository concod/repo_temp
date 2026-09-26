import React, { useRef, useLayoutEffect, useState } from "react";
import { Tooltip } from "impact-ui-v3";

const EllipsisTooltipWrapper = ({ children, title, className, ...rest }) => {
  const ref = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isEllipsis = el.scrollWidth > el.clientWidth;
    setShowTooltip(isEllipsis);
  }, [title]);

  return (
    <Tooltip title={showTooltip ? title : ""} {...rest}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </Tooltip>
  );
};

export default EllipsisTooltipWrapper;
