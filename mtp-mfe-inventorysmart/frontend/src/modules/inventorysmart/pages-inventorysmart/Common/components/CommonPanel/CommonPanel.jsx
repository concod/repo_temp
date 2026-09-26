import React from "react";
import { makeStyles } from "@mui/styles";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { Button } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  panelContainer: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    minWidth: (props) => props.width || 608,
    width: (props) => props.width || 608,
    height: (props) => props.height || "auto",
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECEEFD",
    padding: "12px 16px",
    height: 48,
    "& .panel-header-text": {
      fontFamily: "Manrope",
      fontSize: "16px",
      fontWeight: 800,
      lineHeight: "24px",
      color: "#0D152C",
      textTransform: "capitalize",
    },
  },
  closeButton: {
    padding: "8px !important",
    borderRadius: "8px !important",
    maxHeight: 32,
    maxWidth: 32,
    "& svg": {
      fontSize: "16px",
      color: "#606A7D",
    },
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: "12px 16px",
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 12,
    "& .footer-divider": {
      width: "100%",
      height: 1,
      backgroundColor: "#D9DDE7",
    },
    "& .footer-actions": {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 12,
      padding: "0 16px",
    },
  },
}));

const CommonPanel = ({
  headerText = "Panel Title",
  width,
  height,
  children,
  onClose,
  primaryButtonLabel,
  secondaryButtonLabel,
  onPrimaryButtonClick,
  onSecondaryButtonClick,
  showFooter = true,
  showHeader = true,
  primaryButtonDisabled = false,
}) => {
  const classes = useStyles({ width, height });

  return (
    <div className={classes.panelContainer}>
      {showHeader && (
        <div className={classes.header}>
          <span className="panel-header-text">{headerText}</span>
          {onClose && (
            <IconButton className={classes.closeButton} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </div>
      )}

      <div className={classes.body}>{children}</div>

      {showFooter && (primaryButtonLabel || secondaryButtonLabel) && (
        <div className={classes.footer}>
          <div className="footer-divider" />
          <div className="footer-actions">
            {secondaryButtonLabel && (
              <Button onClick={onSecondaryButtonClick} variant="url">
                {secondaryButtonLabel}
              </Button>
            )}
            {primaryButtonLabel && (
              <Button
                onClick={onPrimaryButtonClick}
                disabled={primaryButtonDisabled}
              >
                {primaryButtonLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonPanel;
