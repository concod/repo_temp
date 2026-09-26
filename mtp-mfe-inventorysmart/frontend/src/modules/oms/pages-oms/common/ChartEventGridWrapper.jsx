import React from "react";
import { makeStyles } from "@mui/styles";
import EventGrid from "./EventGrid";
import ChartLegend from "./ChartLegend";
import { useEventGridChartInfo } from "./useEventGridChartInfo";

// Above this many x-axis points the chart (and event grid) scroll horizontally
// instead of squishing the columns. Matches sample.jsx scrollability behaviour.
const SCROLL_MIN_POINTS = 12;

const useStyles = makeStyles(() => ({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
}));

const ChartEventGridWrapper = ({
  children,
  showEventGrid = false,
  isEventsChecked = false,
  isChartView = true,
  events = [],
  xAxisCategories = [],
  seriesData = [],
  eventIconMap,
  baseChartMarginBottom = 150,
  defaultXAxisTitle = "Timeline",
}) => {
  const classes = useStyles();
  // The event grid only makes sense alongside the chart — hide it in table view.
  const isActive = showEventGrid && isEventsChecked && isChartView;
  const { chartInfo, chartOptions } = useEventGridChartInfo(isActive);

  // When the event grid is active we mirror sample.jsx:
  // - hide the chart x-axis title ("Timeline" renders below the event grid)
  // - disable the built-in Highcharts legend so the keys can render AFTER the grid
  const xAxisTitle = isActive ? "" : defaultXAxisTitle;
  const chartMarginBottom = isActive ? 80 : baseChartMarginBottom;
  const legendOptions = isActive ? { enabled: false } : undefined;
  const showScrollX =
    isActive && (xAxisCategories?.length || 0) > SCROLL_MIN_POINTS;

  return (
    <div className={classes.wrapper}>
      {children({
        chartOptions,
        chartMarginBottom,
        xAxisTitle,
        legendOptions,
        showScrollX,
      })}
      {isActive && (
        <>
          <EventGrid
            chartInfo={chartInfo}
            events={events}
            xAxisCategories={xAxisCategories}
            eventIconMap={eventIconMap}
            showTimelineLabel
          />
          <ChartLegend seriesData={seriesData} />
        </>
      )}
    </div>
  );
};

export default ChartEventGridWrapper;
