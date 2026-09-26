import React from "react";
import { Loader } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import PurpleManIcon from "assets/oms/PurpleMan.png";

const CheckCircleIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10.4" fill="white" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.00012207 12C0.00012207 8.8174 1.2644 5.76516 3.51484 3.51472C5.76528 1.26428 8.81752 0 12.0001 0C15.1827 0 18.235 1.26428 20.4854 3.51472C22.7358 5.76516 24.0001 8.8174 24.0001 12C24.0001 15.1826 22.7358 18.2348 20.4854 20.4853C18.235 22.7357 15.1827 24 12.0001 24C8.81752 24 5.76528 22.7357 3.51484 20.4853C1.2644 18.2348 0.00012207 15.1826 0.00012207 12ZM11.3153 17.136L18.2241 8.4992L16.9761 7.5008L11.0849 14.8624L6.91212 11.3856L5.88812 12.6144L11.3153 17.1376"
      fill="#24A148"
    />
  </svg>
);

const useStyles = makeStyles((theme) => ({
  actionTitle: {
    fontSize: "14px",
    lineHeight: "16px",
    fontWeight: 800,
    color: "#0D152C",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actionCard: {
    width: "100%",
    minHeight: 180,
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "none",
  },
  cardSlot: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    alignSelf: "stretch",
  },
  metricCardSelected: {
    borderRadius: "12px !important",
    border:
      "1px solid var(--Colors-Primary-Border-Default, #4259EE) !important",
    background:
      "linear-gradient(110deg, var(--Colors-Primary-Surface-Subtle, #ECEEFD) 0%, #FFF 48.77%) !important",
    boxShadow: "0 0 18px 5px rgba(0, 0, 0, 0.06) !important",
  },
  actionCardBase: {
    width: "100%",
    minHeight: 180,
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignSelf: "stretch",
    boxShadow: "none",
    gap: "8px",
    cursor: "pointer",
  },
}));

export const LoadingActionCard = ({
  title,
  description,
  isSelected,
  onClick,
}) => {
  const classes = useStyles();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`${classes.actionCardBase} ${
        isSelected ? classes.metricCardSelected : ""
      }`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={PurpleManIcon}
            alt="icon"
            style={{ width: 24, height: 24 }}
          />
        </div>
        <div className={classes.actionTitle}>{title}</div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "24px 12px",
          borderRadius: 8,
          background:
            "linear-gradient(90deg, rgba(221, 215, 243, 0.20) 0%, #EAFBFF 100%)",
        }}
      >
        <Loader progress="100%" size="small" text="" />
        <div style={{ color: "#60697D", fontSize: 14, lineHeight: "20px" }}>
          {description}
        </div>
      </div>
    </div>
  );
};

export const CompletedActionCard = ({
  title,
  completionMessage = "Optimization Complete",
  isSelected,
  onClick,
}) => {
  const classes = useStyles();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`${classes.actionCardBase} ${
        isSelected ? classes.metricCardSelected : ""
      }`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={PurpleManIcon}
            alt="icon"
            style={{ width: 24, height: 24 }}
          />
        </div>
        <div className={classes.actionTitle}>{title}</div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          borderRadius: 8,
          background:
            "linear-gradient(101deg, rgba(235, 247, 241, 0.40) 39.14%, rgba(174, 218, 196, 0.40) 124.35%)",
          gap: 12,
        }}
      >
        <CheckCircleIcon />
        <div
          style={{
            color: "#60697D",
            fontSize: 16,
            lineHeight: "24px",
            fontWeight: 500,
          }}
        >
          {completionMessage}
        </div>
      </div>
    </div>
  );
};

// Skeleton loader component for metric cards
export const MetricCardSkeleton = () => {
  const classes = useStyles();

  return (
    <div className={classes.cardSlot}>
      <div
        className={classes.actionCard}
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Loader progress="100%" showSkeleton size="small" text="" />
      </div>
    </div>
  );
};
