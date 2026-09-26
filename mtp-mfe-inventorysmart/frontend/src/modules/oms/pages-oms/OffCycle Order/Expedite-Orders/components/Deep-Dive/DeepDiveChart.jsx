import React, { useEffect, useMemo, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { FormControl } from "@mui/material";
import { Badge, Chart, EmptyState, Chips, Switch } from "impact-ui-v3";
import theme from "core/Styles/theme";
import moment from "moment/moment";
import { makeStyles } from "@mui/styles";
import _, { cloneDeep, isEmpty } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getOmsDeepDiveTableConfiguration,
  getOmsDeepDiveTableData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import { Stack } from "@mui/system";
import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  setDeepDiveTableLoader,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableConfig,
  setDeepDiveTableData,
  normalizeExpediteChartRows,
  extractExpediteChartHighlights,
  refetchExpediteSessionCharts,
  setSelectedChartScenario,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import CommonDeepDive from "modules/oms/pages-oms/common/DeepDiveChart";
import DeepDiveDownload from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive/DeepDiveDownload";
import {
  useExpediteDeepDiveFilterContextSafe,
  ExpediteOrdersDeepDiveFilterWeekRangeInline,
} from "./DeepDiveFilterPanel";
import {
  EXPEDITE_ORDERS_DEEPDIVE_VIEWS,
  EXPEDITE_SCENARIO_ENABLED_CONFIGS,
} from "../../constants";

const CHART_HIGHLIGHT_STYLES = {
  lostSales: {
    bandColor: "#FCEEEE",
    label: "Lost Sales",
    labelColor: "#E15554",
  },
  recoverable: {
    bandColor: "#ECEEFD",
    label: "Recoverable",
    labelColor: "#4259EE",
  },
};

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    background: "#FFFFFF",
    padding: "1rem",
    borderRadius: "8px",
  },

  chartContainerCompact: {
    background: "#FFFFFF",
    padding: 0,
    borderRadius: "8px",
  },
  infoIcon: {
    color: theme?.palette?.textColours?.greyHelperText,
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
}));

