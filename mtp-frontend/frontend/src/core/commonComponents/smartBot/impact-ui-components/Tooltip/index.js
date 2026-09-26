import React, { forwardRef } from "react";
import MuiTooltip from "@mui/material/Tooltip";
import "./Tooltips.styles.scss";

export const Tooltip = forwardRef((props, ref) => {
  const {
    title,
    orientation = "top",
    variant = "primary-tooltip",
    children,
    ...args
  } = props;
  const getVariant = (variant) => {
    switch (variant) {
      case "secondary":
        return "secondary-tooltip";
      case "tertiary":
        return "tertiary-tooltip";
      default:
        return "primary-tooltip";
    }
  };

  return (
    <MuiTooltip
      ref={ref}
      title={title}
      placement={orientation}
      arrow
      {...args}
      classes={{ popper: `impact-tooltip-container ${getVariant(variant)}` }}
    >
      {children}
    </MuiTooltip>
  );
});
