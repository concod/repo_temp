import React, { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { Divider, FormControl, Typography } from "@mui/material";
import { Button, Tooltip } from "impact-ui-v3";
import theme from "core/Styles/theme";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import { Switch } from "impact-ui-v3";
import { Stack } from "@mui/system";
import moment from "moment/moment";
import { makeStyles } from "@mui/styles";
import _, { cloneDeep, isEmpty } from "lodash";
import InfoIcon from "@mui/icons-material/Info";
import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE,
  OMS_CREATE_SCENARIO_CONDITION_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import EmptyStateLayout from "../../../components/EmptyStateLayout";
import {
  getOmsVendorToStoreDeepDiveTableConfiguration,
  getOmsVendorToStoreDeepDiveTableData,
  setDeepDiveTableData,
  setDeepDiveTableConfig,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    background: "#FFFFFF",
    padding: "1rem",
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

  const SHOW_TOGGLE_BUTTON =
    props?.vendorToStoreScreenConfig?.show_toggle_button || false;
  const CHARTS_CONFIG =
    props?.vendorToStoreScreenConfig?.deep_dive_charts_config || [];
  const CHARTS_WEEK_X_AXIS_KEY =
    props?.vendorToStoreScreenConfig?.charts_weeks_x_axis_key || "week";
  const CHARTS_MONTH_X_AXIS_KEY =
    props?.vendorToStoreScreenConfig?.charts_months_x_axis_key || "month";

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

  const createDataObject = (response, isViewOnWeek) => {
    let responseDataObject = {};
    response?.data?.data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (!responseDataObject[key]) {
          responseDataObject[key] = [];
        }

        if ((key === "week" || key === "week_end_date") && isViewOnWeek) {
          responseDataObject[key].push(moment(item[key]).format("MMM DD"));
        } else if (
          (key === "month" || key === "fiscal_year_week") &&
          !isViewOnWeek
        ) {
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

  const getLevelFromViewBy = () => {
    return props?.isViewedByWeek ? "week" : "month";
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      try {
        props.setDeepDiveTableData([]);
        props.setDeepDiveTableConfigLoader(true);
        let columns = await props.getOmsDeepDiveTableConfiguration(
          props?.isViewedByWeek
        );
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
          appliedFilters = cloneDeep(props?.dashboardSelectedFilters);

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
              props?.filterDashboardConfiguration?.appliedFilterData
                ?.dependencyData ||
              []
          );
        }

        const redirectedRows = redirectionDetails?.selectedRowIds;
        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        let isFilterPresentInConfig = false;
        if (appliedFilters?.length) {
          appliedFilters.find((filter) => {
            if (
              filter.attribute_name ===
              props?.selectedRowsFromOrderDetails?.attribute_name
            ) {
              isFilterPresentInConfig = true;
              if (filter.values.length === 0) {
                filter.values = redirectedRows?.length
                  ? redirectedRows
                  : props?.selectedRowsFromOrderDetails?.values;
              }
            }
          });
        }
        if (
          !isFilterPresentInConfig &&
          props?.selectedRowsFromOrderDetails?.length > 0
        ) {
          appliedFilters = [
            ...appliedFilters,
            props?.selectedRowsFromOrderDetails,
          ];
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
          level: getLevelFromViewBy(),
          ...(appliedDateFilters?.length
            ? { date_filter: appliedDateFilters }
            : {}),
        };

        if (payload?.filters?.length === 0) {
          props.setDeepDiveTableLoader(false);
        } else {
          let response = await props.getOmsVendorToStoreDeepDiveTableData(
            payload
          );
          props.setDeepDiveTableLoader(false);

          if (response?.data?.status) {
            if (response?.data?.data?.length === 0) {
              setIsDeepDiveEmpty(true);
            } else {
              setIsDeepDiveEmpty(false);
              const responseDataFormattted = createDataObject(
                response,
                props?.isViewedByWeek
              );
              if (responseDataFormattted?.[CHARTS_WEEK_X_AXIS_KEY]?.length) {
                setDeepDiveChartData(responseDataFormattted);
                if (props?.isViewedByWeek) {
                  const fiscalYearWeek =
                    responseDataFormattted[CHARTS_WEEK_X_AXIS_KEY];
                  setFiscalYearWeek([...fiscalYearWeek]);
                } else {
                  const fiscalYearMonth =
                    responseDataFormattted[CHARTS_MONTH_X_AXIS_KEY];
                  setFiscalYearWeek([...fiscalYearMonth]);
                }
              }
            }
            setIsRender(true);
            let formatedData = agGridRowFormatter(response.data.data);
            props.setDeepDiveTableData(formatedData);
          }
        }
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setDeepDiveTableLoader(false);
      }
    };

    fetchColumnData();
  }, [props?.reloadComponents, props?.isViewedByWeek]);

  useEffect(() => {
    if (!isEmpty(deepDiveChartData)) {
      createGraphSeries();
    }
  }, [deepDiveChartData]);

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
      verticalAlign: "bottom",
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
              {props?.isChartDisplayed && (
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
                      loader={props.deepDiveTableLoader}
                      minHeight={"260px"}
                    >
                      <Box sx={{ pb: 1 }}>
                        <Charts options={graphOptions} mapView={true} />
                      </Box>
                    </LoadingOverlay>
                  </div>
                </div>
              )}

              {!props?.isChartDisplayed && (
                <Loader loader={props.deepDiveTableLoader} minHeight={"260px"}>
                  <div className={globalClasses.marginVertical1rem}>
                    <AgGridComponent
                      columns={deepDiveTableColumns}
                      rowdata={props.deepDiveTableData}
                      pagination={false}
                      showSaveTableConfig={true}
                      showSearchModalBtn={true}
                      tableHeader="Deep Dive"
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
    deepDiveTableData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableData,
    deepDiveTableLoader:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableLoader,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    dashboardSelectedFilters:
      store.omsReducer.orderingDashboardService.selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementVendorStoreFilterConfiguration"
      ],
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.deep_dive,
    selectedRowsFromOrderDetails:
      store.omsReducer.orderManagementVendorToStoreService
        .selectedRowsFromOrderDetails,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsDeepDiveTableConfiguration: (payload) =>
    dispatch(getOmsVendorToStoreDeepDiveTableConfiguration(payload)),
  getOmsVendorToStoreDeepDiveTableData: (payload) =>
    dispatch(getOmsVendorToStoreDeepDiveTableData(payload)),
  setDeepDiveTableConfig: (payload) =>
    dispatch(setDeepDiveTableConfig(payload)),
  setDeepDiveTableData: (payload) => dispatch(setDeepDiveTableData(payload)),
  setDeepDiveTableLoader: (payload) =>
    dispatch(setDeepDiveTableLoader(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setDeepDiveTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDiveTable);
