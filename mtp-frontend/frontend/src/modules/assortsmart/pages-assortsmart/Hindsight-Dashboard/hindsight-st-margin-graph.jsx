import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Card } from "@mui/material";
import Charts from "core/Utils/charts";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { isEmpty } from "lodash";
import { getAllFilters } from "core/actions/filterAction";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { configureGraphFilters } from "./hindsight-functions";
import LoadingOverlay from "core/Utils/Loader/loader";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  setSTMarginGraphLoader,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { graphColors } from "modules/assortsmart/constants-assortsmart/stringContants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightSTMarginGraphComponent = (props) => {
  const [graphOptions, setGraphOptions] = useState({});
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();
  const tabValues = useRef({});
  const [chartRef, setChartRef] = useState(null);
  const [filtersConfig, setFiltersConfig] = useState({});

  const configureSTMarginFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.st_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "STMargin",
      props.stGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    configureSTMarginFilters();
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
        props.stGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "st_margin_graph",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.stMarginData)) {
      const graphData = props.stMarginData?.data;
      const graphDetails = props.stMarginData?.graph_details;
      const xAxisData = graphData?.map((item) => {
        return replaceSpecialCharacter(item.x_axis);
      });
      const quantityData = graphData?.map((item) => {
        return item[graphDetails?.y_axis];
      });
      const receiptsData = graphData?.map((item) => {
        return item[graphDetails?.y_axis_secondary];
      });
      const marginData = graphData?.map((item) => {
        return item[graphDetails?.line_y] * 100;
      });
      const stData = graphData?.map((item) => {
        return item[graphDetails?.line_y_sec] || item["ST"] * 100;
      });

      let options = {
        chartTitle: "",
        chartType: "barLineChart",
        screen: "hindsight",
        axisLegends: {
          xaxis: {
            title: graphDetails?.x_axis,
            categories: xAxisData,
          },
          yaxis: {
            primaryAxisLable: "",
            secondaryAxisLable: "{value}%",
            color: "black",
            max: 100,
            min: 0,
            gridLineColor: "transparent",
          },
        },
        series: [
          {
            name:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                graphDetails?.y_axis
              ] || "Quantity Sold",
            data: quantityData,
            type: "column",
            color: graphColors?.[0]["column1"],
          },
          {
            name:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                graphDetails?.y_axis_secondary
              ] || "Total Inventory",
            data: receiptsData,
            type: "column",
            color: graphColors?.[0]["column2"],
          },
          {
            name: "Sell Through",
            yAxis: 1,
            type: "spline",
            color: graphColors?.[1]["line1"],
            data: stData,
            tooltip: {
              valueSuffix: "%",
            },
          },
          {
            name: "Margin %",
            data: marginData,
            yAxis: 1,
            type: "spline",
            color: graphColors?.[1]["line2"],
            tooltip: {
              valueSuffix: "%",
            },
          },
        ],
        tooltip: {
          formatter: function () {
            let tooltip = "";
            let name = this.point.series.name;
            let yValue =
              this.point.y > 1000000
                ? (this.point.y / 1000000).toFixed(2) + "M"
                : this.point.y > 1000
                ? (this.point.y / 1000).toFixed(2) + "K"
                : this.point.y.toFixed(2);
            if (
              this.point.series.name?.includes("Margin") ||
              this.point.series?.name?.includes("Sell Through")
            ) {
              yValue = yValue + "%";
            }
            tooltip = tooltip + name + " : " + yValue + "<br/>";
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
      };
      setGraphOptions(options);
      props.setSTMarginGraphLoader(false);
    }
  }, [props.stMarginData]);

  return (
    <LoadingOverlay loader={props.stGraphLoader}>
      {filtersConfig && (
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || {}}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateSTMarginGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.stGraphFilters}
          setGraphFilters={props.setStGraphFilters}
          heading={"Sell through and Margin analysis"}
          graphType={"STMargin"}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
        />
      )}
      {!isEmpty(graphOptions) &&
      graphOptions.series[0].data.length > 0 &&
      graphOptions.series[1].data.length > 0 &&
      graphOptions.series[2].data.length > 0 &&
      graphOptions.series[3].data.length > 0 ? (
        <Charts
          options={graphOptions}
          handleChartRef={handleChartRef}
          screen={"hindsight-assort"}
        />
      ) : (
        <p className={classes.NoDataText}>
          No data Present for Selected Filters
        </p>
      )}
    </LoadingOverlay>
  );

  return (
    <LoadingOverlay loader={props.stGraphLoader}>
      {filtersConfig && (
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || {}}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) =>
            props.generateSTMarginGraphData(payload)
          }
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.stGraphFilters}
          setGraphFilters={props.setStGraphFilters}
          heading={"Sell through and Margin analysis"}
          graphType={"STMargin"}
          handleGraphExpand={(graphType) => props.handleGraphExpand(graphType)}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
        />
      )}
      {!isEmpty(graphOptions) && (
        <Charts options={graphOptions} handleChartRef={handleChartRef} />
      )}
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    stMarginData: HindsightServiceActions.setHindsightSTMarginGraphSelector(
      state
    ),
    stGraphLoader: HindsightServiceActions.setSTMarginLoaderSelector(state),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
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
  setSTMarginGraphLoader,
  getHindsightGraphDownload,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightSTMarginGraphComponent);
