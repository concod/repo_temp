import React from "react";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
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
  actionCardTop: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  actionCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "& svg": {
      width: 28,
      height: 28,
      display: "block",
    },
    "& img": {
      width: 28,
      height: 28,
      display: "block",
      objectFit: "contain",
    },
  },
  actionTitle: {
    fontSize: "14px",
    lineHeight: "16px",
    fontWeight: 800,
    color: "#0D152C",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actionDescription: {
    fontSize: "14px",
    lineHeight: "24px",
    fontWeight: 500,
    color: "#60697D",
  },
  actionFooter: {
    minHeight: 32,
    borderTop: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    fontSize: 12,
    lineHeight: "14px",
    fontWeight: 500,
    color: "#31416E",
    cursor: "pointer",
  },
  actionFooterMuted: {
    justifyContent: "flex-start",
    cursor: "default",
    color: "#60697D",
  },
  actionFooterIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    fontSize: 12,
    lineHeight: 1,
  },
  actionButton: {
    width: "100%",
    minHeight: 32,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: "14px",
    lineHeight: "14px",
    fontWeight: 500,
    color: "#31416E",
    cursor: "pointer",
    padding: "8px 12px",
    boxSizing: "border-box",
  },
  actionButtonIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    "& svg": {
      width: 12,
      height: 12,
      display: "block",
    },
  },
}));

const ActionCard = ({
  icon,
  iconClassName,
  title,
  description,
  footer,
  onFooterClick,
  footerType = "label",
  isFooterMuted = false,
}) => {
  const classes = useStyles();

  return (
    <div className={classes.actionCard}>
      <div className={classes.actionCardTop}>
        <div className={classes.actionCardHeader}>
          <div className={`${classes.actionIconBox} ${iconClassName}`}>
            {icon}
          </div>
          <div className={classes.actionTitle}>{title}</div>
        </div>
        <div className={classes.actionDescription}>{description}</div>
      </div>

      {footerType === "button" ? (
        <button
          type="button"
          className={classes.actionButton}
          onClick={onFooterClick}
        >
          {footer?.icon && (
            <span className={classes.actionButtonIcon}>{footer.icon}</span>
          )}
          <span>{footer?.label}</span>
        </button>
      ) : (
        <div
          className={`${classes.actionFooter} ${
            isFooterMuted ? classes.actionFooterMuted : ""
          }`}
          onClick={isFooterMuted ? undefined : onFooterClick}
          role={!isFooterMuted && onFooterClick ? "button" : undefined}
        >
          {footer?.icon && (
            <span className={classes.actionFooterIcon}>{footer.icon}</span>
          )}
          <span>{footer?.label}</span>
        </div>
      )}
    </div>
  );
};

export default ActionCard;
