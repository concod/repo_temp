import React, { useRef, useEffect, useState, useCallback } from "react";
import { Box, Typography, Divider } from "@mui/material";
import {
  Button,
  Chips,
  Tooltip as ImpactTooltip,
  useTranslation,
} from "impact-ui-v3";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import ForecastPT2 from "assets/ForecastPT2.png";
import { useStyles } from "./kpi-styles";
import { Tooltip } from "@mui/material";
import { getIcons } from "./kpi-icons";
import { getKPIIconComponent } from "../../../utils-inventorysmart/utilityFunctions";
import DrilldownPopover from "./DrilldownPopover";

const CardPanel = ({ panelData, containerClassName,renderKpiForGeneric = false,customClasses, tabValue, isForecastSeparate = false, parentBaseModule = "", inventorysmartOrderBatchingIconConfig = {}, rosType, onRosToggle, onMetricClick, drilldownState, onDrilldownClose, enableRosToggle = false }) => {
  const { t } = useTranslation();
  const cardData = panelData?.cardData;
  const noSubMetrics = panelData?.noSubMetrics;
  const classes = useStyles()

  // Info button component with tooltip
  const InfoButton = ({ tooltipText, orientation = "top" }) => (
    <ImpactTooltip title={tooltipText} orientation={orientation} variant="tertiary">
      <InfoOutlinedIcon className={classes.infoIcon} />
    </ImpactTooltip>
  );

  // Forecast Icon component - used for forecast KPI cards
  const ForecastIcon = () => (
    <div className={classes.forecastSalesIcon}>
      <img src={ForecastPT2} alt="Forecast" style={{ width: '48px', height: '48px' }} />
    </div>
  );

  // Determine if we're in forecast mode
  const isForecastMode = tabValue === "forecast";

  const wrap3DIcon = (iconComponent) => {
    if (!iconComponent) return null;
    return (
      <div className={classes.icon3DWrapper}>
        {iconComponent}
      </div>
    );
  };

  // Get the appropriate icon based on mode and card data
  const getCardIcon = (card, index, parentBaseModule) => {
    // For forecast mode, always use ForecastIcon
    if (isForecastMode) {
      return <ForecastIcon />;
    }
    
    // For store inventory mode, use original icons from getIcons
    // Check if card has a renderIcon function first
    if (card?.renderIcon) {
      const iconComponent = card.renderIcon();
      return wrap3DIcon(iconComponent);
    }
    
    // Use getIcons with the card label to get the appropriate icon
    const label = card?.label || card?.title || "";
    const icon = parentBaseModule === "order-batching" ? getKPIIconComponent(card?.iconType,index)  : getIcons(
      card?.iconType || "",
      index,
      panelData?.noSubMetrics || false,
      renderKpiForGeneric,
      label
    );
    
    if (parentBaseModule === "order-batching" && icon) {
      return wrap3DIcon(icon);
    }
    
    return icon;
  };

  const CardComponent = ({ card, index, parentBaseModule }) => {
    return (
      <div className={customClasses?.flex || ""}>
        {/* New Forecast Sales KPI Card Type */}
        {card?.type === "kpi_forecast_sales" && (
          <div key={index} className={`${classes.forecastSalesCard} ${enableRosToggle ? (rosType === 'low' ? classes.forecastSalesCardLowRos : classes.forecastSalesCardHighRos) : ''}`}>
            <div className={classes.forecastSalesLeftSection}>
              <ForecastIcon />
              <div className={classes.forecastSalesInfo}>
                <Typography className={classes.forecastSalesTitle}>
                  {card?.title || ""}
                </Typography>
                <div className={classes.forecastSalesValueRow}>
                  <Typography component="span" className={classes.forecastSalesValue}>
                    {card?.salesValue}
                  </Typography>
                  <Typography component="span" className={classes.forecastSalesActual}>
                    actual
                  </Typography>
                </div>
              </div>
            </div>
            <div className={classes.forecastSalesRightSection}>
              {card?.metrics?.map((metric, idx) => {
                const isClickable = metric.drilldownEnabled && enableRosToggle;
                const clickableStyle = isClickable ? {
                  backgroundColor: '#F2F4F7',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  border: '1px solid #E8EAF0',
                  boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)',
                } : {};
                return (
                  <div key={idx} className={classes.forecastMetricRow} style={clickableStyle}>
                    <div className={classes.forecastMetricLabel}>
                      <Typography 
                        component="span" 
                        className={`${classes.forecastMetricLabelText} ${isClickable ? classes.forecastMetricLabelClickable : ''}`}
                        onClick={isClickable ? (e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onMetricClick && onMetricClick(index, idx, metric.label, {
                            top: rect.bottom + 4,
                            left: rect.left,
                          }, metric.key, card.timeHorizon);
                        } : undefined}
                      >
                        {metric.label}
                      </Typography>
                      <InfoButton tooltipText={metric.tooltip} />
                    </div>
                    <Typography component="span" className={classes.forecastMetricValue}>
                      {metric.value}
                    </Typography>
                  </div>
                );
              })}
            </div>
            {drilldownState?.cardIndex === index && drilldownState?.visible && (
              <DrilldownPopover
                title={drilldownState.metricLabel}
                data={drilldownState.data}
                columnDefs={drilldownState.columnDefs}
                loading={drilldownState.loading}
                onClose={onDrilldownClose}
                anchorPosition={drilldownState.anchorPosition}
              />
            )}
          </div>
        )}
        {!noSubMetrics && card?.type === "kpi_details_right_aligned" && (
          <div key={index} className={`${classes.forecastSalesCard} ${enableRosToggle ? (rosType === 'low' ? classes.forecastSalesCardLowRos : classes.forecastSalesCardHighRos) : ''}`}>
            <div className={classes.forecastSalesLeftSection}>
              <div className={customClasses?.icon_container || classes.forecastSalesIcon}>
                {getCardIcon(card, index, parentBaseModule)}
              </div>
              <div className={classes.forecastSalesInfo}>
                <Typography className={classes.forecastSalesTitle}>
                  {card?.title}
                </Typography>
                <div className={classes.forecastSalesValueRow}>
                  <Typography component="span" className={classes.forecastSalesValue}>
                    {card?.actualValue}
                  </Typography>
                  <Typography component="span" className={classes.forecastSalesActual}>
                    actual
                  </Typography>
                </div>
              </div>
            </div>
            <div className={classes.forecastSalesRightSection}>
              {card?.comparisons?.map((comparison, idx) => {
                const isClickable = (comparison.drilldownEnabled || idx < 2) && enableRosToggle;
                const clickableStyle = isClickable ? {
                  backgroundColor: '#F2F4F7',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  border: '1px solid #E8EAF0',
                  boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)',
                } : {};
                return (
                  <div key={idx} className={classes.forecastMetricRow} style={clickableStyle}>
                    <div className={classes.forecastMetricLabel}>
                      <Typography 
                        component="span" 
                        className={`${classes.forecastMetricLabelText} ${isClickable ? classes.forecastMetricLabelClickable : ''}`}
                        onClick={isClickable ? (e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onMetricClick && onMetricClick(index, idx, comparison.label, {
                            top: rect.bottom + 4,
                            left: rect.left,
                          }, comparison.key, card.timeHorizon);
                        } : undefined}
                      >
                        {comparison.label}
                      </Typography>
                      {comparison.tooltip && <InfoButton tooltipText={comparison.tooltip} />}
                    </div>
                    <Typography component="span" className={classes.forecastMetricValue}>
                      {comparison.percentage}
                    </Typography>
                  </div>
                );
              })}
            </div>
            {drilldownState?.cardIndex === index && drilldownState?.visible && (
              <DrilldownPopover
                title={drilldownState.metricLabel}
                data={drilldownState.data}
                columnDefs={drilldownState.columnDefs}
                loading={drilldownState.loading}
                onClose={onDrilldownClose}
                anchorPosition={drilldownState.anchorPosition}
              />
            )}
          </div>
        )}
        {!noSubMetrics && card?.type !== "kpi_details_right_aligned" && card?.type !== "kpi_forecast_sales" && (
          <div key={index} className={classes.cardStyles_WithSubMetrics}>
            {/* Card Title and Metric Section */}
            <div className={classes.flexContainerStyles}>
              {/* Title and Icon */}
              <div className={classes.flexItemStyles}>
                {getCardIcon(card, index, parentBaseModule)}
                {!card?.subTitle && (
                  <Tooltip title={card?.title}>
                    <Typography
                      variant="subtitle1"
                      className={classes.withSubMetricsNoSubTitleTitleStyles}
                    >
                      {card?.title || ""}
                    </Typography>
                  </Tooltip>
                )}

                {card?.subTitle && card?.title && (
                  <div
                    className={classes.titleSubTitleFlex}
                  >
                    <Tooltip title={card?.title}>
                      <Typography
                        variant="subtitle1"
                        className={classes.withSubMetricWithSubTitleTitleStyles}
                      >
                        {card?.title || ""}
                      </Typography>
                    </Tooltip>

                    <Typography
                      variant="subtitle1"
                      className={classes.withSubMetircsSubtitleStyles}
                    >
                      {card?.subTitle || ""}
                    </Typography>
                  </div>
                )}
              </div>

              {/* Metric Box */}
              {card?.metric && <div className={classes.metricStyles}>{card?.metric}</div>}
            </div>

            {/* Conditional rendering for sub-metrics */}
            {card?.subMetrics.length === 1 ? (
              <div className={classes.singleSubMetricContainerStyles}>
                {/* Single sub-metric */}
                <Tooltip title={card.subMetrics[0]?.label}>
                  <Typography variant="body2" className={classes.subMetricLabelStyles}>
                    {card.subMetrics[0]?.label}
                  </Typography>
                </Tooltip>
                <Typography variant="body2" className={classes.subMetricsValueStyles}>
                  {card.subMetrics[0].value}
                </Typography>
              </div>
            ) : (
              <div
                className={
                  `${classes.flexContainerStyles} ${classes.marginTop_10}`
                }

              >
                {/* Multiple sub-metrics */}
                {card.subMetrics.map((subMetric, subIndex) => (
                  <div key={subIndex} className={classes.flex_1}>
                    <Tooltip title={subMetric.label}>
                      <Typography variant="body2" className={classes.subMetricLabelStyles}>
                        {subMetric.label}
                      </Typography>
                    </Tooltip>
                    <div
                      className={classes.flex_center}
                    >
                      <Typography
                        variant="body2"
                        className={
                          `${classes.subMetricsValueStyles} ${classes.marginRight_10}`
                        }
                      >
                        {subMetric.value}
                      </Typography>
                      {subMetric.positiveTrend && (
                        <Typography
                          variant="body2"
                          className={
                            `${classes.trendTextStyles} ${classes.upTrendStyles}`
                          }
                        >
                          {subMetric.positiveTrend}
                        </Typography>
                      )}
                      {subMetric.negetiveTrend && (
                        <Typography
                          variant="body2"
                          className={
                            `${classes.trendTextStyles} ${classes.downTrendStyles}`
                          }
                        >
                          {subMetric.negetiveTrend}
                        </Typography>
                      )}

                      {subMetric?.positiveTrend && (
                        <ArrowUpwardIcon
                          className={
                            `${classes.trendTextStyles} ${classes.upTrendStyles}`
                          }
                        />
                      )}
                      {subMetric?.negetiveTrend && (
                        <ArrowDownwardIcon
                          className={
                            `${classes.trendTextStyles} ${classes.downTrendStyles}`
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* KPI Order/Inventory Card Type - Enhanced Design */}
        {card?.type === "kpi_order_inventory" && (
          <div key={index} className={classes.forecastSalesCard}>
            <div className={classes.forecastSalesLeftSection}>
              <div className={customClasses?.icon_container || classes.forecastSalesIcon}>
                {getCardIcon(card, index, parentBaseModule)}
              </div>
              <div className={classes.forecastSalesInfo}>
                <Typography className={classes.forecastSalesTitle}>
                  {card?.title}
                </Typography>
                <div className={classes.forecastSalesValueRow}>
                  <Typography component="span" className={classes.forecastSalesValue}>
                    {card?.actualValue}
                  </Typography>
                  <Typography component="span" className={classes.forecastSalesActual}>
                    {card?.actualLabel || "actual"}
                  </Typography>
                </div>
              </div>
            </div>
            <div className={classes.forecastSalesRightSection}>
              {card?.metrics?.map((metric, idx) => (
                <div key={idx} className={classes.forecastMetricRow}>
                  <div className={classes.forecastMetricLabel}>
                    <Typography component="span" className={classes.forecastMetricLabelText}>
                      {metric.label}
                    </Typography>
                    {metric.tooltip && <InfoButton tooltipText={metric.tooltip} />}
                  </div>
                  <Typography component="span" className={classes.forecastMetricValue}>
                    {metric.value}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        )}
        {noSubMetrics && card?.type !== "kpi_forecast_sales" && card?.type !== "kpi_order_inventory" && (
          <div key={index} className={classes.cardStyles_WithNoSubMetrics}>
            <div
              className={
                classes.noSubMetricsFlexContainer
              }
            >
              <div
                className={customClasses?.icon_container || classes.icon_container}
              >
                {getCardIcon(card, index, parentBaseModule)}
              </div>
              <div className={classes.flex_1}>
                <div
                  className={classes.flex_column}
                >
                    <div className={classes.noSubMetricsLabelStyles}>{card?.label}</div>
                  <div className={classes.flex_row}>
                      <div className={classes.noSubMertricsValueStyles}>{card?.value}</div>
                    <div className={classes.noSubMetricsUnitsStyle}>{card?.units}</div>
                    {card?.percentageDifference && (
                      <div style={{ 
                        color: '#FF0000', 
                        fontSize: '12px', 
                        marginLeft: '8px',
                        alignSelf: 'center'
                      }}>
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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollRef.current?.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const updateScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);
  const resetScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      setCanScrollLeft(false);
      setTimeout(() => {
        updateScrollButtons();
      }, 0);
    }
  }, [updateScrollButtons]);

  useEffect(() => {
    updateScrollButtons();

    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef?.addEventListener("scroll", updateScrollButtons);
      // Also listen for resize events to update scroll buttons
      window.addEventListener("resize", updateScrollButtons);
    }
    return () => {
      if (currentScrollRef) {
        currentScrollRef?.removeEventListener("scroll", updateScrollButtons);
      }
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [cardData?.length, isForecastSeparate, tabValue, expanded, updateScrollButtons]);

  useEffect(() => {
    if (!expanded && scrollRef.current) {
      resetScrollPosition();
    }
  }, [expanded, resetScrollPosition]);
  const sortedCardData =
    expanded && !noSubMetrics && cardData && cardData.length > 0
      ? [...cardData].sort((a, b) => {
          // Handle forecast cards and cards without subMetrics
          const aLength = a.subMetrics?.length || a.metrics?.length || 0;
          const bLength = b.subMetrics?.length || b.metrics?.length || 0;
          return aLength - bLength; // Sort in ascending order based on the number of sub-metrics/metrics
        })
      : cardData || [];

  const expandSvg = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 17H10C10.2833 17 10.5208 17.0958 10.7125 17.2875C10.9042 17.4792 11 17.7167 11 18C11 18.2833 10.9042 18.5208 10.7125 18.7125C10.5208 18.9042 10.2833 19 10 19H6C5.71667 19 5.47917 18.9042 5.2875 18.7125C5.09583 18.5208 5 18.2833 5 18V14C5 13.7167 5.09583 13.4792 5.2875 13.2875C5.47917 13.0958 5.71667 13 6 13C6.28333 13 6.52083 13.0958 6.7125 13.2875C6.90417 13.4792 7 13.7167 7 14V17ZM17 7H14C13.7167 7 13.4792 6.90417 13.2875 6.7125C13.0958 6.52083 13 6.28333 13 6C13 5.71667 13.0958 5.47917 13.2875 5.2875C13.4792 5.09583 13.7167 5 14 5H18C18.2833 5 18.5208 5.09583 18.7125 5.2875C18.9042 5.47917 19 5.71667 19 6V10C19 10.2833 18.9042 10.5208 18.7125 10.7125C18.5208 10.9042 18.2833 11 18 11C17.7167 11 17.4792 10.9042 17.2875 10.7125C17.0958 10.5208 17 10.2833 17 10V7Z" fill="#60697D"/>
  </svg>

  const collapseSvg = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 15H6C5.71667 15 5.47934 14.904 5.288 14.712C5.09667 14.52 5.00067 14.2827 5 14C4.99934 13.7173 5.09534 13.48 5.288 13.288C5.48067 13.096 5.718 13 6 13H10C10.2833 13 10.521 13.096 10.713 13.288C10.905 13.48 11.0007 13.7173 11 14V18C11 18.2833 10.904 18.521 10.712 18.713C10.52 18.905 10.2827 19.0007 10 19C9.71734 18.9993 9.48 18.9033 9.288 18.712C9.096 18.5207 9 18.2833 9 18V15ZM15 9H18C18.2833 9 18.521 9.096 18.713 9.288C18.905 9.48 19.0007 9.71734 19 10C18.9993 10.2827 18.9033 10.5203 18.712 10.713C18.5207 10.9057 18.2833 11.0013 18 11H14C13.7167 11 13.4793 10.904 13.288 10.712C13.0967 10.52 13.0007 10.2827 13 10V6C13 5.71667 13.096 5.47934 13.288 5.288C13.48 5.09667 13.7173 5.00067 14 5C14.2827 4.99934 14.5203 5.09534 14.713 5.288C14.9057 5.48067 15.0013 5.718 15 6V9Z" fill="#60697D"/>
  </svg>

  const chevronLeftSvg = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#60697D"/>
  </svg>

  const chevronRightSvg = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z" fill="#60697D"/>
  </svg>


  const renderPanelHeader = () => {
    
    return (
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={0}
      >
        <Box display="flex" alignItems="center" gap="8px">
          <Typography className={classes.panelHeaderTestStyles}>
            {panelData?.panelHeader || ""}
          </Typography>
          {isForecastMode && enableRosToggle && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: '10px', height: '20px', alignSelf: 'center', borderColor: '#D5D9E0' }} />
              <div className={classes.rosToggleContainer}>
                <Chips
                  label={t("inventorysmart.kpiHighROS")}
                  isActive={rosType === "high"}
                  onClick={() => onRosToggle && onRosToggle("high")}
                  type="single"
                />
                <Chips
                  label={t("inventorysmart.kpiLowROS")}
                  isActive={rosType === "low"}
                  onClick={() => onRosToggle && onRosToggle("low")}
                  type="single"
                />
                <InfoButton
                  tooltipText={t("inventorysmart.kpiTooltipHighROS")}
                />
              </div>
            </>
          )}
          {isForecastMode && !enableRosToggle && (
            <InfoButton
              tooltipText={t(
                "inventorysmart.kpiTooltipForecastAccuracyHighROS"
              )}
              orientation="right"
            />
          )}
        </Box>
        <Box display="flex" alignItems="center">
          {(
            <Box display="flex" alignItems="center" gap="6px">
              <Button
                onClick={() => scroll("left")}
                icon={chevronLeftSvg}
                iconPlacement="left"
                size="large"
                type="default"
                variant="tertiary"
                disabled={!canScrollLeft}
              />
              <Button
                onClick={() => scroll("right")}
                icon={chevronRightSvg}
                iconPlacement="left"
                size="large"
                type="default"
                variant="tertiary"
                disabled={!canScrollRight}
              />
            </Box>
          )}
          {(cardData?.length > 4 || (isForecastSeparate && tabValue === "forecast")) && (
            <Divider orientation="vertical" flexItem sx={{ mx: "12px", height: "16px", alignSelf: "center" }} />
          )}
          {(cardData?.length > 4 ||
            (isForecastSeparate && tabValue === "forecast")) && (
            <ImpactTooltip
              title={
                expanded
                  ? t("inventorysmart.kpiCollapse")
                  : t("inventorysmart.kpiExpand")
              }
              orientation="top"
              variant="tertiary"
            >
              <span>
                <Button
                  onClick={() => setExpanded(!expanded)}
                  icon={expanded ? (
                    collapseSvg
                  ) : (
                    expandSvg
                  )}
                  iconPlacement="left"
                  size="large"
                  type="default"
                  variant="tertiary"
                />
              </span>
            </ImpactTooltip>
          )}
        </Box>
      </Box>
    );
  };

  const renderNonExpandedPanel = () => {
    if (!cardData || cardData.length === 0) {
      return null;
    }
    return (
        <div 
          ref={scrollRef}
          className={classes.nonExpandedContainerStyles}
        >
          {cardData.map((card, index) => (
            <CardComponent key={index} card={card} index={index} parentBaseModule={parentBaseModule} />
          ))}
        </div>
    );
  };
  const renderExpandedPanel = () => {
    if (!sortedCardData || sortedCardData.length === 0) {
      return null;
    }
    return (
      <div
        className={
          classes.expandedPanelContainerStyles
        }
        style={{ justifyContent: 'left' }}
      >
        {sortedCardData.map((card, index) => (
          <CardComponent key={index} card={card} index={index} parentBaseModule={parentBaseModule} />
        ))}
      </div>
    );
  };

  return (
    <div id="metrics-panel" className={containerClassName || classes.pannelContainer}>
      {/**This has KPI Panel header */}
      {renderPanelHeader()}
      {!expanded ? renderNonExpandedPanel() : renderExpandedPanel()}
    </div>
  );
};

export default CardPanel;
