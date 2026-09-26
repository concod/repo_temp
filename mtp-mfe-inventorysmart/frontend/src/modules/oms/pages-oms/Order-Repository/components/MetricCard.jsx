import React, { useMemo, useRef, useCallback } from "react";
import makeStyles from "@mui/styles/makeStyles";
import CoreChart from "core/Utils/core-charts";
import globalStyles from "core/Styles/globalStyles";
import Typography from "@mui/material/Typography";
import { CARD_CONFIG, LABEL_CONFIG } from "./constant";
import { TENANT_LOCALE } from "modules/oms/constants-oms/stringConstants";
import { getKPIIconComponent } from "modules/oms/utils-oms/kpiIconUtils";

const useStyles = makeStyles((theme) => ({
  cardContainer: {
    padding: "0.75rem 1.25rem",
    gap: "1.5rem",
    background: theme.palette.common.white,
    boxShadow: `0 0 var(--ScalesS4) 0 ${theme.palette.colours.boxShadowCard}`,
    borderRadius: "0.5rem",
    border: `0.0625rem solid ${theme.palette.action.hover}`,
    overflow: "hidden",
  },
  iconContainer: {
    width: "2.125rem",
    height: "2.125rem",
    borderRadius: "50%",
  },
  iconContainerStatus: {
    background: theme.palette.background.hummingBird,
    color: theme.palette.colours.easternBlue,
  },
  iconContainerQuantity: {
    background: theme.palette.background.whiteLilac,
    color: theme.palette.colours.studio,
  },
  iconContainerCost: {
    background: theme.palette.background.provincialPink,
    color: theme.palette.colours.cinnabar,
  },
  icon: {
    width: "1.125rem",
    height: "1.125rem",
  },
  title: {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    color: theme.palette.text.black,
  },
  metricRow: {
    borderRadius: "0.375rem",
    borderLeft: "0.125rem solid",
    transition: "all 0.3s ease-out",
  },
  metricRowApproved: {
    borderLeftColor: theme.palette.colours.oldLavender,
  },
  metricRowReview: {
    borderLeftColor: theme.palette.colours.skyBlue,
  },
  metricRowPending: {
    borderLeftColor: theme.palette.colours.eastSide,
  },
  metricRowHidden: {
    borderLeftColor: "transparent",
  },
  colorIndicator: {
    width: "0.5rem",
    height: "0.5rem",
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: `0 0.0625rem 0.125rem ${theme.palette.action.focus}`,
  },
  colorIndicatorApproved: {
    backgroundColor: theme.palette.success.main,
  },
  colorIndicatorReview: {
    backgroundColor: theme.palette.primary.main,
  },
  colorIndicatorPending: {
    backgroundColor: theme.palette.warning.main,
  },
  colorIndicatorDefault: {
    backgroundColor: theme.palette.colours.brightRoyalBlue,
  },
  metricLabel: {
    paddingLeft: "1rem",
    fontSize: "0.875rem",
    lineHeight: "1.3125rem",
    fontWeight: 500,
    color: theme.palette.colours.neutralGrey,
    transition: "all 0.3s ease-out",
  },
  metricLabelHovered: {
    fontWeight: 700,
  },
  metricValue: {
    fontWeight: 700,
    color: theme.palette.text.boldHeadingBlue,
  },
  bodyContainer: {
    gap: "2rem",
  },
  tooltipContainer: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "0 0.375rem 0.375rem 0.375rem",
    padding: "0.25rem 0.5rem",
    fontWeight: 700,
    fontSize: "0.875rem",
    lineHeight: "1.3125rem",
    color: "#1F2B4D",
    backdropFilter: "blur(0.625rem)",
    boxShadow: "0 0 0.25rem 0rem rgba(0, 0, 0, 0.14)",
  },
}));

const getLabelKey = (label = "") => {
  const key = label.toLowerCase();
  if (key.includes("approved")) return "approved";
  if (key.includes("review")) return "review";
  if (key.includes("pending")) return "pending";
  return "";
};

