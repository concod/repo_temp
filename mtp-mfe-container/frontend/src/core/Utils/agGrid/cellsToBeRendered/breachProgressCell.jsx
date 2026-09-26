import React from "react";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: "100%",
    gap: pxToRem(8)
  },
  progressBarContainer: {
    flex: "1 1 auto",
    height: pxToRem(6),
    backgroundColor: colours.galleryLight,
    borderRadius: pxToRem(3),
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    borderRadius: pxToRem(3),
    transition: "width 0.3s ease, background-color 0.3s ease"
  },
  progressText: {
    flex: "0 0 auto",
    fontSize: pxToRem(11),
    fontWeight: 400,
    color: colours.tundora,
    backgroundColor: colours.menuBorder,
    borderRadius: pxToRem(10),
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    minWidth: pxToRem(36),
    textAlign: "center",
    whiteSpace: "nowrap",
    lineHeight: pxToRem(16)
  }
}));

export const DEFAULT_BREACH_THRESHOLDS = {
  healthy: 50,
  approachingCapacity: 80,
  breachedMinor: 100,
  breachedSignificant: 110
};

const getProgressColor = (value, thresholds) => {
  if (value > thresholds.breachedSignificant) {
    return colours.errorInfo;
  } else if (value >= thresholds.breachedMinor) {
    return colours.orangePeel;
  } else if (value >= thresholds.approachingCapacity) {
    return colours.studio;
  } else if (value >= thresholds.healthy) {
    return colours.blueMarguerite;
  } else {
    return colours.coldPurple;
  }
};

const BreachProgressCell = (props) => {
  const classes = useStyles();
  const { value, colDef } = props;
  
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const displayValue = Math.max(0, numericValue);
  const barWidth = Math.min(100, displayValue);
  
  const thresholds = {
    ...DEFAULT_BREACH_THRESHOLDS,
    ...colDef?.extra?.thresholds
  };
  const showText = colDef?.extra?.showText !== false;
  
  const backgroundColor = getProgressColor(displayValue, thresholds);
  
  const displayText = `${displayValue.toFixed(0)}%`;
  
  return (
    <div className={classes.container}>
      <div className={classes.progressBarContainer}>
        <div 
          className={classes.progressBar}
          style={{ 
            width: `${barWidth}%`,
            backgroundColor 
          }}
        />
      </div>
      {showText && (
        <span className={classes.progressText}>
          {displayText}
        </span>
      )}
    </div>
  );
};

export default BreachProgressCell;
