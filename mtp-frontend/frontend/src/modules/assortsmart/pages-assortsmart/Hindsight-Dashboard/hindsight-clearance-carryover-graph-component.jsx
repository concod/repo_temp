import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  setClearanceCarryoverGraphLoader,
  setHindsightClearanceCarryoverGraphData,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { addSnack } from "core/actions/snackbarActions";
import {
  configureFilters,
  configureGraphFilters,
  downloadAsExcel,
} from "./hindsight-functions";
import { getAllFilters } from "core/actions/filterAction";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  bubbleColor,
  carryoverData,
  clearanceData,
  graphColors,
  comaprisonMetric,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const HindsightClearanceCarryoverGraphComponent = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();
  const [clearanceGraphOptions, setClearanceGraphOptions] = useState({});
  const [filtersConfig, setFiltersConfig] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [chartRef, setChartRef] = useState(null);
  const tabValues = useRef({});

  const configureClearanceFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.clearance_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfigData = await configureGraphFilters(
      hindsightValues,
      "clearance",
      props.clearanceGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfigData);
  };

  useEffect(() => {
    configureClearanceFilters();
  }, []);

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({ type: "image/jpeg" });
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({ type: "application/pdf" });
    } else if (format === "excel") {
      downloadAsExcel(
        props.clearanceGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "clearance",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.clearanceData)) {
      const graphData = props.clearanceData?.data;
      const graphDetails = props.clearanceData?.graph_details;
      const settingsData = props.clearanceGraphFilters;
      const dataMapping = [];
      let mappingObj = {};

      const thisYearLabel = graphDetails?.compare_season?.length
        ? graphDetails?.season + " "
        : props.hindsightFilterSelection?.year[0] +
          " " +
          graphDetails?.season?.split(" ")[1] +
          " ";
      const lastYearLabel = graphDetails?.compare_season?.length
        ? graphDetails?.last_season + " "
        : props.hindsightFilterSelection?.year[0] -
          1 +
          " " +
          graphDetails?.season?.split(" ")[1] +
          " ";
      const yAxisLabel =
        props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
          settingsData?.y_axis
        ];
      const ccAttributeLabel =
        settingsData?.cc_attribute?.charAt(0)?.toUpperCase() +
        settingsData?.cc_attribute?.slice(1);
      const regularOrNewLabel =
        settingsData?.cc_attribute === "carryover" ? "new" : "regular";
      const regularOrNewLabelFormatted =
        regularOrNewLabel?.charAt(0)?.toUpperCase() +
        regularOrNewLabel?.slice(1);

      const xAxisData = graphData?.map((item) => {
        return replaceSpecialCharacter(item.x_axis);
      });
      graphData?.forEach((item) => {
        mappingObj = {};
        mappingObj["x_axis"] = replaceSpecialCharacter(item.x_axis);
        mappingObj[thisYearLabel + ccAttributeLabel + " " + yAxisLabel] =
          item["ty_" + settingsData?.y_axis + "_" + settingsData?.cc_attribute];
        mappingObj[lastYearLabel + ccAttributeLabel + " " + yAxisLabel] =
          item["ly_" + settingsData?.y_axis + "_" + settingsData?.cc_attribute];
        mappingObj[
          thisYearLabel + regularOrNewLabelFormatted + " " + yAxisLabel
        ] = item["ty_" + settingsData?.y_axis + "_" + regularOrNewLabel];
        mappingObj[
          lastYearLabel + regularOrNewLabelFormatted + " " + yAxisLabel
        ] = item["ly_" + settingsData?.y_axis + "_" + regularOrNewLabel];
        dataMapping.push(mappingObj);
      });
      const yAxisClearanceDataTY = graphData?.map((item) => {
        return (
          item[
            "ty_" +
              settingsData?.y_axis +
              "_" +
              settingsData?.cc_attribute +
              "_percent"
          ] * 100
        );
      });
      const yAxisClearanceDataLY = graphData?.map((item) => {
        dataMapping[lastYearLabel + " " + ccAttributeLabel + " " + yAxisLabel] =
          item["ly_" + settingsData?.y_axis + "_" + settingsData?.cc_attribute];
        return (
          item[
            "ly_" +
              settingsData?.y_axis +
              "_" +
              settingsData?.cc_attribute +
              "_percent"
          ] * 100
        );
      });
      const yAxisRegularDataTY = graphData?.map((item) => {
        return (
          item[
            "ty_" + settingsData?.y_axis + "_" + regularOrNewLabel + "_percent"
          ] * 100
        );
      });
      const yAxisRegularDataLY = graphData?.map((item) => {
        return (
          item[
            "ly_" + settingsData?.y_axis + "_" + regularOrNewLabel + "_percent"
          ] * 100
        );
      });
      const yAxisSecondaryDataTY = graphData?.map((item) => {
        return item["ty_" + graphDetails?.y_axis_secondary] * 100;
      });
      const yAxisSecondaryDataLY = graphData?.map((item) => {
        return item["ly_" + graphDetails?.y_axis_secondary] * 100;
      });
      let chartOptions = {
        chartTitle: "",
        chartType: "barLineChart",
        screen: "hindsight",
        axisLegends: {
          xaxis: {
            title: {
              text:
                props.levelsJson[graphDetails?.x_axis] ||
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  graphDetails?.x_axis
                ],
            },
            categories: xAxisData,
          },
          yaxis: {
            primaryAxisLable: "{value}%",
            primaryAxisTitle:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.y_axis
              ],
            secondaryAxisTitle:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                graphDetails?.y_axis_secondary
              ],
            secondaryAxisLable: "{value}%",
            color: "black",
            max: 100,
            min: 0,
            gridLineColor: "transparent",
          },
        },
        series: [
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.season +
                " " +
                settingsData?.cc_attribute?.charAt(0)?.toUpperCase() +
                settingsData?.cc_attribute?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ]
              : props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                settingsData?.cc_attribute?.charAt(0)?.toUpperCase() +
                settingsData?.cc_attribute?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ],
            data: yAxisClearanceDataTY,
            type: "column",
            color: graphColors?.[0]["column1"],
            stack: "stack1",
            yAxis: 1,
          },
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.season +
                " " +
                regularOrNewLabel?.charAt(0)?.toUpperCase() +
                regularOrNewLabel?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ]
              : props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                regularOrNewLabel?.charAt(0)?.toUpperCase() +
                regularOrNewLabel?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ],
            data: yAxisRegularDataTY,
            type: "column",
            color: "#87cefa",
            stack: "stack1",
            yAxis: 1,
          },
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.last_season +
                " " +
                settingsData?.cc_attribute?.charAt(0)?.toUpperCase() +
                settingsData?.cc_attribute?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ]
              : props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                settingsData?.cc_attribute?.charAt(0)?.toUpperCase() +
                settingsData?.cc_attribute?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ],
            data: yAxisClearanceDataLY,
            type: "column",
            color: graphColors?.[0]["column2"],
            stack: "stack2",
            yAxis: 1,
          },
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.last_season +
                " " +
                regularOrNewLabel?.charAt(0)?.toUpperCase() +
                regularOrNewLabel?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ]
              : props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                regularOrNewLabel?.charAt(0)?.toUpperCase() +
                regularOrNewLabel?.slice(1) +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  settingsData?.y_axis
                ],
            data: yAxisRegularDataLY,
            type: "column",
            color: "#ffae42",
            stack: "stack2",
            yAxis: 1,
          },
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.season +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  graphDetails?.y_axis_secondary
                ]
              : props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  graphDetails?.y_axis_secondary
                ],
            type: "spline",
            color: graphColors?.[1]["line1"],
            data: yAxisSecondaryDataTY,
            tooltip: {
              valueSuffix: "%",
            },
            yAxis: 1,
          },
          {
            name: graphDetails?.compare_season?.length
              ? graphDetails?.last_season +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  graphDetails?.y_axis_secondary
                ]
              : props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                graphDetails?.season?.split(" ")[1] +
                " " +
                props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                  graphDetails?.y_axis_secondary
                ],
            data: yAxisSecondaryDataLY,
            type: "spline",
            color: graphColors?.[1]["line2"],
            tooltip: {
              valueSuffix: "%",
            },
            yAxis: 1,
          },
        ],
        tooltip: {
          // shared: true,
          formatter: function () {
            let tooltip = "";
            // this.points?.forEach((point) => {
            let name = this.point?.series?.name;
            let yValue =
              this.point?.y > 1000000
                ? (this.point?.y / 1000000).toFixed(2) + "M"
                : this.point?.y > 1000
                ? (this.point?.y / 1000).toFixed(2) + "K"
                : this.point?.y.toFixed(2);
            if (this.point?.series?.name?.includes("Margin")) {
              yValue = yValue + "%";
            }
            if (!name?.includes("Margin")) {
              const currentTooltipObj = dataMapping.filter((item) => {
                if (item.x_axis === this.x) {
                }
                return item.x_axis === this.x;
              })?.[0];
              let yValueOriginal = currentTooltipObj[name];
              yValueOriginal =
                yValueOriginal > 1000000
                  ? (yValueOriginal / 1000000)?.toFixed(2) + "M"
                  : yValueOriginal > 1000
                  ? (yValueOriginal / 1000)?.toFixed(2) + "K"
                  : yValueOriginal?.toFixed(2);
              tooltip =
                name +
                " Percent: " +
                yValue +
                "%" +
                "<br/>" +
                name +
                ": " +
                yValueOriginal;
            } else {
              tooltip = tooltip + name + " : " + yValue + "<br/>";
            }
            // });
            return tooltip;
          },
        },
        show_secondary_axis: true,
        exporting: {
          buttons: {
            contextButton: {
              enabled: false,
            },
          },
        },
        stackedChart: true,
      };
      setClearanceGraphOptions(chartOptions);
      props.setClearanceCarryoverGraphLoader(false);
      if (graphSettingChanged) {
        setGraphSettingChanged(false);
      }
    }
  }, [props.clearanceData, graphSettingChanged]);
  return (
    <Card
      className={`${globalClasses.paper} ${classes.hindsightGraphCard} ${
        props.isGraphExpand ? "" : classes.graphCardHeight
      } ${classes.paperPadding}`}
      id="clearance-graph"
    >
      <LoadingOverlay loader={props.clearanceLoader} spinner>
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || {}}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateClearanceGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.clearanceGraphFilters}
          setGraphFilters={props.setClearanceGraphFilters}
          heading={"Clearance and Carryover Graph"}
          graphType={"clearance"}
          graphSettingChanged={graphSettingChanged}
          setGraphSettingChanged={setGraphSettingChanged}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
          tempHide = {true} //temporary until download excel not implemented
        />
        {!isEmpty(clearanceGraphOptions) &&
        clearanceGraphOptions.series[0].data.length > 0 &&
        clearanceGraphOptions.series[1].data.length > 0 &&
        clearanceGraphOptions.series[2].data.length > 0 &&
        clearanceGraphOptions.series[3].data.length > 0 &&
        clearanceGraphOptions.series[4].data.length > 0 &&
        clearanceGraphOptions.series[5].data.length > 0 ? (
          <Charts
            handleChartRef={handleChartRef}
            options={clearanceGraphOptions}
          />
        ) : (
          <p className={classes.NoDataText}>
            No data Present for Selected Filters
          </p>
        )}
      </LoadingOverlay>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    clearanceData: HindsightServiceActions.setHindsightClearanceCarryoverGraphSelector(
      state
    ),
    clearanceLoader: HindsightServiceActions.setClearanceCarryoverLoaderSelector(
      state
    ),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  setHindsightClearanceCarryoverGraphData,
  addSnack,
  setClearanceCarryoverGraphLoader,
  getHindsightGraphDownload,
  getAllFilters,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightClearanceCarryoverGraphComponent);
