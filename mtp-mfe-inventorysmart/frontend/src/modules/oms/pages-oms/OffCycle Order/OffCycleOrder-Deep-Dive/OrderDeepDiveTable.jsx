import React, { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { Divider, FormControl, Typography } from "@mui/material";
import theme from "core/Styles/theme";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import { Switch } from "impact-ui-v3";
import { Stack } from "@mui/system";
import moment from "moment/moment";
import { makeStyles } from "@mui/styles";
import _, { cloneDeep, isEmpty } from "lodash";

import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOffCycleOrderDeepDiveTableConfiguration,
  getOffCycleOrderDeepDiveTableData,
  setOffCycleOrderDeepDiveTableConfig,
  setOffCycleOrderDeepDiveTableConfigLoader,
  setOffCycleOrderDeepDiveTableDataLoader,
  setOffCycleOrderDeepDiveTableData,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import EmptyStateLayout from "./EmptyStateLayout";

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

  // Access control state for create scenario
  const [
    isUserHasCreateScenarioAccess,
    setIsUserHasCreateScenarioAccess,
  ] = useState(true);

  const SHOW_TOGGLE_BUTTON =
    props?.offCycleOrderScreenConfig?.deep_dive?.show_toggle_button || false;

  const CHARTS_CONFIG =
    props?.offCycleOrderScreenConfig?.deep_dive?.deep_dive_charts_config || [];
  const CHARTS_X_AXIS_KEY =
    props?.offCycleOrderScreenConfig?.deep_dive?.charts_x_axis_key || "week";

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
        props.setDeepDiveTableData([]);
        props.setDeepDiveTableConfigLoader(true);
        let columns = await props.getDeepDiveTableConfiguration();
        let cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
        setDeepDiveTableColumns(cols);
        props.setDeepDiveTableConfig(cols);
        props.setDeepDiveTableConfigLoader(false);
        props.setDeepDiveTableDataLoader(true);

        const appliedFilters = cloneDeep(
          props?.deepDiveFiltersPayload?.filters || []
        );
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
        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );

        const payload = {
          draft_id: props?.draftId,
          filters: [...appliedProductFilters],
          transform_flag: true,
          date_filter: appliedDateFilters,
        };

        if (payload?.filters?.length === 0 && !payload?.draft_id) {
          props.setDeepDiveTableDataLoader(false);
        } else {
          let response = await props.getDeepDiveTableData(payload);
          props.setDeepDiveTableDataLoader(false);

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
          }
        }
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setDeepDiveTableDataLoader(false);
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
                emptyStateDescription="Please select filters to view Deep Dive."
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

                <div className={classes.leftContainer}>
                  <Typography className={classes.deepDiveGraphTitle}>
                    Deep Dive
                  </Typography>
                </div>

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
            </>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    deepDiveTableLoader:
      store.omsReducer.offCycleOrderService
        .offCycleOrderDeepDiveTableDataLoader,
    deepDiveFiltersPayload:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersPayload,
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
    offCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration
        ?.create_new_order,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getDeepDiveTableData: (payload) =>
    dispatch(getOffCycleOrderDeepDiveTableData(payload)),
  setDeepDiveTableConfig: (payload) =>
    dispatch(setOffCycleOrderDeepDiveTableConfig(payload)),
  getDeepDiveTableConfiguration: () =>
    dispatch(getOffCycleOrderDeepDiveTableConfiguration()),
  setDeepDiveTableData: (payload) =>
    dispatch(setOffCycleOrderDeepDiveTableData(payload)),
  setDeepDiveTableDataLoader: (payload) =>
    dispatch(setOffCycleOrderDeepDiveTableDataLoader(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setOffCycleOrderDeepDiveTableConfigLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDiveTable);