const MetricCard = ({
  IS_COST_SHOWN_IN_DECIMALS,
  COST_ROUNDING_PRECISION,
  type = "status",
  data = {},
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const metricRowsRef = useRef([]);
  const metricLabelsRef = useRef([]);

  const cardConfig = CARD_CONFIG[type];
  const icon3DType = cardConfig.icon3D;

  const formatValue = (value, isCost = false) => {
    if (IS_COST_SHOWN_IN_DECIMALS) {
      const ROUNDING_PRECISION = isCost ? COST_ROUNDING_PRECISION : 0;
      const formattedValue =
        value?.toLocaleString(TENANT_LOCALE, {
          minimumFractionDigits: ROUNDING_PRECISION,
          maximumFractionDigits: ROUNDING_PRECISION,
        }) || "0";
      return isCost ? `$${formattedValue}` : formattedValue;
    } else {
      const roundOffValue = parseInt(value);
      const formattedValue =
        roundOffValue?.toLocaleString(TENANT_LOCALE) || "0";
      return isCost ? `$${formattedValue}` : formattedValue;
    }
  };

  const updateTextStyling = useCallback(
    (hoveredIndex) => {
      metricRowsRef.current.forEach((row, index) => {
        const label = metricLabelsRef.current[index];
        if (!row || !label) return;

        if (hoveredIndex === null) {
          // Reset all styles
          row.style.borderLeftColor = "";
          label.style.color = "";
          label.style.fontWeight = "";
        } else if (index === hoveredIndex) {
          // Highlight hovered item
          const item = data?.values?.[index];
          if (item) {
            const labelKey = getLabelKey(item.label);
            const config = LABEL_CONFIG[labelKey];
            if (config) {
              label.style.color = config.borderColor;
              label.style.fontWeight = "700";
            }
          }
        } else {
          // Hide borders of other items
          row.style.borderLeftColor = "transparent";
          label.style.color = "";
          label.style.fontWeight = "";
        }
      });
    },
    [data?.values]
  );

  const chartData = useMemo(
    () =>
      data?.values?.map((item, index) => {
        const labelKey = getLabelKey(item.label);
        const config = LABEL_CONFIG[labelKey];
        const value = item.value;
        return {
          name: item.label,
          y: value,
          color: config.gradient,
          index: index,
        };
      }) || [],
    [data?.values]
  );

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 140,
        width: 140,
        margin: [0, 0, 0, 0],
        spacing: [0, 0, 0, 0],
        animation: {
          duration: 300,
          easing: "easeInOut",
        },
      },
      title: { text: null },
      tooltip: {
        useHTML: true,
        backgroundColor: "transparent",
        borderWidth: 0,
        borderColor: "transparent",
        shadow: false,
        style: {
          pointerEvents: "none",
        },
        formatter: function () {
          const labelKey = getLabelKey(this.point.name);
          const config = LABEL_CONFIG[labelKey];
          const borderColor = config.borderColor;
          const isCost = data?.label?.toLowerCase()?.includes("cost");
          const formattedValue = formatValue(this.y, isCost);

          return `<div class="${classes.tooltipContainer}" style="border-left: 0.0625rem solid ${borderColor};"><b>${formattedValue}</b></div>`;
        },
      },
      legend: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: "60%",
          borderWidth: 2.5,
          borderColor: "#FFFFFF",
          borderRadius: 6,
          dataLabels: { enabled: false },
          allowPointSelect: false,
          cursor: "pointer",
          slicedOffset: 5,
          states: {
            hover: {
              halo: false,
              enabled: true,
              brightness: 0,
              animation: {
                duration: 300,
                easing: "easeOut",
              },
            },
            inactive: {
              brightness: 0.01,
              animation: {
                duration: 300,
                easing: "easeOut",
              },
            },
          },
          point: {
            events: {
              mouseOver: function () {
                this.slice(true);
                updateTextStyling(this.index);
              },
              mouseOut: function () {
                this.slice(false);
                updateTextStyling(null);
              },
            },
          },
        },
      },
      series: [{ name: "Orders", colorByPoint: true, data: chartData }],
      credits: { enabled: false },
      exporting: { enabled: false },
    }),
    [chartData, classes.tooltipContainer, updateTextStyling]
  );

  return (
    <div
      className={`${classes.cardContainer} ${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.fullWidth}`}
    >
      <div
        className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.gapHalf}`}
      >
        <div className={globalClasses.centerAlign}>
          {getKPIIconComponent(icon3DType, 0)}
        </div>
        <Typography variant="h3" component="h3" className={classes.title}>
          {cardConfig.title}
        </Typography>
      </div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${classes.bodyContainer}`}
      >
        <CoreChart options={chartOptions} />
        <div
          className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gapHalf} ${globalClasses.flex}`}
        >
          {data?.values?.map((item, index) => {
            const labelKey = getLabelKey(item.label);

            return (
              <div
                key={`${type}-${index}`}
                ref={(el) => (metricRowsRef.current[index] = el)}
                className={`${classes.metricRow} ${
                  classes[
                    `metricRow${
                      labelKey.charAt(0).toUpperCase() + labelKey.slice(1)
                    }`
                  ]
                } ${globalClasses.flexAlignBetweenCenter}`}
              >
                <span
                  className={classes.metricLabel}
                  ref={(el) => (metricLabelsRef.current[index] = el)}
                >
                  {item.label}:
                </span>

                <span className={classes.metricValue}>
                  {formatValue(
                    item?.value,
                    data?.label?.toLowerCase()?.includes("cost")
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
