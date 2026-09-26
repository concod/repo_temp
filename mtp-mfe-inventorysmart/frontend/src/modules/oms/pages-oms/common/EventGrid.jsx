import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { makeStyles } from "@mui/styles";
import { Tooltip } from "impact-ui-v3";
import { getEventIcon } from "./eventIconMap";
import {
  EVENT_ROW_HEIGHT,
  MIN_EVENT_ROWS,
  getTimelineGridBoundaries,
  packEventsIntoRows,
} from "./eventGridUtils";

const CHART_CONTAINER_HORIZONTAL_PADDING = 12;
const EVENT_ICON_SIZE = 22;
const EVENT_CARD_ICON_SIZE = 18;

const EVENT_CARD_INSET = 4;

// Resolves an event's display label and icon from the backend event name.
const getEventLabel = (evt) => evt?.name || evt?.title || evt?.label || "";

const renderTooltipTitle = (label, description) => {
  const desc = typeof description === "string" ? description.trim() : "";
  const hasDistinctDesc =
    desc && desc.toLowerCase() !== String(label).trim().toLowerCase();

  return hasDistinctDesc ? (
    <span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <br />
      {desc}
    </span>
  ) : (
    label
  );
};

const useStyles = makeStyles((theme) => ({
  timelineSection: {
    marginTop: theme.spacing(1),
    width: "100%",
    paddingLeft: CHART_CONTAINER_HORIZONTAL_PADDING,
    paddingRight: CHART_CONTAINER_HORIZONTAL_PADDING,
    boxSizing: "border-box",
  },
  eventRow: {
    display: "flex",
    alignItems: "stretch",
  },
  rowLabel: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: theme.spacing(0.5),
    fontWeight: 700,
    fontSize: 14,
    color: theme.palette.text.primary,
    borderRight: `1px dashed ${theme.palette.divider}`,
  },
  rowContent: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    minWidth: 0,
  },
  rowContentScrollable: {
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  rowInner: {
    position: "relative",
  },
  timelineGrid: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0,
    borderLeft: `1px dashed ${theme.palette.divider}`,
    transform: "translateX(-0.5px)",
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    borderTop: `1px dashed ${theme.palette.divider}`,
    transform: "translateY(-0.5px)",
  },
  eventIconOnly: {
    position: "absolute",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    transform: "translateX(-50%)",
    boxSizing: "border-box",
    boxShadow: "inset 0 0 0 3px #F4F1F9",
    "& svg": {
      width: 22,
      height: 22,
      display: "block",
      flexShrink: 0,
    },
  },
  eventCard: {
    position: "absolute",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    padding: "4px 12px 4px 4px",
    borderRadius: 10,
    backgroundColor: "#F4F1F9",
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxSizing: "border-box",
  },
  eventCardIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    "& svg": {
      width: 18,
      height: 18,
      display: "block",
    },
  },
  eventCardTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  timelineLabel: {
    textAlign: "center",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(0.5),
    fontSize: 12,
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
}));

const renderTimelineGrid = (classes, gridBoundaries, rowCount) => (
  <div className={classes.timelineGrid} aria-hidden="true">
    {gridBoundaries.map((x, index) => (
      <span
        key={`v-${index}`}
        className={classes.gridLineVertical}
        style={{ left: x }}
      />
    ))}
    {Array.from({ length: rowCount + 1 }).map((_, index) => (
      <span
        key={`h-${index}`}
        className={classes.gridLineHorizontal}
        style={{ top: index * EVENT_ROW_HEIGHT }}
      />
    ))}
  </div>
);

