import React, { useRef, useState, useEffect, memo } from "react";
import "./AISummaryCard.css";
import AI from "assets/AI.png";
import Loader from "core/Utils/Loader/loader";
import {
  getSafeTypographyStyle,
  transformApiResponse,
} from "./AISummaryContent";
import { Tooltip, Alert } from "impact-ui-v3";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

const buildSegments = (text = "") => {
  if (!text) return [{ type: "text", value: "" }];

  const segments = [];

  // Match [[anything]]
  const regex = /\[\[(.*?)\]\]/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;

    // normal text before [[...]]
    if (start > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, start),
      });
    }

    // extract ID inside [[ ]]
    const uniqueId = match[1];

    segments.push({
      type: "button",
      value: "i",
      id: uniqueId,
    });

    lastIndex = end;
  }

  // remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments;
};

// Defined at module level so its reference is stable across renders of the
// parent. If it were defined inside AISummaryPanelBackendContent, React would
// treat it as a new component type on every render and unmount/remount all
// instances, restarting the typewriter animation.
const TypewriterText = ({
  text = "",
  blockIndex,
  activeIndex,
  completedBlocks,
  setCompletedBlocks,
  setActiveIndex,
  getTooltipContent,
}) => {
  const [visibleUnits, setVisibleUnits] = useState(0);
  const segments = buildSegments(text);

  const totalUnits = segments.reduce(
    (sum, segment) =>
      sum + (segment.type === "button" ? 1 : segment.value.length),
    0
  );

  const isActive = blockIndex === activeIndex;
  const isCompleted = completedBlocks.includes(blockIndex);

  useEffect(() => {
    if (!isActive) return;

    setVisibleUnits(0);

    let units = 0;
    const interval = setInterval(() => {
      units += 1;
      setVisibleUnits(units);

      if (units >= totalUnits) {
        clearInterval(interval);
        setCompletedBlocks((prev) => [...prev, blockIndex]);
        setActiveIndex((prev) => prev + 1);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [isActive, text, totalUnits, blockIndex]);

  const renderVisibleContent = (unitsToShow) => {
    let remaining = unitsToShow;
    const nodes = [];

    segments.forEach((segment, index) => {
      if (remaining <= 0) return;

      if (segment.type === "text") {
        const visibleText = segment.value.slice(0, remaining);

        if (visibleText) {
          nodes.push(
            <React.Fragment key={`text-${blockIndex}-${index}`}>
              {visibleText}
            </React.Fragment>
          );
        }

        remaining -= visibleText.length;
      } else if (segment.type === "button") {
        nodes.push(
          <Tooltip
            key={`tooltip-${blockIndex}-${index}`}
            title={getTooltipContent(segment.id)}
            variant="secondary"
          >
            <button
              key={`btn-${blockIndex}-${index}`}
              type="button"
              className="alan-inline-info-btn"
              data-id={segment.id}
              title={segment.id}
            >
              i
            </button>
          </Tooltip>
        );
        remaining -= 1;
      }
    });

    return nodes;
  };

  const unitsToRender = isCompleted ? totalUnits : visibleUnits;

  return (
    <span>
      {renderVisibleContent(unitsToRender)}
      {isActive && unitsToRender < totalUnits && (
        <span className="typing-cursor">|</span>
      )}
    </span>
  );
};

function AISummaryPanelBackendContent({
  content,
  loading,
  error,
}) {
  const data = content || {};
  const tooltipData = data?.tooltip || data?.summary?.tooltip || [];

  const transformedData = transformApiResponse(data);

  const wordIndexRef = useRef(0);

  wordIndexRef.current = 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const [completedBlocks, setCompletedBlocks] = useState([]);
  const [showCopyAlert, setShowCopyAlert] = useState(false);
  const blockCounterRef = useRef(0);
  const tooltipContentRef = useRef(null);

  const useStyles = makeStyles(() => ({
    actionIcon: {
      width: pxToRem(16),
      height: pxToRem(16),
      cursor: "pointer",
    },
    actionIconColor: {
      color: colours.neutrals,
    },
    alertContainer: {
      position: "fixed",
      top: "40px",
      right: "20px",
      zIndex: "999999",
    },
    // Tooltip styles
    tooltipNoData: {
      padding: "8px",
      color: "#6c757d",
    },
    tooltipContainer: {
      minWidth: "300px",
      maxWidth: "500px",
    },
    tooltipHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#f8f9fa",
    },
    tooltipTitle: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#0d152c",
    },
    tooltipIconBtn: {
      width: "24px",
      height: "24px",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    tooltipContent: {
      maxHeight: "200px",
      overflowY: "auto",
      padding: "12px",
      fontSize: "12px",
      lineHeight: "1.4",
      color: "#1f2b4d",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    // List styles
    listItem: {
      listStyleType: "none",
    },
    numberedListItem: {
      listStyleType: "decimal",
    },
    bulletListItem: {
      listStyleType: "disc",
    },
    // Tooltip content styles
    tooltipEntry: {
      marginBottom: "8px",
    },
    tooltipKey: {
      fontWeight: "600",
      marginBottom: "4px",
    },
    tooltipValue: {
      marginLeft: "16px",
      position: "relative",
    },
    tooltipBullet: {
      position: "absolute",
      left: "-8px",
    },
    scrollCta: {
      margin: "8px 12px",
      padding: "4px 8px",
      fontSize: "11px",
      textAlign: "center",
      border: "1px solid #d3d3d3",
      borderRadius: "4px",
      cursor: "pointer",
      background: "transparent",
    },
  }));

  const classes = useStyles();

  blockCounterRef.current = 0;

  const isBlockVisible = (blockIndex) =>
    completedBlocks.includes(blockIndex) || activeIndex === blockIndex;

  const renderFormattedItem = (item) => {
    const parts = item.split("|").map((p) => p.trim());

    let size = "";
    let store = "";

    parts.forEach((part) => {
      const [key, value] = part.split(":");
      if (key === "Size") size = value;
      if (key === "Store") store = value;
    });

    return (
      <div style={{ display: "flex", gap: "40px" }}>
        <span>
          <strong>Size:</strong> {size}
        </span>
        <span>
          <strong>Store:</strong> {store}
        </span>
      </div>
    );
  };

  const handleCopy = async (infoId) => {
    const tooltipInfo = tooltipData?.find((item) => item.id === infoId);

    if (!tooltipInfo || !tooltipInfo.data) return;

    const entries = Object.entries(tooltipInfo.data);
    const text = entries
      .map(([key, value], index) => {
        let text = `${index + 1}. ${key}\n`;
        if (value) {
          value.split(",").forEach((item) => {
            text += `   • ${item.trim()},\n`;
          });
        } else {
          text += `   • No value available,\n`;
        }
        return text;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const getTooltipContent = (infoId) => {
    const tooltipInfo = tooltipData?.find((item) => item.id === infoId);

    if (!tooltipInfo || !tooltipInfo.data) {
      return <div className={classes.tooltipNoData}>No data available.</div>;
    }

    const entries = Object.entries(tooltipInfo.data);
    if (entries.length === 0) {
      return <div className={classes.tooltipNoData}>No data available.</div>;
    }

    const totalLines = entries.reduce((count, [_, value]) => {
      if (!value) return count + 1; // "No value available"

      return count + value.split(",").length;
    }, 0);

    const showScrollText = totalLines > 14;

    return (
      <div className={classes.tooltipContainer}>
        {/* Header */}
        <div className={classes.tooltipHeader}>
          <div className={classes.tooltipTitle}>Details</div>
          <div
            className={`tc-iconBtn ${classes.tooltipIconBtn}`}
            onClick={() => handleCopy(infoId)}
            title="Copy to clipboard"
          >
            <ContentCopyIcon
              fontSize="small"
              className={`${classes.actionIcon} ${classes.actionIconColor}`}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div>
          {/* Scroll CTA */}
          <div ref={tooltipContentRef} className={classes.tooltipContent}>
            {entries.map(([key, value], index) => (
              <div key={key} className={classes.tooltipEntry}>
                <div className={classes.tooltipKey}>
                  {index + 1}. {key}
                </div>
                {value && (
                  <>
                    {value.split(",").map((item, itemIndex) => (
                      <div key={itemIndex} className={classes.tooltipValue}>
                        <span className={classes.tooltipBullet}>•</span>
                        {renderFormattedItem(item)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
          {showScrollText && (
            <div onClick={scrollToBottom} className={classes.scrollCta}>
              Scroll down to see full list ↓
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTypingText = (text = "") => {
    const currentIndex = blockCounterRef.current++;

    return {
      elements: (
        <TypewriterText
          text={text}
          blockIndex={currentIndex}
          activeIndex={activeIndex}
          completedBlocks={completedBlocks}
          setCompletedBlocks={setCompletedBlocks}
          setActiveIndex={setActiveIndex}
          getTooltipContent={getTooltipContent}
        />
      ),
      startIndex: 0,
      blockIndex: currentIndex,
    };
  };

  const renderContent = (content) => {
    if (!content) return null;

    // Paragraph
    if (content.type === "paragraph") {
      const { elements, blockIndex } = renderTypingText(content.text);

      if (!isBlockVisible(blockIndex)) return null;

      return (
        <div className="ais-summaryWrapper typing-container">
          <div
            className="ais-value"
            style={getSafeTypographyStyle(content.style)}
          >
            {elements}
          </div>
        </div>
      );
    }

    // Bullet list
    if (content.type === "list") {
      const firstIndex = blockCounterRef.current;
      if (!isBlockVisible(firstIndex)) return null;

      return (
        <ul className="ais-recoList bullet">
          {content.items?.filter(Boolean).map((item, i) => {
            const { elements, blockIndex } = renderTypingText(item);

            const showBullet =
              completedBlocks.includes(blockIndex) ||
              activeIndex === blockIndex;

            return (
              <li
                key={i}
                className={`typing-container ${
                  showBullet ? classes.bulletListItem : classes.listItem
                }`}
                style={getSafeTypographyStyle(content.itemStyle)}
              >
                {elements}
              </li>
            );
          })}
        </ul>
      );
    }

    // Numbered list
    if (content.type === "numbered") {
      const firstIndex = blockCounterRef.current;
      if (!isBlockVisible(firstIndex)) return null;

      return (
        <ol className="ais-recoList numbered">
          {content.items?.map((item, i) => {
            const { elements, blockIndex } = renderTypingText(item.title);

            const showNumber =
              completedBlocks.includes(blockIndex) ||
              activeIndex === blockIndex;

            return (
              <li
                key={i}
                className={`typing-container ${
                  showNumber ? classes.numberedListItem : classes.listItem
                }`}
              >
                <div
                  className="ais-subTitle"
                  style={getSafeTypographyStyle(item.titleStyle)}
                >
                  {elements}
                </div>

                {item.children && (
                  <ul className="ais-recoList bullet">
                    {item.children?.filter(Boolean).map((child, j) => {
                      const {
                        elements,
                        blockIndex: childIndex,
                      } = renderTypingText(child);

                      const showChildBullet =
                        completedBlocks.includes(childIndex) ||
                        activeIndex === childIndex;

                      return (
                        <li
                          key={j}
                          className={`typing-container ${
                            showChildBullet
                              ? classes.bulletListItem
                              : classes.listItem
                          }`}
                          style={getSafeTypographyStyle(item.childStyle)}
                        >
                          {elements}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      );
    }

    return null;
  };

  const scrollToBottom = () => {
    if (tooltipContentRef.current) {
      tooltipContentRef.current.scrollTo({
        top: tooltipContentRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="ais-card">
      <div className="ais-header">
        <div className="ais-headerRow">
          <div className="ais-lineLeft"></div>

          <div className="ais-pill">
            <img src={AI} alt="AI Icon" className="ais-aiIcon" />
            <span className="ais-pillText">Generated by Iris</span>
          </div>

          <div className="ais-lineRight"></div>
        </div>
      </div>

      <div className="ais-body">
        {loading && (
          <div className="ai-insights-loader-wrapper">
            <Loader
              loader={true}
              size="medium"
              text="Fetching Iris Summary..."
              minHeight="200px"
              showSkeleton={true}
            />
          </div>
        )}

        {/* Error */}
        {!loading && error && <div className="ais-errorMessage">{error}</div>}
        {!loading &&
          !error &&
          (transformedData?.sections || []).map((sec, idx) => {
            // Title
            if (sec.type === "title") {
              const { elements, blockIndex } = renderTypingText(sec.text);

              if (!isBlockVisible(blockIndex)) return null;

              return (
                <div
                  key={idx}
                  className="ais-mainTitle typing-container"
                  style={getSafeTypographyStyle(sec.style)}
                >
                  {elements}
                </div>
              );
            }

            // Top paragraph
            if (sec.type === "paragraph") {
              const { elements, blockIndex } = renderTypingText(sec.text);

              if (!isBlockVisible(blockIndex)) return null;

              return (
                <div key={idx} className="ais-summaryWrapper typing-container">
                  <div
                    className="ais-value"
                    style={getSafeTypographyStyle(sec.style)}
                  >
                    {elements}
                  </div>
                </div>
              );
            }

            // Section
            if (sec.type === "section") {
              const { elements: headingText, blockIndex } = renderTypingText(
                sec.heading
              );

              if (!isBlockVisible(blockIndex)) return null;

              return (
                <div key={idx} className="ais-item">
                  <div className="ais-categorySection typing-container">
                    <div className="ais-categoryLine"></div>

                    <div className="ais-categoryPill">
                      <span
                        className="ais-highlight"
                        style={getSafeTypographyStyle(sec.headingStyle)}
                      >
                        {headingText}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(sec.content)
                    ? sec.content.map((c, i) => (
                        <React.Fragment key={i}>
                          {renderContent(c)}
                        </React.Fragment>
                      ))
                    : renderContent(sec.content)}
                </div>
              );
            }

            return null;
          })}
      </div>

      {/* Copy Alert */}
      {showCopyAlert && (
        <div className={classes.alertContainer}>
          <Alert
            severity="success"
            description="Copied Successfully"
            subtleBackground={true}
            onClose={() => setShowCopyAlert(false)}
          />
        </div>
      )}
    </div>
  );
}

export default memo(AISummaryPanelBackendContent);
