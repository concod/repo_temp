import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import { Tooltip, useTranslation } from "impact-ui-v3";
import AlertsIcon from "../../../../../assets/impactv3/alerts_bell_icon.svg";
import PlansIcon from "../../../../../assets/impactv3/plans_icon.svg";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: "4px 20px",
    background: "#F8F9FB",
    boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12)",
    borderRadius: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  plansTooltipContainer: {
    color: "#F5F5F5",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
  },
  plansTooltipContainerHeading: {
    marginBottom: "20px",
  },
  alertsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontFamily: "Manrope",
  },
  alertIcon: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "24px",
    color: "#60697D",
    "& svg": {
      marginLeft: "6px",
      marginRight: "6px"
    }
  },
  statsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: 0,
  },
  statPanel: {
    display: "flex",
    alignItems: "center",
    background: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    minWidth: "108px",
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
    marginRight: "4px"
  },
  value: {
    color: "#1F2B4D",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    textAlign: "right",
  },
  overallPanel: {
    borderLeft: "2px solid #3B898D", 
  },
  resolvedPanel: {
    borderLeft: "2px solid #5C4657", 
  },
  pendingPanel: {
    borderLeft: "2px solid #FF5252", 
  },
  createdPanel: {
    borderLeft: "2px solid #7552AD",
  },
  draftPanel: {
    borderLeft: "2px solid #E74B1C",
  },
  orderBatchPanel: {
    borderLeft: "2px solid #4271AE", 
  },
}));

const getToolTipTitle = (value, classes) => {
  if (!Object.keys(value).length) return null;
  return (
    <div className={classes.plansTooltipContainer}>
      <div className={classes.plansTooltipContainerHeading}>Overall: {value.Overall?.toLocaleString() || "0"}</div>
      {Object.keys(value).map((item) => item !== "Overall" && (
        <div key={item}>{item} - {value[item]?.toLocaleString() || "0"}</div>
      ))}
    </div>
  )
}

export const getValueForKPIPlans = (value) => {
  if (Object.keys(value).length) {
    return value.Overall?.toLocaleString();
  }
  return value?.toLocaleString();
}

const KPIAlertsData = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();

  const getPanelClass = (label) => {
    switch (label) {
      case "Overall":
        return classes.overallPanel;
      case "Created":
        return classes.createdPanel;
      case "Resolved":
      case "Reviewed":
        return classes.resolvedPanel;
      case "Moved to Order Batching":
      case "Moved to Allocation Batching":
      case "Moved to batching":
      case "Moved to OB":
        return classes.orderBatchPanel;
      case "Draft":
        return classes.draftPanel;
      case "Pending":
      case "Uploaded":
        return classes.pendingPanel;
      default:
        // Config-driven labels like "Move to Allocation Batching"
        if (/^move(d)? to /i.test(label)) return classes.orderBatchPanel;
        return "";
    }
  };

  const getTranslatedLabel = (label) => {
    switch (label) {
      case "Overall":
        return t("inventorysmart.kpiAlertOverall");
      case "Created":
        return t("inventorysmart.kpiAlertCreated");
      case "Resolved":
        return t("inventorysmart.kpiAlertResolved");
      case "Reviewed":
        return t("inventorysmart.kpiAlertReviewed");
      case "Moved to Order Batching":
      case "Moved to Allocation Batching":
      case "Moved to batching":
      case "Moved to OB":
        return label;
      case "Draft":
        return t("inventorysmart.kpiAlertDraft");
      case "Pending":
        return t("inventorysmart.kpiAlertPending");
      case "Uploaded":
        return t("inventorysmart.kpiAlertUploaded");
      default:
        return label;
    }
  };
  const getIcon = (type) => {
    switch (type) {
      case "Alerts":
        return <AlertsIcon alt="Alerts" />
      case "Plans":
        return <PlansIcon alt="Allocation Plans" />
      default:
        return <AlertsIcon alt="Alerts" />
    }
  }
  

  return (
    <div className={classes.container}>
      <div className={classes.alertsContainer}>
        <div className={classes.alertIcon}>
          {getIcon(props?.data?.type)}
          <span>{props?.data?.label}</span>
        </div>

        <div className={classes.statsContainer}>
          {props?.data?.data?.map((alert, index) => (
            <div
              key={index}
              className={`${classes.statPanel} ${getPanelClass(alert?.label)}`}
            >
              <Tooltip 
                orientation="top"
                title={getToolTipTitle(alert.value, classes)}
                variant="tertiary"
              >
                <div className={classes.statContent}>
                  <Typography className={classes.label}>
                    {getTranslatedLabel(alert?.label)}
                  </Typography>
                  <Typography className={classes.value}>
                    {getValueForKPIPlans(alert?.value)}
                  </Typography>
                </div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KPIAlertsData;
