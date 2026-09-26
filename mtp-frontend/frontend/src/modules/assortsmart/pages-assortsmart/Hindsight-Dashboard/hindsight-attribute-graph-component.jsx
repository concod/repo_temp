import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getAllFilters } from "core/actions/filterAction";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  getHindsightTreemapFilters,
  setAttributeGraphLoader,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { configureFilters, configureGraphFilters } from "./hindsight-functions";
import { graphColors } from "modules/assortsmart/constants-assortsmart/stringContants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightAttributeGraphComponent = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();
  const [attributeGraphOptions, setAttributeGraphOptions] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [chartRef, setChartRef] = useState(null);
  const tabValues = useRef({});
  const [filtersConfig, setFiltersConfig] = useState({});

  const configureAttributeFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.attribute_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "attribute",
      props.attributeGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    configureAttributeFilters();
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
        props.attributeGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "attribute",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.attributeGraphData)) {
      const graphData = props.attributeGraphData?.data?.data;
      const graphDetails = props.attributeGraphData?.data?.graph_details;
      const settingsData = props.attributeGraphFilters;
      const xAxisData = graphData?.map((item) => {
        return replaceSpecialCharacter(item.x_axis);
      });
      const tyRevenue = graphData?.map((item) => {
        return item["ty_" + settingsData?.review_metric];
      });
      const lyRevenue = graphData?.map((item) => {
        return item["ly_" + settingsData?.review_metric];
      });
      const tyMargin = graphData?.map((item) => {
        return item["ty_margin"] * 100;
      });
      const lyMargin = graphData?.map((item) => {
        return item["ly_margin"] * 100;
      });
      let seriesData = [
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] +
                " " +
                (graphDetails?.season
                  ? graphDetails?.season?.split(" ")[1]
                  : props.hindsightFilterSelection?.season?.[0]?.split(" ")[1])
              : props.hindsightFilterSelection?.season?.[0]) +
            " " +
            props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
              settingsData?.review_metric
            ],
          data: tyRevenue,
          type: "column",
          color: graphColors?.[0]["column1"],
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                (graphDetails?.season
                  ? graphDetails?.season?.split(" ")[1]
                  : props.hindsightFilterSelection?.season?.[0]?.split(" ")[1])
              : graphDetails?.last_season) +
            " " +
            props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
              settingsData?.review_metric
            ],
          data: lyRevenue,
          type: "column",
          color: graphColors?.[0]["column2"],
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] +
                " " +
                (graphDetails?.season
                  ? graphDetails?.season?.split(" ")[1]
                  : props.hindsightFilterSelection?.season?.[0]?.split(" ")[1])
              : props.hindsightFilterSelection?.season?.[0]) +
            " " +
            "Margin",
          data: tyMargin,
          type: "spline",
          color: graphColors?.[1]["line1"],
          yAxis: 1,
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                (graphDetails?.season
                  ? graphDetails?.season?.split(" ")[1]
                  : props.hindsightFilterSelection?.season?.[0]?.split(" ")[1])
              : graphDetails?.last_season) +
            " " +
            "Margin",
          data: lyMargin,
          type: "spline",
          color: graphColors?.[1]["line2"],
          yAxis: 1,
        },
      ];

      const chartOptions = {
        chartTitle: "",
        chartType: "attribute",
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
          yaxisSecondary: {
            title: "Margin %",
          },
        },
        series: seriesData,
      };
      setAttributeGraphOptions(chartOptions);
      props.setAttributeGraphLoader(false);
      if (graphSettingChanged) {
        setGraphSettingChanged(false);
      }
    }
  }, [props.attributeGraphData, graphSettingChanged]);

  return (
    <LoadingOverlay loader={props.attributeGraphLoader} spinner>
      {filtersConfig && (
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || {}}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateAttributeGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.attributeGraphFilters}
          setGraphFilters={props.setAttributeGraphFilters}
          heading={"Performance by Attribute"}
          graphType={"attribute"}
          graphLevelClass={`${props.graphLevelClass}`}
          setGraphSettingChanged={setGraphSettingChanged}
          handleGraphExpand={props.handleGraphExpand}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
          tempHide = {true} //temporary until download excel not implemented
        />
      )}
      {!isEmpty(attributeGraphOptions) &&
      attributeGraphOptions.series[0].data.length > 0 &&
      attributeGraphOptions.series[1].data.length > 0 &&
      attributeGraphOptions.series[2].data.length > 0 &&
      attributeGraphOptions.series[3].data.length > 0 ? (
        <Charts
          screen={"hindsight-assort"}
          handleChartRef={handleChartRef}
          options={attributeGraphOptions}
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
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    attributeGraphLoader: HindsightServiceActions.setAttributeGraphLoaderSelector(
      state
    ),
    attributeGraphData: HindsightServiceActions.setHindsightAttributeGraphSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  getAllFilters,
  addSnack,
  getHindsightTreemapFilters,
  getHindsightGraphDownload,
  setAttributeGraphLoader,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightAttributeGraphComponent);
