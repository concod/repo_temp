import React, { useState, useRef, useEffect } from "react";
import { Portal, Box } from "@mui/material";
import { useStyles } from "./kpi-styles";
import { Tooltip, Button } from "impact-ui-v3";

import ISExpand from "assets/IS_icons/IS_expand.svg";
import ISCollapse from "assets/IS_icons/IS_collapse.svg";
import ISStyle from "assets/IS_icons/IS_styles_AP1.svg";
import ISStore from "assets/IS_icons/IS_stores_S01.svg";
import ISStorePerStyle from "assets/IS_icons/IS_store_per_styleS02.svg";
import ISSalesUnit from "assets/IS_icons/IS_sales_unitPC1.svg";
import ISLwMargin from "assets/IS_icons/IS_lw_marginPT1.svg";
import ISAllocatedQnty from "assets/IS_icons/IS_allocated_qntST3.svg";
import ISDcAvailable from "assets/IS_icons/IS_dc_availableWH4.svg";
import ISDcAllocatedQnt from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import ISRefs from "assets/IS_icons/IS_JL1.svg";
import ISAP2 from "assets/IS_icons/IS_AP2.svg"
import ISPT2 from "assets/IS_icons/IS_PT2.svg"
import ISStoreOhIt from "assets/IS_icons/IS_OH1.svg";
import ISLwSale from "assets/IS_icons/IS_PC2.svg"
import ISConForcastDemand from "assets/IS_icons/IS_DM1.svg"
import ISUnConForcast from "assets/IS_icons/IS_FC1.svg"
import ISAllocatedStorePerPC9 from "assets/IS_icons/IS_SO3.svg"
import ISVIRRemaining from "assets/IS_icons/IS_RV1.svg"
import ISIOB from "assets/IS_icons/IS_EX1.svg"
import ISAllocatedQntBySize from "assets/IS_icons/IS_ST1.svg"
import ISNetDcAvailable from "assets/IS_icons/IS_WH3.svg"
import ISStyleDepthPerStore from "assets/IS_icons/IS_ST2.svg"
import ISAvgUnitPerStore from "assets/IS_icons/IS_PR1.svg"
import ISStoreGradeAllocatedQty from "assets/IS_icons/IS_SG1.svg"
import ISStoreGradeAllocatedQuantity from "assets/IS_icons/IS_SG2.svg";
import ISTotalTransfers from "assets/IS_icons/IS_TT1.svg";
import ISTotalUnits from "assets/IS_icons/IS_TU1.svg";
import ISSourceStores from "assets/IS_icons/IS_SS1.svg";
import ISDestinationStores from "assets/IS_icons/IS_DS1.svg";
import ISTransferValue from "assets/IS_icons/IS_TV1.svg";
import ArrowLeftIcon from "assets/impactv3/arrow_left.svg";
import ArrowRightIcon from "assets/impactv3/arrow_right.svg";

const getIcons = (
  iconType,
  index,
) => {
  const iconMap = {
    "style": <ISStyle key={`icon-${index}`} />,
    "store": <ISStore key={`icon-${index}`} />,
    "store_per_style": <ISStorePerStyle key={`icon-${index}`} />,
    "sales_unit": <ISSalesUnit key={`icon-${index}`} />,
    "lw_margin": <ISLwMargin key={`icon-${index}`} />,
    "allocated_qty_total": <ISAllocatedQnty key={`icon-${index}`} />,
    "dc_available": <ISDcAvailable key={`icon-${index}`} />,
    "dc_allocated_qty": <ISDcAllocatedQnt key={`icon-${index}`} />,
    "refs": <ISRefs key={`icon-${index}`} />,
    "store_oh_it": <ISStoreOhIt key={`icon-${index}`} />,
    "lw_4_sale": <ISLwSale key={`icon-${index}`} />,
    "constraied_forecasted_demand": <ISConForcastDemand key={`icon-${index}`} />,
    "unconstrained_forecast": <ISUnConForcast key={`icon-${index}`} />,
    "allocated_store_per_PC9": <ISAllocatedStorePerPC9 key={`icon-${index}`} />,
    "vir_remaining": <ISVIRRemaining key={`icon-${index}`} />,
    "iob": <ISIOB key={`icon-${index}`} />,
    "allocated_qnt_by_size": <ISAllocatedQntBySize key={`icon-${index}`} />,
    "net_dc_available": <ISNetDcAvailable key={`icon-${index}`} />,
    "style_depth_per_store": <ISStyleDepthPerStore key={`icon-${index}`} />,
    "avg_unit_per_store": <ISAvgUnitPerStore key={`icon-${index}`} />,
    "store_grade_allocated_qty": <ISStoreGradeAllocatedQty key={`icon-${index}`} />,
    "store_grade_allocated_quantity": <ISStoreGradeAllocatedQuantity key={`icon-${index}`} />,
    "store_grade_allocated_percentage": <ISPT2 key={`icon-${index}`} />,
    "depth_per_store": <ISAP2 key={`icon-${index}`} />,
    "total_transfers": <ISTotalTransfers key={`icon-${index}`} />,
    "total_units": <ISTotalUnits key={`icon-${index}`} />,
    "source_stores": <ISSourceStores key={`icon-${index}`} />,
    "destination_stores": <ISDestinationStores key={`icon-${index}`} />,
    "transfer_value": <ISTransferValue key={`icon-${index}`} />,
  };
  
  if (iconType && iconMap[iconType]) {
    return iconMap[iconType];
  }
  return iconMap["style"];
};

