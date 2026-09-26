import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { cloneDeep, groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  setParetoGraphLoader,
  setHindsightParetoGraphData,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { getAllFilters } from "core/actions/filterAction";
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import { graphColors } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  clearanceData,
  carryoverData,
  xAxisDataParetoGraph,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { configureGraphFilters } from "./hindsight-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindisghtParetoGraphComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [paretoGraphOptions, setParetoGraphOptions] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const tabValues = useRef({});
  const [filtersConfig, setFiltersConfig] = useState({});
  const [chartRef, setChartRef] = useState(null);
  const history = useHistory();

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.pareto_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "pareto",
      props.paretoGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    if (
      !isEmpty(props.screenConfiguration) &&
      !isEmpty(props.treemapFiltersData)
    ) {
      configureFilters();
    }
  }, [props.screenConfiguration, props.treemapFiltersData]);

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  // ! Changes Made
  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({ type: "image/jpeg" });
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({ type: "application/pdf" });
    } else if (format === "excel") {
      downloadAsExcel(
        props.paretoGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "parito_graph",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.paretoGraphData)) {
      let graphData = cloneDeep(props.paretoGraphData?.data);
      const settingsData = props.paretoGraphFilters;
      graphData = graphData?.sort((a, b) => {
        return b[settingsData?.y_axis] - a[settingsData?.y_axis];
      });
      const yThreshold = parseInt(
        props.paretoGraphData?.graph_details?.axis_threshold
      );
      const yAxisSecondaryLabel = settingsData?.y_axis_secondary;
      const yAxisLabel =
        props.treemapFiltersData?.["filter_keys_with_display_name"][
          settingsData?.y_axis
        ];
      const xAxisLabel = props.paretoGraphData?.graph_details?.x_axis;
      const secondaryYLabel =
        props.treemapFiltersData?.["filter_keys_with_display_name"][
          settingsData?.y_axis_secondary
        ];
      const xAxisData = [],
        yAxisData = [],
        yAxisSecondaryDataMapping = [],
        yAxisSecondaryData = [],
        yAxisCumData = [];
      let yAxisSum = 0;
      graphData?.forEach((item) => {
        let dataMapping = {};
        xAxisData.push(replaceSpecialCharacter(item.x_axis));
        yAxisData.push(item?.[settingsData?.y_axis]);
        yAxisSecondaryData.push(item?.[settingsData?.y_axis_secondary]);
        yAxisCumData.push(
          item?.[
            settingsData?.y_axis +
              "_prim_y_" +
              settingsData?.y_axis_secondary +
              "_sec_y_cum_per"
          ]
        );
        dataMapping = {
          x_axis: item.x_axis,
          y_axis_primary: item?.[settingsData?.y_axis],
          y_axis_cum_percent:
            item?.[
              settingsData?.y_axis +
                "_prim_y_" +
                settingsData?.y_axis_secondary +
                "_sec_y_cum_per"
            ],
          y_axis_secondary: item?.[settingsData?.y_axis_secondary],
        };
        yAxisSecondaryDataMapping.push(dataMapping);
        yAxisSum += item?.[settingsData?.y_axis];
      });
      const thresholdData = Math.round((yThreshold * yAxisSum) / 100);
      let xAxisIndex = 0,
        cummulativeSum = 0;
      let yAxisThreshold = 0;
      for (const dataObj of yAxisSecondaryDataMapping) {
        if (dataObj.y_axis_cum_percent >= yThreshold) {
          yAxisThreshold = dataObj.y_axis_cum_percent;
          break;
        }
      }
      for (let index = 0; index < graphData?.length; index++) {
        if (
          graphData[index]?.[
            settingsData?.y_axis +
              "_prim_y_" +
              settingsData?.y_axis_secondary +
              "_sec_y_cum_per"
          ]?.toFixed(2) >= yThreshold
        ) {
          xAxisIndex = index;
          break;
        }
      }
      const options = {
        chartType: "barLineChart",
        chartTitle: "",
        screen: "hindsight",
        axisLegends: {
          xaxis: {
            categories: xAxisData,
            title: {
              text: `${
                props.levelsJson[xAxisLabel] ||
                props.treemapFiltersData["filter_keys_with_display_name"][
                  xAxisLabel
                ]
              }`,
            },
            plotLines: [
              {
                color: "#5218fa",
                width: 3,
                dashStyle: "dash",
                value: xAxisIndex,
              },
            ],
          },
          yaxis: {
            primaryAxisLable: "",
            secondaryAxisTitle: secondaryYLabel,
            primaryAxisTitle: yAxisLabel,
            secondaryAxisLable: "{value}%",
            color: "black",
            max: 100,
            min: 0,
            gridLineColor: "transparent",
            plotLines: [
              {
                color: graphColors?.[1]?.["line2"],
                width: 3,
                dashStyle: "dash",
                value: yAxisThreshold,
              },
            ],
          },
        },
        series: [
          {
            name: `${yAxisLabel}`,
            type: "column",
            zIndex: 2,
            data: yAxisData,
            color: graphColors?.[0]?.["column2"],
          },
          {
            name: `${props.treemapFiltersData?.["filter_keys_with_display_name"][yAxisSecondaryLabel]}`,
            data: yAxisCumData,
            type: "spline",
            color: graphColors?.[0]?.["line2"],
            yAxis: 1,
            zIndex: 10,
          },
        ],
        tooltip: {
          formatter: function () {
            let tooltip = "";
            let primaryLabel = yAxisLabel;
            let xValue = this?.x;
            let res = yAxisSecondaryDataMapping.filter(
              (item) =>
                replaceSpecialCharacter(item.x_axis) ===
                replaceSpecialCharacter(xValue)
            )?.[0];
            let primaryYValue =
              res?.y_axis_primary > 1000000
                ? (res?.y_axis_primary / 1000000).toFixed(2) + "M"
                : res?.y_axis_primary > 1000
                ? (res?.y_axis_primary / 1000).toFixed(2) + "K"
                : res?.y_axis_primary?.toFixed(2);
            let secondaryYValue =
              res?.y_axis_secondary > 1000000
                ? (res?.y_axis_secondary / 1000000).toFixed(2) + "M"
                : res?.y_axis_secondary > 1000
                ? (res?.y_axis_secondary / 1000).toFixed(2) + "K"
                : res?.y_axis_secondary?.toFixed(2);
            let secondaryYCumValue = res?.y_axis_cum_percent?.toFixed(2) + " %";
            tooltip =
              xValue +
              "<br/>" +
              primaryLabel +
              ": " +
              primaryYValue +
              "<br/>" +
              secondaryYLabel +
              ": " +
              secondaryYValue +
              "<br/>" +
              secondaryYLabel +
              " Cum" +
              ": " +
              secondaryYCumValue;
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
        secondaryData: yAxisSecondaryDataMapping,
        yAxisLabel: yAxisLabel,
        secondaryCumYLabel: secondaryYLabel,
        secondaryYLabel: secondaryYLabel,
      };
      setParetoGraphOptions(options);
      props.setParetoGraphLoader(false);
      if (graphSettingChanged) {
        setGraphSettingChanged(false);
      }
    }
  }, [props.paretoGraphData, graphSettingChanged]);

  return (
    <Card
      className={`${globalClasses.paper} ${classes.hindsightGraphCard} ${
        props.isGraphExpand ? "" : classes.graphCardHeight
      } ${classes.paperPadding}`}
      id="pareto-graph"
    >
      <LoadingOverlay loader={props.paretoGraphLoader}>
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
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
          graphLevelClass={`${props.graphLevelClass}`}
          handleGraphExpand={props.handleGraphExpand}
          isGraphExpand={props.isGraphExpand}
          graphSettingChanged={graphSettingChanged}
          setGraphSettingChanged={setGraphSettingChanged}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
        />
        {!isEmpty(paretoGraphOptions) &&
        paretoGraphOptions.series[0].data.length > 0 &&
        paretoGraphOptions.series[1].data.length > 0 ? (
          <Charts
            handleChartRef={handleChartRef}
            screen={"hindsight-assort"}
            options={paretoGraphOptions}
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
  addSnack,
  setHindsightParetoGraphData,
  getHindsightGraphDownload,
  getAllFilters,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindisghtParetoGraphComponent);
