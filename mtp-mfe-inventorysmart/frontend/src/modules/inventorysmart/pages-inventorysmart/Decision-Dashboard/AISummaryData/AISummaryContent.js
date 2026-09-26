export function parseAlanSummary(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  let current = { category: "", summary: "" };

  const pushCurrent = () => {
    if (current.summary.trim() !== "" || current.category.trim() !== "") {
      items.push({ ...current });
    }
    current = { category: "", summary: "" };
  };

  lines.forEach((line) => {
    // -------- CATEGORY LINE ----------
    if (line.startsWith("- **Insight Category:**")) {
      pushCurrent(); // close previous section
      current.category = line
        .replace("- **Insight Category:**", "")
        .replace(/\*\*/g, "")
        .trim();
      return;
    }

    // -------- SUMMARY LINE ----------
    if (line.startsWith("- **Summary:**")) {
      const summaryText = line
        .replace("- **Summary:**", "")
        .replace(/\*\*/g, "")
        .trim();

      current.summary += summaryText;
      return;
    }

    // -------- STORES LINE ----------
    if (line.startsWith("- **Stores:**")) {
      const storesText = line
        .replace("- **Stores:**", "")
        .replace(/\*\*/g, "")
        .trim();

      current.summary += `\n\nStores: ${storesText}`;
      return;
    }

    // -------- FINAL REPORT TITLE ----------
    if (line.startsWith("**Final Report:**")) {
      pushCurrent();
      current.category = "Final Report";
      return;
    }

    // -------- FINAL REPORT BULLETS ----------
    if (line.startsWith("- Store")) {
      current.summary +=
        (current.summary ? "\n" : "") + line.replace(/^\- /, "");
      return;
    }

    // -------- PLAIN STATEMENTS ----------
    if (!line.startsWith("- **")) {
      // plain text (like "No high velocity..." etc.)
      pushCurrent();
      current.summary = line.replace(/\*\*/g, "").trim();
      return;
    }
  });

  pushCurrent();

  return { items };
}

export const transformApiResponse = (data) => {
  if (!data) return null;

  return {
    requestId: data.request_id,
    allocationCode: data.allocation_code,
    model: data.model,

   sections: (data?.summary?.sections || data?.deep_dive?.sections)?.map((section) => ({
      type: section.type,
      heading: section.heading,
      headingStyle: section.headingStyle || {},
      content: section.content || [],
    })),

    meta: {
      cached: data.cached,
      totalTime: data.total_time_s,
    },
  };
};

export const getSafeTypographyStyle = (style = {}) => ({
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
  lineHeight: style.lineHeight,
  color: style.color,
  fontStyle: style.fontStyle,
  letterSpacing: style.letterSpacing,
});

// Alan Summary Panel Constants
export const getMetricOptions = (allowedMetrics = []) =>
  allowedMetrics.map((metric) => ({
    label: metric.display,
    value: metric.field,
  }));

export const getDefaultMetricOption = (metricOptions = [], defaultMetric) =>
  metricOptions.find((option) => option.value === defaultMetric) || null;

export const STATUS_MAP = {
  0: { name: "Under allocated", color: "#ff6b6b" },
  1: { name: "Over allocated", color: "#ffd43b" },
  2: { name: "Normal", color: "#51cf66" },
};

// Alan Summary Panel Text Constants
export const ALAN_SUMMARY_TEXT = {
  // Error messages
  SELECT_ONE_ROW: "Please select exactly one row to get Iris Summary",
  NO_DATA_RECEIVED: "No data received",
  ERROR_FETCHING_ALAN_SUMMARY: "Error fetching Iris Summary:",
  FAILED_TO_FETCH_ALAN_SUMMARY: "Failed to fetch Iris Summary",
  NO_DATA_FOR_DEEP_DIVE: "No data available for deep dive analysis",
  MISSING_DEEP_DIVE_PARAMS: "Missing required parameters for deep dive analysis",
  FAILED_TO_FETCH_DEEP_DIVE: "Failed to fetch deep dive analysis",

  // Chart and UI labels
  CHART_TITLE: "Allocation Scatter Chart",
  DISTRIBUTION_SUMMARY_HEADER: "Distribution Summary : Deep Dive",
  DEEP_DIVE_SUMMARY_HEADER: "Deep Dive Summary",
  PANEL_TITLE: "Iris Summary",

  // Info card labels
  ALLOCATION_LABEL: "ALLOCATION",
  ARTICLE_LABEL: "ARTICLE",
  STORES_LABEL: "STORES",

  // Placeholder and loading messages
  DEEP_DIVE_PLACEHOLDER: "Please select a data point from the scatter chart to view detailed insights.",
  DEEP_DIVE_LOADING: "Loading deep dive analysis...",

  // Debug messages
  CHART_DEBUG_INFO: "Chart Debug Info:",
  ITEMS_SUFFIX: " items",

  // Default value
  NA: "N/A",

  // Tooltip template
  TOOLTIP_TEMPLATE: (selectedXAxis, selectedYAxis) => `
        <b>Store:</b> {point.name}<br/>
        <b>${selectedXAxis}:</b> {point.x}<br/>
        <b>${selectedYAxis}:</b> {point.y}<br/>
        <b>Allocation:</b> {point.allocation}<br/>
        <b>Demand:</b> {point.demand}<br/>
        <b>ROS:</b> {point.ros}<br/>
        <b>Stock:</b> {point.stock}
      `,
};
