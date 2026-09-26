import React from "react";
import { Button, Tooltip } from "impact-ui-v3";
import ThumbsUp from "assets/thumbs-up.svg";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  driverSignificanceRenderer: {
    display: "flex",
    width: "fit-content",
    float: "right",
    "& svg": {
      transform: "translate(-3px, -3px) scale(0.7)",
      width: "24px !important",
      height: "24px !important",
    },
  },
}));

const DriverSignificanceRenderer = ({ onClick }) => {
  const classes = useStyles();
  return (
    <div className={classes.driverSignificanceRenderer}>
      <Tooltip
        orientation="right"
        title="Driver Significance"
        variant="tertiary"
      >
        <Button
          onClick={onClick}
          icon={<ThumbsUp />}
          iconPlacement="left"
          size="small"
          type="default"
          variant="tertiary"
        />
      </Tooltip>
    </div>
  );
};

export default DriverSignificanceRenderer;
