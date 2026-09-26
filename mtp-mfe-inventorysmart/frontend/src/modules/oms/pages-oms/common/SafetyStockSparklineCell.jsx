import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { IconButton, Popover } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import theme from "core/Styles/theme";
import { getSafetyStockGraph } from "modules/oms/services-oms/common/common-services";

const DEFAULT_GRAPH_KEYS = ["product_code", "loc_code"];
const SPARKLINE_LINE_COLOR = "#BFAFD9";
const SPARKLINE_FILL_COLOR = "#977CC1";
const SPARKLINE_XAXIS_LABEL = "Service Level (%)";
const SPARKLINE_SERIES_LABEL = "Safety Stock";
const GRAPH_POPUP_TITLE = "Safety Stock vs Service Level";
const GRAPH_POPUP_WIDTH = 488;
const GRAPH_POPUP_HEIGHT = 280;
const GRAPH_POPUP_PADDING = 16;
const GRAPH_POPUP_TITLE_HEIGHT = 28;
const GRAPH_POPUP_BORDER_RADIUS = 12;
const GRAPH_POPUP_AXIS_LABEL_COLOR = "#60697D";
const GRAPH_POPUP_GRID_COLOR = "#E6E9F0";
const COMMON_FONT_FAMILY = "Manrope";
const GRAPH_POPUP_AXIS_TITLE_STYLE = {
  color: GRAPH_POPUP_AXIS_LABEL_COLOR,
  fontSize: "10px !important",
  fontWeight: 500,
  lineHeight: "140%",
  textTransform: "capitalize",
};
const GRAPH_POPUP_AXIS_LABEL_STYLE = {
  color: GRAPH_POPUP_AXIS_LABEL_COLOR,
  fontWeight: 500,
  textTransform: "capitalize",
};

const sparklineDataCache = new Map();

const buildGraphPayload = (rowData, uniqueKeys) => {
  const keys =
    Array.isArray(uniqueKeys) && uniqueKeys.length > 0
      ? uniqueKeys
      : DEFAULT_GRAPH_KEYS;
  const body = {};
  keys.forEach((key) => {
    body[key] = rowData?.[key];
  });
  return body;
};

const fetchSparklineData = (payload) => {
  const cacheKey = JSON.stringify(payload);
  if (!sparklineDataCache.has(cacheKey)) {
    const request = getSafetyStockGraph(payload)()
      .then((response) => {
        if (response?.data?.status) {
          return response.data.data;
        }
        sparklineDataCache.delete(cacheKey);
        return null;
      })
      .catch(() => {
        sparklineDataCache.delete(cacheKey);
        return null;
      });
    sparklineDataCache.set(cacheKey, request);
  }
  return sparklineDataCache.get(cacheKey);
};

const getCurrentServiceLevel = (rowData) => {
  const value = Number(
    rowData?.service_level_pct ?? rowData?.service_level_percentage
  );
  return Number.isFinite(value) ? Math.round(value) : null;
};


const getCurrentSafetyStock = (series, rowData) => {
  const currentServiceLevel = getCurrentServiceLevel(rowData);
  if (series && currentServiceLevel !== null) {
    const index = series.categories.findIndex(
      (category) => Number(category) === currentServiceLevel
    );
    if (index !== -1) {
      return series.points[index];
    }
  }
  const fallback = Number(rowData?.safety_stock);
  return Number.isFinite(fallback) ? fallback : null;
};

const getGraphSeries = (graphData) => {
  const serviceLevels = graphData?.service_level;
  const safetyStock = graphData?.safety_stock;
  const hasGraphData =
    Array.isArray(serviceLevels) &&
    Array.isArray(safetyStock) &&
    serviceLevels[0] !== null &&
    safetyStock[0] !== null;

  if (!hasGraphData) {
    return null;
  }
  return {
    categories: serviceLevels.map((val) => `${Math.round(val * 100)}`),
    points: safetyStock.map((val) => parseFloat(Number(val).toFixed(2))),
  };
};