const EventGrid = ({
  chartInfo,
  events = [],
  xAxisCategories = [],
  showTimelineLabel = true,
  eventIconMap,
}) => {
  const classes = useStyles();
  const eventsScrollRef = useRef(null);
  const isSyncingScrollRef = useRef(false);
  const [chartScrollLeft, setChartScrollLeft] = useState(0);

  const plotLeft = chartInfo?.plotLeft || 0;

  const eventRows = useMemo(() => packEventsIntoRows(events, xAxisCategories), [
    events,
    xAxisCategories,
  ]);

  const eventRowCount = Math.max(eventRows.length, MIN_EVENT_ROWS);

  const timelineGridBoundaries = useMemo(
    () => getTimelineGridBoundaries(chartInfo?.pointPositions, plotLeft),
    [chartInfo, plotLeft]
  );

  const innerWidth = useMemo(() => {
    if (timelineGridBoundaries.length) {
      return timelineGridBoundaries[timelineGridBoundaries.length - 1];
    }

    if (!chartInfo?.pointPositions?.length) return "100%";

    const lastX =
      chartInfo.pointPositions[chartInfo.pointPositions.length - 1]?.x || 0;
    return lastX - plotLeft + 80;
  }, [chartInfo, plotLeft, timelineGridBoundaries]);

  const getPositionX = useCallback(
    (dateStr) => {
      if (!chartInfo?.pointPositions) return null;
      const found = chartInfo.pointPositions.find(
        (point) => point.category === dateStr
      );
      return found ? found.x : null;
    },
    [chartInfo]
  );

  const syncChartFromTimeline = useCallback(
    (scrollLeft) => {
      if (isSyncingScrollRef.current) return;

      isSyncingScrollRef.current = true;
      setChartScrollLeft(scrollLeft);

      if (chartInfo?.scrollingContainer) {
        chartInfo.scrollingContainer.scrollLeft = scrollLeft;
      }

      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    },
    [chartInfo?.scrollingContainer]
  );

  const handleTimelineScroll = useCallback(
    (event) => {
      syncChartFromTimeline(event.currentTarget.scrollLeft);
    },
    [syncChartFromTimeline]
  );

  const handleTimelineWheel = useCallback(
    (event) => {
      const scrollTarget = eventsScrollRef.current;
      if (!scrollTarget) return;

      const scrollDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;

      if (!scrollDelta) return;
      event.preventDefault();

      const nextScrollLeft = scrollTarget.scrollLeft + scrollDelta;
      scrollTarget.scrollLeft = nextScrollLeft;
      syncChartFromTimeline(nextScrollLeft);
    },
    [syncChartFromTimeline]
  );

  useEffect(() => {
    const scrollEl = chartInfo?.scrollingContainer;
    if (!scrollEl) return;

    const syncScroll = () => {
      if (isSyncingScrollRef.current) return;

      isSyncingScrollRef.current = true;
      const scrollLeft = scrollEl.scrollLeft;
      setChartScrollLeft(scrollLeft);

      if (eventsScrollRef.current) {
        eventsScrollRef.current.scrollLeft = scrollLeft;
      }

      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };

    scrollEl.addEventListener("scroll", syncScroll, { passive: true });
    syncScroll();

    return () => scrollEl.removeEventListener("scroll", syncScroll);
  }, [chartInfo?.scrollingContainer]);

  if (!chartInfo || !xAxisCategories?.length) {
    return null;
  }

  return (
    <div className={classes.timelineSection} onWheel={handleTimelineWheel}>
      <div className={classes.eventRow}>
        <div className={classes.rowLabel} style={{ width: plotLeft }}>
          Events
        </div>
        <div
          className={`${classes.rowContent} ${classes.rowContentScrollable}`}
          ref={eventsScrollRef}
          onScroll={handleTimelineScroll}
        >
          <div
            className={classes.rowInner}
            style={{
              width: innerWidth,
              minHeight: eventRowCount * EVENT_ROW_HEIGHT,
              transform: chartInfo?.scrollingContainer
                ? undefined
                : `translateX(-${chartScrollLeft}px)`,
            }}
          >
            {renderTimelineGrid(classes, timelineGridBoundaries, eventRowCount)}
            {eventRows.map((row, rowIdx) =>
              row.map((evt) => {
                const startX = getPositionX(evt.startDate);
                if (startX === null) return null;

                const label = getEventLabel(evt);
                const tooltipTitle = renderTooltipTitle(label, evt.description);

                if (evt.type === "icon-only") {
                  const icon = getEventIcon(
                    label,
                    EVENT_ICON_SIZE,
                    eventIconMap
                  );
                  return (
                    <Tooltip
                      key={evt.id}
                      title={tooltipTitle}
                      variant="tertiary"
                    >
                      <span
                        className={classes.eventIconOnly}
                        style={{
                          left: startX - plotLeft,
                          top: rowIdx * EVENT_ROW_HEIGHT + 8,
                        }}
                      >
                        {icon}
                      </span>
                    </Tooltip>
                  );
                }

                const cellLeft = timelineGridBoundaries[evt._startIdx];
                const cellRight = timelineGridBoundaries[evt._endIdx + 1];

                let cardLeft;
                let cardWidth;
                if (cellLeft != null && cellRight != null) {
                  cardLeft = cellLeft + EVENT_CARD_INSET;
                  cardWidth = Math.max(
                    cellRight - cellLeft - EVENT_CARD_INSET * 2,
                    60
                  );
                } else {
                  const endX = getPositionX(evt.endDate);
                  if (endX === null) return null;
                  cardLeft = startX - plotLeft;
                  cardWidth = Math.max(endX - startX, 60);
                }

                const icon = getEventIcon(
                  label,
                  EVENT_CARD_ICON_SIZE,
                  eventIconMap
                );

                return (
                  <Tooltip key={evt.id} title={tooltipTitle} variant="tertiary">
                    <span
                      className={classes.eventCard}
                      style={{
                        left: cardLeft,
                        top: rowIdx * EVENT_ROW_HEIGHT + 8,
                        width: cardWidth,
                      }}
                    >
                      {icon && (
                        <span className={classes.eventCardIcon}>{icon}</span>
                      )}
                      <span className={classes.eventCardTitle}>{label}</span>
                    </span>
                  </Tooltip>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showTimelineLabel && (
        <div className={classes.timelineLabel}>Timeline</div>
      )}
    </div>
  );
};

export default EventGrid;
