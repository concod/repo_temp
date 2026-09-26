import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { configureGraphFilters } from "./hindsight-functions";
import { setSizeGraphLoader,getHindsightGraphDownload } from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { graphColors } from "modules/assortsmart/constants-assortsmart/stringContants";
import { getAllFilters } from "core/actions/filterAction";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightSizeGraphComponent = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();
  const [sizeGraphOptions, setSizeGraphOptions] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const tabValues = useRef({}); 
 const [chartRef, setChartRef] = useState(null);
  const [filtersConfig, setFiltersConfig] = useState({});

  const configureSizeGraphFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.size_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "size_review",
      props.sizeGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    configureSizeGraphFilters();
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
        props.sizeGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "size_review",
        props.addSnack
      );
    }
  };

  useEffect(() => {
    if (!isEmpty(props.sizeGraphData)) {
      const graphData = props.sizeGraphData?.data;
      const graphDetails = props.sizeGraphData?.graph_details;
      const settingsData = props.sizeGraphFilters;
      const sizeData = graphData?.filter((item) => {
        return item["ty_" + settingsData?.y_axis + "_cum_percent"] <= 80;
      });
      const xAxisData = sizeData?.map((item) => {
        return replaceSpecialCharacter(item?.x_axis);
      });
      const yAxisDataTy = sizeData.map((data) => {
        return data["ty_" + settingsData?.y_axis] || 0;
      });
      const yAxisDataLy = sizeData?.map((data) => {
        return data["ly_" + settingsData?.y_axis] || 0;
      });
      const marginDataTy = sizeData?.map((data) => {
        return data["ty_margin_percent"] * 100;
      });
      const marginDataLy = sizeData?.map((data) => {
        return data["ly_margin_percent"] * 100;
      });

      const seriesData = [
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1]
              : props.hindsightFilterSelection?.season?.[0]) +
            " " +
            props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
              settingsData?.y_axis
            ],
          data: yAxisDataTy,
          type: "column",
          color: graphColors?.[0]["column1"],
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
              settingsData?.y_axis
            ],
          data: yAxisDataLy,
          type: "column",
          color: graphColors?.[0]["column2"],
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] +
                " " +
                graphDetails?.season?.split(" ")[1]
              : props.hindsightFilterSelection?.season?.[0]) + " Margin",
          data: marginDataTy,
          type: "spline",
          yAxis: 1,
          color: graphColors?.[1]["line1"],
        },
        {
          name:
            (parseInt(graphDetails?.compare_year)
              ? props.hindsightFilterSelection?.year[0] -
                1 +
                " " +
                graphDetails?.season?.split(" ")[1]
              : graphDetails?.last_season) + " Margin",
          data: marginDataLy,
          type: "spline",
          yAxis: 1,
          color: graphColors?.[1]["line2"],
        },
      ];

      const options = {
        chartTitle: "",
        chartType: "barLineChart",
        graphType: "size_review",
        axisLegends: {
          xaxis: {
            title: {
              text: graphDetails?.x_axis,
            },
            categories: xAxisData,
          },
          yaxis: {
            primaryAxisLable: "",
            primaryAxisTitle:
              props.treemapFiltersData["filter_keys_with_display_name"]?.[
                settingsData?.y_axis
              ],
            secondaryAxisTitle:
              props.treemapFiltersData["filter_keys_with_display_name"]?.[
                graphDetails?.y_axis_secondary
              ],
            secondaryAxisLable: "{value}%",
            color: "black",
            max: 100,
            min: 0,
            gridLineColor: "transparent",
          },
        },
        series: seriesData,
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
            if (this.point.series.name?.includes("Margin")) {
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
      setSizeGraphOptions(options);
      props.setSizeGraphLoader(false);
      if (graphSettingChanged) {
        setGraphSettingChanged(false);
      }
    }
  }, [props.sizeGraphData, graphSettingChanged]);

  return (
    <Card
      className={`${globalClasses.paper} ${classes.paperPadding} ${classes.hindsightGraphCard}`}
      id="size-graph"
    >
      <LoadingOverlay loader={props.sizeGraphLoader} spinner>
        {filtersConfig && (
          <HindsightGraphHeader
            filtersConfig={filtersConfig || {}}
            tabValues={tabValues.current || {}}
            screenConfiguration={props.screenConfiguration}
            generateGraphData={(payload) =>
              props.generateSizeGraphData(payload)
            }
            hindsightFilterSelection={props.hindsightFilterSelection}
            graphFilters={props.sizeGraphFilters}
            setGraphFilters={props.setSizeGraphFilters}
            heading={"Size Level Graph"}
            graphType={"size_review"}
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
        )}
        {!isEmpty(sizeGraphOptions) &&
        sizeGraphOptions.series[0].data.length > 0 &&
        sizeGraphOptions.series[1].data.length > 0 &&
        sizeGraphOptions.series[2].data.length > 0 &&
        sizeGraphOptions.series[3].data.length > 0 ? (
          <Charts
            screen={"hindsight-assort"}
            handleChartRef={handleChartRef}
            options={sizeGraphOptions}
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
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
    sizeGraphData: HindsightServiceActions.setHindsightSizeGraphSelector(state),
    sizeGraphLoader: HindsightServiceActions.setSizeLoaderSelector(state),
  };
};

const mapActionsToProps = {
  getAllFilters,
  addSnack,
  getHindsightGraphDownload,
  setSizeGraphLoader,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightSizeGraphComponent);
