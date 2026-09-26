import React, { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { Divider, FormControl, Typography } from "@mui/material";
import { Button, Tooltip, Chart as ChartsV3, Panel as PanelV3 } from "impact-ui-v3";
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
} from "modules/oms/services-oms/Order-Management/order-management-service";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import FilterListIcon from "assets/filterICon.svg";
import ChartIcon from "assets/chartIcon.svg";
import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { Switch } from "impact-ui-v3";
import { Stack } from "@mui/system";
import moment from "moment/moment";
import { makeStyles } from "@mui/styles";
import _, { cloneDeep, isEmpty } from "lodash";
import InfoIcon from "@mui/icons-material/Info";
import EmptyStateLayout from "../components/EmptyStateLayout";
import { OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { OMS_CREATE_SCENARIO_CONDITION_MESSAGE, DEEP_DIVE_GRAPH_COLORS } from "modules/oms/constants-oms/stringConstants";

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    background: "#FFFFFF",
    // padding: "1rem",
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

const OrderDeepDiveTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [isRender, setIsRender] = useState(false);
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(false);
  const [isDeepDiveEmpty, setIsDeepDiveEmpty] = useState(false);

  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showChart, setShowChart] = useState(true);

  // Access control state for create scenario
  const [
    isUserHasCreateScenarioAccess,
    setIsUserHasCreateScenarioAccess,
  ] = useState(true);

  const SHOW_TOGGLE_BUTTON =
    props?.screenConfig?.oms_dashboard?.deep_dive?.show_toggle_button || false;

  const CHARTS_CONFIG =
    props?.screenConfig?.oms_dashboard?.deep_dive?.deep_dive_charts_config ||
    [];
  const CHARTS_X_AXIS_KEY =
    props?.screenConfig?.oms_dashboard?.deep_dive?.charts_x_axis_key || "week";

  const graphColours = [];
  const negativeSeries = [];

  CHARTS_CONFIG.forEach((chartItem) => {
    if (chartItem.show_as_negative) {
      negativeSeries.push(chartItem.leadTime.key);
      negativeSeries.push(chartItem.effectiveLeadTime.key);
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

  const createDataObject = (response) => {
    let responseDataObject = {};
    response?.data?.data.forEach((item) => {
       // Check if both lost_sales and forecast are present and calculate effective_sales
       if (item.hasOwnProperty("lost_sales") && item.hasOwnProperty("forecast")) {
        const effectiveSalesValue = Math.max(0, item.forecast - item.lost_sales);
        if (!responseDataObject["effective_sales"]) {
          responseDataObject["effective_sales"] = [];
        }
        responseDataObject["effective_sales"].push(Math.round(effectiveSalesValue));
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
        props.setOrderManagementDeepDiveTableData([]);
        props.setOrderManagementDeepDiveTableConfigLoader(true);
        let columns = await props.getOmsDeepDiveTableConfiguration();
        let cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
        setDeepDiveTableColumns(cols);
        props.setOrderManagementDeepDiveTableConfig(cols);
        props.setOrderManagementDeepDiveTableConfigLoader(false);
        props.setOrderManagementDeepDiveTableLoader(true);

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
          appliedFilters = cloneDeep(
            props?.orderManagementDeepDiveFiltersPayload?.filters ||
              filtersFromRedirection ||
              props?.filterDashboardConfiguration?.appliedFilterData
                ?.dependencyData ||
              []
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
              if (filter.values.length === 0) {
                filter.values = redirectedRows?.length
                  ? redirectedRows
                  : props?.selectedRowsFromMatrixSummary?.values;
              }
            }
          });
        }
        console.log("appliedFilters", appliedFilters);
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

        const payload = {
          filters: [...appliedProductFilters],
          transform_flag: true,
          ...(appliedDateFilters?.length
            ? { date_filter: appliedDateFilters }
            : {}),
        };

        if (payload?.filters?.length === 0) {
          props.setOrderManagementDeepDiveTableLoader(false);
        } else {
          let response = await props.getOmsDeepDiveTableData(payload);
          props.setOrderManagementDeepDiveTableLoader(false);

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
            props.setOrderManagementDeepDiveTableData(formatedData);
          }
        }
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderManagementDeepDiveTableLoader(false);
      }
    };

    fetchColumnData();
  }, [props?.reloadComponents]);

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

  const graphOptions = {
    chartType: "stackedBarChart",
    chartHeight: 450,
    chartTitle: null,
    axisLegends: {
      xaxis: {
        categories: fiscalYearWeek,
      },
      yaxis: {
        title: "Units",
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
            colorValue = graphColours[this.index];
            colorIndex = this.index;
            this.chart.series[this.index].update({
              color: colorValue,
            });
          },
          mouseOut: function () {
            this.chart.series[this.index].update({
              color: graphColours[this.index],
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
          if (point.y < 0) pointValue = -1 * point.y;
          activePoint +=
            `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
            `<span style="color: ${textColor}"> ${point.series.name} <b> : ${pointValue} </b><br>`;
        });
        return activePoint;
      },
      shared: true,
    },
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
    props.setOrderManagementDeepDiveTableConfig(cols);
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

                {/* <div className={classes.leftContainer}>
                  <Typography className={classes.deepDiveGraphTitle}>
                    Deep Dive
                  </Typography>

                  {!props?.showInDashboard && (
                    <>
                      <Divider
                        orientation="vertical"
                        variant="middle"
                        flexItem
                      />
                      <div className={classes.createScenarioGroup}>
                        <Tooltip
                          title={OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE?.message}
                        >
                          <Button
                            variant="tertiary"
                            color="primary"
                            id="viewOrderCreateScenario"
                            onClick={props?.navigateToCreateScenario}
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
                        <Tooltip title={OMS_CREATE_SCENARIO_CONDITION_MESSAGE}>
                          <InfoIcon
                            className={classes.infoIcon}
                            fontSize="small"
                          />
                        </Tooltip>
                      </div>
                    </>
                  )}
                </div> */}

                <div>
                  <LoadingOverlay
                    loader={props.orderManagementDeepDiveTableLoader}
                    minHeight={"260px"}
                  >
                    <Box>
                      {/* <Charts options={graphOptions} mapView={true} /> */}
                      <ChartsV3 
                        graphType={graphOptions?.chartType}
                        xAxisCategories={graphOptions?.axisLegends?.xaxis?.categories}
                        yAxisTitle={graphOptions?.axisLegends?.yaxis?.title}
                        xAxisTitle={"Timeline"}
                        seriesData={graphOptions?.series}
                        graphTitle={"Deep Dive"}
                        xAxisTitlePositionY={21}
                        topLeftOptions={!props?.showInDashboard && (
                          <>
                            <div className={classes.createScenarioGroup}>
                              <Tooltip
                                title={OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE?.message}
                                variant="tertiary"
                              >
                                <Button
                                  variant="tertiary"
                                  color="primary"
                                  id="viewOrderCreateScenario"
                                  onClick={props?.navigateToCreateScenario}
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
                              <Tooltip title={OMS_CREATE_SCENARIO_CONDITION_MESSAGE} variant="tertiary">
                                <InfoIcon
                                  className={classes.infoIcon}
                                  fontSize="small"
                                />
                              </Tooltip>
                            </div>
                          </>
                        )}
                        topRightOptions={
                          <Tooltip title="Show filter" variant="tertiary"><Button variant="tertiary" icon={<FilterListIcon />} onClick={() => setShowFilterModal(true)}/></Tooltip>
                        }
                        customSystemButton={props?.downloadButton}
                        showSwitchButton
                        showchart={showChart}
                        showDownloadButton={false}
                        setShowChart={(p) => {
                          setShowChart(p);
                        }}
                        fallbackContent={
                          <Loader
                            loader={props.orderManagementDeepDiveTableLoader}
                            minHeight={"260px"}
                          >
                            <div className={globalClasses.marginVertical1rem}>
                              <AgGridComponent
                                columns={deepDiveTableColumns}
                                rowdata={props.orderManagementDeepDiveTableData}
                                pagination={false}
                                showSaveTableConfig={true}
                                showSearchModalBtn={true}
                                tableHeader="Deep Dive"
                                customSystemButton={
                                  <Tooltip title="Show Chart" variant="tertiary"><Button variant="text" icon={<ChartIcon />} onClick={() => setShowChart(true)}/></Tooltip>
                                }
                              />
                            </div>
                          </Loader>
                        }
                        customTooltipFormatter={(params) => {
                          let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${params?.points[0]?.key}</b></span><br/>`;
                          let titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
                          activePoint += titleLine;
                  
                          params?.points?.forEach(function (point, index) {
                            let textColor = theme.palette.text.primary;
                            if (index !== colorIndex) textColor = theme.palette.text.disabled;
                            let pointValue = point.y;
                            if (point.y < 0) pointValue = -1 * point.y;
                            activePoint +=
                              `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
                              `<span style="color: ${textColor}"> ${point.series.name} <b> : ${pointValue} </b><br>`;
                          });
                          return activePoint;
                        }}
                        plotOptionsEvents={{events: {
                          mouseOver: function () {
                            colorValue = graphColours[this.index];
                            colorIndex = this.index;
                            this.chart.series[this.index].update({
                              color: colorValue,
                            });
                          },
                          mouseOut: function () {
                            this.chart.series[this.index].update({
                              color: graphColours[this.index],
                            });
                          },
                        },}}
                        sharedTooltip={true}
                      />
                    </Box>
                  </LoadingOverlay>
                </div>
              </div>
              {/* {!props?.showInDashboard && (
                <Loader
                  loader={props.orderManagementDeepDiveTableLoader}
                  minHeight={"260px"}
                >
                  <div className={globalClasses.marginVertical1rem}>
                    <AgGridComponent
                      columns={deepDiveTableColumns}
                      rowdata={props.orderManagementDeepDiveTableData}
                      pagination={false}
                      showSaveTableConfig={true}
                      showSearchModalBtn={true}
                      tableHeader="Deep Dive"
                      noRowOverlayMessage="No data found"
                    />
                  </div>
                </Loader>
              )} */}
            </>
          )}
        </>
      )}
      <PanelV3
        title="Graph Filters"
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
          setShowFilterModal(false);
        }}
        // primaryButtonProps={{
        //   disabled: !isEmpty(props?.orderManagementDeepDiveFiltersData),
        // }}
        // secondaryButtonProps={{
        //   disabled: !isEmpty(props?.orderManagementDeepDiveFiltersData),
        // }}
      >
        {props?.filters}
      </PanelV3>
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
    orderManagementDeepDiveTableLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableLoader,
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
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
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
  setOrderManagementDeepDiveTableConfig: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfig(payload)),
  setOrderManagementDeepDiveTableData: (payload) =>
    dispatch(setOrderManagementDeepDiveTableData(payload)),
  setOrderManagementDeepDiveTableLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableLoader(payload)),
  setOrderManagementDeepDiveTableConfigLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDiveTable);
