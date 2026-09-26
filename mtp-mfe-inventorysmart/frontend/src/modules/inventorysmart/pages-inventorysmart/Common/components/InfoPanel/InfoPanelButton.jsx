import React from "react";
import { useInfoPanelStyles } from "./infoPanelStyles";
import IconBook from "./icon-book.svg";

const InfoPanelButton = ({ onClick, ariaLabel }) => {
  const classes = useInfoPanelStyles();

  return (
    <button
      type="button"
      className={classes.triggerBtn}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <IconBook className={classes.triggerIcon} />
    </button>
  );
};

export default InfoPanelButton;
