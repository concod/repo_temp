import React from "react";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { useExpediteOrdersCardsStyles } from "./styles.js";

const MetricCard = ({ title, value, total, progress = 0, icon = null }) => {
  const classes = useExpediteOrdersCardsStyles();
  const progressPct = Math.min(
    100,
    Math.max(0, Number.isFinite(Number(progress)) ? Number(progress) : 0)
  );

  return (
    <div className={classes.metricCard}>
      {/* Title row: label on left, icon button on right */}
      <div className={classes.metricTitleRow}>
        <Typography className={classes.metricTitle}>{title}</Typography>
        {icon ? (
          <div className={classes.metricIconWrapper}>
            <div style={{ transform: "scale(0.75)" }}>{icon}</div>
          </div>
        ) : null}
      </div>

      {/* Progress + value section */}
      <div className={classes.metricProgressSection}>
        {/* MUI determinate bar — value 0–100 = (metric value / total) × 100 from HeaderKPIPanel. */}
        <div className={classes.miniProgressBar}>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Value + total */}
        <div className={classes.metricValueRow}>
          <Typography className={classes.metricValue}>{value}</Typography>
          <Typography className={classes.metricTotal}>{total}</Typography>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
