import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { Switch } from "impact-ui";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { getAllFilters } from "core/actions/filterAction";
import { bubbleColor, bubbleGraphDollarMetrics } from "modules/assortsmart/constants-assortsmart/stringContants";
import { configureGraphFilters,downloadAsExcel } from "./hindsight-functions";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const HindsightBubbleGraphComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [bubbleGraphOptions, setbubbleGraphOptions] = useState({});
  const tabValues = useRef({});
  const [filtersConfig, setFiltersConfig] = useState({});
  const history = useHistory();
  const [summaryData, setSummaryData] = useState({});
  const [summaryPercentData, setSummaryPercentData] = useState({});
  const [percentageToggle, setPercentageToggle] = useState(false);
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [chartRef, setChartRef] = useState(null);

  useEffect(() => {
    return () => {
      props.setHindsightBubbleGraphData({});
    };
  }, []);

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({type: "image/jpeg"});
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({type: "application/pdf"});
    } else if (format === "excel") {
      downloadAsExcel(props.bubbleGraphFilters,props.hindsightFilterSelection,props.planCode,props.getHindsightGraphDownload,"bubble_graph",props.addSnack)
    }
  };

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.bubble_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(hindsightValues, "bubble", props.bubbleGraphFilters, history, props);
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    if (
      !isEmpty(props.screenConfiguration) &&
      !isEmpty(props.treemapFiltersData) &&
      !isEmpty(props.bubbleGraphFilters)
    ) {
      configureFilters();
    }
  }, [
    props.screenConfiguration,
    props.treemapFiltersData,
    props.bubbleGraphFilters,
  ]);

  const configureGraphSummary = (graphData) => {
    const quadrantData = groupBy(graphData, "quadrant");
    const xAxis = props.bubbleGraphFilters?.x_axis;
    const yAxis = props.bubbleGraphFilters?.y_axis;
    const bubbleSize = props.bubbleGraphFilters?.bubble_size;
    const summary = {},
      summaryPercent = {};
    let totalXaxisSummary = 0,
      totalYaxisSummary = 0,
      totalBubbleSizeSummary = 0;
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
        x_axis: xAxisSummary,
        y_axis: yAxisSummary,
        bubble_size: bubbleSizeSummary,
      };
      totalXaxisSummary += summary[quadrant]?.x_axis;
      totalYaxisSummary += summary[quadrant]?.y_axis;
      totalBubbleSizeSummary += summary[quadrant]?.bubble_size;
    });
    const summaryData = {};
    Object.keys(quadrantData)?.forEach((quadrant) => {
      summaryData[quadrant] = {
        x_axis:
          summary[quadrant]?.x_axis > 1000000
            ? (bubbleGraphDollarMetrics?.includes(xAxis) ? "$" : "") + (summary[quadrant]?.x_axis / 1000000).toFixed(2) + "M"
            : summary[quadrant]?.x_axis > 1000
            ? (bubbleGraphDollarMetrics?.includes(xAxis) ? "$" : "") + (summary[quadrant]?.x_axis / 1000).toFixed(2) + "K"
            : (bubbleGraphDollarMetrics?.includes(xAxis) ? "$" : "") + (summary[quadrant]?.x_axis).toFixed(2),
        y_axis:
          summary[quadrant]?.y_axis > 1000000
            ? (bubbleGraphDollarMetrics?.includes(yAxis) ? "$" : "") + (summary[quadrant]?.y_axis / 1000000).toFixed(2) + "M"
            : summary[quadrant]?.y_axis > 1000
            ? (bubbleGraphDollarMetrics?.includes(yAxis) ? "$" : "") + (summary[quadrant]?.y_axis / 1000).toFixed(2) + "K"
            : (bubbleGraphDollarMetrics?.includes(yAxis) ? "$" : "") + (summary[quadrant]?.y_axis).toFixed(2),
        bubble_size:
          summary[quadrant]?.bubble_size > 1000000
            ? (bubbleGraphDollarMetrics?.includes(bubbleSize) ? "$" : "") + (summary[quadrant]?.bubble_size / 1000000).toFixed(2) + "M"
            : summary[quadrant]?.bubble_size > 1000
            ? (bubbleGraphDollarMetrics?.includes(bubbleSize) ? "$" : "") + (summary[quadrant]?.bubble_size / 1000).toFixed(2) + "K"
            : (bubbleGraphDollarMetrics?.includes(bubbleSize) ? "$" : "") + (summary[quadrant]?.bubble_size).toFixed(2),
      };
      summaryPercent[quadrant] = {
        x_axis:
          Math.round((summary[quadrant]?.x_axis / totalXaxisSummary) * 100) +
          "%",
        y_axis:
          Math.round((summary[quadrant]?.y_axis / totalYaxisSummary) * 100) +
          "%",
        bubble_size:
          Math.round(
            (summary[quadrant]?.bubble_size / totalBubbleSizeSummary) * 100
          ) + "%",
      };
    });
    setSummaryData(summaryData);
    setSummaryPercentData(summaryPercent);
  };

  const configureBubbleGraphData = () => {
    const graphData = props.bubbleGraphData?.data;
    const graphDetails = props.bubbleGraphData?.graph_details;
    const thresholdData = props.bubbleGraphData?.threshold;
    const bubbleSizeData = props.bubbleGraphData?.bubble_size_data;
    const settingsData = props.bubbleGraphFilters;
    const bubbleGraphData = [];
    graphData?.forEach((item, index)=>{
      let bubbleObj = {};
      const xAxis = item[settingsData?.x_axis];
      const yAxis = item[settingsData?.y_axis];
      const minXAxis = thresholdData?.[settingsData?.x_axis]?.min;
      const maxXAxis = thresholdData?.[settingsData?.x_axis]?.max;
      const minYAxis = thresholdData?.[settingsData?.y_axis]?.min;
      const maxYAxis = thresholdData?.[settingsData?.y_axis]?.max;

      //calculate x & y axis threshold line
      const x_axis_thrshold_line = (maxXAxis - minXAxis)/(100/settingsData?.x_axis_threshold);
      const y_axis_thrshold_line = (maxYAxis - minYAxis)/(100/settingsData?.y_axis_threshold);

      //Calculate quadrant names based on x & y axis values
      let quadrant = "";
      if(xAxis >= ((maxXAxis - minXAxis)/2) && yAxis >= ((maxYAxis - minYAxis)/2)){
        quadrant = "quadrant_1";
      } else if(xAxis < ((maxXAxis - minXAxis)/2) && yAxis >= ((maxYAxis - minYAxis)/2)){
        quadrant = "quadrant_2";
      } else if(xAxis < ((maxXAxis - minXAxis)/2) && yAxis < ((maxYAxis - minYAxis)/2)){
        quadrant = "quadrant_3";
      }else{
        quadrant = "quadrant_4";
      }

      bubbleObj = {
        bubble_color_grp: item["bubble_color_grp"],
        bubble_points: item["bubble_points"],
        x_axis: item[settingsData?.x_axis],
        y_axis: item[settingsData?.y_axis],
        bubble_size: bubbleSizeData?.[settingsData?.bubble_size]?.[index],
        min_x_axis: minXAxis,
        max_x_axis: maxXAxis,
        min_y_axis: minYAxis,
        max_y_axis: maxYAxis,
        quadrant: quadrant,
        x_axis_thrshold_line: x_axis_thrshold_line,
        y_axis_thrshold_line: y_axis_thrshold_line
      }
      bubbleGraphData.push(bubbleObj);
    });
    return bubbleGraphData; 
  }

  useEffect(()=>{
    if(!isEmpty(props.bubbleGraphData) && !isEmpty(props.bubbleGraphFilters)){
      const settingsData = props.bubbleGraphFilters;
      const bubbleGraphData = configureBubbleGraphData(props.bubbleGraphData, props.bubbleGraphFilters);
      configureGraphSummary(bubbleGraphData);
      const groupData = groupBy(bubbleGraphData, "bubble_color_grp");
      const seriesData = [];
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
            bubble_points: replaceSpecialCharacter(bubbleObj.bubble_points),
            colorGroup: replaceSpecialCharacter(colorGrp),
            xAxisLabel:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.x_axis
              ],
            yAxisLabel:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.y_axis
              ],
            bubbleSizeName:
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.bubble_size
              ],
          });
        }
        seriesObj["color"] = bubbleColor?.[colorIndex]?.["ABOVE_AVG"];
        seriesObj["name"] = replaceSpecialCharacter(colorGrp);
        colorIndex++;
        seriesData.push(seriesObj);
      }
      console.log("seriesdata:", seriesData)
      const xAxisThreshold = bubbleGraphData?.[0]?.x_axis_thrshold_line;
      const yAxisThreshold = bubbleGraphData?.[0]?.y_axis_thrshold_line;
      const options = {
        chartType: "bubble",
        chartTitle: "",
        xAxis: {
          min: 0,
          gridLineWidth: 1,
          title: {
            text: `${
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.x_axis
              ]
            }`,
          },
          labels: {
            formatter: function () {
              if (this.value > 1000000) {
                return this.value / 1000000 + "M";
              }
              if (this.value > 1000) {
                return this.value / 1000 + "K";
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
          min: 0,
          title: {
            text: `${
              props.treemapFiltersData?.["filter_keys_with_display_name"]?.[
                settingsData?.y_axis
              ]
            }`,
          },
          labels: {
            formatter: function () {
              if (this.value > 1000000) {
                return this.value / 1000000 + "M";
              }
              if (this.value > 1000) {
                return this.value / 1000 + "K";
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
                : this.point.x > 1000
                ? (this.point.x / 1000).toFixed(2) + "K"
                : this.point.x.toFixed(2);
            let yAxisValue =
              this.point.y > 1000000
                ? (this.point.y / 1000000).toFixed(2) + "M"
                : this.point.y > 1000
                ? (this.point.y / 1000).toFixed(2) + "K"
                : this.point.y.toFixed(2);
            let zAxisValue =
              this.point.z > 1000000
                ? (this.point.z / 1000000).toFixed(0) + "M"
                : this.point.z > 1000
                ? (this.point.z / 1000).toFixed(0) + "K"
                : this.point.z.toFixed(2);

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
              zAxisValue;
            return tooltip;
          },
        },
        series: seriesData,
      };
      console.log("graphoptions:", options);
      props.setBubbleGraphLoader(false);
      setbubbleGraphOptions(options);
      if(graphSettingChanged){
        setGraphSettingChanged(false);
      }
    }
  },[props.bubbleGraphData, graphSettingChanged])

  const switchView = (e) => {
    setPercentageToggle(e.target.checked);
  };

  return (
    <Card className={`${globalClasses.paper} ${classes.paperPadding} ${classes.hindsightGraphCard}`} id="bubble-graph">
      <LoadingOverlay loader={props.bubbleGraphLoader}>
        {filtersConfig && (
          <HindsightGraphHeader
            filtersConfig={filtersConfig}
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
            setGraphSettingChanged={setGraphSettingChanged}
            onExport={handleExport}
          />
        )}

        {(!isEmpty(bubbleGraphOptions) && 
        bubbleGraphOptions.series.length > 0) ? 
          <Grid container gap="5px">
            <Grid Item xs={9}>
              <Charts options={bubbleGraphOptions} handleChartRef={handleChartRef} screen={"hindsight-assort"}/>
            </Grid>
            <Grid Item xs={2.9}>
              <Card
                className={`${classes.graphSummary} ${classes.graphOut}`}
                id="kpi"
              >
                <div className={classes.headerDiv}>
                  <div className={classes.kpiHeader}>Graph Summary</div>
                  <Switch 
                    onChange={(e) => {
                      switchView(e);
                    }}
                    id="switch-percentage-view"
                    color="primary"
                    checked={percentageToggle}
                    rightLabel="Show in %"
                  />
                </div>
                {!isEmpty(summaryData) &&
                  !isEmpty(summaryPercentData) &&
                  Object.keys(summaryData)
                    ?.sort()
                    ?.map((item, index) => {
                      return (
                        <>
                          <div
                            className={`${classes.graphStyles} ${classes.graphQuadrantLabel}`}
                          >
                            {"Quadrant " + item?.split("_")?.[1]}
                          </div>
                          <div
                            className={` ${classes.graphSummaryContainer} ${
                              Object.keys(summaryData).length === index + 1
                                ? classes.graphSummaryBorder
                                : ""
                            }`}
                          >
                            <div className={classes.graphSummaryDiv}>
                              <p
                                className={`${classes.kpiHeader} ${classes.graphSummaryValueLabel}`}
                              >
                                {
                                  (percentageToggle
                                    ? summaryPercentData
                                    : summaryData)?.[item]?.x_axis
                                }
                              </p>
                              <p
                                className={`${classes.graphStyles} ${classes.graphSummaryLabel}`}
                              >
                                {
                                  props.treemapFiltersData?.[
                                    "filter_keys_with_display_name"
                                  ]?.[
                                    props.bubbleGraphFilters?.x_axis
                                  ]
                                }
                              </p>
                            </div>
                            <div className={classes.graphSummaryDiv}>
                              <p
                                className={`${classes.kpiHeader} ${classes.graphSummaryValueLabel}`}
                              >
                                {
                                  (percentageToggle
                                    ? summaryPercentData
                                    : summaryData)?.[item]?.y_axis
                                }
                              </p>
                              <p
                                className={`${classes.graphStyles} ${classes.graphSummaryLabel}`}
                              >
                                {
                                  props.treemapFiltersData?.[
                                    "filter_keys_with_display_name"
                                  ]?.[
                                    props.bubbleGraphFilters?.y_axis
                                  ]
                                }
                              </p>
                            </div>
                            <div className={classes.graphSummaryDiv}>
                              <p
                                className={`${classes.kpiHeader} ${classes.graphSummaryValueLabel}`}
                              >
                                {
                                  (percentageToggle
                                    ? summaryPercentData
                                    : summaryData)?.[item]?.bubble_size
                                }
                              </p>
                              <p
                                className={`${classes.graphStyles} ${classes.graphSummaryLabel}`}
                              >
                                {
                                  props.treemapFiltersData?.[
                                    "filter_keys_with_display_name"
                                  ]?.[
                                    props.bubbleGraphFilters?.bubble_size
                                  ]
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
        : <p className={classes.NoDataText}>No data Present for Selected Filters</p>}
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
  addSnack,
  setBubbleGraphLoader,
  getHindsightGraphDownload,
  getAllFilters,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightBubbleGraphComponent);
