import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import { useSelector } from "react-redux";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";


/**
 * Styles for the ThinkingIndicator component
 * Includes cursor animation and thinking UI styles
 */
const useStyles = makeStyles((theme) => ({
  cursor: {
    display: "inline-block",
    width: pxToRem(4),
    height: pxToRem(16),
    backgroundColor: theme.palette.primary.main,
    marginLeft: pxToRem(2),
    animation: "$blink 1s infinite",
  },
  "@keyframes blink": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0 },
    "100%": { opacity: 1 },
  },
  thoughtDropdown: {
    marginBottom: pxToRem(12),
  },
  thoughtHeader: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(6),
    padding: `${pxToRem(6)} ${pxToRem(8)}`,
    backgroundColor: "#F3F4F6",
    borderRadius: pxToRem(6),
    cursor: "pointer",
    border: "1px solid #E5E7EB",
    "&:hover": {
      backgroundColor: "#E5E7EB",
    },
  },
  thoughtIcon: {
    fontSize: pxToRem(16),
    color: "#6B7280",
  },
  thinkingText: {
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: "#6B7280",
    flex: 1,
  },
  thinkingSpinner: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(2),
    marginLeft: pxToRem(2),
  },
  thinkingDot: {
    width: pxToRem(4),
    height: pxToRem(4),
    backgroundColor: "#6B7280",
    borderRadius: "50%",
    animation: "$dotPulse 1.4s ease-in-out infinite both",
    "&:nth-child(1)": {
      animationDelay: "-0.32s",
    },
    "&:nth-child(2)": {
      animationDelay: "-0.16s",
    },
    "&:nth-child(3)": {
      animationDelay: "0s",
    },
  },
  "@keyframes dotPulse": {
    "0%, 80%, 100%": {
      transform: "scale(0.8)",
      opacity: 0.5,
    },
    "40%": {
      transform: "scale(1)",
      opacity: 1,
    },
  },
  thoughtContent: {
    padding: `${pxToRem(12)} ${pxToRem(16)}`,
    backgroundColor: "#FAFBFC",
    border: "1px solid #E1E4E8",
    borderTop: "none",
    borderRadius: `0 0 ${pxToRem(6)} ${pxToRem(6)}`,
    maxHeight: pxToRem(200),
    overflowY: "auto",
    "&::-webkit-scrollbar": {
      width: pxToRem(4),
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#F1F3F4",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#C1C8CD",
      borderRadius: pxToRem(2),
    },
  },
  thoughtText: {
    fontFamily: "var(--Colors-Neutrals-Text-icon-Label, #6B6B70)",
    fontSize: pxToRem(14),
    fontWeight: 400,
    lineHeight: "22.4px",
    color: "#6B6B70",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
}));

/**
 * ThinkingIndicator Component
 * Displays "Planning next moves" indicator while AI is thinking
 *
 * @param {Object} props - Component props
 * @param {string} props.thinkingContent - Current thinking content being streamed
 */
const ThinkingIndicator = (props) => {
  const {
    // thinkingContent,
    isStreaming = false,
    thinkDone = false,
    renderThinkingLoader = () => {},
    thinkingStarted = false,
  } = props;
  const classes = useStyles();
  const thinkingContext = useSelector((state) => {
    return state.smartBotReducer.thinkingContext;
  });
  const { thinkingContent } = thinkingContext;


  const [thinkingContentState, setThinkingContentState] = useState("");

  useEffect(() => {
    // Always update the thinking content state when it changes
    setThinkingContentState(thinkingContent || "");
  }, [thinkingContent, isStreaming]);

  return (
    <div>
      {/* Thinking header - always expanded during active thinking */}
      {/* <div className={classes.thoughtHeader}>
        <span className={classes.thoughtIcon}>🧠</span>
        <Typography className={classes.thinkingText}>
          Planning next moves
        </Typography>
        <div className={classes.thinkingSpinner}>
          <span className={classes.thinkingDot} />
          <span className={classes.thinkingDot} />
          <span className={classes.thinkingDot} />
        </div>
      </div> */}
      {/* Always show thinking content while actively thinking */}
      <div>
        {/* <Typography className={classes.thoughtText}>
          {thinkingContent ? thinkingContent : "Analyzing your request..."}
        </Typography> */}
        {/* Add a 3-dot loading animation to show active streaming */}
        {thinkingContentState ? (
          <div>
            <TextRenderer text={thinkingContentState} thinking={true}/>
            {/* {renderThinkingLoader()} */}
          </div>
        ) : (
          <div className={classes.thinkingSpinner}>
            <span className={classes.thinkingDot} />
            <span className={classes.thinkingDot} />
            <span className={classes.thinkingDot} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingIndicator;
