import React from "react";
import { makeStyles } from "@mui/styles";
import { Typography } from "@mui/material";
import { Tooltip } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  card: {
    borderRadius: theme.typography.pxToRem(12),
    border: `${theme.typography.pxToRem(1)} solid ${theme.palette.divider}`,
    boxShadow: "none",
    backgroundColor: theme.palette.background.paper,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.2s ease-in-out",
    "&:hover": {
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    },
  },
  cardContent: {
    padding: theme.spacing(2),
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    "&:last-child": {
      paddingBottom: theme.spacing(2),
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(3),
  },
  titleSection: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    flexShrink: 0,
    "& svg": {
      width: 18,
      height: 18,
    },
  },
  title: {
    fontSize: theme.typography.pxToRem(14),
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "21px",
    textTransform: "capitalize",
  },
  badgeSection: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 24,
    maxWidth: 164,
    padding: "2px 8px",
    borderRadius: 1000,
    border: "1px solid #D3F1FF",
    background: "linear-gradient(93deg, #EAF8FF -5.02%, #FDEDFF 120.86%)",
    "& svg": {
      width: 16,
      height: 16,
    },
  },
  badgeText: {
    fontSize: theme.typography.pxToRem(11),
    fontWeight: 500,
    color: "#5B7FFF",
  },
  actionIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    maxWidth: 164,
    padding: 4,
    gap: 6,
    borderRadius: 1000,
    background: "#EEF2FF",
    boxSizing: "border-box",
    cursor: "pointer",
    color: theme.palette.text.secondary,
    transition: "color 0.2s ease-in-out",
    "&:hover": {
      color: theme.palette.primary.main,
    },
    "& svg": {
      width: 16,
      height: 16,
      display: "block",
    },
  },
  metricsSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
    flex: 1,
  },
  metricsDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: theme.palette.divider,
    margin: `0 ${theme.spacing(2)}`,
    flexShrink: 0,
  },
  primaryMetric: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5),
  },
  primaryLabel: {
    fontSize: theme.typography.pxToRem(14),
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  primaryValue: {
    fontSize: theme.typography.pxToRem(18),
    fontWeight: 700,
    color: theme.palette.text.primary,
    letterSpacing: "-0.5px",
  },
  secondaryMetrics: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    flex: 1,
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  metricIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    flexShrink: 0,
    color: theme.palette.text.secondary,
    "& svg": {
      width: 18,
      height: 18,
    },
  },
  metricText: {
    fontSize: theme.typography.pxToRem(14),
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  metricValue: {
    fontSize: theme.typography.pxToRem(14),
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginLeft: theme.spacing(0.5),
  },
  metricSuffix: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 24,
    padding: 6,
    marginLeft: theme.spacing(0.5),
    borderRadius: "var(--Sizes-S-1000, 833.333px)",
    background: "var(--Colors-Alert-Badge-neutral-Surface-Subtle, #F2F3F4)",
    boxSizing: "border-box",
    color: theme.palette.text.secondary,
    "& svg": {
      width: 12,
      height: 12,
      display: "block",
    },
  },
  progressBarContainer: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  progressGroup: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 1,
  },
  progressPositiveSegment: {
    height: 8,
    borderRadius: 8,
    border: "1px solid #4259EE",
    background: "linear-gradient(110deg, #ECEEFD 0%, #FFF 48.77%)",
    boxShadow: "0 0 18px 5px rgba(0, 0, 0, 0.06)",
    boxSizing: "border-box",
  },
  progressNeutralSegment: {
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.palette.grey[200],
  },
  progressDivider: {
    width: 1,
    height: 10,
    backgroundColor: theme.palette.divider,
    flexShrink: 0,
  },
  progressNegativeSegment: {
    height: 8,
    borderRadius: "4px 12px 12px 4px",
    background:
      "linear-gradient(90deg, rgba(246, 204, 204, 0.70) 0%, rgba(255, 177, 177, 0.80) 100%)",
    flexShrink: 1,
  },
  progressSegment: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease-in-out",
  },
  tooltipContent: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75),
  },
  tooltipRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontSize: theme.typography.pxToRem(13),
    color: theme.palette.text.primary,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
}));

