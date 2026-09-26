import React, { useEffect, useRef, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import classNames from "classnames";
import { addSnack } from "core/actions/snackbarActions";
import { Divider, FormControl, Typography } from "@mui/material";
import {
  Button,
  Tooltip,
  Chart as ChartsV3,
  Panel as PanelV3,
  RadioButtonGroup,
  Select,
  Switch,
  Chips,
} from "impact-ui-v3";
import theme from "core/Styles/theme";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getOmsDeepDiveTableConfiguration,
  setOrderManagementDeepDiveTableLoader,
  setOrderManagementDeepDiveTableData,
  setOrderManagementDeepDiveTableConfig,
  getOmsDeepDiveTableData,
  setOrderManagementDeepDiveTableConfigLoader,
  getOmsHolidayWeeks,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import FilterListIcon from "assets/impactv3/filterIcon.svg";
import ChartIcon from "assets/impactv3/chartIcon.svg";
import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { Stack } from "@mui/system";
import moment from "moment/moment";
import { makeStyles } from "@mui/styles";
import _, { cloneDeep, isEmpty } from "lodash";
import InfoIcon from "assets/Info.svg";
import EmptyStateLayout from "modules/oms/pages-oms/Order-Management/components/EmptyStateLayout";
import { OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { OMS_CREATE_SCENARIO_CONDITION_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { addSelectedHierarchyToFilters } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { overrideExpediteArticleFilter } from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";
import { fetchDeepDiveTableDataV3 } from "modules/oms/pages-oms/OrderManagement/ProductDetails/api/deepDiveTableData.api.js";
import { selectMatrixHandoff } from "modules/oms/pages-oms/OrderManagement/slices/matrixHandoff.slice.js";
import ChartEventGridWrapper from "modules/oms/pages-oms/common/ChartEventGridWrapper";
import { mapHolidayWeeksToEvents } from "modules/oms/pages-oms/common/eventGridUtils";

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    background: "#FFFFFF",
    borderRadius: "8px",
  },
  infoIconWrapper: {
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    lineHeight: 0,
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  filterContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  leftContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  deepDiveGraphTitle: {
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "24px",
  },
  createScenarioGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  groupedKpiDropdown: {},
}));

const RIGHT_LABEL_SWITCH = "Units";
const LEFT_LABEL_SWITCH = "Cost";

const getFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.msFullscreenElement;

const DeepDiveChartTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [costTableColumns, setCostTableColumns] = useState([]);
  const [defaultTableColumns, setDefaultTableColumns] = useState([]);
  const [isRender, setIsRender] = useState(false);
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(false);
  const [isDeepDiveEmpty, setIsDeepDiveEmpty] = useState(false);

  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [showChart, setShowChart] = useState(true);

  const [isUnitsChecked, setIsUnitsChecked] = useState(true);
  const [internalIsEventsChecked, setInternalIsEventsChecked] = useState(false);
  const [eventGridEvents, setEventGridEvents] = useState([]);

  // Access control state for create scenario
  const [
    isUserHasCreateScenarioAccess,
    setIsUserHasCreateScenarioAccess,
  ] = useState(true);

  const deepDiveConfig = props?.decisionDashboardDeepDiveConfig?.is_enabled
    ? props?.decisionDashboardDeepDiveConfig
    : props?.screenConfig;

  const propChartsConfig = Array.isArray(props?.chartsConfig)
    ? props?.chartsConfig
    : props?.chartsConfig?.deep_dive_charts_config;
  const DEEP_DIVE_CHARTS_CONFIG =
    propChartsConfig ||
    deepDiveConfig?.deep_dive_charts_config ||
    props?.screenConfig?.deep_dive_charts_config ||
    [];

  const DEFAULT_WEEKS_TO_SHOW =
    props?.defaultWeeks ?? deepDiveConfig?.default_weeks ?? 26;

  const SHOW_TOGGLE_BUTTON =
    props?.showToggleButton !== undefined
      ? props.showToggleButton
      : deepDiveConfig?.show_toggle_button || false;
  const [defaultChartsConfig, setDefaultChartsConfig] = useState(
    cloneDeep(DEEP_DIVE_CHARTS_CONFIG || [])
  );
  const [chartsConfig, setChartsConfig] = useState(
    cloneDeep(DEEP_DIVE_CHARTS_CONFIG || [])
  );

  const CHARTS_X_AXIS_KEY =
    props?.chartsXAxisKey || deepDiveConfig?.charts_x_axis_key || "week";
  const SHOW_UNIT_COST_SWITCH =
    props?.showUnitCostSwitch !== undefined
      ? props.showUnitCostSwitch
      : deepDiveConfig?.show_unit_cost_switch || false;
  const SHOW_EVENT_GRID =
    props?.showEventGrid !== undefined
      ? props.showEventGrid
      : deepDiveConfig?.show_event_grid || false;
  const EVENT_ICON_MAP_CONFIG =
    props?.eventIconMap !== undefined
      ? props.eventIconMap
      : deepDiveConfig?.event_icon_map || null;
  const SUB_SERIES_TOOLIPS =
    props?.subSeriesTooltips || deepDiveConfig?.sub_series_toolips || [];

  const GRAPH_TITLE = props?.graphTitle || "Deep Dive";
  const SHOW_CREATE_SCENARIO_BUTTON =
    props?.showCreateScenarioButton !== undefined
      ? props.showCreateScenarioButton
      : !props?.showInDashboard;
  const SHOW_CHART_TABLE_TOGGLE =
    props?.showChartTableToggle !== undefined
      ? props.showChartTableToggle
      : true;

  // Event-grid toggle can be controlled by the parent (value + onChange).
  const isEventsChecked =
    props?.isEventsChecked !== undefined
      ? props.isEventsChecked
      : internalIsEventsChecked;
  const handleEventsCheckedChange = (checked) => {
    if (props?.onEventsCheckedChange) {
      props.onEventsCheckedChange(checked);
    } else {
      setInternalIsEventsChecked(checked);
    }
  };
  // Event-grid data can be passed in; otherwise use the internal holiday fetch.
  const eventsToRender =
    props?.events !== undefined ? props.events : eventGridEvents;

  const IS_DATA_DRIVEN = props?.deepDiveChartData !== undefined;
  const chartDataSource = IS_DATA_DRIVEN
    ? props.deepDiveChartData
    : deepDiveChartData;

  const WOS_KEY = "fwos";
  const PSI_KEY = "store_oh";

  const DISABLED_KPI_OPTION_MAPPING = deepDiveConfig?.disable_kpi_mapping || [];

  const getChildDisableMap = (selectedOptions) => {
    const selectedValues = new Set(
      (Array.isArray(selectedOptions) ? selectedOptions : [])
        .map((o) => o?.value)
        .filter(Boolean)
    );
    const childDisableMap = {};
    DISABLED_KPI_OPTION_MAPPING.forEach((mapping) => {
      Object.entries(mapping).forEach(([parent, child]) => {
        childDisableMap[child] = !selectedValues.has(parent);
      });
    });
    return childDisableMap;
  };

  const applyParentChildDisable = (options, selectedOptions) => {
    const childDisableMap = getChildDisableMap(selectedOptions);
    return (Array.isArray(options) ? options : []).map((option) =>
      Object.prototype.hasOwnProperty.call(childDisableMap, option?.value)
        ? { ...option, isDisabled: childDisableMap[option.value] }
        : option
    );
  };

  const applyParentChildDisableGrouped = (groupedOptions, selectedOptions) => {
    const childDisableMap = getChildDisableMap(selectedOptions);
    return (Array.isArray(groupedOptions) ? groupedOptions : []).map(
      (group) => ({
        ...group,
        options: (Array.isArray(group.options)
          ? group.options
          : []
        ).map((option) =>
          Object.prototype.hasOwnProperty.call(childDisableMap, option?.value)
            ? { ...option, isDisabled: childDisableMap[option.value] }
            : option
        ),
      })
    );
  };

  const enforceParentChildSelection = (options) => {
    const childDisableMap = getChildDisableMap(options);
    return (Array.isArray(options) ? options : []).filter(
      (option) => childDisableMap[option?.value] !== true
    );
  };

  const getVisibleKpiDropdownOptions = (kpiOptions, chartsCfg, isUnits) => {
    const visibleKeySet = new Set();
    (Array.isArray(chartsCfg) ? chartsCfg : []).forEach((graph) => {
      const leaf = isUnits ? graph?.leadTime : graph?.effectiveLeadTime;
      const key = leaf?.key;
      if (!key) return;
      if (leaf?.is_hidden) return;
      visibleKeySet.add(key);
    });

    return (Array.isArray(kpiOptions) ? kpiOptions : []).filter((o) =>
      visibleKeySet.has(o?.value)
    );
  };

  const KPI_DROPDOWN_OPTIONS =
    props?.kpiDropdownOptions || deepDiveConfig?.kpi_dropdown_options || [];
  const EFFECTIVE_KPI_DROPDOWN_OPTIONS =
    props?.kpiDropdownOptionsEffective ||
    deepDiveConfig?.kpi_dropdown_options_effective ||
    [];
  const SHOW_KPI_DROPDOWN =
    props?.showKpiDropdown !== undefined
      ? props.showKpiDropdown
      : deepDiveConfig?.show_kpi_dropdown || false;
  const USE_GROUPED_KPI_DROPDOWN =
    props?.showGroupDropdown !== undefined
      ? props.showGroupDropdown
      : deepDiveConfig?.use_grouped_kpi_dropdown || false;

  const GROUP_BADGE_COLOR_MAP = {
    Inventory: "info",
    Orders: "success",
    Store: "local",
    Sales: "local",
  };
  const DEFAULT_BADGE_COLOR = "info";

  const GROUP_BADGE_CUSTOM_STYLES = {
    Store: {
      backgroundColor: "#FCF8EA !important",
    },
    Sales: {
      backgroundColor: "#FCEEEE !important",
    },
  };

  const kpiSeriesStyleRef = useRef({});

  const renderKpiLegendIcon = (color, type) => {
    const c = color || "#999";
    if (type === "column" || type === "bar") {
      return (
        <svg
          width="14"
          height="12"
          viewBox="0 0 14 12"
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            marginRight: 6,
            flexShrink: 0,
          }}
        >
          <rect x="2" y="2" width="10" height="8" rx="1" fill={c} />
        </svg>
      );
    }
    if (type === "area" || type === "areaspline") {
      return (
        <svg
          width="22"
          height="12"
          viewBox="0 0 22 12"
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            marginRight: 6,
            flexShrink: 0,
          }}
        >
          <polyline
            points="1,10 6,4 11,7 16,2 21,5"
            fill="none"
            stroke={c}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="7" r="2.5" fill={c} />
        </svg>
      );
    }
    return (
      <svg
        width="22"
        height="12"
        viewBox="0 0 22 12"
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          marginRight: 6,
          flexShrink: 0,
        }}
      >
        <line
          x1="1"
          y1="6"
          x2="21"
          y2="6"
          stroke={c}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="11" cy="6" r="2.5" fill={c} />
      </svg>
    );
  };

  const buildGrouped = (flatOptions) => {
    const groupMap = {};
    const groupOrder = [];
    (Array.isArray(flatOptions) ? flatOptions : []).forEach((opt) => {
      const g = opt?.group || "Metrics";
      if (!groupMap[g]) {
        groupMap[g] = [];
        groupOrder.push(g);
      }
      const style = kpiSeriesStyleRef.current[opt?.value] || {};
      const icon = renderKpiLegendIcon(style.color, style.type);
      groupMap[g].push({
        ...opt,
        _rawLabel:
          typeof opt.label === "string" ? opt.label : opt._rawLabel || "",
        label: (
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {icon}
            {typeof opt.label === "string"
              ? opt.label
              : opt._rawLabel || opt.label}
          </span>
        ),
      });
    });
    return groupOrder.map((name) => {
      const color = GROUP_BADGE_COLOR_MAP[name] ?? DEFAULT_BADGE_COLOR;
      const groupObj = {
        label: name,
        customBadgeLabel: name,
        customBadgeColor: color,
        options: groupMap[name],
      };
      if (color === "local" && GROUP_BADGE_CUSTOM_STYLES[name]) {
        groupObj.customBadgeStyles = GROUP_BADGE_CUSTOM_STYLES[name];
      }
      return groupObj;
    });
  };

  const KPI_FLAT_OPTIONS = USE_GROUPED_KPI_DROPDOWN
    ? props?.kpiDropdownGroupOptions ||
      deepDiveConfig?.kpi_dropdown_group_options ||
      KPI_DROPDOWN_OPTIONS
    : KPI_DROPDOWN_OPTIONS;
  const KPI_FLAT_OPTIONS_EFFECTIVE = USE_GROUPED_KPI_DROPDOWN
    ? props?.kpiDropdownGroupOptionsEffective ||
      deepDiveConfig?.kpi_dropdown_group_options_effective ||
      EFFECTIVE_KPI_DROPDOWN_OPTIONS
    : EFFECTIVE_KPI_DROPDOWN_OPTIONS;

  const KPI_GROUPED = USE_GROUPED_KPI_DROPDOWN
    ? buildGrouped(KPI_FLAT_OPTIONS)
    : [];
  const KPI_GROUPED_EFFECTIVE = USE_GROUPED_KPI_DROPDOWN
    ? buildGrouped(KPI_FLAT_OPTIONS_EFFECTIVE)
    : [];

  const [currentKpiDropdownOptions, setCurrentKpiDropdownOptions] = useState(
    USE_GROUPED_KPI_DROPDOWN ? KPI_GROUPED : KPI_DROPDOWN_OPTIONS
  );
  const [
    selectedKpiDropdownOptions,
    setSelectedKpiDropdownOptions,
  ] = useState(() =>
    getVisibleKpiDropdownOptions(
      KPI_FLAT_OPTIONS,
      DEEP_DIVE_CHARTS_CONFIG || [],
      true
    )
  );
  const [isOpenKpiDropdown, setIsOpenKpiDropdown] = useState(false);
  const [isSelectAllForKpi, setIsSelectAllForKpi] = useState(false);

  const kpiKeywordIndexRef = useRef({});
  const kpiSearchTermRef = useRef("");
  const kpiSearchInputRef = useRef(null);
  const psiWasPresentRef = useRef(false);
  const [kpiSearchTerm, setKpiSearchTerm] = useState("");

  const KPI_ABBREVIATION_MAP = {
    wos: ["store_wos", "weeks_of_supply"],
    ly: ["ly", "last_year"],
    dc: ["dc_"],
    oh: ["_oh", "on_hand"],
  };

  const KPI_SEARCH_SUGGESTIONS = [
    "inventory",
    "sales",
    "orders",
    "lost sales",
    "supply",
  ];

  const dashboardSelectedFiltersSignature = props?.showInDashboard
    ? JSON.stringify(props?.dashboardSelectedFilters ?? [])
    : "";

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsChartFullscreen(!!getFullscreenElement());
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const graphColours = [];
  const negativeSeries = [];
  const NEGATIVE_TOOLTIPS = [];

  useEffect(() => {
    if (!USE_GROUPED_KPI_DROPDOWN) return;
    const styleMap = {};
    (Array.isArray(chartsConfig) ? chartsConfig : []).forEach((graph) => {
      const key = isSwitchedChecked
        ? graph?.effectiveLeadTime?.key
        : graph?.leadTime?.key;
      if (key && graph?.series) {
        styleMap[key] = {
          color: graph.series.color,
          type: graph.series.type || "line",
        };
      }
    });
    kpiSeriesStyleRef.current = styleMap;
    const freshGrouped = buildGrouped(
      isUnitsChecked ? KPI_FLAT_OPTIONS : KPI_FLAT_OPTIONS_EFFECTIVE
    );
    setCurrentKpiDropdownOptions(freshGrouped);
  }, [chartsConfig, isSwitchedChecked]);

  useEffect(() => {
    const nextDefault = cloneDeep(DEEP_DIVE_CHARTS_CONFIG || []);
    setDefaultChartsConfig(nextDefault);
    setChartsConfig(nextDefault);

    const nextKpiFlatOptions = isUnitsChecked
      ? KPI_FLAT_OPTIONS
      : KPI_FLAT_OPTIONS_EFFECTIVE;
    setCurrentKpiDropdownOptions(
      USE_GROUPED_KPI_DROPDOWN
        ? isUnitsChecked
          ? KPI_GROUPED
          : KPI_GROUPED_EFFECTIVE
        : nextKpiFlatOptions
    );
    setSelectedKpiDropdownOptions(
      getVisibleKpiDropdownOptions(
        nextKpiFlatOptions,
        nextDefault,
        isUnitsChecked
      )
    );
    setIsSelectAllForKpi(false);
  }, [deepDiveConfig]);

  useEffect(() => {
    if (!KPI_FLAT_OPTIONS.length) return;
    const index = {};
    KPI_FLAT_OPTIONS.forEach((opt) => {
      const value = opt?.value;
      if (!value) return;
      const keywords = Array.isArray(opt.secondary_keywords)
        ? opt.secondary_keywords.map((k) => k.toLowerCase())
        : [];
      Object.entries(KPI_ABBREVIATION_MAP).forEach(([abbr, patterns]) => {
        const matchesAbbr = patterns.some(
          (p) =>
            value.toLowerCase().includes(p.replace("_", "")) ||
            value.toLowerCase().includes(p) ||
            (opt.label || "").toLowerCase().includes(abbr)
        );
        if (matchesAbbr && !keywords.includes(abbr)) keywords.push(abbr);
      });
      index[value] = keywords;
    });
    kpiKeywordIndexRef.current = index;
  }, [KPI_FLAT_OPTIONS.length]);

  useEffect(() => {
    if (!USE_GROUPED_KPI_DROPDOWN) return;
    const styleId = "grouped-kpi-dropdown-style-deepdive";
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `.ia-select-container-v3-styled-menu { min-width: 360px !important; width: 360px !important; max-height: 400px !important; } .ia-select-container-v3-styled-menu .ia-select-container-v3 { max-height: 350px !important; overflow-y: auto !important; } .ia-select-container-v3-styled-menu ul, .ia-select-container-v3-styled-menu [class*="menu-list"], .ia-select-container-v3-styled-menu [class*="MenuList"] { max-height: 300px !important; overflow-y: auto !important; }`;
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [USE_GROUPED_KPI_DROPDOWN]);

  const handleKpiSearch = (event, groupedInitialOptions, setCurrentOptions) => {
    const raw = (event?.target?.value || "").slice(0, 50);
    const sanitised = raw
      .replace(/[\/\%\*\^\$\!\@\#\&\(\)\[\]\{\}\|\\]/g, "")
      .trim();
    const term = sanitised.toLowerCase();
    kpiSearchTermRef.current = term;
    setKpiSearchTerm(term);

    if (term.length < 3) {
      setCurrentOptions(groupedInitialOptions);
      return;
    }

    const flatOptions = (Array.isArray(groupedInitialOptions)
      ? groupedInitialOptions
      : []
    ).flatMap((g) => (Array.isArray(g.options) ? g.options : []));

    const scored = flatOptions.map((opt) => {
      const label = (typeof opt.label === "string"
        ? opt.label
        : opt._rawLabel || ""
      ).toLowerCase();
      const value = opt.value || "";
      const keywords = kpiKeywordIndexRef.current[value] || [];
      let score = 0;
      let matchedKeyword = null;

      if (label === term) {
        score = 4;
      } else if (label.startsWith(term)) {
        score = 3;
      } else if (label.includes(term)) {
        score = 2;
      } else {
        const kw = keywords.find((k) => k.includes(term) || term.includes(k));
        if (kw) {
          score = 1;
          matchedKeyword = kw;
        }
      }

      return { ...opt, _score: score, _matchedKeyword: matchedKeyword };
    });

    const matched = scored
      .filter((o) => o._score > 0)
      .sort((a, b) => b._score - a._score);

    if (!matched.length) {
      setCurrentOptions([]);
      return;
    }

    const highlightLabel = (rawLabel, searchTerm, icon) => {
      const idx = (rawLabel || "").toLowerCase().indexOf(searchTerm);
      const textNode =
        idx >= 0 ? (
          <span>
            {rawLabel.slice(0, idx)}
            <mark style={{ background: "#FFF176", padding: 0 }}>
              {rawLabel.slice(idx, idx + searchTerm.length)}
            </mark>
            {rawLabel.slice(idx + searchTerm.length)}
          </span>
        ) : (
          <span>{rawLabel}</span>
        );
      return (
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {icon}
          {textNode}
        </span>
      );
    };

    const groupMap = {};
    const groupOrder = [];
    matched.forEach((opt) => {
      const g = opt?.group || "Metrics";
      if (!groupMap[g]) {
        groupMap[g] = [];
        groupOrder.push(g);
      }
      const rawLabel =
        typeof opt.label === "string" ? opt.label : opt._rawLabel || "";
      const style = kpiSeriesStyleRef.current[opt?.value] || {};
      const icon = renderKpiLegendIcon(style.color, style.type);
      groupMap[g].push({
        ...opt,
        _rawLabel: rawLabel,
        label: highlightLabel(rawLabel, term, icon),
      });
    });
    setCurrentOptions(
      groupOrder.map((name) => {
        const color = GROUP_BADGE_COLOR_MAP[name] ?? DEFAULT_BADGE_COLOR;
        const groupObj = {
          label: name,
          customBadgeLabel: name,
          customBadgeColor: color,
          options: groupMap[name],
        };
        if (color === "local" && GROUP_BADGE_CUSTOM_STYLES[name]) {
          groupObj.customBadgeStyles = GROUP_BADGE_CUSTOM_STYLES[name];
        }
        return groupObj;
      })
    );
  };

  const kpiFormatOptionLabel = (
    opt,
    setCurrentOptions,
    groupedInitialOptions
  ) => {
    const term = kpiSearchTerm || kpiSearchTermRef.current;
    const label =
      typeof opt.label === "string" ? opt.label : opt._rawLabel || "";
    const matchedKeyword = opt._matchedKeyword;

    if (!term || term.length < 3) {
      return <span>{label}</span>;
    }

    const idx = label.toLowerCase().indexOf(term);
    const highlighted =
      idx >= 0 ? (
        <span>
          {label.slice(0, idx)}
          <mark style={{ background: "#FFF176", padding: 0 }}>
            {label.slice(idx, idx + term.length)}
          </mark>
          {label.slice(idx + term.length)}
        </span>
      ) : (
        <span>{label}</span>
      );

    return (
      <div>
        {highlighted}
        {matchedKeyword && (
          <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
            {`matched: ${matchedKeyword}`}
          </div>
        )}
      </div>
    );
  };

  (Array.isArray(chartsConfig) ? chartsConfig : []).forEach((chartItem) => {
    if (chartItem.show_as_negative) {
      negativeSeries.push(chartItem.leadTime.key);
      negativeSeries.push(chartItem.effectiveLeadTime.key);
    }
    if (chartItem.show_negative_tooltip) {
      NEGATIVE_TOOLTIPS.push(chartItem.leadTime.key);
      NEGATIVE_TOOLTIPS.push(chartItem.effectiveLeadTime.key);
    }
    graphColours.push(chartItem.series.color);
  });

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const formatTooltipValue = (value, label) => {
    const isCostSeries = (label || "").toLowerCase().includes("cost");
    return isCostSeries ? `$${value}` : value;
  };

  const appendChildTooltips = (params, activePoint, parentPoint) => {
    const activePointIndex =
      params?.points?.[0]?.point?.index ?? params?.points?.[0]?.point?.x;
    if (activePointIndex === undefined) return activePoint;

    const parentKey =
      parentPoint?.series?.userOptions?.key ||
      parentPoint?.series?.options?.key ||
      parentPoint?.series?.userOptions?.id ||
      parentPoint?.series?.options?.id;
    if (!parentKey) return activePoint;

    SUB_SERIES_TOOLIPS?.forEach((tooltipItem) => {
      if (tooltipItem?.parent !== parentKey) return;

      const parentSeriesIndex = params?.points?.findIndex(
        (p) =>
          p?.series?.userOptions?.key === tooltipItem?.parent ||
          p?.series?.options?.key === tooltipItem?.parent ||
          p?.series?.userOptions?.id === tooltipItem?.parent ||
          p?.series?.options?.id === tooltipItem?.parent
      );
      if (parentSeriesIndex === -1) return;

      const parentSeriesActualIndex =
        params?.points?.[parentSeriesIndex]?.series?.index;

      const parentTextColor =
        parentSeriesIndex !== undefined &&
        parentSeriesIndex !== -1 &&
        parentSeriesActualIndex !== undefined &&
        parentSeriesActualIndex !== colorIndex
          ? theme.palette.text.disabled
          : theme.palette.text.primary;

      const seriesData = deepDiveChartData?.[tooltipItem?.key];
      const rawValue = Array.isArray(seriesData)
        ? seriesData?.[activePointIndex]
        : undefined;
      if (rawValue === undefined || rawValue === null) return;

      let formattedValue = rawValue;
      if (!NEGATIVE_TOOLTIPS.includes(parentKey)) {
        if (typeof formattedValue === "number" && formattedValue < 0)
          formattedValue = -1 * formattedValue;
      }
      const tooltipValue = formatTooltipValue(
        formattedValue,
        tooltipItem?.label
      );

      activePoint +=
        `<span style="padding-left: 16px; display: inline-block">` +
        `<span style="color: ${tooltipItem?.color}; margin-right:2px">\u25CF</span>` +
        `<span style="color: ${parentTextColor}"> ${tooltipItem?.label} <b> : ${tooltipValue} </b></span>` +
        `</span><br>`;
    });

    return activePoint;
  };

  //To Handle Switch Button between Units and Cost
  const onUnitsCostSwitchChange = (event) => {
    let isUnitsSelected =
      event.target.value === RIGHT_LABEL_SWITCH.toLowerCase();
    const isELTSelected = !isUnitsSelected;
    setIsUnitsChecked(isUnitsSelected);

    const nextKpiOptions = isUnitsSelected
      ? KPI_DROPDOWN_OPTIONS
      : EFFECTIVE_KPI_DROPDOWN_OPTIONS;
    setCurrentKpiDropdownOptions(nextKpiOptions);
    setSelectedKpiDropdownOptions(
      getVisibleKpiDropdownOptions(
        nextKpiOptions,
        defaultChartsConfig,
        isUnitsSelected
      )
    );
    setIsSelectAllForKpi(false);

    const nextChartsConfig = cloneDeep(defaultChartsConfig);
    setChartsConfig(nextChartsConfig);
    createGraphSeries(isELTSelected, nextChartsConfig);

    props?.setTableConfigLoader(false);
  };

  const createDataObject = (response) => {
    let responseDataObject = {};
    response?.data?.data.forEach((item) => {
      // Check if both lost_sales and forecast are present and calculate effective_sales
      if (
        item.hasOwnProperty("lost_sales") &&
        item.hasOwnProperty("forecast")
      ) {
        const effectiveSalesValue = Math.max(
          0,
          item.forecast - item.lost_sales
        );
        if (!responseDataObject["effective_sales"]) {
          responseDataObject["effective_sales"] = [];
        }
        responseDataObject["effective_sales"].push(
          Math.round(effectiveSalesValue)
        );
      }

      Object.keys(item).forEach((key) => {
        if (!responseDataObject[key]) {
          responseDataObject[key] = [];
        }
        if (key === "week" || key === "week_end_date") {
          responseDataObject[key].push(moment(item[key]).format("MMM DD"));
        } else if (key === "month" || key === "fiscal_year_week") {
          responseDataObject[key].push(item[key]);
        } else {
          let value = Math.round(item[key] || 0);
          if (negativeSeries.includes(key)) {
            value = -1 * value;
          }
          if (key) responseDataObject[key].push(value);
        }
      });
    });
    return responseDataObject;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      try {
        const nextChartsConfig = cloneDeep(defaultChartsConfig);
        setChartsConfig(nextChartsConfig);
        setSelectedKpiDropdownOptions(
          getVisibleKpiDropdownOptions(
            USE_GROUPED_KPI_DROPDOWN
              ? KPI_FLAT_OPTIONS
              : currentKpiDropdownOptions,
            nextChartsConfig,
            isUnitsChecked
          )
        );
        setIsSelectAllForKpi(false);

        props.setOrderManagementDeepDiveTableData([]);
        props.setTableConfigLoader(true);

        const defaultColumnsPromise = props.getOmsDeepDiveTableConfiguration();
        const costColumnsPromise = SHOW_UNIT_COST_SWITCH
          ? props.getOmsDeepDiveTableConfiguration(true)
          : null;
        const [columns, costCols] = await Promise.all([
          defaultColumnsPromise,
          costColumnsPromise,
        ]);

        if (SHOW_UNIT_COST_SWITCH) {
          const formattedCostCols = formattingDeepDiveColumns(
            costCols?.data?.data,
            true
          );
          setCostTableColumns(formattedCostCols);
        }

        let cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
        setDeepDiveTableColumns(cols);
        setDefaultTableColumns(cols);
        props.setOrderManagementDeepDiveTableConfig(cols);
        props.setTableConfigLoader(false);
        props.setTableLoader(true);

        // Fetching the redirection details from local storage
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const filtersFromRedirection = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];

        let appliedFilters = [];
        if (props?.showInDashboard) {
          appliedFilters = cloneDeep(props?.dashboardSelectedFilters);

          // Add deep dive filters payload to applied filters
          if (props?.orderManagementDeepDiveFiltersPayload?.filters?.length) {
            appliedFilters = [
              ...appliedFilters,
              ...cloneDeep(
                props?.orderManagementDeepDiveFiltersPayload?.filters
              ),
            ];
          }
        } else {
          const fromPayload =
            props?.orderManagementDeepDiveFiltersPayload?.filters;
          const fromConfig =
            props?.filterDashboardConfiguration?.appliedFilterData
              ?.dependencyData;
          const rawBase = cloneDeep(
            (fromPayload?.length ?? 0) > 0
              ? fromPayload
              : (filtersFromRedirection?.length ?? 0) > 0
              ? filtersFromRedirection
              : fromConfig || []
          );
          appliedFilters = mergeOmsDcIntoFilters(
            rawBase,
            props?.selectedDcs || []
          );
        }

        const redirectedRows = redirectionDetails?.selectedRowIds;
        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters?.length) {
          appliedFilters.find((filter) => {
            if (
              filter.attribute_name ===
              props?.selectedRowsFromMatrixSummary?.attribute_name
            ) {
              if (
                filter.values.length === 0 ||
                (redirectionDetails?.isRedirection &&
                  filter.values.length >
                    props?.selectedRowsFromMatrixSummary?.values?.length)
              ) {
                filter.values = redirectedRows?.length
                  ? redirectedRows
                  : props?.selectedRowsFromMatrixSummary?.values;
              }
            }
          });
        }

        const appliedDateFilters = [];
        // Adding the OMS Date filters to the filters
        if (!isEmpty(props?.ropDate)) {
          appliedDateFilters.push(props?.ropDate);
        }
        if (!isEmpty(props?.recommRecieptDate)) {
          appliedDateFilters.push(props?.recommRecieptDate);
        }
        // Adding the Deep Dive Date filters to the filters
        if (props?.weekRange?.attribute_name) {
          appliedDateFilters.push(props?.weekRange);
        }
        // Adding the Redirection Date filters to the filters
        if (
          redirectionDetails?.isRedirection &&
          redirectionDetails?.dateFilters?.length
        ) {
          appliedDateFilters.push(redirectionDetails?.dateFilters);
        }

        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );
        const appliedFiltersWithHierarchy = addSelectedHierarchyToFilters(
          props?.highLevelSummaryState,
          appliedProductFilters
        );

        const dcFilterSource = props?.showInDashboard
          ? props?.dashboardSelectedFilters
          : props?.selectedFilters;
        const dcFilterFromSelected = dcFilterSource?.find(
          (f) => f.dimension === "dc"
        );
        if (dcFilterFromSelected) {
          // Remove any existing DC filter first
          const filtersWithoutDc = appliedFiltersWithHierarchy.filter(
            (f) => f.dimension !== "dc"
          );
          appliedFiltersWithHierarchy.length = 0;
          appliedFiltersWithHierarchy.push(
            ...filtersWithoutDc,
            cloneDeep(dcFilterFromSelected)
          );
        }

        let resolvedFilters = appliedFiltersWithHierarchy;
        if (Array.isArray(props?.selectedKpiStyles)) {
          resolvedFilters = overrideExpediteArticleFilter(
            appliedFiltersWithHierarchy,
            props.selectedKpiStyles
          );
        }

        const selectedHierarchies = Array.isArray(
          props?.matrixHandoff?.selectedHierarchies
        )
          ? props.matrixHandoff.selectedHierarchies
          : [];

        const payload = {
          filters: [...resolvedFilters],
          transform_flag: true,
          default_weeks: DEFAULT_WEEKS_TO_SHOW,
          is_download: false,
          ...(appliedDateFilters?.length
            ? { date_filter: appliedDateFilters }
            : {}),
          ...(props?.useV3DeepDiveTable
            ? {
                selected_hierarchies: selectedHierarchies,
                is_v3:
                  typeof props?.isV3Schema === "boolean"
                    ? props.isV3Schema
                    : typeof props?.matrixHandoff?.isV3Schema === "boolean"
                    ? props.matrixHandoff.isV3Schema
                    : false,
              }
            : {}),
        };

        if (payload?.filters?.length === 0) {
          props.setTableLoader(false);
        } else {
          // New OM Product Details only — v3 ClickHouse; other consumers keep v2.
          let response = props?.useV3DeepDiveTable
            ? await fetchDeepDiveTableDataV3(payload)
            : await props.getOmsDeepDiveTableData(
                payload,
                props?.decisionDashboardDeepDiveConfig?.is_enabled,
                deepDiveConfig?.is_v2_deep_dive
              );
          props.setTableLoader(false);

          setIsUnitsChecked(true);

          if (response?.data?.status) {
            if (response?.data?.data?.length === 0) {
              setIsDeepDiveEmpty(true);
            } else {
              setIsDeepDiveEmpty(false);
              const responseDataFormattted = createDataObject(response);
              if (responseDataFormattted?.[CHARTS_X_AXIS_KEY]?.length) {
                let fiscalYearWeek = responseDataFormattted[CHARTS_X_AXIS_KEY];
                setDeepDiveChartData(responseDataFormattted);
                setFiscalYearWeek([...fiscalYearWeek]);

                if (SHOW_EVENT_GRID && props?.events === undefined) {
                  try {
                    const holidayResponse = await props.getOmsHolidayWeeks(
                      payload
                    );
                    if (holidayResponse?.data?.status) {
                      setEventGridEvents(
                        mapHolidayWeeksToEvents(holidayResponse?.data?.data, {
                          fiscalYearWeeks:
                            responseDataFormattted?.fiscal_year_week,
                          categories: fiscalYearWeek,
                        })
                      );
                    } else {
                      setEventGridEvents([]);
                    }
                  } catch (holidayErr) {
                    console.log("holiday weeks err", holidayErr);
                    setEventGridEvents([]);
                  }
                }
              }
            }
            setIsRender(true);
            let formatedData = agGridRowFormatter(response.data.data);
            props.setOrderManagementDeepDiveTableData(formatedData);
          }
        }
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setTableLoader(false);
      }
    };

    const fetchColumnsOnly = async () => {
      try {
        props.setTableConfigLoader(true);
        const defaultColumnsPromise = props.getOmsDeepDiveTableConfiguration();
        const costColumnsPromise = SHOW_UNIT_COST_SWITCH
          ? props.getOmsDeepDiveTableConfiguration(true)
          : null;
        const [columns, costCols] = await Promise.all([
          defaultColumnsPromise,
          costColumnsPromise,
        ]);
        if (SHOW_UNIT_COST_SWITCH) {
          const formattedCostCols = formattingDeepDiveColumns(
            costCols?.data?.data,
            true
          );
          setCostTableColumns(formattedCostCols);
        }
        const cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
        setDeepDiveTableColumns(cols);
        setDefaultTableColumns(cols);
        props.setOrderManagementDeepDiveTableConfig(cols);
        props.setTableConfigLoader(false);
      } catch (err) {
        console.log("err", err);
        props.setTableConfigLoader(false);
      }
    };

    if (!IS_DATA_DRIVEN) {
      fetchColumnData();
    } else if (SHOW_CHART_TABLE_TOGGLE && !props?.onSwitchToTableView) {
      fetchColumnsOnly();
    }
  }, [
    props?.reloadComponents,
    dashboardSelectedFiltersSignature,
    props?.selectedDcs,
    props?.orderManagementDeepDiveFiltersPayload,
    props?.showInDashboard,
    props?.selectedKpiStyles,
  ]);

  useEffect(() => {
    if (!isEmpty(deepDiveChartData)) {
      createGraphSeries();
    }
  }, [deepDiveChartData]);

  useEffect(() => {
    if (!IS_DATA_DRIVEN) return;
    const categories = chartDataSource?.[CHARTS_X_AXIS_KEY] || [];
    setFiscalYearWeek([...categories]);
    const hasData = !isEmpty(chartDataSource) && categories.length > 0;
    setIsDeepDiveEmpty(!hasData);
    setIsRender(true);
    if (hasData) {
      createGraphSeries(isSwitchedChecked || !isUnitsChecked);
    }
  }, [props?.deepDiveChartData]);

  // Access control for Create Scenario button
  useEffect(() => {
    const deepDiveAccess = props.userAccess?.find(
      (item) => item.screen === OMS_DEEP_DIVE_SCREENNAME_KEY
    );

    const canCreateScenario = deepDiveAccess?.isCreateScenarioButton || false;

    if (!isEmpty(props.userAccess)) {
      // If userAccess exists, use the new access control
      setIsUserHasCreateScenarioAccess(canCreateScenario);
    } else {
      setIsUserHasCreateScenarioAccess(true);
    }
  }, [props.userAccess]);

  let colorValue = null;
  let colorIndex = null;

  const graphOptions = {
    chartType: "stackedBarChart",
    chartHeight: 600,
    chartTitle: null,
    axisLegends: {
      xaxis: {
        categories: fiscalYearWeek,
      },
      yaxis: {
        title: isUnitsChecked ? RIGHT_LABEL_SWITCH : LEFT_LABEL_SWITCH,
      },
    },
    tickPixelInterval: {
      yaxis: 40,
    },
    series: seriesGraphData,
    legend: {
      verticalAlign: "top",
    },
    exporting: {
      buttons: {
        contextButton: {
          enabled: false,
        },
      },
    },
    plotOptions: {
      series: {
        states: {
          hover: {
            enabled: true,
            brightness: 0.2,
          },
        },
        events: {
          mouseOver: function () {
            colorValue = this.userOptions?.color ?? this.color;
            colorIndex = this.index;
            this.update({
              color: colorValue,
            });
          },
          mouseOut: function () {
            this.update({
              color: this.userOptions?.color ?? this.color,
            });
          },
        },
      },
    },

    tooltip: {
      backgroundColor: theme.palette.common.white,
      borderColor: theme.palette.text.disabled,
      shadow: false,
      style: {
        padding: "8px",
      },
      useHTML: true,
      formatter: function () {
        let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${this.points[0].key}</b></span><br/>`;
        let titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
        activePoint += titleLine;

        this.points.forEach(function (point, index) {
          let textColor = theme.palette.text.primary;
          if (index !== colorIndex) textColor = theme.palette.text.disabled;
          let pointValue = point.y;

          const pointKey =
            point?.series?.userOptions?.key ||
            point?.series?.options?.key ||
            point?.series?.userOptions?.id ||
            point?.series?.options?.id;
          if (point.y < 0 && !NEGATIVE_TOOLTIPS.includes(pointKey)) {
            pointValue = -1 * point.y;
          }

          const tooltipValue = formatTooltipValue(
            pointValue,
            point?.series?.name
          );

          activePoint +=
            `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
            `<span style="color: ${textColor}"> ${point.series.name} <b> : ${tooltipValue} </b><br>`;
        });
        return activePoint;
      },
      shared: true,
    },
  };

  const createGraphSeries = (displayType, chartsConfigOverride) => {
    let isELTEnabled = isSwitchedChecked;
    if (displayType !== undefined) isELTEnabled = displayType;
    const activeChartsConfig = chartsConfigOverride || chartsConfig;
    let series = [];
    let wosAdded = false;
    activeChartsConfig.forEach((graph, index) => {
      const seriesKey = isELTEnabled
        ? graph.effectiveLeadTime?.key
        : graph.leadTime?.key;
      const isWos = seriesKey === WOS_KEY;

      if (isELTEnabled) {
        if (graph?.effectiveLeadTime?.is_hidden) return;
      } else {
        if (graph?.leadTime?.is_hidden) return;
      }

      if (isWos) {
        if (wosAdded) return;
        wosAdded = true;
        const seriesName = isELTEnabled
          ? graph.effectiveLeadTime?.label
          : graph.leadTime?.label;
        // const xLen = fiscalYearWeek.length || undefined;
        const psiArr = chartDataSource[PSI_KEY] || [];
        const fwosArr = chartDataSource[WOS_KEY] || [];
        const maxFwos = Math.max(...fwosArr.map((v) => Number(v) || 0), 1);
        const wosScaled = psiArr.map((psiVal, i) =>
          Math.round(
            (Number(psiVal) || 0) * ((Number(fwosArr[i]) || 0) / maxFwos) * 0.2
          )
        );
        series.push({
          ...graph.series,
          id: WOS_KEY,
          key: WOS_KEY,
          name: seriesName,
          type: "column",
          stacking: "normal",
          color: "#dedede",
          showInLegend: false,
          linkedTo: PSI_KEY + "_col",
          data: wosScaled,
        });
        series.push({
          ...graph.series,
          id: PSI_KEY + "_col",
          key: PSI_KEY + "_col",
          name: seriesName,
          type: "column",
          stacking: "normal",
          enableMouseTracking: false,
          data: psiArr,
        });
        return;
      }

      const mappedSeriesKey = isELTEnabled
        ? graph.effectiveLeadTime?.mappedKeyToPlot ||
          graph.effectiveLeadTime?.key
        : graph.leadTime?.mappedKeyToPlot || graph.leadTime?.key;
      let seriesData = isELTEnabled
        ? chartDataSource[
            graph.effectiveLeadTime?.mappedKeyToPlot ||
              graph.effectiveLeadTime?.key
          ]
        : chartDataSource[
            graph.leadTime?.mappedKeyToPlot || graph.leadTime?.key
          ];
      // In data-driven mode the incoming data isn't pre-negated (that normally
      // happens in createDataObject during the self-fetch), so apply the
      // show_as_negative flag here to match the fetch-path behavior.
      if (
        IS_DATA_DRIVEN &&
        graph?.show_as_negative &&
        Array.isArray(seriesData)
      ) {
        seriesData = seriesData.map((val) => -1 * val);
      }
      let graphSeries = {
        ...graph.series,
        id: mappedSeriesKey,
        key: mappedSeriesKey,
        name: isELTEnabled
          ? graph.effectiveLeadTime?.label
          : graph.leadTime?.label,
        data: seriesData,
      };
      series.push(graphSeries);
    });
    setSeriesGraphData([...series]);

    const columns = isELTEnabled
      ? [...costTableColumns]
      : [...defaultTableColumns];
    setDeepDiveTableColumns(columns);
    props.setOrderManagementDeepDiveTableConfig(columns);
  };

  const formattingDeepDiveColumns = (columns, isEltEnabled) => {
    const updatedColumns = columns.map((val) => {
      const newVal = { ...val };

      if (DEEP_DIVE_ELT_TABLE_COLUMNS.includes(newVal?.column_name)) {
        newVal.is_hidden = !isEltEnabled;
      }
      if (DEEP_DIVE_TABLE_COLUMNS.includes(newVal?.column_name)) {
        newVal.is_hidden = isEltEnabled;
      }

      return newVal;
    });

    let formattedColumns = agGridColumnFormatter(
      updatedColumns,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );
    return formattedColumns;
  };

  const onSwitchChange = (event) => {
    let displayType = event.target.checked;
    createGraphSeries(displayType);
    setIsSwitchedChecked(displayType);
  };

  const updateChartsConfigForSelectedKpis = (options) => {
    const selectedKeySet = new Set(
      (Array.isArray(options) ? options : [])
        .map((o) => o?.value)
        .filter(Boolean)
    );

    if (selectedKeySet.size === 0) {
      return cloneDeep(defaultChartsConfig).map((graph) => {
        if (isUnitsChecked) {
          return {
            ...graph,
            leadTime: {
              ...graph.leadTime,
              is_hidden: true,
            },
          };
        }

        return {
          ...graph,
          effectiveLeadTime: {
            ...graph.effectiveLeadTime,
            is_hidden: true,
          },
        };
      });
    }

    return cloneDeep(defaultChartsConfig).map((graph) => {
      const selectedGraphKey = isUnitsChecked
        ? graph?.leadTime?.key
        : graph?.effectiveLeadTime?.key;
      if (!selectedGraphKey) return graph;

      const isSelected = selectedKeySet.has(selectedGraphKey);

      if (isUnitsChecked) {
        return {
          ...graph,
          leadTime: {
            ...graph.leadTime,
            is_hidden: !isSelected,
          },
        };
      }

      return {
        ...graph,
        effectiveLeadTime: {
          ...graph.effectiveLeadTime,
          is_hidden: !isSelected,
        },
      };
    });
  };

  const handleKPIChange = (options) => {
    let enforcedOptions = Array.isArray(options) ? [...options] : [];
    const selectedValues = new Set(enforcedOptions.map((o) => o?.value));
    const flatOptions = isUnitsChecked
      ? KPI_FLAT_OPTIONS
      : KPI_FLAT_OPTIONS_EFFECTIVE;
    const psiNowPresent = selectedValues.has(PSI_KEY);
    if (
      psiNowPresent &&
      !psiWasPresentRef.current &&
      !selectedValues.has(WOS_KEY)
    ) {
      const wosOption = flatOptions.find((o) => o?.value === WOS_KEY);
      if (wosOption) enforcedOptions = [...enforcedOptions, wosOption];
    }
    psiWasPresentRef.current = psiNowPresent;
    const finalValues = new Set(enforcedOptions.map((o) => o?.value));
    if (!finalValues.has(PSI_KEY)) {
      enforcedOptions = enforcedOptions.filter((o) => o?.value !== WOS_KEY);
    }
    const cleanedOptions = enforceParentChildSelection(enforcedOptions);
    setSelectedKpiDropdownOptions(cleanedOptions);

    const updatedChartsConfig = updateChartsConfigForSelectedKpis(
      enforcedOptions
    );

    setChartsConfig(updatedChartsConfig);
    createGraphSeries(!isUnitsChecked, updatedChartsConfig);
  };

  const handleTableChartViewToggle = (isNewViewCharts) => {
    if (!isNewViewCharts && props?.onSwitchToTableView) {
      props.onSwitchToTableView();
      return;
    }
    if (isNewViewCharts) {
      props?.setTableConfigLoader(true);
    } else {
      props?.setTableConfigLoader(false);
    }
    setShowChart(isNewViewCharts);
  };

  const handleChipClick = (attribute) => {
    console.log("Chip clicked:", attribute);
    props?.setSelectedViews((prev) => {
      const newValue = prev.includes(attribute)
        ? prev.filter((item) => item !== attribute)
        : [...prev, attribute];

      props?.onViewsChange?.(newValue);
      return newValue;
    });
  };

  return (
    <div>
      {!isRender ? (
        <Loader loader={true} minHeight={"260px"}></Loader>
      ) : (
        <>
          {isDeepDiveEmpty ? (
            <div className={globalClasses.centerAlign}>
              <EmptyStateLayout
                emptyStateHeading="No Data Found"
                emptyStateDescription="Please select filters to view this page."
                hidePrimaryButton
              />
            </div>
          ) : (
            <>
              <div className={classes.chartContainer}>
                {SHOW_TOGGLE_BUTTON && (
                  <div className={globalClasses.centerAlign}>
                    <FormControl>
                      <Stack
                        direction="row"
                        spacing={0}
                        alignItems="center"
                        sx={{ mx: 2 }}
                      >
                        <Switch
                          onChange={onSwitchChange}
                          disabled={false}
                          rightLabel="Effective lead time"
                          leftLabel="Lead time"
                          value={isSwitchedChecked}
                        />
                      </Stack>
                    </FormControl>
                  </div>
                )}

                <div>
                  <LoadingOverlay
                    loader={props.tableLoader}
                    minHeight={"260px"}
                  >
                    <Box>
                      <ChartEventGridWrapper
                        showEventGrid={SHOW_EVENT_GRID}
                        isEventsChecked={isEventsChecked}
                        isChartView={showChart}
                        xAxisCategories={
                          graphOptions?.axisLegends?.xaxis?.categories
                        }
                        seriesData={graphOptions?.series}
                        events={eventsToRender}
                        eventIconMap={EVENT_ICON_MAP_CONFIG}
                      >
                        {({
                          chartOptions,
                          chartMarginBottom,
                          xAxisTitle,
                          legendOptions,
                          showScrollX,
                        }) => (
                          <ChartsV3
                            chartOptions={chartOptions}
                            chartMarginBottom={chartMarginBottom}
                            legendOptions={legendOptions}
                            showScrollX={showScrollX}
                            chartHeight={graphOptions?.chartHeight}
                            height={SHOW_KPI_DROPDOWN ? "500px" : null}
                            style={{ height: graphOptions?.chartHeight }}
                            graphType={graphOptions?.chartType}
                            xAxisCategories={
                              graphOptions?.axisLegends?.xaxis?.categories
                            }
                            yAxisTitle={graphOptions?.axisLegends?.yaxis?.title}
                            xAxisTitle={xAxisTitle}
                            seriesData={graphOptions?.series}
                            graphTitle={GRAPH_TITLE}
                            xAxisTitlePositionY={21}
                            topLeftOptions={
                              <>
                                {SHOW_CREATE_SCENARIO_BUTTON ? (
                                  <div className={classes.createScenarioGroup}>
                                    <Tooltip
                                      title={
                                        OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE?.message
                                      }
                                      variant="tertiary"
                                    >
                                      <Button
                                        variant="tertiary"
                                        color="primary"
                                        id="viewOrderCreateScenario"
                                        onClick={
                                          props?.navigateToCreateScenario
                                        }
                                        disabled={
                                          !isEmpty(props.userAccess)
                                            ? !isUserHasCreateScenarioAccess ||
                                              props?.isCreateScenarioRestricted()
                                            : props?.isCreateScenarioRestricted()
                                        }
                                      >
                                        Create Scenario
                                      </Button>
                                    </Tooltip>
                                    <Tooltip
                                      title={
                                        OMS_CREATE_SCENARIO_CONDITION_MESSAGE
                                      }
                                      variant="tertiary"
                                    >
                                      <span className={classes.infoIconWrapper}>
                                        <InfoIcon />
                                      </span>
                                    </Tooltip>
                                  </div>
                                ) : (
                                  props?.graphTitleAdornment || null
                                )}

                                {props?.SHOW_DEEPDIVE_VIEWS &&
                                Array.isArray(props?.DEEPDIVE_VIEWS) ? (
                                  <div style={{ display: "flex", gap: "12px" }}>
                                    {props.DEEPDIVE_VIEWS.map((option) => (
                                      <Chips
                                        key={option.value}
                                        isActive={props?.selectedViews.includes(
                                          option.value
                                        )}
                                        label={option.label}
                                        onClick={() =>
                                          handleChipClick(option.value)
                                        }
                                        type="multi"
                                      />
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            }
                            topRightOptions={
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                              >
                                {SHOW_KPI_DROPDOWN && (
                                  <FormControl
                                    key="kpiOptions"
                                    size="small"
                                    sx={{
                                      minWidth: USE_GROUPED_KPI_DROPDOWN
                                        ? 253
                                        : 240,
                                    }}
                                    className={classNames(
                                      classes.flexRow,
                                      globalClasses.verticalAlignCenter
                                    )}
                                  >
                                    {USE_GROUPED_KPI_DROPDOWN ? (
                                      <>
                                        <Select
                                          id="kpiDropdown"
                                          isGrouped={true}
                                          isMulti={true}
                                          withPortal={true}
                                          menuShouldScrollIntoView={false}
                                          isClearable={true}
                                          isCloseWhenClickOutside={true}
                                          label={"Select metrics"}
                                          placeholder={"Select an option..."}
                                          isWithSearch={true}
                                          toggleSelectAll={true}
                                          labelOrientation="left"
                                          isSelectAll={isSelectAllForKpi}
                                          setIsSelectAll={setIsSelectAllForKpi}
                                          isOpen={isOpenKpiDropdown}
                                          setIsOpen={setIsOpenKpiDropdown}
                                          initialOptions={applyParentChildDisableGrouped(
                                            isUnitsChecked
                                              ? KPI_GROUPED
                                              : KPI_GROUPED_EFFECTIVE,
                                            selectedKpiDropdownOptions
                                          )}
                                          currentOptions={applyParentChildDisableGrouped(
                                            currentKpiDropdownOptions,
                                            selectedKpiDropdownOptions
                                          )}
                                          setCurrentOptions={
                                            setCurrentKpiDropdownOptions
                                          }
                                          selectedOptions={
                                            selectedKpiDropdownOptions
                                          }
                                          setSelectedOptions={
                                            setSelectedKpiDropdownOptions
                                          }
                                          onClearAll={() => handleKPIChange([])}
                                          onSelectAll={(params) => {
                                            setIsSelectAllForKpi(
                                              !isSelectAllForKpi
                                            );
                                            if (params.target.checked) {
                                              const allFlat = (isUnitsChecked
                                                ? KPI_GROUPED
                                                : KPI_GROUPED_EFFECTIVE
                                              ).flatMap((g) => g.options || []);
                                              handleKPIChange(allFlat);
                                            } else {
                                              handleKPIChange([]);
                                            }
                                          }}
                                          onDropdownClose={() => {
                                            kpiSearchTermRef.current = "";
                                            setKpiSearchTerm("");
                                            setCurrentKpiDropdownOptions(
                                              isUnitsChecked
                                                ? KPI_GROUPED
                                                : KPI_GROUPED_EFFECTIVE
                                            );
                                          }}
                                          onDropdownOpen={() => {
                                            setTimeout(() => {
                                              const input = /** @type {HTMLElement|null} */ (document.querySelector(
                                                "#kpiDropdown input[type='text'], .ia-select-container-v3 input"
                                              ));
                                              if (input) {
                                                kpiSearchInputRef.current = input;
                                                input.focus();
                                              }
                                            }, 100);
                                          }}
                                          onMenuScrollToBottom={() => {}}
                                          onSearchBlur={() => {}}
                                          onSearch={(e) =>
                                            handleKpiSearch(
                                              e,
                                              applyParentChildDisableGrouped(
                                                isUnitsChecked
                                                  ? KPI_GROUPED
                                                  : KPI_GROUPED_EFFECTIVE,
                                                selectedKpiDropdownOptions
                                              ),
                                              setCurrentKpiDropdownOptions
                                            )
                                          }
                                          formatOptionLabel={(opt) =>
                                            kpiFormatOptionLabel(
                                              opt,
                                              setCurrentKpiDropdownOptions,
                                              applyParentChildDisableGrouped(
                                                isUnitsChecked
                                                  ? KPI_GROUPED
                                                  : KPI_GROUPED_EFFECTIVE,
                                                selectedKpiDropdownOptions
                                              )
                                            )
                                          }
                                          noOptionsMessage={() =>
                                            kpiSearchTerm.length >= 3
                                              ? `No metrics found for '${kpiSearchTerm}'. Try: inventory, sales, orders, lost sales, supply`
                                              : "No options"
                                          }
                                          handleChange={(selected) => {
                                            const options = Array.isArray(
                                              selected
                                            )
                                              ? selected
                                              : selected
                                              ? [selected]
                                              : [];
                                            handleKPIChange(options);
                                          }}
                                        />
                                      </>
                                    ) : (
                                      <Select
                                        id="kpiDropdown"
                                        isMulti={true}
                                        withPortal={true}
                                        menuShouldScrollIntoView={false}
                                        isClearable={true}
                                        isCloseWhenClickOutside={true}
                                        label={"Select metrics"}
                                        placeholder={"Select metrics"}
                                        isWithSearch={true}
                                        toggleSelectAll={true}
                                        labelOrientation="left"
                                        isSelectAll={isSelectAllForKpi}
                                        setIsSelectAll={setIsSelectAllForKpi}
                                        isOpen={isOpenKpiDropdown}
                                        setIsOpen={setIsOpenKpiDropdown}
                                        initialOptions={applyParentChildDisable(
                                          isUnitsChecked
                                            ? KPI_DROPDOWN_OPTIONS
                                            : EFFECTIVE_KPI_DROPDOWN_OPTIONS,
                                          selectedKpiDropdownOptions
                                        )}
                                        currentOptions={applyParentChildDisable(
                                          currentKpiDropdownOptions,
                                          selectedKpiDropdownOptions
                                        )}
                                        setCurrentOptions={
                                          setCurrentKpiDropdownOptions
                                        }
                                        selectedOptions={
                                          selectedKpiDropdownOptions
                                        }
                                        setSelectedOptions={
                                          setSelectedKpiDropdownOptions
                                        }
                                        onClearAll={() => handleKPIChange([])}
                                        handleChange={(selected) => {
                                          const options = Array.isArray(
                                            selected
                                          )
                                            ? selected
                                            : selected
                                            ? [selected]
                                            : [];
                                          handleKPIChange(options);
                                        }}
                                      />
                                    )}
                                  </FormControl>
                                )}

                                {SHOW_KPI_DROPDOWN && (
                                  <Divider
                                    orientation="vertical"
                                    flexItem
                                    sx={{ height: 16, alignSelf: "center" }}
                                  />
                                )}

                                {SHOW_EVENT_GRID && (
                                  <FormControl sx={{ mx: 0.5 }}>
                                    <Switch
                                      aria-label="eventsToggle"
                                      onChange={(event) =>
                                        handleEventsCheckedChange(
                                          event.target.checked
                                        )
                                      }
                                      disabled={false}
                                      leftLabel="Events"
                                      rightLabel=""
                                      value={isEventsChecked}
                                    />
                                  </FormControl>
                                )}

                                {SHOW_EVENT_GRID && (
                                  <Divider
                                    orientation="vertical"
                                    flexItem
                                    sx={{ height: 16, alignSelf: "center" }}
                                  />
                                )}

                                {SHOW_UNIT_COST_SWITCH && (
                                  <FormControl sx={{ mx: 0.5 }}>
                                    <RadioButtonGroup
                                      aria-label="costUnitsRadioButton"
                                      name="costUnitsRadioButton"
                                      orientation="row"
                                      id="costUnitsRadioButton"
                                      onChange={(e) => {
                                        onUnitsCostSwitchChange(e);
                                      }}
                                      selectedOption={
                                        isUnitsChecked
                                          ? RIGHT_LABEL_SWITCH.toLowerCase()
                                          : LEFT_LABEL_SWITCH.toLowerCase()
                                      }
                                      options={[
                                        {
                                          label: LEFT_LABEL_SWITCH,
                                          value: LEFT_LABEL_SWITCH.toLowerCase(),
                                        },
                                        {
                                          label: RIGHT_LABEL_SWITCH,
                                          value: RIGHT_LABEL_SWITCH.toLowerCase(),
                                        },
                                      ]}
                                    />
                                  </FormControl>
                                )}

                                {SHOW_UNIT_COST_SWITCH && (
                                  <Divider
                                    orientation="vertical"
                                    flexItem
                                    sx={{ height: 16, alignSelf: "center" }}
                                  />
                                )}

                                <Tooltip title="Show filter" variant="tertiary">
                                  <Button
                                    variant="tertiary"
                                    icon={<FilterListIcon />}
                                    onClick={() =>
                                      props?.onFilterClick
                                        ? props.onFilterClick()
                                        : setShowFilterModal(true)
                                    }
                                  />
                                </Tooltip>
                              </Stack>
                            }
                            showSwitchButton={SHOW_CHART_TABLE_TOGGLE}
                            showchart={showChart}
                            customSystemButton={props?.downloadButton}
                            showDownloadButton={false}
                            handleChartExpand={setIsChartFullscreen}
                            setShowChart={(p) => {
                              handleTableChartViewToggle(p);
                            }}
                            fallbackContent={
                              <Loader
                                loader={
                                  props.tableLoader || props?.tableConfigLoader
                                }
                                minHeight={"260px"}
                              >
                                <div
                                  className={globalClasses.marginVertical1rem}
                                >
                                  <AgGridComponent
                                    columns={deepDiveTableColumns}
                                    rowdata={
                                      IS_DATA_DRIVEN
                                        ? props?.tableData || []
                                        : props.orderManagementDeepDiveTableData
                                    }
                                    pagination={false}
                                    showSaveTableConfig={true}
                                    showSearchModalBtn={true}
                                    tableHeader={GRAPH_TITLE}
                                    customSystemButton={
                                      <Tooltip
                                        title="Show Chart"
                                        variant="tertiary"
                                      >
                                        <Button
                                          variant="text"
                                          icon={<ChartIcon />}
                                          onClick={() =>
                                            handleTableChartViewToggle(true)
                                          }
                                        />
                                      </Tooltip>
                                    }
                                  />
                                </div>
                              </Loader>
                            }
                            xAxisOptions={props?.chartXAxisOptions}
                            customTooltipFormatter={
                              props?.customTooltipFormatter ||
                              ((params) => {
                                let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${params?.points[0]?.key}</b></span><br/>`;
                                let titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
                                activePoint += titleLine;

                                params?.points?.forEach(function (
                                  point,
                                  index
                                ) {
                                  let textColor = theme.palette.text.primary;
                                  if (point?.series?.index !== colorIndex)
                                    textColor = theme.palette.text.disabled;
                                  let pointValue = point.y;
                                  const pointKey =
                                    point?.series?.userOptions?.key ||
                                    point?.series?.options?.key ||
                                    point?.series?.userOptions?.id ||
                                    point?.series?.options?.id;
                                  if (
                                    point.y < 0 &&
                                    !NEGATIVE_TOOLTIPS.includes(pointKey)
                                  ) {
                                    pointValue = -1 * point.y;
                                  }

                                  const tooltipValue = formatTooltipValue(
                                    pointValue,
                                    point?.series?.name
                                  );

                                  activePoint +=
                                    `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
                                    `<span style="color: ${textColor}"> ${point.series.name} <b> : ${tooltipValue} </b><br>`;

                                  activePoint = appendChildTooltips(
                                    params,
                                    activePoint,
                                    point
                                  );
                                });

                                return activePoint;
                              })
                            }
                            plotOptionsEvents={{
                              events: {
                                mouseOver: function () {
                                  colorValue =
                                    this.userOptions?.color ?? this.color;
                                  colorIndex = this.index;
                                  this.update({
                                    color: colorValue,
                                  });
                                },
                                mouseOut: function () {
                                  this.update({
                                    color:
                                      this.userOptions?.color ?? this.color,
                                  });
                                },
                              },
                            }}
                            sharedTooltip={true}
                          />
                        )}
                      </ChartEventGridWrapper>
                    </Box>
                  </LoadingOverlay>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {!props?.onFilterClick && (
        <PanelV3
          key={isChartFullscreen ? "chart-fullscreen" : "chart-normal"}
          title={props?.filterPanelTitle || "Graph Filters"}
          open={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          primaryButtonLabel="Apply"
          onPrimaryButtonClick={() => {
            props?.onFilterApply();
            setShowFilterModal(false);
          }}
          secondaryButtonLabel="Reset"
          onSecondaryButtonClick={() => {
            props?.handleResetFilters();
          }}
          container={() => getFullscreenElement() || document.body}
        >
          {props?.filters}
        </PanelV3>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    orderManagementDeepDiveTableConfig:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableConfig,
    orderManagementDeepDiveTableData:
      store.omsReducer.orderManagementService.orderManagementDeepDiveTableData,
    tableLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableLoader,
    tableConfigLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableConfigLoader,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    dashboardSelectedFilters:
      store.omsReducer.orderingDashboardService.selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.oms_dashboard?.deep_dive,
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    orderManagementDeepDiveFiltersData:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersData,
    matrixHandoff: selectMatrixHandoff(store),
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsDeepDiveTableConfiguration: (isCostEnabled) =>
    dispatch(getOmsDeepDiveTableConfiguration(isCostEnabled)),
  getOmsDeepDiveTableData: (payload, isCalledFromDashboard, isV2DeepDive) =>
    dispatch(
      getOmsDeepDiveTableData(payload, isCalledFromDashboard, isV2DeepDive)
    ),
  getOmsHolidayWeeks: (payload) => dispatch(getOmsHolidayWeeks(payload)),
  setOrderManagementDeepDiveTableConfig: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfig(payload)),
  setOrderManagementDeepDiveTableData: (payload) =>
    dispatch(setOrderManagementDeepDiveTableData(payload)),
  setTableLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableLoader(payload)),
  setTableConfigLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DeepDiveChartTable);