export const SafetyStockGraphPopover = ({
  popupState,
  uniqueKeys,
  plotBands,
  onClose,
}) => {
  const [graphData, setGraphData] = useState(undefined);
  const rowData = popupState?.rowData;

  useEffect(() => {
    if (!rowData) {
      return undefined;
    }
    let cancelled = false;
    setGraphData(undefined);
    fetchSparklineData(buildGraphPayload(rowData, uniqueKeys)).then((data) => {
      if (!cancelled) {
        setGraphData(data);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowData]);

  const series = getGraphSeries(graphData);

  const currentServiceLevel = getCurrentServiceLevel(rowData);
  const popupPoints = series
    ? series.points.map((y, index) =>
      Number(series.categories[index]) === currentServiceLevel
        ? {
          y,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 5,
            fillColor: SPARKLINE_FILL_COLOR,
          },
        }
        : y
    )
    : [];

  const popupChartOptions = {
    chart: {
      type: "spline",
      width: GRAPH_POPUP_WIDTH - GRAPH_POPUP_PADDING * 2,
      height:
        GRAPH_POPUP_HEIGHT - GRAPH_POPUP_PADDING * 2 - GRAPH_POPUP_TITLE_HEIGHT,
      backgroundColor: "transparent",
      spacing: [12, 4, 4, 4],
      style: { fontFamily: COMMON_FONT_FAMILY },
    },
    title: { text: null },
    credits: { enabled: false },
    exporting: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: series?.categories ?? [],
      title: {
        text: SPARKLINE_XAXIS_LABEL,
        margin: 16,
        style: GRAPH_POPUP_AXIS_TITLE_STYLE,
      },
      plotBands: (Array.isArray(plotBands) ? plotBands : []).map((band) => ({
        ...band,
        color: band?.color
          ? Highcharts.color(band.color).setOpacity(0.4).get()
          : band?.color,
      })),
      lineColor: GRAPH_POPUP_GRID_COLOR,
      labels: {
        style: {
          ...GRAPH_POPUP_AXIS_LABEL_STYLE,
          fontSize: "6.971px !important",
          lineHeight: "133.33%",
        },
      },
    },
    yAxis: {
      title: {
        text: SPARKLINE_SERIES_LABEL,
        style: GRAPH_POPUP_AXIS_TITLE_STYLE,
      },
      gridLineDashStyle: "Dash",
      gridLineColor: GRAPH_POPUP_GRID_COLOR,
      labels: {
        style: {
          ...GRAPH_POPUP_AXIS_LABEL_STYLE,
          fontSize: "10px !important",
          lineHeight: "140%",
        },
      },
    },
    tooltip: {
      outside: true,
      hideDelay: 100,
      backgroundColor: theme.palette.text.primary,
      borderColor: "transparent",
      borderRadius: 8,
      shadow: false,
      padding: 10,
      useHTML: true,
      style: { zIndex: 9999 },
      formatter: function () {
        const category = this.point?.category ?? this.x;
        return `<span style="color: ${theme.palette.common.white}">Service Level: <b>${category}%</b><br/>${SPARKLINE_SERIES_LABEL}: <b>${Highcharts.numberFormat(
          this.y,
          0,
          ".",
          ","
        )}</b></span>`;
      },
    },
    plotOptions: {
      series: {
        animation: false,
        lineWidth: 2,
        color: SPARKLINE_LINE_COLOR,
        marker: {
          enabled: false,
          states: { hover: { enabled: false } },
        },
        states: { hover: { halo: { size: 0 }, lineWidthPlus: 0 } },
      },
    },
    series: [
      {
        name: SPARKLINE_SERIES_LABEL,
        data: popupPoints,
      },
    ],
  };

  return (
    <Popover
      open={Boolean(popupState)}
      anchorReference="anchorPosition"
      anchorPosition={popupState?.position}
      onClose={onClose}
      PaperProps={{
        style: {
          width: GRAPH_POPUP_WIDTH,
          height: GRAPH_POPUP_HEIGHT,
          padding: GRAPH_POPUP_PADDING,
          boxSizing: "border-box",
          borderRadius: GRAPH_POPUP_BORDER_RADIUS,
        },
      }}
    >
      <div
        style={{
          height: GRAPH_POPUP_TITLE_HEIGHT,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 12,
          fontFamily: COMMON_FONT_FAMILY,
          color: theme.palette.text.primary,
          lineHeight: "166.667%",
          textTransform: "capitalize",
        }}
      >
        <span>{GRAPH_POPUP_TITLE}</span>
        <IconButton
          aria-label="close"
          size="small"
          onClick={onClose}
          style={{ padding: 2 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      {series && (
        <HighchartsReact highcharts={Highcharts} options={popupChartOptions} />
      )}
    </Popover>
  );
};

const SafetyStockSparklineCell = ({ rowData, uniqueKeys, onOpenPopup }) => {
  const [graphData, setGraphData] = useState(undefined);
  const containerRef = useRef(null);
  const isMountedRef = useRef(true);
  const openGraphPopupRef = useRef(() => { });

  useEffect(() => {
    isMountedRef.current = true;
    fetchSparklineData(buildGraphPayload(rowData, uniqueKeys)).then((data) => {
      if (isMountedRef.current) {
        setGraphData(data);
      }
    });
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const series = getGraphSeries(graphData);

  const openGraphPopup = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    onOpenPopup?.({
      rowData,
      position: { top: rect.bottom, left: rect.left },
    });
  };
  openGraphPopupRef.current = openGraphPopup;

  const hasSeries = Boolean(series);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }
    let openedByPointer = false;
    const onPointerDown = () => {
      openedByPointer = true;
      openGraphPopupRef.current();
    };
    const onMouseDown = () => {
      if (!openedByPointer) {
        openGraphPopupRef.current();
      }
      openedByPointer = false;
    };
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("mousedown", onMouseDown);
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("mousedown", onMouseDown);
    };
  }, [hasSeries]);

  if (graphData === undefined) {
    return <span></span>;
  }

  if (!series) {
    return <span>-</span>;
  }

  const currentServiceLevel = getCurrentServiceLevel(rowData);
  const currentSafetyStock = getCurrentSafetyStock(series, rowData);

  const sparklineOptions = {
    chart: {
      type: "spline",
      width: 59,
      height: 18,
      margin: [2, 0, 2, 0],
      backgroundColor: "transparent",
      plotBackgroundColor: "transparent",
      borderWidth: 0,
      style: { overflow: "visible", fontFamily: COMMON_FONT_FAMILY },
      skipClone: true,
    },
    title: { text: null },
    credits: { enabled: false },
    exporting: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: series.categories,
      visible: false,
    },
    yAxis: {
      visible: false,
    },

    tooltip: {
      outside: true,
      hideDelay: 100,
      backgroundColor: theme.palette.text.primary,
      borderColor: "transparent",
      borderRadius: 8,
      shadow: false,
      padding: 10,
      useHTML: true,
      style: { width: "250px", zIndex: 9999 },
      formatter: function () {
        const category = this.point?.category ?? this.x;
        return `<span style="color: ${theme.palette.common.white};">Service Level: <b>${category}%</b><br/>${SPARKLINE_SERIES_LABEL}: <b>${Highcharts.numberFormat(
          this.y,
          0,
          ".",
          ","
        )}</b></span>`;
      },
    },

    plotOptions: {
      series: {
        animation: false,
        lineWidth: 1.5,
        color: SPARKLINE_LINE_COLOR,
        cursor: "pointer",
        marker: {
          enabled: false,
          radius: 2,
          states: { hover: { enabled: true } },
        },
        states: { hover: { lineWidthPlus: 0 } },
        events: {
          click: openGraphPopup,
        },
      },
    },
    series: [
      {
        name: SPARKLINE_SERIES_LABEL,
        data: series.points,
      },
    ],
  };

  return (
    <div
      ref={containerRef}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        height: "100%",
        width: "100%",
      }}
    >
      {(currentSafetyStock !== null || currentServiceLevel !== null) && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            width: 'fit-content',
            justifyContent: 'space-between',
          }}
        >
          {currentSafetyStock !== null &&
            <span style={{ flex: 1, textAlign: 'right' }}>${Highcharts.numberFormat(currentSafetyStock, 0, ".", ",")}</span>}
          {currentSafetyStock !== null && currentServiceLevel !== null && <span style={{ color: '#7A8294', flex: 1, textAlign: 'center' }}>vs</span>}
          {currentServiceLevel !== null && <span style={{ flex: 1, textAlign: 'left' }}>{`${currentServiceLevel}%`}</span>}
        </span>
      )}

      <HighchartsReact highcharts={Highcharts} options={sparklineOptions} />
    </div>
  );
};

export default SafetyStockSparklineCell;