const hasNestedSubHeaders = (subHeaders) =>
  subHeaders?.some((subHeader) => subHeader.sub_headers?.length > 0);

const formatGroupLabel = (label) =>
  label?.includes("DC_") ? `DC ${label.split("_")[1]}` : label;

export const RecommendationKPICard = ({tableConfig, tableData, headerTitle = "Summary", showScrollIcon = false}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedDC, setSelectedDC] = useState(null);
  const classes = useStyles();

  // Create refs for tracking button positions
  const buttonRefs = useRef({});
  const cardsContainerRef = useRef(null);
  const subHeaderContainerRefs = useRef({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  const updateScrollButtons = () => {
    if (cardsContainerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = cardsContainerRef.current;
      // Small epsilon to avoid floating-point scroll inaccuracies (Chrome/Safari rounding issues)
      const EPS = 2;

      setIsScrollable(scrollWidth > clientWidth + EPS);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const formatValue = (value, type, extra={}) => {
    if (value === "N/A" || isNaN(Number(value))) return value;

    const numValue = Number(value);
    if (type === "percentage") {
      // common logic for percentage
      const multiplier = extra?.multiplier === true ? 1 : 100;
      let newVal = (numValue * multiplier).toFixed(2);
      
      // if whole number, then return as a whole number
      if (Number(newVal) % 1 === 0) {
        return Math.round(newVal) + "%";
      }
      return newVal + "%";
    }
    
    // Format numbers with comma separators; always return a string to avoid falsy 0 issues
    // Check if the number is effectively an integer (even if stored as float)
    if (Number.isInteger(numValue) || numValue % 1 === 0) {
      // integer value -> return integer string (with commas if large)
      const intValue = Math.round(numValue);
      return intValue >= 1000
        ? intValue.toLocaleString('en-US') 
        : String(intValue);
    } else {
      // show two decimal places for fractional inputs or large numbers
      const formatted = numValue.toFixed(2);
      const formattedNum = Number(formatted);
      if (formattedNum >= 1000) {
        return formattedNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return formatted;
    }
  };

  useEffect(() => {
    // click outside of the popover to close it
    function handleClickOutside(event) {
      if (
        popoverOpen &&
        !event.target.closest(".popover-content") &&
        !Object.values(buttonRefs.current).some(
          (ref) => ref && ref.contains(event.target)
        )
      ) {
        setPopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

  // Add wheel event listener for mouse scroll on cards container
  // Supports horizontal scrolling for touchpad (deltaX) and vertical scroll for mouse (deltaY)
  useEffect(() => {
    const container = cardsContainerRef.current;
    if (container) {
      const handleWheel = (e) => {
        e.preventDefault();
        // Use deltaX for touchpad horizontal scroll, deltaY for mouse vertical scroll
        const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        container.scrollLeft += scrollDelta;
      };
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [expanded]);

  // Enable mouse wheel scrolling for all cards with subHeaders (including Net DC Available)
  // Only works when content overflows (scrollWidth > clientWidth) - automatically handles cards with more data
  // Supports horizontal scrolling for touchpad (deltaX) and vertical scroll for mouse (deltaY)
  useEffect(() => {
    let handlers = [];
    
    // Wait for DOM to update before attaching listeners
    const timeoutId = setTimeout(() => {
      const containers = Object.values(subHeaderContainerRefs.current).filter(Boolean);
      
      if (containers.length === 0) return;

      handlers = containers.map((container) => {
        const handleWheel = (e) => {
          // Use deltaX for touchpad horizontal scroll, deltaY for mouse vertical scroll
          const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          
          // Check if content overflows and can scroll in the requested direction
          const hasOverflow = container.scrollWidth > container.clientWidth;
          const canScrollRight = scrollDelta > 0 && 
            container.scrollLeft + container.clientWidth < container.scrollWidth;
          const canScrollLeft = scrollDelta < 0 && container.scrollLeft > 0;

          if (hasOverflow && (canScrollRight || canScrollLeft)) {
            e.preventDefault();
            e.stopPropagation();
            container.scrollLeft += scrollDelta;
          }
        };
        
        container.addEventListener("wheel", handleWheel, { passive: false });
        return { container, handleWheel };
      });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      handlers.forEach(({ container, handleWheel }) => {
        if (container && handleWheel) {
          container.removeEventListener("wheel", handleWheel);
        }
      });
    };
  }, [expanded, tableConfig, tableData]);

  const extractSubHeaderData = (config) => {
    if (!config.sub_headers?.length) return [];

    // DC → size (or any group → leaf) when first-level items have nested sub_headers
    if (hasNestedSubHeaders(config.sub_headers)) {
      return config.sub_headers.map((groupSubHeader) => {
        if (groupSubHeader.sub_headers?.length > 0) {
          const sizeDetails = groupSubHeader.sub_headers.map((leafSubHeader) => ({
            label: leafSubHeader.label,
            column_name: leafSubHeader.column_name,
            type: leafSubHeader.type,
            extra: leafSubHeader.extra,
            value: tableData[leafSubHeader.column_name] || 0,
          }));

          const totalQuantity = sizeDetails.reduce(
            (sum, item) => sum + Number(item.value),
            0
          );

          return {
            label: formatGroupLabel(groupSubHeader.label),
            column_name: groupSubHeader.column_name,
            type: groupSubHeader.type,
            extra: groupSubHeader.extra,
            value: totalQuantity,
            sizeDetails,
          };
        }

        return {
          label: formatGroupLabel(groupSubHeader.label),
          column_name: groupSubHeader.column_name,
          type: groupSubHeader.type,
          extra: groupSubHeader.extra,
          value: tableData[groupSubHeader.column_name] || 0,
        };
      });
    }

    return config.sub_headers.map((subHeader) => ({
      label: subHeader.label,
      column_name: subHeader.column_name,
      type: subHeader.type,
      extra: subHeader.extra,
      value: tableData[subHeader.column_name] || 0,
    }));
  };

  const cardData = tableConfig
  .filter((config) => !config.is_hidden)
  .map((config, index) => {
    const subHeaderData = extractSubHeaderData(config);
    const hasSubHeaders = subHeaderData && Array.isArray(subHeaderData) && subHeaderData.length > 0;
    const iconType = config?.extra?.iconType || "style";
    return {
      column_name: config.column_name,
      label: config.label,
      hasSubHeaders: hasSubHeaders,
      hasNestedSubHeaders: hasNestedSubHeaders(config.sub_headers),
      subHeaderData: subHeaderData,
      iconType: iconType
    };
  });

  useEffect(() => {
    const el = cardsContainerRef.current;
    if (!el || !showScrollIcon) return;

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
  
  const getValueFromTableData = (columnName) => {
    if (!columnName || !tableData) return "N/A";
    return tableData[columnName] !== undefined ? tableData[columnName] : "N/A";
  };

  const getLabelFromTableConfig = (columnName) => {
    if (!columnName || !tableConfig) return "N/A";
    const config = tableConfig.find((item) => item.column_name === columnName);
    return config ? config.label : "N/A";
  };

  const handleClose = () => {
    setPopoverOpen(false);
    setSelectedDC(null);
  };

  const renderSizeRows = (sizeDetails) => {
    if (!sizeDetails || !Array.isArray(sizeDetails) || sizeDetails.length === 0) {
      return <div className={classes.popoverSizeRow}>No size data available</div>;
    }
    
    const rows = [];
  
    // group sizes into pairs
    for (let i = 0; i < sizeDetails.length; i += 2) {
      const leftSize = sizeDetails[i];
      const rightSize = i + 1 < sizeDetails.length ? sizeDetails[i + 1] : null;
      
      rows.push(
        <div key={i} className={classes.popoverSizeRow}>
          <div className={`${sizeDetails.length >1 ? classes.popoverSizeColumn : classes.singleItemSize}`}>
            <Tooltip title={leftSize.label} variant="tertiary">
              <span className={classes.popoverSizeLabel}>
                {leftSize.label}
              </span>
            </Tooltip>
            <Tooltip title={formatValue(leftSize.value, leftSize.type, leftSize.extra) || "-"} variant="tertiary">
              <span className={classes.popoverSizeValue}>
                {formatValue(leftSize.value, leftSize.type, leftSize.extra) || "-"}
              </span>
            </Tooltip>
          </div>
          {rightSize && <span className={classes.popoverDividerLine}></span>}
          {rightSize && (
            <div className={classes.popoverSizeColumn}>
              <Tooltip title={rightSize.label} variant="tertiary">
                <span className={classes.popoverSizeLabel}>
                  {rightSize.label}
                </span>
              </Tooltip>
              <Tooltip title={formatValue(rightSize.value, rightSize.type, rightSize.extra) || "-"} variant="tertiary">
                <span className={classes.popoverSizeValue}>
                  {formatValue(rightSize.value, rightSize.type, rightSize.extra) || "-"}
                </span>
              </Tooltip>
            </div>
          )}
        </div>
      );
    }
    
    return rows;
  };

  // Format size details for tooltip content
  const formatSizeDetailsForTooltip = (sizeDetails) => {
    if (!sizeDetails || !Array.isArray(sizeDetails) || sizeDetails.length === 0) {
      return "No size data available";
    }
    
    // Create a React element for the tooltip content
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "4px",
        padding: "4px 0"
      }}>
        {sizeDetails.map((size, idx) => (
          <div key={idx} style={{ 
            display: "flex", 
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "12px"
          }}>
            <span style={{ color: "#60697D" }}>{size.label}:</span>
            <span style={{ color: "#1F2B4D", fontWeight: 600 }}>
              {formatValue(size.value, size.type) || "-"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleArrowClick = (event, dcData, buttonId) => {
    event.stopPropagation();
    const buttonEl = buttonRefs.current[buttonId];
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 200 + rect.width / 2,
      });
      setSelectedDC(dcData);
      setPopoverOpen(true);
    }
  };

  const CardComponent = ({ card, index }) => {
    const cardLabel = card.label || getLabelFromTableConfig(card.column_name);
    
    if (card.hasNestedSubHeaders) {
      return (
        <div className={classes.allocatedQtyCardWrapper}>
          <div key={index} className={classes.cardStyles_WithNoSubMetrics}>
            <div className={classes.noSubMetricsFlexContainer}>
              <div className={classes.icon_container}>
                {getIcons(card.iconType, index)}
              </div>
              <div className={classes.flex_column}>
                <div className={classes.labelContainer}>
                  <Tooltip title={cardLabel} variant="tertiary">
                    <div className={classes.noSubMetricsLabelStyles}>
                      {cardLabel}
                    </div>
                  </Tooltip>
                </div>
                <div
                  ref={(el) => {
                    if (el) {
                      subHeaderContainerRefs.current[`subHeader-${index}`] = el;
                    } else {
                      delete subHeaderContainerRefs.current[`subHeader-${index}`];
                    }
                  }}
                  className={classes.dcDataContainer}
                >
                  {card.subHeaderData.map((dcData, dcIndex) => {
                    const buttonId = `dc-${index}-${dcIndex}`;
                    const dcValue = formatValue(dcData.value, dcData.type, dcData.extra);
                    
                    return (
                      <div key={dcIndex} className={classes.flex_row}>
                        <div className={classes.dcDataItem}>
                          <Tooltip title={dcData.label} variant="tertiary">
                            <div className={classes.dcDataLabel}>
                              {dcData.label}
                            </div>
                          </Tooltip>
                          <Tooltip title={dcValue} variant="tertiary">
                            <div className={classes.subHeaderValueStyles}>
                              {dcValue}
                            </div>
                          </Tooltip>
                          {dcData.sizeDetails ? (
                            <Tooltip title={"view by size"} variant="tertiary">
                              <div
                                ref={(el) => (buttonRefs.current[buttonId] = el)}
                                className={classes.arrowButton}
                                onClick={(event) =>
                                  handleArrowClick(event, dcData, buttonId)
                                }
                              >
                                {">"}
                              </div>
                            </Tooltip>
                          ) : (
                            <div className={classes.arrowButton}>
                              {">"}
                            </div>
                          )}
                        </div>
                        {dcIndex !== card.subHeaderData.length - 1 && (
                          <div className={classes.dividerLine} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const cardValue = getValueFromTableData(card.column_name);
    return (
      <div className={classes.cardWrapper}>
        <div key={index} className={classes.cardStyles_WithNoSubMetrics}>
          <div className={classes.noSubMetricsFlexContainer}>
            <div className={classes.icon_container}>
              {getIcons(card.iconType, index)}
            </div>
            <div className={classes.flex_column}>
              <Tooltip title={cardLabel} variant="tertiary">
                <div className={classes.noSubMetricsLabelStyles}>
                  {cardLabel}
                </div>
              </Tooltip>
              {card.hasSubHeaders &&
              card.subHeaderData &&
              card.subHeaderData.length > 0 ? (
                <div 
                  ref={(el) => {
                    if (el) {
                      subHeaderContainerRefs.current[`subHeader-${index}`] = el;
                    } else {
                      delete subHeaderContainerRefs.current[`subHeader-${index}`];
                    }
                  }}
                  className={classes.dcDataContainer}
                >
                  {card.subHeaderData.map((subHeader, subIndex) => {
                    const subHeaderValue = formatValue(subHeader.value, subHeader.type, subHeader.extra);
                    return (
                      <div key={subIndex} className={classes.flex_row}>
                        <div className={classes.dcDataItem}>
                          <Tooltip title={subHeader.label} variant="tertiary">
                            <div className={classes.subHeaderLabel}>
                              {/* {subHeader.label.includes("DC_")
                                ? subHeader.label.split("_")[0] +
                                  " " +
                                  subHeader.label.split("_")[1]
                                : subHeader.label} */}
                                {subHeader.label}
                            </div>
                          </Tooltip>
                          <Tooltip title={subHeaderValue} variant="tertiary">
                            <div className={classes.noSubMertricsValueStyles}>
                              {subHeaderValue}
                            </div>
                          </Tooltip>
                        </div>
                        {subIndex !== card.subHeaderData.length - 1 && (
                          <div className={classes.dividerLine}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={classes.flex_row}>
                  <Tooltip title={cardValue} variant="tertiary">
                    <div className={classes.noSubMertricsValueStyles}>
                      {formatValue(cardValue, card.type, card.extra)}
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const scroll = (direction) => {
    const container = cardsContainerRef.current;
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
        targetLeft = nextChild.offsetLeft;
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

  const renderPanelHeader = () => {
    return (
      <div className={`${classes.panelHeaderContainer} ${classes.paddingBottom8}`}>
        <span className={classes.panelHeaderTestStyles}>
          {headerTitle}
        </span>
        <div className={classes.flex_center}>
          {showScrollIcon && !expanded && isScrollable && (
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
              <div className={classes.dividerLine12} />
            </>
          )}
          {cardData?.length > 4 && (
            <div
              onClick={() => setExpanded(!expanded)}
              className={classes.expandButton}
            >
              {expanded ? <ISCollapse /> : <ISExpand />} 
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNonExpandedPanel = () => {
    return (
      <div 
        ref={cardsContainerRef}
        className={classes.nonExpandedContainerStyles}
      >
        {cardData.map((card, index) => (
          <div key={index} className={classes.cardItemContainer}>
            <CardComponent card={card} index={index} />
          </div>
        ))}
      </div>
    );
  };

  const renderExpandedPanel = () => {
    return (
      <div className={classes.expandedPanelContainerStyles}>
        {cardData.map((card, index) => (
          <div key={index} className={classes.expandedCardItemContainer}>
            <CardComponent card={card} index={index} />
          </div>
        ))}
      </div>
    );
  };

  const CustomSizePopover = () => {
    if (!popoverOpen || !selectedDC || !selectedDC.sizeDetails) return null;

    const popoverStyle = {
      position: "absolute",
      top: `${popoverPosition.top}px`,
      left: `${popoverPosition.left}px`,
      minWidth: "400px", 
      maxWidth: "700px",
      backgroundColor: "#fff",
      borderRadius: "12px",
      padding: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      zIndex: 1500,
    };

    return (
      <Portal>
        <div className="popover-content" style={popoverStyle}>
          <div className={classes.popoverHeader}>
            <span className={classes.popoverTitle}>Sizes</span>
            <div onClick={handleClose} className={classes.popoverCloseButton}>
              x
            </div>
          </div>
          <div className={classes.popoverContent}>
            <div className={classes.popoverSizeGrid}>
              {renderSizeRows(selectedDC.sizeDetails)}
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  return (
    <div id="metrics-panel" className={classes.pannelContainer}>
      {renderPanelHeader()}
      {!expanded ? renderNonExpandedPanel() : renderExpandedPanel()}
      <CustomSizePopover />
    </div>
  );
};
