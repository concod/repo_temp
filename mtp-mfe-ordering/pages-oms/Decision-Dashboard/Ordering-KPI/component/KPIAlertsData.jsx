import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import AlertsIcon from "assets/impactv3/alerts_bell_icon.svg";
import DonutChart from "assets/impactv3/donut_chart.svg";
import PlansIcon from "assets/impactv3/plans_icon.svg";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: "4px 20px",
    background: "#F8F9FB",
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.12)",
    borderRadius: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  alertsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  alertIcon: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#60697D",
  },
  statsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginLeft: "1rem",
  },
  statPanel: {
    display: "flex",
    alignItems: "center",
    background: "white",
    padding: "4px 12px",
    borderRadius: "4px",
    minWidth: "150px",
  },
  statContent: {
    flex: "1 1 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#60697D",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    marginRight: "10px",
  },
  value: {
    color: "#1F2B4D",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    textAlign: "right",
  },
  overallPanel: {
    borderLeft: "2.5px solid #3B898D", // Tiffany Blue
  },
  resolvedPanel: {
    borderLeft: "2.5px solid #4361EE", // Blue
  },
  pendingPanel: {
    borderLeft: "2.5px solid #FF5252", // Red
  },
}));

const KPIAlertsData = (props) => {
  const classes = useStyles();

  const getPanelClass = (label) => {
    switch (label) {
      case "Overall":
      case "Created":
        return classes.overallPanel;
      case "Resolved":
      case "Reviewed":
        return classes.resolvedPanel;
      case "Pending":
      case "Moved to Order Batching":
      case "Moved to OB":
      case "Uploaded":
      case "Draft":
        return classes.pendingPanel;
      default:
        return "";
    }
  };
  const getIcon = (type) => {
    switch (type) {
      case "Alerts":
        return <AlertsIcon alt="Alerts" />;
      case "Drafts":
        return <PlansIcon alt="Drafts" />;
      default:
        return <AlertsIcon alt="Alerts" />;
    }
  };
  return (
    <div className={classes.container}>
      <div className={classes.alertsContainer}>
        <div className={classes.alertIcon}>
          {getIcon(props?.data?.type)}
          <Typography>{props?.data?.label}</Typography>
        </div>
        {/* <DonutChart alt="Status" /> */}

        <div className={classes.statsContainer}>
          {props?.data?.data?.map((alert, index) => (
            <div
              key={index}
              className={`${classes.statPanel} ${getPanelClass(alert?.label)}`}
            >
              <div className={classes.statContent}>
                <Typography className={classes.label}>
                  {alert?.label}
                </Typography>
                <Typography className={classes.value}>
                  {alert?.value?.toLocaleString()}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KPIAlertsData;
