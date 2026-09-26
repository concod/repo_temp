export const EVENT_ROW_HEIGHT = 52;
export const MIN_EVENT_ROWS = 3;

export const packEventsIntoRows = (events, categories) => {
  const catIndex = (date) => categories.indexOf(date);
  const sorted = [...(events || [])].sort(
    (a, b) => catIndex(a.startDate) - catIndex(b.startDate)
  );
  const rows = [];

  for (const evt of sorted) {
    const start = catIndex(evt.startDate);
    const end = catIndex(evt.endDate);
    if (start === -1) continue;

    let placed = false;
    for (const row of rows) {
      const lastEnd = row[row.length - 1]._endIdx;
      if (start > lastEnd) {
        row.push({ ...evt, _startIdx: start, _endIdx: end });
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push([{ ...evt, _startIdx: start, _endIdx: end }]);
    }
  }

  return rows;
};

export const getTimelineGridBoundaries = (pointPositions, plotLeft) => {
  const positions =
    pointPositions?.map((point) => point.x - plotLeft) || [];
  if (positions.length < 2) return positions;

  const boundaries = [];
  const firstGap = positions[1] - positions[0];
  boundaries.push(Math.max(0, positions[0] - firstGap / 2));

  for (let i = 0; i < positions.length - 1; i += 1) {
    boundaries.push((positions[i] + positions[i + 1]) / 2);
  }

  const lastGap =
    positions[positions.length - 1] - positions[positions.length - 2];
  boundaries.push(positions[positions.length - 1] + lastGap / 2);
  return boundaries;
};

export const areChartInfoEqual = (prev, next) => {
  if (!prev || !next) return false;

  if (
    prev.plotLeft !== next.plotLeft ||
    prev.plotWidth !== next.plotWidth ||
    prev.plotTop !== next.plotTop ||
    prev.plotHeight !== next.plotHeight ||
    prev.chartWidth !== next.chartWidth ||
    prev.scrollingContainer !== next.scrollingContainer
  ) {
    return false;
  }

  if (prev.pointPositions?.length !== next.pointPositions?.length) {
    return false;
  }

  return next.pointPositions.every((point, index) => {
    const prevPoint = prev.pointPositions[index];
    return prevPoint?.category === point.category && prevPoint?.x === point.x;
  });
};

export const extractChartInfo = (chart) => {
  if (!chart?.xAxis?.[0]) return null;

  const xAxis = chart.xAxis[0];
  const categories = xAxis.categories || [];
  // Use chart-relative pixels (includes plotLeft). EventGrid subtracts plotLeft
  // to position markers/grid lines inside the plot content area.
  const pointPositions = categories.map((category, index) => ({
    category,
    x: xAxis.toPixels(index),
  }));

  // Highcharts exposes the scrollable element directly as chart.scrollingContainer
  // (class ".highcharts-scrolling"); ".highcharts-scrolling-parent" is the fixed wrapper.
  const scrollingContainer =
    chart.scrollingContainer ||
    chart.renderTo?.querySelector(".highcharts-scrolling") ||
    null;

  return {
    plotLeft: chart.plotLeft,
    plotTop: chart.plotTop,
    plotWidth: chart.plotWidth,
    plotHeight: chart.plotHeight,
    chartWidth: chart.chartWidth,
    pointPositions,
    scrollingContainer,
  };
};

export const getEventGridChartMarginBottom = (baseMargin = 150) => baseMargin;



export const mapHolidayWeeksToEvents = (data, options) => {
  const rows = Array.isArray(data) ? data : data?.data || [];
  const fiscalYearWeeks = options?.fiscalYearWeeks || [];
  const categories = options?.categories || [];

  // When fiscal_year_week isn't provided separately, fall back to matching
  // directly against the categories.
  const referenceWeeks = fiscalYearWeeks.length ? fiscalYearWeeks : categories;

  // Fiscal week -> chart column index (first occurrence wins).
  const weekToIndex = new Map();
  referenceWeeks.forEach((week, index) => {
    if (week == null) return;
    const key = String(week);
    if (!weekToIndex.has(key)) weekToIndex.set(key, index);
  });

  const lastIndex = referenceWeeks.length - 1;
  // Preserve the raw category value (string or number) so it matches the chart's
  // x-axis categories exactly when positioning markers.
  const labelAt = (index) =>
    categories[index] != null ? categories[index] : referenceWeeks[index];

  const events = [];

  rows.forEach((row, index) => {
    const name =
      row?.holiday_name ||
      row?.name ||
      row?.event_name ||
      row?.holiday ||
      "";
    if (!name) return;

    const description = row?.holiday_desc || row?.description || "";
    const startWeek = row?.start_week ?? row?.startWeek ?? null;
    const endWeek = row?.end_week ?? row?.endWeek ?? null;

    let startIdx = weekToIndex.has(String(startWeek))
      ? weekToIndex.get(String(startWeek))
      : null;
    let endIdx = weekToIndex.has(String(endWeek))
      ? weekToIndex.get(String(endWeek))
      : null;

    // Skip events that fall entirely outside the visible x-axis.
    if (startIdx === null && endIdx === null) return;

    // Clamp a missing endpoint to the visible range so partial spans still show.
    if (startIdx === null) startIdx = 0;
    if (endIdx === null) endIdx = lastIndex;
    if (endIdx < startIdx) {
      const tmp = startIdx;
      startIdx = endIdx;
      endIdx = tmp;
    }

    const spansMultipleWeeks = endIdx > startIdx;

    events.push({
      id: `${name}-${startWeek}-${endWeek}-${index}`,
      name,
      description,
      startDate: labelAt(startIdx),
      endDate: labelAt(endIdx),
      type: spansMultipleWeeks ? "card" : "icon-only",
    });
  });

  return events;
};
