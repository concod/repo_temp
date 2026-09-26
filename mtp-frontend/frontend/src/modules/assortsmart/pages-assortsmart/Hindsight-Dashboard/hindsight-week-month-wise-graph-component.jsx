import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card } from "@mui/material";
import theme from "core/Styles/theme";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getAllFilters } from "core/actions/filterAction";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  setHindsightLoader,
  getHindsightTreemapFilters,
  getHindsightGraphDownload
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { configureGraphFilters } from "./hindsight-functions";
import { graphColors } from "modules/assortsmart/constants-assortsmart/stringContants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightWeekMothComparisonGraphComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const tabValues = useRef({});
  const history = useHistory();
  const [timelineGraphOptions, setTimelineGraphOptions] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [filtersConfig, setFiltersConfig] = useState({});
  const [chartRef, setChartRef] = useState(null);

  const configureTimelineGraphFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.timeline_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "timeline",
      props.weekMonthComparisonGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

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
        props.weekMonthComparisonGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "timeline",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    configureTimelineGraphFilters();
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.hindsightTimelineGraphData) &&
      !isEmpty(props.weekMonthComparisonGraphFilters)
    ) {
      const graphData = props.hindsightTimelineGraphData?.data?.data;
      const graphDetails =
        props.hindsightTimelineGraphData?.data?.graph_details;
      const settingsData = props.weekMonthComparisonGraphFilters;
      const xAxisData = graphData?.map((item) => {
        return replaceSpecialCharacter(item.x_axis);
      });
      const tyData = graphData?.map((item) => {
        return item["ty_" + settingsData?.review_metric];
      });
      const lyData = graphData?.map((item) => {
        return item["ly_" + settingsData?.review_metric];
      });
      let seriesData = [
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1]
              : props.hindsightFilterSelection?.season?.[0]) +
            " " +
            props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
              settingsData?.review_metric
            ],
          data: tyData,
          marker: {
            fillColor: "transparent",
            lineColor: theme.palette.graphColours[0],
          },
          color: graphColors?.[1]["line2"],
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                graphDetails?.season?.split(" ")[1]
              : graphDetails?.last_season) +
            " " +
            props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
              settingsData?.review_metric
            ],
          data: lyData,
          marker: {
            fillColor: "transparent",
            lineColor: theme.palette.graphColours[1],
          },
          color: graphColors?.[1]["line1"],
        },
      ];
      const chartOptions = {
        type: "line",
        chartType: "multiLineChart",
        screen: "hindsight",
        chartTitle: "",
        axisLegends: {
          xaxis: {
            title:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                graphDetails?.x_axis
              ],
            categories: xAxisData,
          },
          yaxis: {
            title:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.review_metric
              ],
          },
        },
        tooltip: {
          formatter: function () {
            let tooltip = "";
            let name = this.point?.series?.name;
            let yValue =
              this.point.y > 1000000
                ? (this.point?.y / 1000000).toFixed(2) + "M"
                : this.point?.y > 1000
                ? (this.point?.y / 1000).toFixed(2) + "K"
                : this.point?.y.toFixed(2);
            if (this.point?.series?.name?.includes("Margin")) {
              yValue = yValue + "%";
            }
            tooltip = tooltip + name + " : " + yValue + "<br/>";
            return tooltip;
          },
        },
        series: seriesData,
        hideLabels: true,
        marker: "none",
        legend: {
          itemStyle: {
            fontSize: "14px",
          },
          layout: "vertical",
          align: "right",
          verticalAlign: "middle",
          borderWidth: 0,
          showInLegend: false,
        },
      };
      setTimelineGraphOptions(chartOptions);
      if (graphSettingChanged) {
        setGraphSettingChanged(false);
      }
    }
  }, [props.hindsightTimelineGraphData, graphSettingChanged]);

  return (
    <LoadingOverlay loader={props.timelineGraphLoader} spinner>
      {filtersConfig && (
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || []}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateWeekMonthComparisonData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.weekMonthComparisonGraphFilters}
          setGraphFilters={props.setWeekMonthComparisonGraphFilters}
          heading={"Performance by Week/Month wise Comparison"}
          graphType={"timeline"}
          setGraphSettingChanged={setGraphSettingChanged}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
          tempHide = {true} //temporary until download excel not implemented
        />
      )}
      {!isEmpty(timelineGraphOptions) &&
      timelineGraphOptions.series[0].data.length > 0 &&
      timelineGraphOptions.series[1].data.length > 0 ? (
        <Charts
          handleChartRef={handleChartRef}
          options={timelineGraphOptions}
        />
      ) : (
        <p className={classes.NoDataText}>
          No data Present for Selected Filters
        </p>
      )}
    </LoadingOverlay>
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
    hindsightTreemapData: HindsightServiceActions.setHindsightTreemapSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    timelineGraphLoader: HindsightServiceActions.setTimelineGraphLoaderSelector(
      state
    ),
    hindsightTimelineGraphData: HindsightServiceActions.setHindsightTimelineGraphSelector(
      state
    ),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  getAllFilters,
  addSnack,
  setHindsightLoader,
  getHindsightGraphDownload,
  getHindsightTreemapFilters,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightWeekMothComparisonGraphComponent);
