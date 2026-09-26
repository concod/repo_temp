import React, { useState, useEffect } from "react";
import { makeStyles } from "@mui/styles";
import { useSelector } from "react-redux";
import { pxToRem } from "core/Utils/functions/utils";
import AgentIcon from "coreAssets/chatbot/agent_icon.svg";
import MinimizedIconLogo from "coreAssets/chatbot/mimimizedIconLogo.svg";
import MinimizeDashIcon from "coreAssets/chatbot/minimize_dash_icon.svg";
import ExpandFullscreenIcon from "coreAssets/chatbot/expand_fullscreen_icon.svg";
import StepErrorIcon from "coreAssets/chatbot/step_error.svg";
import LoadingCircle from "coreAssets/chatbot/loading_circle.svg";
import ExclamationIcon from "coreAssets/chatbot/exclamation_icon.svg";
import MinimizedAiIcon from "coreAssets/chatbot/minimized_ai_icon.svg";

const useStyles = makeStyles((theme) => ({
  "@keyframes minimizedPulse": {
    "0%": { boxShadow: "4px 5px 29px 0 rgba(75, 81, 115, 0.80)" },
    "50%": { boxShadow: "4px 5px 29px 0 rgba(75, 81, 115, 0.50)" },
    "100%": { boxShadow: "4px 5px 29px 0 rgba(75, 81, 115, 0.80)" },
  },
  "@keyframes spinLoader": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
  "@keyframes spinIcon": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
  "@keyframes heartbeat": {
    "0%": { 
      boxShadow: "0 0 27px 0 rgba(255, 86, 86, 0.2) inset",
      border: "1px solid #F66969"
    },
    "50%": { 
      boxShadow: "0 0 27px 0 rgba(255, 86, 86, 0.59) inset",
      border: "1px solid #F66969"
    },
    "100%": { 
      boxShadow: "0 0 27px 0 rgba(255, 86, 86, 0.2) inset",
      border: "1px solid #F66969"
    },
  },
  fullyMinimizedContainer: {
    position: "fixed",
    bottom: pxToRem(24),
    right: 0,
    zIndex: 1300,
    display: "flex",
    width: pxToRem(35),
    height: pxToRem(35),
    padding: `${pxToRem(8)} ${pxToRem(10)}`,
    justifyContent: "center",
    alignItems: "center",
    gap: pxToRem(8),
    borderRadius: `${pxToRem(8)} 0 0 ${pxToRem(8)}`,
    borderTop: "1px solid #2AC2EE",
    borderBottom: "1px solid #2AC2EE",
    borderLeft: "1px solid #2AC2EE",
    background: "#0D152C",
    cursor: "pointer",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  widgetContainer: {
    position: "fixed",
    bottom: pxToRem(24),
    right: pxToRem(24),
    zIndex: 1300,
    display: "flex",
    width: pxToRem(275),
    flexDirection: "column",
    alignItems: "flex-start",
    borderRadius: pxToRem(12),
    background: "#0D152C",
    boxShadow: "4px 5px 29px 0 rgba(75, 81, 115, 0.80)",
    cursor: "pointer",
    animation: "$minimizedPulse 3s ease-in-out infinite",
  },
  widgetHeader: {
    display: "flex",
    padding: pxToRem(8),
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: `${pxToRem(12)} ${pxToRem(12)} 0 0`,
    border: "1px solid #31416E",
    background: "#0D152C",
  },
  headerLeft: {
    display: "flex",
    padding: pxToRem(8),
    alignItems: "center",
    gap: pxToRem(6),
  },
  headerIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
      "& path": {
        fill: "#FFFFFF",
      },
    },
  },
  headerIconLogo: {
    width: pxToRem(20),
    height: pxToRem(20),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: pxToRem(20),
      height: pxToRem(20),
    },
  },
  headerIconLogoSpin: {
    width: pxToRem(20),
    height: pxToRem(20),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "$spinIcon 2s linear infinite",
    "& svg": {
      width: pxToRem(20),
      height: pxToRem(20),
    },
  },
  headerText: {
    color: "#FFFFFF",
    fontFamily: "Manrope",
    fontSize: pxToRem(12),
    fontWeight: 600,
    lineHeight: pxToRem(16),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  warningIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  minimizeBtn: {
    width: pxToRem(16),
    height: pxToRem(16),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    "& svg": {
      fill: "#FFFFFF",
    },
  },
  widgetContent: {
    display: "flex",
    padding: pxToRem(8),
    flexDirection: "column",
    alignItems: "flex-start",
    gap: pxToRem(12),
    alignSelf: "stretch",
  },
  innerContent: {
    display: "flex",
    padding: pxToRem(8),
    flexDirection: "column",
    alignItems: "flex-start",
    gap: pxToRem(8),
    alignSelf: "stretch",
    borderRadius: pxToRem(8),
    border: "1px solid #31416E",
    background: "#1F2B4D",
  },
  innerContentStepForm: {
    display: "flex",
    padding: pxToRem(8),
    flexDirection: "column",
    alignItems: "flex-start",
    gap: pxToRem(8),
    alignSelf: "stretch",
    borderRadius: pxToRem(8),
    border: "1px solid #F66969",
    background: "#1F2B4D",
    animation: "$heartbeat 2s ease-in-out infinite",
  },
  innerFirstRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
  },
  stepHeaderText: {
    color: "#FFFFFF",
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    fontWeight: 600,
    lineHeight: pxToRem(21),
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: pxToRem(200),
  },
  expandBtn: {
    width: pxToRem(16),
    height: pxToRem(16),
    aspectRatio: "1/1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    flexShrink: 0,
  },
  innerSecondRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
  },
  subHeaderPill: {
    display: "flex",
    maxWidth: pxToRem(164),
    padding: `${pxToRem(2)} ${pxToRem(8)} ${pxToRem(2)} ${pxToRem(4)}`,
    justifyContent: "center",
    alignItems: "center",
    gap: pxToRem(4),
    borderRadius: pxToRem(1000),
    background: "#31416E",
  },
  subHeaderPillStepForm: {
    display: "flex",
    maxWidth: pxToRem(164),
    padding: `${pxToRem(2)} ${pxToRem(8)} ${pxToRem(2)} ${pxToRem(4)}`,
    justifyContent: "center",
    alignItems: "center",
    gap: pxToRem(4),
    borderRadius: pxToRem(1000),
    background: "rgba(225, 85, 84, 0.50)",
  },
  exclamationIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  loaderIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "$spinLoader 1s linear infinite",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
    },
  },
  subHeaderText: {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 1,
    flex: "1 0 0",
    overflow: "hidden",
    color: "#B3BDF8",
    textAlign: "center",
    textOverflow: "ellipsis",
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    fontWeight: 500,
    lineHeight: pxToRem(20),
    textTransform: "capitalize",
  },
  timeText: {
    color: "#B4BAC7",
    fontFamily: "Manrope",
    fontSize: pxToRem(12),
    fontWeight: 500,
    lineHeight: pxToRem(16),
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
}));

const MinimizedChatWidget = ({ onExpand }) => {
  const classes = useStyles();
  const minimizedStreamData = useSelector(
    (state) => state.smartBotReducer.minimizedStreamData
  );
  const [elapsedTime, setElapsedTime] = useState("");
  const [isFullyMinimized, setIsFullyMinimized] = useState(false);

  useEffect(() => {
    if (!minimizedStreamData?.streamStartTime || !minimizedStreamData?.isStreaming) {
      if (!minimizedStreamData?.isStreaming && minimizedStreamData?.streamStartTime) {
        const elapsed = Math.floor(
          (Date.now() - minimizedStreamData.streamStartTime) / 1000
        );
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setElapsedTime(`${mins}m:${String(secs).padStart(2, "0")}s`);
      }
      return;
    }

    const updateElapsed = () => {
      const elapsed = Math.floor(
        (Date.now() - minimizedStreamData.streamStartTime) / 1000
      );
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins}m:${String(secs).padStart(2, "0")}s`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [minimizedStreamData?.streamStartTime, minimizedStreamData?.isStreaming]);

  if (!minimizedStreamData) return null;

  const {
    isStreaming,
    stepHeader = "Processing",
    stepSubHeader = "",
    stepStatus,
    actionCount = 1,
  } = minimizedStreamData;

  // Don't show the minimized widget once streaming is completed
  if (!isStreaming && stepStatus !== "step_form") return null;

  const actionLabel = actionCount > 0
    ? `${actionCount} Action${actionCount > 1 ? "s" : ""} in progress...`
    : "Action in progress...";
  const isCompleted = stepStatus === "completed" && !isStreaming;

  const handleExpandClick = (e) => {
    e.stopPropagation();
    onExpand?.();
  };

  const handleMinimizeClick = (e) => {
    e.stopPropagation();
    setIsFullyMinimized(true);
  };

  const handleFullyMinimizedClick = () => {
    setIsFullyMinimized(false);
  };

  if (isFullyMinimized) {
    return (
      <div className={classes.fullyMinimizedContainer} onClick={handleFullyMinimizedClick}>
        <MinimizedAiIcon />
      </div>
    );
  }

  return (
    <div className={classes.widgetContainer} onClick={handleExpandClick}>
      {/* Header */}
      <div className={classes.widgetHeader}>
        <div className={classes.headerLeft}>
          <div className={!isCompleted ? classes.headerIconLogoSpin : classes.headerIconLogo}>
            <MinimizedIconLogo />
          </div>
          <span className={classes.headerText}>
            {isCompleted ? "Action completed" : actionLabel}
          </span>
          {!isCompleted && (
            <div className={classes.warningIcon}>
              <StepErrorIcon />
            </div>
          )}
        </div>
        <button
          className={classes.minimizeBtn}
          onClick={handleMinimizeClick}
          aria-label="Minimize"
        >
          <MinimizeDashIcon />
        </button>
      </div>

      {/* Content */}
      <div className={classes.widgetContent}>
        <div className={stepStatus === "step_form" ? classes.innerContentStepForm : classes.innerContent}>
          {/* First row: step header + expand icon */}
          <div className={classes.innerFirstRow}>
            <span className={classes.stepHeaderText} title={stepHeader}>
              {stepHeader}
            </span>
            <button
              className={classes.expandBtn}
              onClick={handleExpandClick}
              aria-label="Expand chatbot"
            >
              <ExpandFullscreenIcon />
            </button>
          </div>

          {/* Second row: sub-header with loader/exclamation + time */}
          {stepSubHeader && (
            <div className={classes.innerSecondRow}>
              <div className={stepStatus === "step_form" ? classes.subHeaderPillStepForm : classes.subHeaderPill}>
                {stepStatus === "step_form" ? (
                  <div className={classes.exclamationIcon}>
                    <ExclamationIcon />
                  </div>
                ) : !isCompleted && (
                  <div className={classes.loaderIcon}>
                    <LoadingCircle />
                  </div>
                )}
                <span className={classes.subHeaderText} title={stepSubHeader}>
                  {stepSubHeader}
                </span>
              </div>
              {elapsedTime && (
                <span className={classes.timeText}>{elapsedTime}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinimizedChatWidget;
