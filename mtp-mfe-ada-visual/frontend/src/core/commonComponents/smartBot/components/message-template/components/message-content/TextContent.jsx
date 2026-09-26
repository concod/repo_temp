import { useState } from "react";
import { Typography, Collapse } from "@mui/material";
import { TextRenderer } from "../../../TextRenderer.jsx";
import { useStyles } from "../../../../styling.jsx";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";

const useThinkingStyles = makeStyles((theme) => ({
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
  thoughtHeaderText: {
    fontFamily: "Manrope",
    fontSize: pxToRem(12),
    fontWeight: 500,
    color: "#6B7280",
    flex: 1,
  },
  dropdownArrow: {
    fontSize: pxToRem(12),
    color: "#6B7280",
    transition: "transform 0.2s ease",
    "&.expanded": {
      transform: "rotate(180deg)",
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

const TextContent = ({ bodyText, botData }) => {
  const classes = useStyles();
  const thinkingClasses = useThinkingStyles();
  const [isThoughtExpanded, setIsThoughtExpanded] = useState(false);

  // Extract thinking response from botData if available
  const thinkingResponse = botData?.thinkingResponse;

  /**
   * Component for displaying collapsible thought dropdown
   */
  const ThoughtDropdown = ({ thinkingContent, thinkingTime }) => (
    <div className={thinkingClasses.thoughtDropdown}>
      <div 
        className={thinkingClasses.thoughtHeader}
        onClick={() => setIsThoughtExpanded(!isThoughtExpanded)}
      >
        <span className={thinkingClasses.thoughtIcon}>🧠</span>
        <Typography className={thinkingClasses.thoughtHeaderText}>
          Thought for {thinkingTime || 0} second{(thinkingTime || 0) !== 1 ? 's' : ''}
        </Typography>
        <span className={`${thinkingClasses.dropdownArrow} ${isThoughtExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      <Collapse in={isThoughtExpanded}>
        <div className={thinkingClasses.thoughtContent}>
          <Typography className={thinkingClasses.thoughtText}>
            {thinkingContent}
          </Typography>
        </div>
      </Collapse>
    </div>
  );

  const renderTextContent = () => {
    // If the text contains "IA Smart Platform", handle it specially
    if (bodyText?.includes("IA Smart Platform")) {
      const platformIndex = bodyText.indexOf("IA Smart Platform");
      return (
        <Typography variant="div" className={classes.bodyTextStyling}>
          {bodyText.slice(0, platformIndex)}
          <Typography variant="span" sx={{ fontWeight: 600 }}>
            {bodyText.slice(
              platformIndex,
              platformIndex + 18
            )}
          </Typography>
          {bodyText.slice(
            platformIndex + 18,
            bodyText?.length
          )}
        </Typography>
      );
    }

    // For all other cases, use TextRenderer
    return (
      <Typography className={classes.bodyTextStyling}>
        <TextRenderer text={bodyText} />
      </Typography>
    );
  };

  return (
    <div>
      {/* Render main text content */}
      {renderTextContent()}
    </div>
  );
};

export default TextContent;
