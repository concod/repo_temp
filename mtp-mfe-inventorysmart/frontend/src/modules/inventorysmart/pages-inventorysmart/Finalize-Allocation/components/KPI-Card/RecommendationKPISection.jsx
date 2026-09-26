import React, { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { useStyles } from "./kpi-styles";
import IS_PlanScope from "assets/IS_icons/IS_FC1.svg";
import IS_SalesImpact from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import IS_InventoryLevel from "assets/IS_icons/IS_Transit.svg";
import IS_Edit from "assets/IS_icons/IS_Edit.svg";
import IS_WosShift from "assets/IS_icons/IS_Supply.svg";
import IS_SizeAvailability from "assets/IS_icons/IS_Size.svg";
import CloseIcon from "assets/closeIcon.svg";
import { Typography, Portal } from "@mui/material";
import { Tooltip , Button, Input} from "impact-ui-v3";
import ArrowLeftIcon from "assets/impactv3/arrow_left.svg";
import ArrowRightIcon from "assets/impactv3/arrow_right.svg";

const INVENTORY_CHIP_BG = {
  stockout: "#FEEAF3",
  shortfall: "#FCF8EA",
  normal: "#EBF7F1",
  excess: "#FDF0EC",
};

const INVENTORY_LEVEL_FORMULAE = {
  stockout: "Inventory = 0 OR WOS ≤ Stockout Threshold",
  shortfall: "WOS > Stockout Threshold AND ≤ Shortfall Threshold",
  normal: "WOS > Shortfall Threshold AND ≤ Excess Threshold",
  excess: "WOS > Excess Threshold",
};

const MORE_INFO_LABELS = {
  dest_stores_sales_lift: "Dest Stores",
  source_stores_sales_lift: "Source Stores",
  top_quartile_sales_lift: "Top Quartile",
  dest_stores_incremental_dollars: "Dest Stores",
  source_stores_incremental_dollars: "Source Stores",
  top_quartile_incremental_dollars: "Top Quartile",
  stockout: "Stockout",
  shortfall: "Shortfall",
  normal: "Normal",
  excess: "Excess",
};

const KPI_SECTIONS = [
  {
    key: "plan_scope",
    title: "Plan Scope",
    Icon: IS_PlanScope,
    rows: [
      [
        { key: "store_count", label: "Stores" },
        { key: "stylecolor_count", label: "Style Colors" },
        { key: "transfers", label: "Transfers" },
        { key: "transfer_units", label: "Transfer Units" },
      ],
      [
        { key: "total_inventory", label: "Total Inventory" },
        { key: "avg_dest_per_src", label: "Avg Dest / Src" },
        { key: "avg_units_per_transfer", label: "Avg Units / Transfer" },
      ],
    ],
  },
  {
    key: "sales_impact",
    title: "Sales Impact",
    Icon: IS_SalesImpact,
    rows: [
      [
        { key: "sales_lift", label: "Net Sales Lift" }
      ],
      [
        { key: "incremental_dollars", label: "Net Sales Lift $" }

      ],
    ],
  },
  {
    key: "inventory_level",
    title: "Inventory Level",
    Icon: IS_InventoryLevel,
    rows: [
      [
        { key: "stockout", label: "Stockout" },
        { key: "shortfall", label: "Shortfall" },
      ],
      [
        { key: "normal", label: "Normal" },
        { key: "excess", label: "Excess" },
      ],
    ],
  },
  {
    key: "wos_shift",
    title: "WOS Shift",
    Icon: IS_WosShift,
    rows: [
      [
        { key: "destination", label: "Destination" }
      ],
      [
        { key: "source", label: "Source" },
      ],
    ],
  },
  {
    key: "size_availability",
    title: "Size Availability",
    Icon: IS_SizeAvailability,
    rows: [[{ key: "size_run", label: "Size Run" }]],
  },
];

export const RecommendationKPISection = ({kpiData, headerTitle = "Transfer Recommendations"}) => {
    const classes = useStyles();
    const [transferCost, setTransferCost] = useState(1);
    const [totalCost, setTotalCost] = useState(1);
    const [incrementalCost, setIncrementalCost] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [scrollThumb, setScrollThumb] = useState({ width: 0, left: 0 });
    const scrollRef = useRef();
    const containerRef = useRef();
    const SCROLLBAR_TRACK_WIDTH = 120;
    const MIN_THUMB_WIDTH = 24;

    const [moreInfo, setMoreInfo] = useState({
        open: false,
        key: null,
        position: { top: 0, left: 0 },
    });
    const [popoverEntered, setPopoverEntered] = useState(false);
    const triggerRef = useRef(null);

    const scroll = (direction) => {
        const container = scrollRef.current;
        if (!container) return;

        const children = Array.from(container.children);
        if (!children.length) return;

        const { scrollLeft, clientWidth, scrollWidth } = container;
        const style = window.getComputedStyle(container);
        const leftPadding = parseFloat(style.paddingLeft);

        const PADDING = container.offsetLeft + leftPadding + 1;

        let targetLeft = scrollLeft;

        if (direction === "right") {
            const nextChild = children.find(
                (child) => child.offsetLeft > scrollLeft + PADDING
            );
            if (nextChild) {
                targetLeft = nextChild.offsetLeft - PADDING;
            } else {
                targetLeft = scrollWidth - clientWidth;
            }
        } else {
            const prevChildren = children.filter(
                (child) => child.offsetLeft < scrollLeft - PADDING
            );
            if (prevChildren.length) {
                const prevChild = prevChildren[prevChildren.length - 1];
                targetLeft = prevChild.offsetLeft - PADDING;
            } else {
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
            const EPS = 2;
            setIsScrollable(scrollWidth > clientWidth + EPS);
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - EPS);

            const ratio = clientWidth / scrollWidth;
            const thumbWidth = Math.max(
                SCROLLBAR_TRACK_WIDTH * ratio,
                MIN_THUMB_WIDTH
            );
            const maxScrollLeft = scrollWidth - clientWidth;
            const scrollRatio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
            const thumbLeft = scrollRatio * (SCROLLBAR_TRACK_WIDTH - thumbWidth);
            setScrollThumb({ width: thumbWidth, left: thumbLeft });
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
    }, [expanded]);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setMoreInfo((prev) => ({
            ...prev,
            position: {
                top: rect.bottom + 8,
                left: rect.left,
            },
        }));
    };

    const handleMoreInfoEnter = (event, sectionKey) => {
        triggerRef.current = event.currentTarget;
        const rect = event.currentTarget.getBoundingClientRect();
        setMoreInfo({
            open: true,
            key: sectionKey,
            position: {
                top: rect.bottom + 8,
                left: rect.left,
            },
        });
        setPopoverEntered(false);
    };

    const handleMoreInfoClose = () => {
        setMoreInfo((prev) => ({ ...prev, open: false }));
        setPopoverEntered(false);
    };

    const handlePopoverMouseEnter = () => {
        setPopoverEntered(true);
    };

    const handlePopoverMouseLeave = () => {
        if (popoverEntered) {
            handleMoreInfoClose();
        }
    };

    useEffect(() => {
        if (!moreInfo.open) return;
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [moreInfo.open, moreInfo.key]);

    const [editCost, setEditCost] = useState({
        open: false,
        position: { top: 0, left: 0 },
    });
    const [editCostValue, setEditCostValue] = useState(transferCost);
    const editTriggerRef = useRef(null);

    const updateEditPosition = () => {
        if (!editTriggerRef.current) return;
        const rect = editTriggerRef.current.getBoundingClientRect();
        setEditCost((prev) => ({
            ...prev,
            position: { top: rect.bottom + 8, left: rect.left },
        }));
    };

    const handleEditCostOpen = (event) => {
        editTriggerRef.current = event.currentTarget;
        const rect = event.currentTarget.getBoundingClientRect();
        setEditCostValue(transferCost);
        setEditCost({
            open: true,
            position: { top: rect.bottom + 8, left: rect.left },
        });
    };

    const handleEditCostClose = () => {
        setEditCost((prev) => ({ ...prev, open: false }));
    };

    const handleEditCostSave = () => {
        setTransferCost(Number(editCostValue) || 0);
        setEditCost((prev) => ({ ...prev, open: false }));
    };

    useEffect(() => {
        const transferUnits = Number(kpiData?.plan_scope?.transfer_units) || 0;
        const salesLift = Number(kpiData?.sales_impact?.sales_lift) || 0;

        const newTotalCost = transferUnits * transferCost;
        const newIncrementalCost = salesLift
            ? (newTotalCost / salesLift) * 100
            : 0;

        setTotalCost(Number(newTotalCost.toFixed(2)));
        setIncrementalCost(Number(newIncrementalCost.toFixed(2)));
    }, [kpiData, transferCost]);

    useEffect(() => {
        if (!editCost.open) return;
        window.addEventListener("scroll", updateEditPosition, true);
        window.addEventListener("resize", updateEditPosition);
        return () => {
            window.removeEventListener("scroll", updateEditPosition, true);
            window.removeEventListener("resize", updateEditPosition);
        };
    }, [editCost.open]);

    const kpiMetricChip = (title, value, change, bgColor) => {
        return(
            <div
                className={classes.kpiMetricChip}
                key={title}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
                <Typography component="span" className={classes.kpiMetricTitle}>
                    {title}
                </Typography>
                <Typography component="span" className={classes.kpiMetricValue}>
                    {value}
                </Typography>
                {change !== undefined && change !== null && (
                    <Typography component="span" className={change > 0 ? classes.kpiMetricChangePositive : classes.kpiMetricChangeNegative}>
                        {change>0 && "+"}{change}
                    </Typography>
                )}
            </div>
        )
    }

    const renderMetric = (sectionData, metric) => {
        const value = sectionData?.[metric.key];
        const bgColor = INVENTORY_CHIP_BG[metric.key];
        if (Array.isArray(value)) {
            return kpiMetricChip(metric.label, value[0], value[1], bgColor);
        }
        return kpiMetricChip(metric.label, value, undefined, bgColor);
    }

    const renderMoreInfoTrigger = (sectionKey, sectionData) => {
        if (sectionKey === "wos_shift") {
            if (!sectionData?.more_info) return null;
            return (
                <span className={classes.kpiMoreInfoText}>
                    {sectionData.more_info}
                </span>
            );
        }

        if (sectionKey === "size_availability") {
            if (!sectionData?.more_details) return null;
            return (
                <Tooltip
                    title={sectionData.more_details}
                    variant="tertiary"
                    placement="bottom"
                >
                    <span className={classes.kpiMoreInfo}>More Info</span>
                </Tooltip>
            );
        }

        if (!sectionData?.more_details) return null;
        return (
            <span
                className={classes.kpiMoreInfo}
                onMouseEnter={(e) => handleMoreInfoEnter(e, sectionKey)}
            >
                More Info
            </span>
        );
    }

    const renderMoreInfoContent = (sectionKey, sectionData) => {
        if (sectionKey === "sales_impact") {
            const details = sectionData?.more_details || {};
            const columns = [
                { title: "Net Sales Lift (Units)", data: details.sales_lift },
                { title: "Incremental $", data: details.incremental_dollars },
            ];
            return (
                <div className={classes.moreInfoColumns}>
                    {columns.map((col) => (
                        <div className={classes.moreInfoColumn} key={col.title}>
                            <Typography component="span" className={classes.moreInfoColumnTitle}>
                                {col.title}
                            </Typography>
                            <div className={classes.moreInfoChipColumn}>
                                {Object.entries(col.data || {}).map(([k, v]) =>
                                    kpiMetricChip(MORE_INFO_LABELS[k] || k, v)
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (sectionKey === "inventory_level") {
            return (
                <div className={classes.moreInfoChipColumn}>
                    {Object.entries(INVENTORY_LEVEL_FORMULAE).map(([k, v]) =>
                        kpiMetricChip(MORE_INFO_LABELS[k] || k, v)
                    )}
                </div>
            );
        }

        return null;
    }

    const MoreInfoPopover = () => {
        if (!moreInfo.open || !moreInfo.key) return null;
        const sectionData = kpiData?.[moreInfo.key];
        const popoverStyle = {
            position: "fixed",
            top: `${moreInfo.position.top}px`,
            left: `${moreInfo.position.left}px`,
        };
        return (
            <Portal>
                <div
                    className={`popover-content ${classes.moreInfoPopover}`}
                    style={popoverStyle}
                    onMouseEnter={handlePopoverMouseEnter}
                    onMouseLeave={handlePopoverMouseLeave}
                >
                    <div className={classes.popoverHeader}>
                        <span className={classes.popoverTitle}>More Info</span>
                        <div
                            onClick={handleMoreInfoClose}
                            className={classes.popoverCloseButton}
                        >
                            <CloseIcon />
                        </div>
                    </div>
                    <div className={classes.popoverContent}>
                        {renderMoreInfoContent(moreInfo.key, sectionData)}
                    </div>
                </div>
            </Portal>
        );
    }

    const EditCostPopover = () => {
        if (!editCost.open) return null;
        const popoverStyle = {
            position: "fixed",
            top: `${editCost.position.top}px`,
            left: `${editCost.position.left}px`,
        };
        return (
            <Portal>
                <div
                    className={`popover-content ${classes.moreInfoPopover}`}
                    style={popoverStyle}
                >
                    <div className={classes.popoverHeader}>
                        <span className={classes.popoverTitle}>Edit Transfer Cost</span>
                        <div
                            onClick={handleEditCostClose}
                            className={classes.popoverCloseButton}
                        >
                            <CloseIcon />
                        </div>
                    </div>
                    <div className={classes.editPopoverBody}>
                        <Input
                            label="Choose Number"
                            name="transferCost"
                            type="number"
                            value={editCostValue}
                            onChange={(e) => setEditCostValue(e.target.value)}
                            placeholder="Enter value"
                        />
                        <div className={classes.editPopoverActions}>
                            <Button onClick={handleEditCostSave} variant="primary">
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            </Portal>
        );
    }

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

    const renderExpandCollapseButton = () => {
        if (!(KPI_SECTIONS?.length > 4)) return null;
        return (
          <>
            <div className={classes.topRightDivider} />
            <Tooltip
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
            </Tooltip>
          </>
        );
    };

    const renderKPISections = () => {
        return KPI_SECTIONS.map(({ key, title, rows, Icon }) => {
            const sectionData = kpiData?.[key];
            if (!sectionData) return null;
            return (
                <div className={classes.kpiBox} key={key}>
                    <div className={classes.kpiBoxLeftSection}>
                        {Icon && <Icon />}
                        <div className={classes.kpiBoxLeftTitleSection}>
                            <Typography component="h1" variant="h4">
                                {title}
                            </Typography>
                            {renderMoreInfoTrigger(key, sectionData)}
                        </div>
                    </div>
                    <div className={classes.kpiBoxMiddleDivider} />
                    <div className={classes.kpiBoxRightSection}>
                        {rows.map((row, rowIndex) => (
                            <div className={classes.kpiBoxRightRow} key={rowIndex}>
                                {row.map((metric) => renderMetric(sectionData, metric))}
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    };

    return (
      <div id="metrics-panel" className={classes.kpiContainer}>
        <div
          className={`${classes.panelHeaderContainer} ${classes.paddingBottom4}`}
        >
          <span className={classes.panelHeaderTestStyles}>{headerTitle}</span>
          <Box display="flex" alignItems="center" gap={1}>
            <div className={classes.topRightSection}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "4px",
                  alignItems: "center",
                }}
              >
                <span className={classes.topRightSectionText}>
                  Transfer Cost:{" "}
                  <span style={{ fontWeight: 800 }}>${transferCost}</span>
                </span>
                <Button
                  onClick={handleEditCostOpen}
                  icon={<IS_Edit />}
                  type="default"
                  variant="url"
                >
                  Edit
                </Button>
              </div>
              <div className={classes.kpiMetricChip}>
                <Typography component="span" className={classes.kpiMetricTitle}>
                  Total Cost:
                </Typography>
                <Typography component="span" className={classes.kpiMetricValue}>
                  ${totalCost}
                </Typography>
              </div>
              <div className={classes.kpiMetricChip}>
                <Typography component="span" className={classes.kpiMetricTitle}>
                  Transfer Cost-to-Lift Ratio (%):
                </Typography>
                <Typography component="span" className={classes.kpiMetricValue}>
                  {incrementalCost}%
                </Typography>
              </div>
            </div>
            {renderExpandCollapseButton()}
          </Box>
        </div>
        {expanded ? (
          <Box className={classes.expandedPanelContainerStyles}>
            {renderKPISections()}
          </Box>
        ) : (
          <>
            <Box
              ref={containerRef}
              className={classes.kpiContainerWrapper}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {isHovering && canScrollLeft && (
                <div
                  className={`${classes.edgeFade} ${classes.edgeFadeLeft}`}
                />
              )}
              {isHovering && canScrollRight && (
                <div
                  className={`${classes.edgeFade} ${classes.edgeFadeRight}`}
                />
              )}
              {isHovering && isScrollable && canScrollLeft && (
                <Box className={classes.scrollButtonWrapperLeft}>
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
                </Box>
              )}
              <div ref={scrollRef} className={classes.nonExpandedContainerStyles}>
                {renderKPISections()}
              </div>
              {isHovering && isScrollable && canScrollRight && (
                <Box className={classes.scrollButtonWrapperRight}>
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
              )}
            </Box>
            {isScrollable && (
              <div className={classes.customScrollTrack}>
                <div
                  className={classes.customScrollThumb}
                  style={{
                    width: `${scrollThumb.width}px`,
                    transform: `translateX(${scrollThumb.left}px)`,
                  }}
                />
              </div>
            )}
          </>
        )}
        <MoreInfoPopover />
        <EditCostPopover />
      </div>
    );
}