const ExpediteOrdersDeepDiveChart = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const expediteFilterContext = useExpediteDeepDiveFilterContextSafe();

  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [isRender, setIsRender] = useState(false);
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(false);
  const [isDeepDiveEmpty, setIsDeepDiveEmpty] = useState(false);

  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});
  const [modularTableData, setModularTableData] = useState([]);

  const [chartHighlights, setChartHighlights] = useState(null);
  const [selectedViews, setSelectedViews] = useState([
    props.selectedChartScenario || "default_lead_time",
  ]);

  useEffect(() => {
    if (
      props.selectedChartScenario &&
      !selectedViews.includes(props.selectedChartScenario)
    ) {
      setSelectedViews([props.selectedChartScenario]);
    }
  }, [props.selectedChartScenario]);

  // Access control state for create scenario
  const [
    isUserHasCreateScenarioAccess,
    setIsUserHasCreateScenarioAccess,
  ] = useState(true);

  const IS_CHART_MODULARISED = props?.forceLegacyChart
    ? false
    : props?.deepDiveConfig?.is_chart_modularised || false;

  const MODULAR_EXPEDITE_CONFIG =
    props?.deepDiveConfig?.modular_expedite_charts_config || {};

  const SHOW_EXPEDITE_ORDERS_DEEPDIVE_VIEWS =
    props?.deepDiveConfig?.show_expedite_orders_deepdive_views ?? true;

  const allChartsConfig =
    (IS_CHART_MODULARISED
      ? MODULAR_EXPEDITE_CONFIG?.deep_dive_charts_config
      : props?.deepDiveConfig?.deep_dive_charts_config) || [];

  const CHARTS_CONFIG = useMemo(() => {
    const visibleLabels = props?.visibleChartLabels;
    let baseConfig = [];

    if (!Array.isArray(visibleLabels) || visibleLabels.length === 0) {
      baseConfig = allChartsConfig;
    } else {
      baseConfig = visibleLabels
        .map((label) =>
          allChartsConfig.find((graph) => graph?.leadTime?.label === label)
        )
        .filter(Boolean);
    }

    // Add additional series when selectedViews has values
    if (
      selectedViews &&
      selectedViews.length > 0 &&
      EXPEDITE_SCENARIO_ENABLED_CONFIGS
    ) {
      return [...baseConfig, ...EXPEDITE_SCENARIO_ENABLED_CONFIGS];
    }

    return baseConfig;
  }, [allChartsConfig, props?.visibleChartLabels, selectedViews]);

  const SHOW_TOGGLE_BUTTON =
    !props?.visibleChartLabels?.length &&
    ((IS_CHART_MODULARISED
      ? MODULAR_EXPEDITE_CONFIG?.show_toggle_button
      : props?.deepDiveConfig?.show_toggle_button) ||
      false);
  const CHARTS_X_AXIS_KEY = props?.deepDiveConfig?.charts_x_axis_key || "week";

  const { graphColours, negativeSeries } = useMemo(() => {
    const colours = [];
    const negatives = [];
    CHARTS_CONFIG.forEach((chartItem) => {
      if (chartItem.show_as_negative) {
        negatives.push(chartItem.leadTime.key);
        negatives.push(chartItem.effectiveLeadTime.key);
      }
      colours.push(chartItem.series.color);
    });
    return { graphColours: colours, negativeSeries: negatives };
  }, [CHARTS_CONFIG]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
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

          if (!IS_CHART_MODULARISED && negativeSeries.includes(key)) {
            value = -1 * value;
          }
          if (key) responseDataObject[key].push(value);
        }
      });
    });
    return responseDataObject;
  };

  useEffect(() => {
    if (props.sessionChartData === undefined) return; // not in session mode

    if (props.isLoadingSession || props.isSessionChartLoading) {
      setIsRender(false);
      return;
    }

    const data = normalizeExpediteChartRows(props.sessionChartData);
    if (!Array.isArray(data) || data.length === 0) {
      setIsDeepDiveEmpty(true);
      setChartHighlights(null);
      setIsRender(true);
      setModularTableData([]);
      return;
    }

    setModularTableData(agGridRowFormatter(data));
    const chartResponse = { data: { data } };
    const formatted = createDataObject(chartResponse);
    if (formatted?.[CHARTS_X_AXIS_KEY]?.length) {
      setDeepDiveChartData(formatted);
      setFiscalYearWeek([...formatted[CHARTS_X_AXIS_KEY]]);
      setIsDeepDiveEmpty(false);
    } else {
      setIsDeepDiveEmpty(true);
    }
    setChartHighlights(
      props.showChartHighlights
        ? extractExpediteChartHighlights(props.sessionChartData)
        : null
    );
    setIsRender(true);
  }, [
    props.sessionChartData,
    props.isLoadingSession,
    props.isSessionChartLoading,
    props.showChartHighlights,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy path: only runs when NOT in session mode (sessionChartData is absent).
  useEffect(() => {
    if (props.sessionChartData !== undefined) return; // session mode — skip legacy

    const fetchColumnData = async () => {
      try {
        props.setDeepDiveTableData([]);
        props.setDeepDiveTableConfigLoader(true);
        let columns = await props.getOmsDeepDiveTableConfiguration();
        let cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
        setDeepDiveTableColumns(cols);
        props.setDeepDiveTableConfig(cols);
        props.setDeepDiveTableConfigLoader(false);
        props.setDeepDiveTableLoader(true);

        // Fetching the redirection details from local storage
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const filtersFromRedirection = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];

        let appliedFilters = [];
        if (props?.showInDashboard) {
          const dashboardSelectedFilters = JSON.parse(
            localStorage.getItem("omsDashboardSelectedFilters")
          );
          appliedFilters = cloneDeep(dashboardSelectedFilters);

          // Add deep dive filters payload to applied filters
          if (props?.deepDiveFiltersPayload?.filters?.length) {
            appliedFilters = [
              ...appliedFilters,
              ...cloneDeep(props?.deepDiveFiltersPayload?.filters),
            ];
          }
        } else {
          appliedFilters = cloneDeep(
            props?.deepDiveFiltersPayload?.filters ||
              filtersFromRedirection ||
              []
          );
        }

        const redirectedRows = redirectionDetails?.selectedRowIds;
        const redirectedFilterConfig = props?.deepDiveProductFilter;
        const redirectedValues = redirectedRows?.length
          ? redirectedRows
          : props?.selectedRowsFromAlert?.[
              redirectedFilterConfig.attribute_name
            ];
        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters?.length && redirectedFilterConfig) {
          let isFilterFound = false;
          appliedFilters.forEach((filter) => {
            if (
              filter.attribute_name === redirectedFilterConfig.attribute_name
            ) {
              isFilterFound = true;

              if (!filter.values?.length) {
                filter.values = redirectedValues;
              }
            }
          });

          if (!isFilterFound) {
            appliedFilters.push({
              ...redirectedFilterConfig,
              values: redirectedValues,
            });
          }
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
        const weekRangeForPayload =
          props?.weekRange?.attribute_name != null
            ? props.weekRange
            : props?.deepDiveWeekRange?.attribute_name != null
            ? props.deepDiveWeekRange
            : null;
        if (weekRangeForPayload?.attribute_name) {
          appliedDateFilters.push(weekRangeForPayload);
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

        const payload = {
          filters: [...appliedProductFilters],
          transform_flag: true,
          ...(appliedDateFilters?.length
            ? { date_filter: appliedDateFilters }
            : {}),
        };

        if (payload?.filters?.length === 0) {
          props.setDeepDiveTableLoader(false);
        } else {
          let response = await props.getOmsDeepDiveTableData(payload);
          props.setDeepDiveTableLoader(false);

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
              }
            }
            setIsRender(true);
            let formatedData = agGridRowFormatter(response.data.data);
            props.setDeepDiveTableData(formatedData);
            setModularTableData(formatedData);
          }
        }
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setDeepDiveTableLoader(false);
      }
    };

    fetchColumnData();
  }, [props?.reloadComponents]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEmpty(deepDiveChartData)) {
      createGraphSeries();
    }
  }, [deepDiveChartData]);

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

  const highlightPlotBands = useMemo(() => {
    if (!chartHighlights) return undefined;

    const fyw = deepDiveChartData?.["fiscal_year_week"];
    if (!Array.isArray(fyw) || fyw.length === 0) return undefined;

    const lostStartIdx =
      chartHighlights.lostSalesStart != null
        ? fyw.indexOf(chartHighlights.lostSalesStart)
        : -1;
    const recoverStartIdx =
      chartHighlights.recoverableStart != null
        ? fyw.indexOf(chartHighlights.recoverableStart)
        : -1;
    const recoverEndIdx =
      chartHighlights.recoverableEnd != null
        ? fyw.indexOf(chartHighlights.recoverableEnd)
        : -1;

    const bands = [];

    const NARROW_BAND_CELLS = 4;
    const buildLabel = (text, color, bandWidthCells) => {
      const isNarrow = bandWidthCells < NARROW_BAND_CELLS;
      return {
        text,
        useHTML: true,
        align: isNarrow ? "left" : "center",
        textAlign: "left",
        verticalAlign: "top",
        x: isNarrow ? 4 : 0,
        y: 14,
        style: {
          color,
          fontSize: "11px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        },
      };
    };

    if (lostStartIdx >= 0) {
      const lostEndIdxExclusive =
        recoverStartIdx > lostStartIdx ? recoverStartIdx : fyw.length;
      const lostEndBoundary = lostEndIdxExclusive - 0.5;
      const lostWidthCells = lostEndIdxExclusive - lostStartIdx;
      bands.push({
        from: lostStartIdx - 0.5,
        to: lostEndBoundary,
        color: CHART_HIGHLIGHT_STYLES.lostSales.bandColor,
        zIndex: 0,
        label: buildLabel(
          CHART_HIGHLIGHT_STYLES.lostSales.label,
          CHART_HIGHLIGHT_STYLES.lostSales.labelColor,
          lostWidthCells
        ),
      });
    }

    if (recoverStartIdx >= 0) {
      const recoverEndIdxResolved =
        recoverEndIdx >= recoverStartIdx ? recoverEndIdx : recoverStartIdx;
      const recoverEndBoundary = recoverEndIdxResolved + 0.5;
      const recoverWidthCells = recoverEndIdxResolved - recoverStartIdx + 1;
      bands.push({
        from: recoverStartIdx - 0.5,
        to: recoverEndBoundary,
        color: CHART_HIGHLIGHT_STYLES.recoverable.bandColor,
        zIndex: 0,
        label: buildLabel(
          CHART_HIGHLIGHT_STYLES.recoverable.label,
          CHART_HIGHLIGHT_STYLES.recoverable.labelColor,
          recoverWidthCells
        ),
      });
    }

    return bands.length ? bands : undefined;
  }, [chartHighlights, deepDiveChartData]);

  /* Highlight plot-bands ride along on the `xAxisOptions` prop (matching the */
  const chartXAxisOptions = {
    plotBands: highlightPlotBands,
  };

  const chartTooltipFormatter = (params) => {
    const points = params?.points || [];
    if (!points.length) return "";
    let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${points[0]?.key}</b></span><br/>`;
    const titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
    activePoint += titleLine;

    points.forEach((point, index) => {
      let textColor = theme.palette.text.primary;
      const seriesIndex = point?.series?.index ?? index;
      if (seriesIndex !== colorIndex) textColor = theme.palette.text.disabled;
      let pointValue = point.y;
      if (point.y < 0) pointValue = -1 * point.y;
      activePoint +=
        `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
        `<span style="color: ${textColor}"> ${point.series.name} <b> : ${pointValue} </b><br>`;
    });
    return activePoint;
  };

  const chartPlotOptionsEvents = {
    events: {
      mouseOver: function () {
        colorValue = graphColours[this.index];
        colorIndex = this.index;
      },
    },
  };

  const handleChipClick = (attribute) => {
    console.log("Chip clicked:", attribute);
    setSelectedViews((prev) => {
      if (prev.includes(attribute)) {
        return prev.filter((item) => item !== attribute);
      }
      return [...prev, attribute];
    });
  };

  const createGraphSeries = (displayType) => {
    let isELTEnabled = isSwitchedChecked;
    if (displayType !== undefined) isELTEnabled = displayType;
    let series = [];
    CHARTS_CONFIG.forEach((graph, index) => {
      let graphSeries = {
        ...graph.series,
        name: isELTEnabled
          ? graph.effectiveLeadTime?.label
          : graph.leadTime?.label,
        data: isELTEnabled
          ? deepDiveChartData[graph.effectiveLeadTime?.key]
          : deepDiveChartData[graph.leadTime?.key],
      };
      series.push(graphSeries);
    });
    setSeriesGraphData([...series]);
    let cols = formattingDeepDiveColumns(deepDiveTableColumns, isELTEnabled);
    setDeepDiveTableColumns(cols);
    props.setDeepDiveTableConfig(cols);
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

  const handleViewsChange = (newSelectedViews) => {
    setSelectedViews(newSelectedViews);
    if (newSelectedViews.length > 0) {
      const selectedScenario = newSelectedViews[0];
      props.setSelectedChartScenario(selectedScenario);
      if (props.sessionChartData !== undefined) {
        props.refetchExpediteSessionCharts();
      }
    } else {
      props.setSelectedChartScenario(null);
      if (props.sessionChartData !== undefined) {
        props.refetchExpediteSessionCharts();
      }
    }
  };

  if (IS_CHART_MODULARISED) {
    const isSessionLoading =
      props.sessionChartData !== undefined &&
      (props.isLoadingSession || props.isSessionChartLoading);
    if (isSessionLoading) {
      return <Loader loader={true} minHeight={"260px"} />;
    }
    return (
      <CommonDeepDive
        showInDashboard={props?.showInDashboard}
        fiscalCalendarDetails={props?.fiscalCalendarDetails}
        decisionDashboardDeepDiveConfig={{
          ...(props?.deepDiveConfig || {}),
          is_enabled: true,
        }}
        chartsConfig={CHARTS_CONFIG}
        chartsXAxisKey={CHARTS_X_AXIS_KEY}
        deepDiveChartData={deepDiveChartData}
        graphTitle="Deep Dive"
        showCreateScenarioButton={false}
        showChartTableToggle={true}
        SHOW_DEEPDIVE_VIEWS={SHOW_EXPEDITE_ORDERS_DEEPDIVE_VIEWS}
        DEEPDIVE_VIEWS={EXPEDITE_ORDERS_DEEPDIVE_VIEWS}
        selectedViews={selectedViews}
        setSelectedViews={setSelectedViews}
        onViewsChange={handleViewsChange}
        showToggleButton={SHOW_TOGGLE_BUTTON}
        showUnitCostSwitch={MODULAR_EXPEDITE_CONFIG?.show_unit_cost_switch}
        showKpiDropdown={MODULAR_EXPEDITE_CONFIG?.show_kpi_dropdown}
        kpiDropdownOptions={MODULAR_EXPEDITE_CONFIG?.kpi_dropdown_options}
        kpiDropdownOptionsEffective={
          MODULAR_EXPEDITE_CONFIG?.kpi_dropdown_options_effective
        }
        subSeriesTooltips={MODULAR_EXPEDITE_CONFIG?.sub_series_toolips}
        showEventGrid={MODULAR_EXPEDITE_CONFIG?.show_event_grid}
        eventIconMap={MODULAR_EXPEDITE_CONFIG?.event_icon_map}
        chartXAxisOptions={chartXAxisOptions}
        customTooltipFormatter={chartTooltipFormatter}
        graphTitleAdornment={
          props?.selectedStyleColor ? (
            <Badge
              label={`Selected Style: ${props.selectedStyleColor}`}
              color="default"
              size="default"
              variant="subtle"
            />
          ) : null
        }
        filterPanelTitle="Deep Dive Filters"
        filters={
          props?.modularFilterContent !== undefined ? (
            props.modularFilterContent
          ) : (
            <ExpediteOrdersDeepDiveFilterWeekRangeInline />
          )
        }
        onFilterApply={
          props?.modularOnFilterApply || expediteFilterContext?.onFilterApply
        }
        handleResetFilters={
          props?.modularOnFilterReset ||
          expediteFilterContext?.handleResetFilters
        }
        tableData={modularTableData}
        downloadButton={
          props?.modularDownloadButton !== undefined ? (
            props.modularDownloadButton
          ) : (
            <DeepDiveDownload
              weekRange={expediteFilterContext?.weekRange}
              isCalledFromExpediteOrders
              showAsCustomButton={true}
            />
          )
        }
      />
    );
  }

  return (
    <div>
      {!isRender ? (
        <Loader loader={true} minHeight={"260px"}></Loader>
      ) : (
        <>
          {isDeepDiveEmpty ? (
            <div className={globalClasses.centerAlign}>
              <EmptyState
                heading="No Data Found"
                description="Please select filters to view this page."
                primaryButtonLabel={null}
                secondaryButtonLabel={null}
              />
            </div>
          ) : (
            <>
              <div
                className={
                  props?.compactLayout
                    ? classes.chartContainerCompact
                    : classes.chartContainer
                }
              >
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

                {SHOW_EXPEDITE_ORDERS_DEEPDIVE_VIEWS && (
                  <div>
                    {EXPEDITE_ORDERS_DEEPDIVE_VIEWS.map((option) => (
                      <Chips
                        key={option.value}
                        isActive={selectedViews.includes(option.value)}
                        label={option.label}
                        onClick={() => handleChipClick(option.value)}
                        type="multi"
                      />
                    ))}
                  </div>
                )}

                <div>
                  <LoadingOverlay
                    loader={props.deepDiveTableLoader}
                    minHeight={"260px"}
                  >
                    <Box sx={{ pb: props?.compactLayout ? 0 : 1 }}>
                      <Chart
                        graphType="stackedBarChart"
                        chartHeight={props.chartHeight ?? 450}
                        style={{ height: props.chartHeight ?? 450 }}
                        xAxisCategories={fiscalYearWeek}
                        yAxisTitle="Units"
                        xAxisTitle="Timeline"
                        xAxisTitlePositionY={21}
                        seriesData={seriesGraphData}
                        showHeader={false}
                        showSwitchButton={false}
                        showChartTypeDropdown={false}
                        showDownloadButton={false}
                        showExpandButton={false}
                        cardContainer={false}
                        sharedTooltip={true}
                        xAxisOptions={chartXAxisOptions}
                        customTooltipFormatter={chartTooltipFormatter}
                        plotOptionsEvents={chartPlotOptionsEvents}
                      />
                    </Box>
                  </LoadingOverlay>
                </div>
              </div>
              {!props?.showInDashboard && (
                <Loader loader={props.deepDiveTableLoader} minHeight={"260px"}>
                  <div className={globalClasses.marginVertical1rem}>
                    <AgGridComponent
                      columns={deepDiveTableColumns}
                      rowdata={props.deepDiveTableData}
                      pagination={false}
                      showSaveTableConfig={true}
                      showSearchModalBtn={true}
                      tableHeader="Deep Dive"
                      showSkeleton={true}
                      noRowOverlayMessage="No data found"
                    />
                  </div>
                </Loader>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    deepDiveConfig:
      store.omsReducer.expediteOrdersService.expediteOrdersConfig
        ?.expedite_orders?.deep_dive,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    deepDiveTableData: store.omsReducer.expediteOrdersService.deepDiveTableData,
    deepDiveTableLoader:
      store.omsReducer.expediteOrdersService.deepDiveTableLoader,
    dashboardSelectedFilters:
      store.omsReducer.orderingDashboardService.selectedFilters,
    deepDiveFiltersPayload:
      store.omsReducer.expediteOrdersService.deepDiveFiltersPayload,
    deepDiveFilters: store.omsReducer.expediteOrdersService.deepDiveFilters,
    deepDiveProductFilter:
      store.omsReducer.expediteOrdersService.deepDiveProductFilter,
    deepDiveWeekRange: store.omsReducer.expediteOrdersService.deepDiveWeekRange,
    selectedRowsFromAlert:
      store.omsReducer.expediteOrdersService.selectedRowsFromAlert,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsDeepDiveTableConfiguration: () =>
    dispatch(getOmsDeepDiveTableConfiguration()),
  getOmsDeepDiveTableData: (payload) =>
    dispatch(getOmsDeepDiveTableData(payload)),
  setDeepDiveTableConfig: (payload) =>
    dispatch(setDeepDiveTableConfig(payload)),
  setDeepDiveTableData: (payload) => dispatch(setDeepDiveTableData(payload)),
  setDeepDiveTableLoader: (payload) =>
    dispatch(setDeepDiveTableLoader(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setDeepDiveTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  refetchExpediteSessionCharts: () => dispatch(refetchExpediteSessionCharts()),
  setSelectedChartScenario: (payload) =>
    dispatch(setSelectedChartScenario(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersDeepDiveChart);
