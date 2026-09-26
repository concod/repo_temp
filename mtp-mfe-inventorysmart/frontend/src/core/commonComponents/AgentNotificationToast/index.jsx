import React, { useEffect, useState, useCallback } from "react";
import { makeStyles } from "@mui/styles";
import { Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
const NotificationIcon = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="11" fill="#F57C00" />
    <rect x="11" y="6" width="2" height="7" rx="1" fill="#FFFFFF" />
    <circle cx="12" cy="16.5" r="1.25" fill="#FFFFFF" />
  </svg>
);

const useStyles = makeStyles(() => ({
  toastContainer: {
    position: "fixed",
    top: 60,
    right: 8,
    zIndex: 1400,
    display: "flex",
    width: 384,
    minWidth: 370,
    padding: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderRadius: 8,
    border: "1px solid #F6CCCC",
    background:
      "linear-gradient(105deg, var(--Colors-Error-Surface-Subtle, #FCEEEE) 5.87%, #FFF 36.7%)",
    boxShadow: "0 10px 26px 5px rgba(0, 0, 0, 0.12)",
    animation: "$slideIn 0.3s ease-out",
  },
  "@keyframes slideIn": {
    from: {
      opacity: 0,
      transform: "translateX(100%)",
    },
    to: {
      opacity: 1,
      transform: "translateX(0)",
    },
  },
  "@keyframes slideOut": {
    from: {
      opacity: 1,
      transform: "translateX(0)",
    },
    to: {
      opacity: 0,
      transform: "translateX(100%)",
    },
  },
  slideOut: {
    animation: "$slideOut 0.3s ease-in forwards",
  },
  contentWrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
    overflow: "hidden",
  },
  errorIcon: {
    width: 18,
    height: 18,
    minWidth: 18,
    marginTop: 2,
  },
  textWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    overflow: "hidden",
    flex: 1,
  },
  title: {
    fontFamily: "Manrope",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "16px",
    color: "var(--Colors-Primary-Surface-Default, #1A1A1A)",
    textTransform: "capitalize",
  },
  message: {
    fontFamily: "Manrope",
    fontSize: 12,
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
    color: "#666",
    textTransform: "capitalize",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-word",
  },
  actionsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  reviewButton: {
    fontFamily: "Manrope",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "16px",
    color: "var(--Colors-Primary-Surface-Default, #1A1A1A)",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    background: "none",
    border: "none",
    padding: 0,
    "&:hover": {
      textDecoration: "underline",
    },
  },
  closeButton: {
    padding: 2,
    color: "#666",
  },
}));

const AgentNotificationToast = () => {
  const classes = useStyles();
  const [notification, setNotification] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setNotification(null);
      setIsClosing(false);
    }, 300);
  }, []);

  const handleReview = useCallback(() => {
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    const handleNotification = (event) => {
      setNotification(event.detail);
      setIsClosing(false);
    };

    window.addEventListener("agent-notification", handleNotification);
    return () => {
      window.removeEventListener("agent-notification", handleNotification);
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      className={`${classes.toastContainer} ${
        isClosing ? classes.slideOut : ""
      }`}
    >
      <div className={classes.contentWrapper}>
        <NotificationIcon className={classes.errorIcon} />
        <div className={classes.textWrapper}>
          {/* <Typography className={classes.title}>
            User Input Required To Proceed
          </Typography> */}
          <Typography className={classes.message}>
            {notification.message}
          </Typography>
        </div>
      </div>
      <div className={classes.actionsWrapper}>
        {/* <button className={classes.reviewButton} onClick={handleReview}>
          Review
        </button> */}
        <IconButton
          className={classes.closeButton}
          size="small"
          onClick={handleClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};

export default AgentNotificationToast;
