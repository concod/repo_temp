import React from "react";
import { useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import { Button } from "impact-ui-v3";
import { getKPIIconComponent } from "modules/oms/utils-oms/kpiIconUtils.js";
import { useExpediteOrdersCardsStyles } from "./styles.js";
import { EXPEDITE_LOST_SALES_KPI_CARDS } from "../constants";

const formatValue = (n, isCurrency) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return "--";
  const formatted = num.toLocaleString("en-US");
  return isCurrency ? `$${formatted}` : formatted;
};

const calculateProgress = (value, total) => {
  const val = Number(value);
  const tot = Number(total);
  if (Number.isNaN(val) || Number.isNaN(tot) || tot === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((val / tot) * 100)));
};

/**
 * Compact (sticky) KPI card. Renders inline:
 *   [icon] Title             |  Label1                 Label2
 *   [────── thin progress ─] |  value / total          value / total
 *
 * Headline metric (first in `metrics`) drives the progress bar.
 */
const LostSalesKpiCardCompact = ({
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
    <div className={classes.kpiCompactCard}>
      <div className={classes.kpiCompactLeftCol}>
        <div className={classes.kpiCompactTitleRow}>
          {iconType ? (
            <span className={classes.kpiCompactIcon} aria-hidden>
              {getKPIIconComponent(iconType, 0)}
            </span>
          ) : null}
          <Typography component="span" className={classes.kpiCompactTitle}>
            {title}
          </Typography>
        </div>
        <div
          className={classes.kpiCompactBar}
          style={{ background: trackColor }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className={classes.kpiCompactBarFill}
            style={{ width: `${progress}%`, background: accentColor }}
          />
        </div>
      </div>

      <div className={classes.kpiCompactMetrics}>
        {metrics.map((metric) => {
          const values = data?.[metric.key] || {};
          return (
            <div className={classes.kpiCompactMetricCol} key={metric.key}>
              <Typography
                component="span"
                className={classes.kpiCompactMetricLabel}
              >
                {metric.label}
              </Typography>
              <div className={classes.kpiCompactMetricValueRow}>
                <Typography
                  component="span"
                  className={classes.kpiCompactMetricValue}
                >
                  {formatValue(values?.value, metric.isCurrency)}
                </Typography>
                <Typography
                  component="span"
                  className={classes.kpiCompactMetricTotal}
                >
                  / {formatValue(values?.total, metric.isCurrency)}
                </Typography>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Compact CTA: emoji + title + 2 small action buttons (no description).
 * Used inside the sticky compact KPI strip.
 */
const ExpediteOrdersCtaCardCompact = ({
  onCreateOffCycle,
  onExpediteOrders,
  title = "Override The Default Lead Time",
  createOffCycleLabel = "Create Off Cycle Order",
}) => {
  const classes = useExpediteOrdersCardsStyles();
  return (
    <div className={classes.ctaCardCompact}>
      <span className={classes.kpiCompactCtaEmoji} aria-hidden>
        🙁
      </span>
      <Typography component="span" className={classes.kpiCompactCtaTitle}>
        {title}
      </Typography>
      <div className={classes.kpiCompactCtaButtons}>
        <Button
          size="small"
          type="default"
          variant="secondary"
          className={classes.ctaButton}
          onClick={onCreateOffCycle}
        >
          {createOffCycleLabel}
        </Button>
        <Button
          size="small"
          type="default"
          variant="secondary"
          className={classes.ctaButton}
          onClick={onExpediteOrders}
        >
          Expedite Orders
        </Button>
      </div>
    </div>
  );
};

/**
 * Sticky condensed KPI strip rendered in the page top bar (above the scroll
 * area) once the user scrolls past the original full-size KPI panel.
 *
 * Renders only on step 1 — driven by the same Redux `lostSalesKpiData` block
 * (or hardcoded fallback) used by `HeaderKPIPanel`.
 */
const HeaderKPIPanelCompact = ({
  onCreateOffCycle,
  onExpediteOrders,
  showCtaCard = true,
  ctaTitle,
  createOffCycleLabel,
}) => {
  const classes = useExpediteOrdersCardsStyles();
  const beforeKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.beforeKpi
  );

  const recoveryWindowChartRow = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowChartRow
  );
  const recoveryWindowKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowKpi
  );
  const kpiSource = recoveryWindowChartRow ? recoveryWindowKpi : beforeKpi;

  const lostSalesKpiBlock = kpiSource?.data || kpiSource || {};

  return (
    <div className={classes.kpiCompactStrip}>
      {EXPEDITE_LOST_SALES_KPI_CARDS.map((card) => (
        <LostSalesKpiCardCompact
          key={card.key}
          title={card.title}
          iconType={card.iconType}
          accentColor={card.accentColor}
          trackColor={card.trackColor}
          metrics={card.metrics}
          data={lostSalesKpiBlock?.[card.key]}
        />
      ))}
      {showCtaCard && (
        <ExpediteOrdersCtaCardCompact
          onCreateOffCycle={onCreateOffCycle}
          onExpediteOrders={onExpediteOrders}
          title={ctaTitle}
          createOffCycleLabel={createOffCycleLabel}
        />
      )}
    </div>
  );
};

export default HeaderKPIPanelCompact;
