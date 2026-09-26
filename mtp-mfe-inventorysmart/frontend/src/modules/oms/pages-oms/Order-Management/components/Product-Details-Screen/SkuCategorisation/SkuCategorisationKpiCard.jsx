import React, { useMemo } from "react";
import Typography from "@mui/material/Typography";
import { Tooltip } from "impact-ui-v3";
import InfoIcon from "assets/impactv3/info_icon.svg";
import classNames from "classnames";
import CoreChart from "core/Utils/core-charts";
import { SKU_CATEGORISATION_COLORS } from "modules/oms/constants-oms/stringConstants";
import { useSkuCategorisationStyles, SKU_CATEGORISATION_CHART_SIZE } from "./skuCategorisationStyles";

const formatCount = (value) => {
  const num = Number(value);
  if (value === null || value === undefined || Number.isNaN(num)) return "--";
  return num.toLocaleString("en-US");
};

const formatCurrencyCompact = (value) => {
  const num = Number(value);
  if (value === null || value === undefined || Number.isNaN(num)) return "--";
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}k`;
  }
  return `$${num.toLocaleString("en-US")}`;
};

const CardTitleHeader = ({
  title,
  info,
  comingSoon,
  classes,
  className,
}) => (
  <div className={classNames(classes.cardHeader, className)}>
    <div className={classes.cardTitleGroup}>
      <Typography component="span" className={classes.cardTitle}>
        {title}
      </Typography>
      {info ? (
        <Tooltip title={info} variant="tertiary">
          <div
            className={classes.infoIcon}
            onClick={(e) => e.stopPropagation()}
            aria-label={`More information about ${title}`}
          >
            <InfoIcon />
          </div>
        </Tooltip>
      ) : null}
    </div>
    {comingSoon ? (
      <span className={classes.comingSoonBadge}>Coming Soon</span>
    ) : null}
  </div>
);

const SkuCategorisationKpiCard = ({
  title,
  type,
  data = {},
  subtitle,
  info,
  isSelected = false,
  comingSoon = false,
  isEmptyCount = false,
  onSelect,
  onEmptyCountClick,
}) => {
  const classes = useSkuCategorisationStyles();
  const isChartCard = type === "chart";
  const isGreyedOut = comingSoon || isEmptyCount;

  const chartData = useMemo(() => {
    const salesForecast = Number(data?.sales_forecast) || 0;
    const potentialLostSales = Number(data?.potential_lost_sales) || 0;
    const total = salesForecast + potentialLostSales;

    if (total === 0) {
      return [
        {
          name: "Potential Lost sales",
          y: 1,
          color: SKU_CATEGORISATION_COLORS.potentialLostSales,
        },
      ];
    }

    return [
      {
        name: "Sales Forecast",
        y: salesForecast,
        color: SKU_CATEGORISATION_COLORS.salesForecast,
      },
      {
        name: "Potential Lost sales",
        y: potentialLostSales,
        color: SKU_CATEGORISATION_COLORS.potentialLostSales,
      },
    ];
  }, [data?.potential_lost_sales, data?.sales_forecast]);

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: SKU_CATEGORISATION_CHART_SIZE,
        width: SKU_CATEGORISATION_CHART_SIZE,
        margin: [0, 0, 0, 0],
        spacing: [0, 0, 0, 0],
      },
      title: { text: null },
      tooltip: { enabled: false },
      legend: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: "60%",
          borderWidth: 2,
          borderColor: "#FFFFFF",
          dataLabels: { enabled: false },
          allowPointSelect: false,
          enableMouseTracking: false,
          states: {
            hover: { enabled: false },
            inactive: { enabled: false },
          },
        },
      },
      series: [{ name: "SKU Categorisation", colorByPoint: true, data: chartData }],
      credits: { enabled: false },
      exporting: { enabled: false },
    }),
    [chartData]
  );

  const handleClick = () => {
    if (comingSoon) return;
    if (isEmptyCount) {
      onEmptyCountClick?.();
      return;
    }
    onSelect?.();
  };

  return (
    <div
      className={classNames(classes.card, {
        [classes.cardSelected]: isSelected,
        [classes.cardDisabled]: comingSoon,
        [classes.cardEmptyCount]: isEmptyCount,
      })}
      onClick={handleClick}
      role="button"
      tabIndex={comingSoon ? -1 : 0}
      aria-disabled={isGreyedOut || undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      {isSelected ? <span className={classes.cardPointer} aria-hidden /> : null}

      {isChartCard ? (
        <div className={classes.chartCardContent}>
          <div className={classes.chartCardTopRow}>
            <CardTitleHeader
              title={title}
              info={info}
              comingSoon={comingSoon}
              classes={classes}
            />
            <Typography component="div" className={classes.chartCardCount}>
              {formatCount(data?.count)}
            </Typography>
          </div>
          <div className={classes.chartCardBody}>
            <div className={classes.chartWrapper}>
              <CoreChart options={chartOptions} />
            </div>
            <div className={classes.chartLegend}>
              <div className={classes.legendRow}>
                <span
                  className={classes.legendBar}
                  style={{
                    background: SKU_CATEGORISATION_COLORS.salesForecast,
                  }}
                />
                <Typography component="span" className={classes.legendLabel}>
                  Sales Forecast
                </Typography>
                <Typography component="span" className={classes.legendValue}>
                  {formatCurrencyCompact(data?.sales_forecast)}
                </Typography>
              </div>
              <div className={classes.legendRow}>
                <span
                  className={classes.legendBar}
                  style={{
                    background: SKU_CATEGORISATION_COLORS.potentialLostSales,
                  }}
                />
                <Typography component="span" className={classes.legendLabel}>
                  Potential Lost sales
                </Typography>
                <Typography component="span" className={classes.legendValue}>
                  {formatCurrencyCompact(data?.potential_lost_sales)}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={classes.simpleCardContent}>
          <CardTitleHeader
            title={title}
            info={info}
            comingSoon={comingSoon}
            classes={classes}
          />
          <div className={classes.cardValueRow}>
            <Typography component="div" className={classes.cardCount}>
              {formatCount(data?.count)}
            </Typography>
            {subtitle ? (
              <Typography component="div" className={classes.cardSubtitle}>
                {subtitle}
              </Typography>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuCategorisationKpiCard;
