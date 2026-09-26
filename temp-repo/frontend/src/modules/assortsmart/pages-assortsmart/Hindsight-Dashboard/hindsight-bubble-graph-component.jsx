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
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { getAllFilters } from "core/actions/filterAction";
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import {
  clearanceData,
  carryoverData,
} from "modules/assortsmart/constants-assortsmart/stringContants";

const HindsightBubbleGraphComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [bubbleGraphOptions, setbubbleGraphOptions] = useState({});
  const tabValues = useRef({});
  const filtersConfig = useRef({});
  const history = useHistory();
  const [summaryData, setSummaryData] = useState({});

  useEffect(() => {
    return () => {
      props.setHindsightBubbleGraphData({});
    };
  }, []);

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.bubble_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    filtersConfig.current["graphFilters"] = {};
    filtersConfig.current["settings"] = {};
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
              props.bubbleGraphFilters
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
              if (
                item.accessor === "x_axis" ||
                item.accessor === "y_axis" ||
                item.accessor === "bubble_size"
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
              if (item.accessor === "bubble_points") {
                item.options = props.treemapFiltersData[
                  "bubble_point_values"
                ]?.map((point) => {
                  return {
                    label:
                      props.levelsJson?.[point] ||
                      props.treemapFiltersData?.[
                        "filter_keys_with_display_name"
                      ]?.[point],
                    value: point,
                    id: point,
                  };
                });
              }
            });
          }
          const accessKey = filterKey.includes("filters")
            ? "graphFilters"
            : "settings";
          filtersConfig.current[accessKey][key] = filterConfig;
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

  const configureGraphSummary = (graphData, graphDetails) => {
    const quadrantData = groupBy(graphData, "quadrant");
    const summary = {};
    Object.keys(quadrantData)?.forEach((quadrant) => {
      summary[quadrant] = {};
      let xAxisSummary = 0,
        yAxisSummary = 0,
        bubbleSizeSummary = 0;
      quadrantData[quadrant]?.forEach((item) => {
        xAxisSummary += item.x_axis;
        yAxisSummary += item.y_axis;
        bubbleSizeSummary += item.bubble_size;
      });
      summary[quadrant] = {
        x_axis: Math.round(xAxisSummary),
        y_axis: Math.round(yAxisSummary),
        bubble_size: Math.round(bubbleSizeSummary),
      };
    });
    setSummaryData(summary);
  };

  useEffect(() => {
    const configureBubbleGraphData = () => {
      const graphData = props.bubbleGraphData?.data;
      configureGraphSummary(graphData, props.bubbleGraphData?.graph_details);
      const groupData = groupBy(graphData, "bubble_color_grp");
      const seriesData = [];
      const colors = [
        "red",
        "blue",
        "green",
        "yellow",
        "pink",
        "brown",
        "black",
        "orange",
      ]; //TODO: to be replaced later
      let colorIndex = 0;
      for (const colorGrp in groupData) {
        const seriesObj = {
          data: [],
        };
        for (const bubbleObj of groupData[colorGrp]) {
          seriesObj.data.push({
            x: bubbleObj.x_axis,
            y: bubbleObj.y_axis,
            z: bubbleObj.bubble_size,
            bubble_points: bubbleObj.bubble_points,
            colorGroup: colorGrp,
            xAxisLabel: props.bubbleGraphData?.graph_details?.x_axis,
            yAxisLabel: props.bubbleGraphData?.graph_details?.y_axis,
            bubbleSizeName: props.bubbleGraphData?.graph_details?.bubble_size,
          });
        }
        seriesObj["color"] = colors[colorIndex];
        colorIndex++;
        seriesData.push(seriesObj);
      }
      const xAxisThreshold =
        props.bubbleGraphData?.data?.[0]?.x_axis_thrshold_line;
      const yAxisThreshold =
        props.bubbleGraphData?.data?.[0]?.y_axis_thrshold_line;
      const options = {
        chartType: "bubble",
        chartTitle: "",
        xAxis: {
          gridLineWidth: 1,
          title: {
            text: `${props.bubbleGraphData?.graph_details?.x_axis}`,
          },
          labels: {
            formatter: function () {
              if (this.value > 1000000) {
                return this.value / 1000000 + "M";
              }
              if (this.value > 100000) {
                return this.value / 100000 + "K";
              }
              return this.value;
            },
          },
          plotLines: [
            {
              color: "black",
              dashStyle: "dot",
              width: 2,
              value: xAxisThreshold,
              zIndex: 3,
            },
          ],
        },
        yAxis: {
          startOnTick: false,
          endOnTick: false,
          title: {
            text: `${props.bubbleGraphData?.graph_details?.y_axis}`,
          },
          labels: {
            formatter: function () {
              if (this.value > 1000000) {
                return this.value / 1000000 + "M";
              }
              if (this.value > 100000) {
                return this.value / 100000 + "K";
              }
              return this.value;
            },
          },
          maxPadding: 0.2,
          plotLines: [
            {
              color: "black",
              dashStyle: "dot",
              width: 2,
              value: yAxisThreshold,
              zIndex: 3,
            },
          ],
        },
        tooltip: {
          formatter: function () {
            let xAxisValue =
              this.point.x > 1000000
                ? (this.point.x / 1000000).toFixed(2) + "M"
                : this.point.x > 100000
                ? (this.point.x / 100000).toFixed(2) + "K"
                : this.point.x.toFixed(2);
            let yAxisValue =
              this.point.y > 1000000
                ? (this.point.y / 1000000).toFixed(2) + "M"
                : this.point.y > 100000
                ? (this.point.y / 100000).toFixed(2) + "K"
                : this.point.y.toFixed(2);

            let tooltip =
              "Bubble Point: " +
              this.point.bubble_points +
              "<br/>" +
              "Bubble Color Group: " +
              this.point.colorGroup +
              "<br/>" +
              this.point.xAxisLabel +
              ": " +
              xAxisValue +
              "<br/>" +
              this.point.yAxisLabel +
              ": " +
              yAxisValue +
              "<br/>" +
              this.point.bubbleSizeName +
              ": " +
              this.point.z;
            return tooltip;
          },
        },
        series: seriesData,
      };
      props.setBubbleGraphLoader(false);
      setbubbleGraphOptions(options);
    };
    if (!isEmpty(props.bubbleGraphData)) {
      configureBubbleGraphData();
    }
  }, [props.bubbleGraphData]);

  return (
    <Card className={globalClasses.paper} id="bubble-graph">
      <LoadingOverlay loader={props.bubbleGraphLoader}>
        <HindsightGraphHeader
          filtersConfig={filtersConfig.current}
          tabValues={tabValues.current}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateBubbleGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          setGraphFilters={props.setBubbleGraphFilters}
          graphFilters={props.bubbleGraphFilters}
          heading={"Bubble Graph"}
          graphType={"bubble"}
        />

        {!isEmpty(bubbleGraphOptions) && (
          <Grid container direction="row" justifyContent="space-between">
            <Grid Item xs={8}>
              <Charts options={bubbleGraphOptions} />
            </Grid>
            <Grid Item xs={4}>
              <Card className={classes.kpiCardContainer} id="kpi">
                <div>
                  <Typography
                    variant="h5"
                    gutterBottom
                    style={{ marginBottom: "20px" }}
                  >
                    Graph Summary
                  </Typography>
                </div>
                {!isEmpty(summaryData) &&
                  Object.keys(summaryData)?.map((item) => {
                    return (
                      <>
                        <Typography
                          variant="body1"
                          style={{ marginBottom: "5px" }}
                        >
                          {item}
                        </Typography>
                        <div className={classes.graphSummaryContainer}>
                          <div className={classes.graphSummaryDiv}>
                            <p className={classes.graphSummaryLabel}>
                              {summaryData?.[item]?.x_axis}
                            </p>
                            <p>
                              {props.bubbleGraphData?.graph_details?.x_axis}
                            </p>
                          </div>
                          <div className={classes.graphSummaryDiv}>
                            <p className={classes.graphSummaryLabel}>
                              {summaryData?.[item]?.y_axis}
                            </p>
                            <p>
                              {props.bubbleGraphData?.graph_details?.y_axis}
                            </p>
                          </div>
                          <div className={classes.graphSummaryDiv}>
                            <p className={classes.graphSummaryLabel}>
                              {summaryData?.[item]?.bubble_size}
                            </p>
                            <p>
                              {
                                props.bubbleGraphData?.graph_details
                                  ?.bubble_size
                              }
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })}
              </Card>
            </Grid>
          </Grid>
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
    bubbleGraphData: HindsightServiceActions.setHindsightBubbleGraphSelector(
      state
    ),
    bubbleGraphLoader: HindsightServiceActions.setBubbleGraphLoaderSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
  getAllFilters,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightBubbleGraphComponent);
