import React from "react";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import OptimisationIcon from "../../../../../assets/optimisation.svg";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import CloseIcon from "@mui/icons-material/Close";

const useStyles = makeStyles(() => ({
  optimizeWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    minHeight: "calc(100vh - 200px)",
    backgroundColor: "#FFFFFF",
    margin: "24px auto 0",
    maxWidth: "1200px",
    borderRadius: "12px",
  },
  centerSvg: {
    width: "241px",
    height: "241px",
    minHeight: "180px",
    position: "relative",
    overflow: "hidden",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headingKpiPanel: {
    textAlign: "center",
    marginBottom: "32px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "30px",
    marginBottom: "24px",
  },
  kpisBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  kpi: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    borderRadius: "8px",
    minWidth: "140px",
  },
  kpiIcon: {
    fontSize: "32px !important",
  },
  kpiTextPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  textBold: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1A1A1A",
  },
  textLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#666666",
  },
  operatorIcon: {
    fontSize: "24px !important",
    color: "#666666",
  },
  equalIcon: {
    fontSize: "24px !important",
    color: "#666666",
  },
  dataPointsKpi: {
    minWidth: "180px",
  },
  ctaTextPanel: {
    textAlign: "center",
    marginTop: "32px",
  },
  paragraph: {
    color: "#1F2B4D",
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "20px",
    marginBottom: "16px",
  },
  lightText: {
    color: "#7A8294",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: "800",
    lineHeight: "30px",
    marginBottom: "17px",
    marginTop: "12px",
  },
  bottomCtaContainer: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    marginTop: "24px",
  },
  notificationText: {
    color: "#7A8294",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "20px",
  },
  divider: {
    width: "100%",
    maxWidth: "600px",
    border: "none",
    borderTop: "1px solid #E0E0E0",
    margin: "12px 0 12px 0",
  },
}));

const formatKpiValue = (value) => {
  if (value === "-" || value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  return String(value);
};

export default function DcTransferOptimizationScreen({
  heading = "Optimisation running for recommendation",
  description =
    "It'll take several minutes. You'll get notification once optimisation is completed.",
  secondaryButtonLabel = "Return to Dashboard",
  onSecondaryButtonClick,
  primaryButtonLabel = "Create new DC transfer",
  onPrimaryButtonClick,
  optimizationData = {
    products: 0,
    stores: 0,
    days: 0,
    dataPoints: "-",
  },
}) {
  const classes = useStyles();
  const ImageComponent = OptimisationIcon;

  const kpiConfig = [
    {
      key: "products",
      value: optimizationData.products,
      label: "Products",
      icon: Inventory2OutlinedIcon,
      backgroundColor: "#E3F2FD",
      iconColor: "#1976D2",
    },
    {
      key: "stores",
      value: optimizationData.stores,
      label: "Stores",
      icon: StorefrontOutlinedIcon,
      backgroundColor: "#E8F5E9",
      iconColor: "#388E3C",
    },
    {
      key: "days",
      value: optimizationData.days,
      label: "Days",
      icon: CalendarTodayOutlinedIcon,
      backgroundColor: "#F3E5F5",
      iconColor: "#7B1FA2",
    },
  ];

  const renderKpiCard = (config, index) => {
    const IconComponent = config.icon;
    return (
      <React.Fragment key={config.key}>
        <div
          className={classes.kpi}
          style={{ backgroundColor: config.backgroundColor }}
        >
          <IconComponent
            className={classes.kpiIcon}
            style={{ color: config.iconColor }}
          />
          <div className={classes.kpiTextPanel}>
            <div className={classes.textBold}>
              {formatKpiValue(config.value)}
            </div>
            <div className={classes.textLabel}>{config.label}</div>
          </div>
        </div>
        {index < kpiConfig.length - 1 && (
          <CloseIcon className={classes.operatorIcon} />
        )}
      </React.Fragment>
    );
  };

  return (
    <div className={classes.optimizeWrapper}>
      <div className={classes.centerSvg}>
        <ImageComponent />
      </div>

      <div className={classes.headingKpiPanel}>
        <div className={classes.heading}>{heading}</div>
        <div className={classes.kpisBox}>
          {kpiConfig.map((config, index) => renderKpiCard(config, index))}

          <span className={classes.equalIcon}>=</span>

          <div
            className={`${classes.kpi} ${classes.dataPointsKpi}`}
            style={{ backgroundColor: "#F3E5F5" }}
          >
            <ShowChartIcon
              className={classes.kpiIcon}
              style={{ color: "#9C27B0" }}
            />
            <div className={classes.kpiTextPanel}>
              <div className={classes.textBold}>
                {formatKpiValue(optimizationData.dataPoints)}
              </div>
              <div className={classes.textLabel}>Data points</div>
            </div>
          </div>
        </div>
      </div>

      <div className={classes.ctaTextPanel}>
        <div className={classes.paragraph}>{description}</div>
        <div className={classes.lightText}>OR</div>

        <div className={classes.bottomCtaContainer}>
          {primaryButtonLabel && (
            <Button variant="primary" onClick={onPrimaryButtonClick}>
              {primaryButtonLabel}
            </Button>
          )}
          {secondaryButtonLabel && (
            <Button variant="secondary" onClick={onSecondaryButtonClick}>
              {secondaryButtonLabel}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