const MetricCard = ({
  icon,
  title,
  badge,
  badgeIcon,
  actionIcon,
  onActionClick,
  primaryMetric,
  secondaryMetrics = [],
  progressSegments = [],
  iconWrapperClassName,
  className,
}) => {
  const classes = useStyles();
  const hasCompositeProgress = progressSegments.length === 3;
  const positiveSegment = hasCompositeProgress ? progressSegments[0] : null;
  const neutralSegment = hasCompositeProgress ? progressSegments[1] : null;
  const negativeSegment = hasCompositeProgress ? progressSegments[2] : null;

  return (
    <div className={`${classes.card} ${className || ""}`}>
      <div className={classes.cardContent}>
        <div className={classes.header}>
          <div className={classes.titleSection}>
            {icon && (
              <div
                className={`${classes.iconWrapper} ${
                  iconWrapperClassName || ""
                }`}
              >
                {icon}
              </div>
            )}
            <Typography className={classes.title}>{title}</Typography>
          </div>

          <div className={classes.badgeSection}>
            {badge && (
              <div className={classes.badge}>
                {badgeIcon && badgeIcon}
                <span className={classes.badgeText}>{badge}</span>
              </div>
            )}
            {actionIcon && (
              <Tooltip title="Like" variant="tertiary">
                <div className={classes.actionIcon} onClick={onActionClick}>
                  {actionIcon}
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        <div className={classes.metricsSection}>
          {primaryMetric && (
            <div className={classes.primaryMetric}>
              <span className={classes.primaryLabel}>
                {primaryMetric.label}
              </span>
              <span className={classes.primaryValue}>
                {primaryMetric.value}
              </span>
            </div>
          )}

          {primaryMetric && secondaryMetrics.length > 0 && (
            <div className={classes.metricsDivider} />
          )}

          {secondaryMetrics.length > 0 && (
            <div className={classes.secondaryMetrics}>
              {secondaryMetrics.map((metric, index) => (
                <div key={index} className={classes.metricRow}>
                  {metric.icon && (
                    <div className={classes.metricIcon}>{metric.icon}</div>
                  )}
                  <span className={classes.metricText}>{metric.label}</span>
                  <span className={classes.metricValue}>{metric.value}</span>
                  {metric.suffix && (
                    <span className={classes.metricSuffix}>
                      {metric.suffix}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {progressSegments.length > 0 && (
          <Tooltip
            variant="secondary"
            title={
              <div className={classes.tooltipContent}>
                {positiveSegment?.tooltip && (
                  <div className={classes.tooltipRow}>
                    <div
                      className={classes.tooltipDot}
                      style={{
                        backgroundColor:
                          positiveSegment.dotColor || positiveSegment.color,
                      }}
                    />
                    <span>{positiveSegment.tooltip}</span>
                  </div>
                )}
                {neutralSegment?.tooltip && (
                  <div className={classes.tooltipRow}>
                    <div
                      className={classes.tooltipDot}
                      style={{
                        backgroundColor:
                          neutralSegment.dotColor || neutralSegment.color,
                      }}
                    />
                    <span>{neutralSegment.tooltip}</span>
                  </div>
                )}
                {negativeSegment?.tooltip && (
                  <div className={classes.tooltipRow}>
                    <div
                      className={classes.tooltipDot}
                      style={{
                        backgroundColor:
                          negativeSegment.dotColor || negativeSegment.color,
                      }}
                    />
                    <span>{negativeSegment.tooltip}</span>
                  </div>
                )}
              </div>
            }
            orientation="bottom"
          >
            <div
              className={classes.progressBarContainer}
              style={{ cursor: "pointer" }}
            >
              {hasCompositeProgress ? (
                <>
                  {(positiveSegment.percentage > 0 ||
                    neutralSegment.percentage > 0) && (
                    <>
                      <div
                        className={classes.progressGroup}
                        style={{
                          flex: `${
                            positiveSegment.percentage +
                            neutralSegment.percentage
                          } 1 0`,
                        }}
                      >
                        {positiveSegment.percentage > 0 && (
                          <div
                            style={{
                              flex: `${positiveSegment.percentage} 1 0`,
                              height: 8,
                              borderRadius: 8,
                              background: positiveSegment.color,
                            }}
                          />
                        )}
                        {neutralSegment.percentage > 0 && (
                          <div
                            style={{
                              flex: `${neutralSegment.percentage} 1 0`,
                              height: 8,
                              borderRadius: 8,
                              background: neutralSegment.color,
                            }}
                          />
                        )}
                      </div>
                      <div className={classes.progressDivider} />
                    </>
                  )}
                  {negativeSegment.percentage > 0 && (
                    <div
                      style={{
                        flex: `${negativeSegment.percentage} 1 0`,
                        height: 8,
                        borderRadius: "4px 12px 12px 4px",
                        background: negativeSegment.color,
                      }}
                    />
                  )}
                </>
              ) : (
                progressSegments.map((segment, index) => (
                  <div
                    key={index}
                    className={classes.progressSegment}
                    style={{
                      width: `${segment.percentage}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                ))
              )}
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
