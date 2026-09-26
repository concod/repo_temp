import React, { useRef, useEffect, useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { Button, Tooltip as TooltipV3 } from "impact-ui-v3";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useStyles } from "./kpi-styles";
import { getIcons } from "./kpi-icons";
import ArrowLeftIcon from "assets/impactv3/arrow_left.svg";
import ArrowRightIcon from "assets/impactv3/arrow_right.svg";
import EllipsisTooltipWrapper from "../../EllipsisTooltipWrapper";

const CardPanel = ({
  panelData,
  containerClassName,
  renderKpiForGeneric = false,
  customClasses,
}) => {
  const cardData = panelData?.cardData;
  const noSubMetrics = panelData?.noSubMetrics;
  const classes = useStyles();

  const CardComponent = ({ card, index }) => {
    return (
      <div>
        {!noSubMetrics && card?.type === "kpi_details_right_aligned" && (
          <div key={index} className={classes.cardStyles_WithNoSubMetrics}>
            <div className={classes.noSubMetricsFlexContainer}>
              <div
                className={
                  customClasses?.icon_container || classes.icon_container
                }
              >
                {card?.renderIcon
                  ? card?.renderIcon()
                  : getIcons(
                      card?.icon,
                      index,
                      noSubMetrics,
                      renderKpiForGeneric,
                      card?.title
                    )}
              </div>
              <div className={classes.flex_1}>
                <div className={classes.flex_column}>
                  <EllipsisTooltipWrapper
                    title={card?.title}
                    className={classes.noSubMetricsLabelStyles}
                    variant="tertiary"
                    orientation="right"
                  >
                    {card?.title}
                  </EllipsisTooltipWrapper>
                  <div className={classes.rightAlignedContainer}>
                    {/* Actual Value */}
                    <div className={classes.rightAlignedActualRow}>
                      <Typography
                        variant="body2"
                        className={classes.rightAlignedActualLabel}
                      >
                        Actual
                      </Typography>
                      <Typography
                        variant="body2"
                        className={classes.rightAlignedActualValue}
                      >
                        {card?.actualValue}
                      </Typography>
                    </div>
                    {/* Forecast Comparisons */}
                    {card?.comparisons?.map((comparison, idx) => (
                      <div
                        key={idx}
                        className={classes.rightAlignedComparisonRow}
                      >
                        <EllipsisTooltipWrapper
                          title={comparison.label}
                          className={classes.rightAlignedComparisonLabel}
                          variant="tertiary"
                          orientation="right"
                        >
                          <Typography
                            variant="body2"
                            className={classes.rightAlignedComparisonLabel}
                          >
                            {comparison.label}
                          </Typography>
                        </EllipsisTooltipWrapper>
                        <div className={classes.rightAlignedComparisonValues}>
                          <Typography
                            variant="body2"
                            className={classes.rightAlignedForecastValue}
                          >
                            {comparison.value}
                          </Typography>
                          <div className={classes.rightAlignedArrowContainer}>
                            {comparison.isPositive ? (
                              <ArrowUpwardIcon
                                className={`${classes.rightAlignedPositive} ${classes.rightAlignedArrowIcon}`}
                              />
                            ) : (
                              <ArrowDownwardIcon
                                className={`${classes.rightAlignedNegative} ${classes.rightAlignedArrowIcon}`}
                              />
                            )}
                          </div>
                          <Typography
                            variant="body2"
                            className={`${classes.rightAlignedDifferenceText} ${
                              comparison.isPositive
                                ? classes.rightAlignedPositive
                                : classes.rightAlignedNegative
                            }`}
                          >
                            {comparison.difference}({comparison.percentage})
                          </Typography>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!noSubMetrics && card?.type !== "kpi_details_right_aligned" && (
          <div key={index} className={classes.cardStyles_WithSubMetrics}>
            {/* Card Title and Metric Section */}
            <div className={classes.flexContainerStyles}>
              {/* Title and Icon */}
              <div className={classes.flexItemStyles}>
                {card?.renderIcon
                  ? card?.renderIcon()
                  : getIcons(
                      card?.icon,
                      index,
                      noSubMetrics,
                      renderKpiForGeneric,
                      card?.label
                    )}
                {!card?.subTitle && (
                  <EllipsisTooltipWrapper
                    title={card?.title}
                    className={classes.withSubMetricsNoSubTitleTitleStyles}
                    variant="tertiary"
                    orientation="right"
                  >
                    <Typography
                      variant="subtitle1"
                      className={classes.withSubMetricsNoSubTitleTitleStyles}
                    >
                      {card?.title || ""}
                    </Typography>
                  </EllipsisTooltipWrapper>
                )}

                {card?.subTitle && card?.title && (
                  <div className={classes.titleSubTitleFlex}>
                    <EllipsisTooltipWrapper
                      title={card?.title}
                      className={classes.withSubMetricWithSubTitleTitleStyles}
                      variant="tertiary"
                      orientation="right"
                    >
                      <Typography
                        variant="subtitle1"
                        className={classes.withSubMetricWithSubTitleTitleStyles}
                      >
                        {card?.title || ""}
                      </Typography>
                    </EllipsisTooltipWrapper>

                    <Typography
                      variant="subtitle1"
                      className={classes.withSubMetircsSubtitleStyles}
                    >
                      {card?.subTitle || "-"}
                    </Typography>
                  </div>
                )}
              </div>

              {/* Metric Box */}
              {card?.metric && (
                <div className={classes.metricStyles}>{card?.metric}</div>
              )}
            </div>

            {/* Conditional rendering for sub-metrics */}
            {card?.subMetrics.length === 1 ? (
              <div className={classes.singleSubMetricContainerStyles}>
                {/* Single sub-metric */}
                <Typography
                  variant="body2"
                  className={classes.subMetricsValueStyles}
                >
                  {card.subMetrics[0].value}
                </Typography>
                <EllipsisTooltipWrapper
                  title={card.subMetrics[0]?.label}
                  className={classes.subMetricLabelStyles}
                  variant="tertiary"
                  orientation="right"
                >
                  {card.subMetrics[0]?.label || "-"}
                </EllipsisTooltipWrapper>
              </div>
            ) : (
              <div
                className={`${classes.flexContainerStyles} ${classes.marginTop_10} ${classes.marginLeft_4}`}
              >
                {/* Multiple sub-metrics */}
                {card.subMetrics.map((subMetric, subIndex) => (
                  <React.Fragment key={subIndex}>
                    <div className={classes.flex_1}>
                      <EllipsisTooltipWrapper
                        title={subMetric.label}
                        className={classes.subMetricLabelStyles}
                        variant="tertiary"
                        orientation="right"
                      >
                        {subMetric.label || "-"}
                      </EllipsisTooltipWrapper>
                      <div className={classes.flex_center}>
                        <Typography
                          variant="body2"
                          className={`${classes.subMetricsValueStyles} ${classes.marginRight_10}`}
                        >
                          {subMetric.value}
                        </Typography>
                        {subMetric.positiveTrend && (
                          <Typography
                            variant="body2"
                            className={`${classes.trendTextStyles} ${classes.upTrendStyles}`}
                          >
                            {subMetric.positiveTrend}
                          </Typography>
                        )}
                        {subMetric.negetiveTrend && (
                          <Typography
                            variant="body2"
                            className={`${classes.trendTextStyles} ${classes.downTrendStyles}`}
                          >
                            {subMetric.negetiveTrend}
                          </Typography>
                        )}

                        {subMetric?.positiveTrend && (
                          <ArrowUpwardIcon
                            className={`${classes.trendTextStyles} ${classes.upTrendStyles}`}
                          />
                        )}
                        {subMetric?.negetiveTrend && (
                          <ArrowDownwardIcon
                            className={`${classes.trendTextStyles} ${classes.downTrendStyles}`}
                          />
                        )}
                      </div>
                    </div>
                    {subIndex !== card.subMetrics.length - 1 && (
                      <div className={classes.verticalSeparator}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
        {noSubMetrics && (
          <div key={index} className={classes.cardStyles_WithNoSubMetrics}>
            <div className={classes.noSubMetricsFlexContainer}>
              <div
                className={
                  customClasses?.icon_container || classes.icon_container
                }
              >
                {card?.renderIcon
                  ? card?.renderIcon()
                  : getIcons(
                      card?.icon,
                      index,
                      noSubMetrics,
                      renderKpiForGeneric,
                      card?.label
                    )}
              </div>
              <div className={classes.flex_1}>
                <div className={classes.flex_column}>
                  <EllipsisTooltipWrapper
                    title={card?.label}
                    className={classes.noSubMetricsLabelStyles}
                    variant="tertiary"
                    orientation="right"
                  >
                    {card?.label}
                  </EllipsisTooltipWrapper>
                  <div className={classes.flex_row}>
                    <EllipsisTooltipWrapper
                      title={card?.value}
                      className={classes.noSubMertricsValueStyles}
                      variant="tertiary"
                      orientation="right"
                    >
                      {card?.value}
                    </EllipsisTooltipWrapper>
                    <div className={classes.noSubMetricsUnitsStyle}>
                      {card?.units}
                    </div>
                    {card?.percentageDifference && (
                      <div
                        style={{
                          color: "#FF0000",
                          fontSize: "12px",
                          marginLeft: "8px",
                          alignSelf: "center",
                        }}
                      >
                        {card.percentageDifference}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const scrollRef = useRef();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;

    const children = Array.from(container.children);
    if (!children.length) return;

    const { scrollLeft, clientWidth, scrollWidth } = container;
    const style = window.getComputedStyle(container);
    const leftPadding = parseFloat(style.paddingLeft);

    // Offset to account for card gap/margins so the next card aligns neatly after scrolling
    const PADDING = container.offsetLeft + leftPadding + 1; // outer container padding + inner container padding

    let targetLeft = scrollLeft;

    if (direction === "right") {
      // Find the first card whose left edge is *after* the current scrollLeft
      const nextChild = children.find(
        (child) => child.offsetLeft > scrollLeft + PADDING
      );

      if (nextChild) {
        targetLeft = nextChild.offsetLeft - PADDING;
      } else {
        // If none found, go to max scroll
        targetLeft = scrollWidth - clientWidth;
      }
    } else {
      // direction === "left"
      // Find the last card whose left edge is *before* current scrollLeft
      const prevChildren = children.filter(
        (child) => child.offsetLeft < scrollLeft - PADDING
      );

      if (prevChildren.length) {
        const prevChild = prevChildren[prevChildren.length - 1];
        targetLeft = prevChild.offsetLeft - PADDING;
      } else {
        // If none found, snap to start
        targetLeft = 0;
      }
    }

    container.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
  };

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
      // Small epsilon to avoid floating-point scroll inaccuracies (Chrome/Safari rounding issues)
      const EPS = 2;

      setIsScrollable(scrollWidth > clientWidth + EPS);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollButtons();

    const observer = new ResizeObserver(() => {
      updateScrollButtons();
    });

    observer.observe(el);
    el.addEventListener("scroll", updateScrollButtons);

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollButtons);
    };
  }, [cardData.length, expanded]);

  const sortedCardData =
    expanded && !noSubMetrics
      ? [...cardData].sort((a, b) => a.subMetrics.length - b.subMetrics.length) // Sort in ascending order based on the number of sub-metrics
      : cardData;

  const expandSvg = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 17H10C10.2833 17 10.5208 17.0958 10.7125 17.2875C10.9042 17.4792 11 17.7167 11 18C11 18.2833 10.9042 18.5208 10.7125 18.7125C10.5208 18.9042 10.2833 19 10 19H6C5.71667 19 5.47917 18.9042 5.2875 18.7125C5.09583 18.5208 5 18.2833 5 18V14C5 13.7167 5.09583 13.4792 5.2875 13.2875C5.47917 13.0958 5.71667 13 6 13C6.28333 13 6.52083 13.0958 6.7125 13.2875C6.90417 13.4792 7 13.7167 7 14V17ZM17 7H14C13.7167 7 13.4792 6.90417 13.2875 6.7125C13.0958 6.52083 13 6.28333 13 6C13 5.71667 13.0958 5.47917 13.2875 5.2875C13.4792 5.09583 13.7167 5 14 5H18C18.2833 5 18.5208 5.09583 18.7125 5.2875C18.9042 5.47917 19 5.71667 19 6V10C19 10.2833 18.9042 10.5208 18.7125 10.7125C18.5208 10.9042 18.2833 11 18 11C17.7167 11 17.4792 10.9042 17.2875 10.7125C17.0958 10.5208 17 10.2833 17 10V7Z"
        fill="#60697D"
      />
    </svg>
  );

  const collapseSvg = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 15H6C5.71667 15 5.47934 14.904 5.288 14.712C5.09667 14.52 5.00067 14.2827 5 14C4.99934 13.7173 5.09534 13.48 5.288 13.288C5.48067 13.096 5.718 13 6 13H10C10.2833 13 10.521 13.096 10.713 13.288C10.905 13.48 11.0007 13.7173 11 14V18C11 18.2833 10.904 18.521 10.712 18.713C10.52 18.905 10.2827 19.0007 10 19C9.71734 18.9993 9.48 18.9033 9.288 18.712C9.096 18.5207 9 18.2833 9 18V15ZM15 9H18C18.2833 9 18.521 9.096 18.713 9.288C18.905 9.48 19.0007 9.71734 19 10C18.9993 10.2827 18.9033 10.5203 18.712 10.713C18.5207 10.9057 18.2833 11.0013 18 11H14C13.7167 11 13.4793 10.904 13.288 10.712C13.0967 10.52 13.0007 10.2827 13 10V6C13 5.71667 13.096 5.47934 13.288 5.288C13.48 5.09667 13.7173 5.00067 14 5C14.2827 4.99934 14.5203 5.09534 14.713 5.288C14.9057 5.48067 15.0013 5.718 15 6V9Z"
        fill="#60697D"
      />
    </svg>
  );

  const renderPanelHeader = () => {
    return (
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={0}
        padding="5px 0px"
      >
        <Typography className={classes.panelHeaderTestStyles}>
          {panelData?.panelHeader || ""}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {!expanded && isScrollable && (
            <>
              <Box display="flex" alignItems="center" gap={1}>
                <Button
                  onClick={() => scroll("left")}
                  icon={
                    <Box sx={{ transform: "translate(4px,3px)" }}>
                      <ArrowLeftIcon />
                    </Box>
                  }
                  iconPlacement="left"
                  size="large"
                  type="default"
                  variant="tertiary"
                  disabled={!canScrollLeft}
                />
                <Button
                  onClick={() => scroll("right")}
                  icon={
                    <Box sx={{ transform: "translate(6px,3px)" }}>
                      <ArrowRightIcon />
                    </Box>
                  }
                  iconPlacement="left"
                  size="large"
                  type="default"
                  variant="tertiary"
                  disabled={!canScrollRight}
                />
              </Box>
              {cardData?.length > 4 && (
                <Box className={classes.verticalSeparator}></Box>
              )}
            </>
          )}
          {cardData?.length > 4 && (
            <TooltipV3
              title={expanded ? "Collapse" : "Expand"}
              variant="tertiary"
            >
              <Button
                onClick={() => setExpanded(!expanded)}
                icon={expanded ? collapseSvg : expandSvg}
                iconPlacement="left"
                size="large"
                type="default"
                variant="tertiary"
              />
            </TooltipV3>
          )}
        </Box>
      </Box>
    );
  };

  const renderNonExpandedPanel = () => {
    return (
      <div ref={scrollRef} className={classes.nonExpandedContainerStyles}>
        {cardData.map((card, index) => (
          <CardComponent card={card} index={index} />
        ))}
      </div>
    );
  };

  const renderExpandedPanel = () => {
    return (
      <Box
        className={classes.expandedPanelContainerStyles}
        sx={{ justifyContent: "left" }}
      >
        {sortedCardData.map((card, index) => (
          <CardComponent card={card} index={index} />
        ))}
      </Box>
    );
  };

  return (
    <div
      id="metrics-panel"
      className={containerClassName || classes.pannelContainer}
    >
      {/**This has KPI Panel header and expandable icon */}
      {renderPanelHeader()}
      {!expanded ? renderNonExpandedPanel() : renderExpandedPanel()}
    </div>
  );
};

export default CardPanel;
