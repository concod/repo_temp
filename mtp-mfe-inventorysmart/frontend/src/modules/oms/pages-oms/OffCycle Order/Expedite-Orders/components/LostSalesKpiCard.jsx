import React from "react";
import Typography from "@mui/material/Typography";
import { Card } from "impact-ui-v3";
import { getKPIIconComponent } from "modules/oms/utils-oms/kpiIconUtils.js";
import { useExpediteOrdersCardsStyles } from "./styles.js";

/** Format integer; show "$" prefix for currency, "--" for null/NaN. */
const formatValue = (n, isCurrency) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return "--";
  const formatted = num.toLocaleString("en-US");
  return isCurrency ? `$${formatted}` : formatted;
};

/** Progress percent (0–100) for the donut arc. */
const calculateProgress = (value, total) => {
  const val = Number(value);
  const tot = Number(total);
  if (Number.isNaN(val) || Number.isNaN(tot) || tot === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((val / tot) * 100)));
};

/**
 * SVG donut with accent arc + lighter track + centered % label.
 * Stroke geometry uses the standard "circumference - dashoffset" trick so the
 * fill always reflects the requested percentage exactly.
 */
const KpiDonut = ({ percent, accentColor, trackColor }) => {
  const size = 78;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - safePercent / 100);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
      role="img"
      aria-label={`${safePercent}% progress`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accentColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
          color: "#0D152C",
        }}
      >
        {`${safePercent}%`}
      </div>
    </div>
  );
};

/**
 * Dual-metric KPI card.
 *
 * Layout (matches Figma):
 *   ┌──────────────────────────────────────────────┐
 *   │              [icon] Title                   │
 *   │  ◯ XX%                                       │
 *   │              ● value / total   ● value / tot │
 *   │              Label              Label        │
 *   └──────────────────────────────────────────────┘
 *
 * - Donut on the left, vertically centered.
 * - Title (with leading icon) anchored to the top-right column.
 * - Two metric columns with a small leading colored dot, value/total inline,
 *   and a sub-label below.
 */
const LostSalesKpiCard = ({
  title,
  iconType,
  accentColor,
  trackColor,
  metrics,
  data,
}) => {
  const classes = useExpediteOrdersCardsStyles();

  const headlineMetric = metrics?.[0];
  const headlineValues = data?.[headlineMetric?.key];
  const progress = calculateProgress(
    headlineValues?.value,
    headlineValues?.total
  );

  return (
    <Card
      className={classes.lostSalesKpiCard}
      padding={14}
      minHeight={0}
      maxWidth="100%"
      size="medium"
    >
      <div className={classes.lostSalesKpiBody}>
        <KpiDonut
          percent={progress}
          accentColor={accentColor}
          trackColor={trackColor}
        />

        <div className={classes.lostSalesKpiRight}>
          <div className={classes.lostSalesKpiHeader}>
            {iconType ? (
              <span className={classes.lostSalesKpiIcon} aria-hidden>
                {getKPIIconComponent(iconType, 0)}
              </span>
            ) : null}
            <Typography component="span" className={classes.lostSalesKpiTitle}>
              {title}
            </Typography>
          </div>

          <div className={classes.lostSalesKpiMetricsRow}>
            {metrics.map((metric) => {
              const values = data?.[metric.key] || {};
              return (
                <div
                  className={classes.lostSalesKpiMetricCol}
                  key={metric.key}
                >
                  <div className={classes.lostSalesKpiMetricValueRow}>
                    <span
                      className={classes.lostSalesKpiMetricDot}
                      style={{
                        background: metric.dotColor || accentColor,
                      }}
                    />
                    <Typography
                      component="span"
                      className={classes.lostSalesKpiMetricValue}
                    >
                      {formatValue(values?.value, metric.isCurrency)}
                    </Typography>
                    <Typography
                      component="span"
                      className={classes.lostSalesKpiMetricTotal}
                    >
                      / {formatValue(values?.total, metric.isCurrency)}
                    </Typography>
                  </div>
                  <Typography
                    component="span"
                    className={classes.lostSalesKpiMetricLabel}
                  >
                    {metric.label}
                  </Typography>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LostSalesKpiCard;
