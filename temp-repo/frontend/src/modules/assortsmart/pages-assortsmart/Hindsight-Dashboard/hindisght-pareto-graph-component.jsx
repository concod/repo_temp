import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  setParetoGraphLoader,
  setHindsightParetoGraphData,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { getAllFilters } from "core/actions/filterAction";
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import {
  clearanceData,
  carryoverData,
  xAxisDataParetoGraph,
} from "modules/assortsmart/constants-assortsmart/stringContants";

const HindisghtParetoGraphComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [paretoGraphOptions, setParetoGraphOptions] = useState({});
  const tabValues = useRef({});
  const filtersConfig = useRef({});
  const history = useHistory();

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.pareto_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    filtersConfig.current["graphFilters"] = {};
    const channels = await getChannelOptions("", props.screenConfiguration);
    for (const filterKey in hindsightValues) {
      if (!filterKey.includes("metrics")) {
        for (const key in hindsightValues[filterKey]) {
          const param = hindsightValues[filterKey][key];
          const filterResp = await props.getAllFilters(param);
          let filterConfig = [];
          if (filterResp?.data?.status) {
            filterConfig = await generateFilterConfig(
              filterResp?.data?.data,
              "graph_filters",
              props.userAccessList,
              false,
              history.location.pathname,
              "",
              "",
              props.paretoGraphFilters
            );
            filterConfig?.forEach((item) => {
              if (item.accessor === "channel") {
                item.options = channels;
              }
              if (item.accessor === "clearance") {
                item.options = clearanceData?.map((filter) => {
                  return {
                    label: filter.column_name,
                    value: filter.value,
                    id: filter.value,
                  };
                });
              }
              if (item.accessor === "carryover") {
                item.options = carryoverData?.map((filter) => {
                  return {
                    label: filter.column_name,
                    value: filter.value,
                    id: filter.value,
                  };
                });
              }
              if (item.accessor === "x_axis") {
                item.options = xAxisDataParetoGraph?.map((axisData) => {
                  return {
                    label:
                      props.levelsJson[axisData] ||
                      props.treemapFiltersData?.[
                        "filter_keys_with_display_name"
                      ]?.[axisData] ||
                      axisData,
                    value: axisData,
                    id: axisData,
                  };
                });
              }
              if (
                item.accessor === "y_axis" ||
                item.accessor === "y_axis_secondary"
              ) {
                item.options = props.treemapFiltersData["size_group"]?.map(
                  (size) => {
                    return {
                      label:
                        props.treemapFiltersData?.[
                          "filter_keys_with_display_name"
                        ]?.[size],
                      value: size,
                      id: size,
                    };
                  }
                );
              }
            });
          }
          filtersConfig.current["graphFilters"][key] = filterConfig;
        }
      }
    }
  };

  useEffect(() => {
    if (
      !isEmpty(props.screenConfiguration) &&
      !isEmpty(props.treemapFiltersData)
    ) {
      configureFilters();
    }
  }, [props.screenConfiguration, props.treemapFiltersData]);

  useEffect(() => {
    if (!isEmpty(props.paretoGraphData)) {
      const graphData = props.paretoGraphData?.data;
      const threshold = parseInt(
        props.paretoGraphData?.graph_details?.axis_threshold
      );
      const yAxisSecondaryLabel =
        props.paretoGraphData?.graph_details?.y_axis_secondary;
      const yAxisLabel = props.paretoGraphData?.graph_details?.y_axis;
      const xAxisLabel = props.paretoGraphData?.graph_details?.x_axis;
      const xAxisData = [],
        yAxisData = [];
      let yAxisSum = 0;
      graphData?.forEach((item) => {
        xAxisData.push(item.x_axis);
        yAxisData.push(item.primary_y_axis);
        yAxisSum += item.primary_y_axis;
      });
      const thresholdData = Math.round((threshold * yAxisSum) / 100);
      let xAxisIndex = 0,
        cummulativeSum = 0;
      for (let index = 0; index < yAxisData?.length; index++) {
        cummulativeSum += yAxisData[index];
        if (cummulativeSum >= thresholdData) {
          xAxisIndex = index;
          break;
        }
      }
      const options = {
        chartType: "pareto",
        chartTitle: "",
        xAxis: {
          categories: xAxisData,
          crosshair: true,
          plotLines: [
            {
              color: "green",
              width: 3,
              dashStyle: "dash",
              value: xAxisIndex,
            },
          ],
        },
        yAxis: [
          {
            title: {
              text: "",
            },
          },
          {
            title: {
              text: "",
            },
            minPadding: 0,
            maxPadding: 0,
            max: 100,
            min: 0,
            opposite: true,
            labels: {
              format: "{value}%",
            },
            plotLines: [
              {
                color: "green",
                width: 3,
                dashStyle: "dash",
                value: threshold,
              },
            ],
          },
        ],
        series: [
          {
            type: "pareto",
            name: `${yAxisSecondaryLabel}`,
            yAxis: 1,
            zIndex: 10,
            baseSeries: 1,
            tooltip: {
              valueDecimals: 2,
              valueSuffix: "%",
            },
          },
          {
            name: `${yAxisLabel}`,
            type: "column",
            zIndex: 2,
            data: yAxisData,
          },
        ],
      };
      setParetoGraphOptions(options);
      props.setParetoGraphLoader(false);
    }
  }, [props.paretoGraphData]);

  return (
    <Card className={globalClasses.paper} id="pareto-graph">
      <LoadingOverlay loader={props.paretoGraphLoader}>
        <HindsightGraphHeader
          filtersConfig={filtersConfig.current}
          tabValues={tabValues.current}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateParetoGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          setGraphFilters={props.setParetoGraphFilters}
          graphFilters={props.paretoGraphFilters}
          heading={"Top Performing Hierarchies"}
          graphType={"pareto"}
        />
        {!isEmpty(paretoGraphOptions) && (
          <Charts options={paretoGraphOptions} />
        )}
      </LoadingOverlay>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    paretoGraphData: HindsightServiceActions.setHindsightParetoGraphSelector(
      state
    ),
    paretoGraphLoader: HindsightServiceActions.setParetoGraphLoaderSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  setParetoGraphLoader,
  setHindsightParetoGraphData,
  getAllFilters,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindisghtParetoGraphComponent);
