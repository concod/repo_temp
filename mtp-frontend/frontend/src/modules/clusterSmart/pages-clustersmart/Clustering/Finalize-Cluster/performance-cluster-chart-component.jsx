import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";

import { Typography, Card, TextField } from "@mui/material";
import PropTypes from "prop-types";
import { isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import Charts from "core/Utils/charts";
import Form from "core/Utils/form";
import { decimalsFormatter, percentFormatter } from "core/Utils/formatter";
import globalStyles from "core/Styles/globalStyles";
import {
  attributeFormatter,
  isChannelMultiple,
} from "../../../../assortsmart/utils-assortsmart/utilityFunctions";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import {
  set1_2_Loader,
  setPerformanceGraphData,
  getPerformanceGraphData,
  clearPerformanceGraphData,
} from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import { setImportClusterData } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  PERFORMANCE_CLUSTER_FORM,
  PERFORMANCE_CLUSTER_UPLOAD_FORM,
  NON_CHART_METRIC_KEYS,
  PERCENTAGE_METRICS,
  Plan,
} from "../../../../assortsmart/constants-assortsmart/stringContants";
import InfoComponent from "./InfoComponent";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const PerformanceClusterChartComponent = (props) => {
  const clusterType = props?.isPlanInfoFetched
    ? props.selectedClusterTab === 0
      ? "ia_recommended"
      : "upload"
    : props?.clusterPlanDetails?.data?.cluster_type ||
      props?.planDetails?.data.cluster_type;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [
    bucketIdAndPerfMetricFormData,
    setBucketIdAndPerfMetricFormData,
  ] = useState({});
  const [
    performanceGraphDatasetVisibility,
    setPerformanceGraphDatasetVisibility,
  ] = useState(false);
  const [performanceGraphDataToPlot, setPerformanceGraphDataToPlot] = useState(
    []
  );
  const [onChangeClusterBucketId, setOnChangeClusterBucketId] = useState(0);
  const [channelSelected, setChannelSelected] = useState("");

  useEffect(() => {
    if (props.planDetails?.data) {
      if (isChannelMultiple(props.planDetails?.data)) {
        setChannelSelected(props.planDetails?.data?.channel[0]);
      }
    }
    return () => {
      props.clearPerformanceGraphData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (props.channelSelected) {
      setChannelSelected(props.channelSelected);
    }
  }, [props.channelSelected]);

  useEffect(() => {
    populatePerformanceClusterId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.performanceClusterBucketInfo]);

  const populatePerformanceClusterId = () => {
    if (
      props.performanceClusterBucketInfo &&
      props.performanceClusterBucketInfo.length > 0
    ) {
      PERFORMANCE_CLUSTER_FORM[0].options = props.performanceClusterBucketInfo.map(
        (obj) => {
          return {
            value: obj.bucket_id,
            label: obj.bucket_id,
            id: obj.bucket_id,
          };
        }
      );
      PERFORMANCE_CLUSTER_FORM[0].options.sort((a, b) =>
        a.value > b.value ? 1 : -1
      );
      // set optimal value of the list based on data set
      if (isEmpty(onChangeClusterBucketId)) {
        let list = props.performanceClusterBucketInfo.filter((obj) =>
            props.fromPlanBudgetScreen ? obj.is_final : obj.is_optimal
          ),
          requiredBucketId = list?.length ? list[0].bucket_id : "";
        let selectedChannel =
          props.channelSelected || props.planDetails?.data?.channel[0];
        if (
          requiredBucketId &&
          props.performanceBucketId?.[selectedChannel] &&
          requiredBucketId !==
            props.performanceBucketId?.[selectedChannel]?.toString()
        ) {
          requiredBucketId = props.performanceBucketId?.[
            selectedChannel
          ]?.toString();
        }

        bucketIdAndPerfMetricFormData["clusterBucketId"] = requiredBucketId;
        props.fetchPerformanceBucketId(requiredBucketId, "performance");
      } else {
        bucketIdAndPerfMetricFormData[
          "clusterBucketId"
        ] = onChangeClusterBucketId;
        props.fetchPerformanceBucketId(onChangeClusterBucketId, "performance");
      }
      setBucketIdAndPerfMetricFormData(bucketIdAndPerfMetricFormData);
    }
  };

  useEffect(() => {
    if (props.channelSelected && !isEmpty(bucketIdAndPerfMetricFormData)) {
      bucketIdAndPerfMetricFormData["clusterBucketId"] = "";
      bucketIdAndPerfMetricFormData["x-axis"] = "";
      bucketIdAndPerfMetricFormData["y-axis"] = "";
      bucketIdAndPerfMetricFormData["z-axis"] = "";
      setBucketIdAndPerfMetricFormData({});
      setOnChangeClusterBucketId(0);
      populatePerformanceClusterId();
      populatePerformanceAxisData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.channelSelected]);

  const populatePerformanceAxisData = () => {
    if (
      props.performanceGraphData.datasets &&
      props.performanceGraphData.datasets.data.length > 0
    ) {
      setPerformanceGraphDatasetVisibility(true);
      setPerformanceGraphDataToPlot(props.performanceGraphData.datasets.data);
      let chartAxisOptions = props.performanceGraphData.datasets.data[0];
      let filteredAxis = Object.keys(chartAxisOptions).filter(
        (item) => !NON_CHART_METRIC_KEYS.includes(item)
      );

      let axisOptions = filteredAxis.map((items) => {
        return {
          value: items,
          label:
            items === "st"
              ? attributeFormatter(items) + "%"
              : attributeFormatter(items),
          id: items,
        };
      });
      PERFORMANCE_CLUSTER_FORM[1].options = axisOptions;
      PERFORMANCE_CLUSTER_FORM[2].options = axisOptions;
      PERFORMANCE_CLUSTER_FORM[3].options = axisOptions;
      PERFORMANCE_CLUSTER_UPLOAD_FORM[0].options = axisOptions;
      PERFORMANCE_CLUSTER_UPLOAD_FORM[1].options = axisOptions;
      PERFORMANCE_CLUSTER_UPLOAD_FORM[2].options = axisOptions;
      // Setting default value of axis
      if (!bucketIdAndPerfMetricFormData["x-axis"]) {
        bucketIdAndPerfMetricFormData["x-axis"] = axisOptions.filter(
          (item) => item.value === "sales_retail$"
        )[0].value;
      }
      if (!bucketIdAndPerfMetricFormData["y-axis"]) {
        bucketIdAndPerfMetricFormData["y-axis"] = axisOptions[0].value;
      }
      if (!bucketIdAndPerfMetricFormData["z-axis"]) {
        bucketIdAndPerfMetricFormData["z-axis"] = axisOptions.filter(
          (item) => item.value === "GMROI"
        )[0].value;
      }
      setBucketIdAndPerfMetricFormData(bucketIdAndPerfMetricFormData);
      buildPerformanceGraph();
    } else {
      setPerformanceGraphDatasetVisibility(false);
      setPerformanceGraphDataToPlot([]);
    }
  };

  useEffect(() => {
    populatePerformanceAxisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.performanceGraphData]);

  // Disable cluster bucket id field on view cluster grade pop up modal
  useEffect(() => {
    if (props.fromPlanBudgetScreen) {
      PERFORMANCE_CLUSTER_FORM[0].isDisabled = true;
    } else {
      PERFORMANCE_CLUSTER_FORM[0].isDisabled = false;
    }
  }, [props.fromPlanBudgetScreen]);

  useEffect(() => {
    if (props.importCluster) {
      getPerformanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.importCluster]);

  useEffect(() => {
    if (
      props.planDetails?.data?.cluster_plan_code &&
      ((isChannelMultiple(props.planDetails?.data) &&
        (channelSelected || props.fromPlanBudgetScreen)) ||
        !isChannelMultiple(props.planDetails?.data))
    ) {
      if (props.performanceBucketId?.[channelSelected]) {
        getPerformanceData(
          props.performanceBucketId?.[props.channelSelected]?.toString()
        );
      } else {
        getPerformanceData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.channelSelected, props.planDetails]);

  const getPerformanceData = async (bucketId) => {
    props.set1_2_Loader(true);
    try {
      if (!bucketId) {
        let optimalPerformance = {};
        props.planDetails?.data?.channel.map(async (chan) => {
          if (!Plan.__Ecom_Channel.includes(chan)) {
            let graphBody = {
              cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
              channel: chan,
              cluster_type: clusterType,
            };
            let graphResponse = await props.getPerformanceGraphData(
              graphBody,
              props.planDetails?.data?.cluster_plan_code
            );
            if (!props.performanceBucketId?.[chan]) {
              graphResponse.data.data?.bucket_info.forEach((info) => {
                if (info.is_optimal) {
                  optimalPerformance[chan] = parseInt(info.bucket_id);
                  props.setPerformanceBucketId(parseInt(info.bucket_id), chan);
                }
              });
            }
            if (
              chan === props.channelSelected ||
              !isChannelMultiple(props.planDetails?.data)
            ) {
              props.setPerformanceGraphData(graphResponse.data);
            }
          }
        });
      } else {
        let graphBody = {
          cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
          channel: props.channelSelected ? props.channelSelected : "",
          bucket_id: bucketId,
          cluster_type: clusterType,
        };
        let graphResponse = await props.getPerformanceGraphData(
          graphBody,
          props.planDetails?.data?.cluster_plan_code
        );
        props.setPerformanceGraphData(graphResponse.data);
      }
      if (props.importCluster) props.setImportClusterData(false);
    } catch (err) {
      displayErrorMessage("Something went wrong", "error");
    }
  };

  const handleChange = (updatedFormData) => {
    if(updatedFormData['x-axis'] === updatedFormData['y-axis']){
      props.addSnack({
        message: "Select unique value for X Axis ,Y Axis",
        options: {
          variant: "error",
        },
      });
      return
    }
    setOnChangeClusterBucketId(updatedFormData.clusterBucketId);
    props.fetchPerformanceBucketId(
      updatedFormData.clusterBucketId,
      "performance",
      true
    );
    // fetch graph data based on active bucket id
    const getGraph = async () => {
      if (
        updatedFormData.clusterBucketId !==
        bucketIdAndPerfMetricFormData["clusterBucketId"]
      ) {
        const bucketId = parseInt(updatedFormData.clusterBucketId);
        getPerformanceData(bucketId);
      }
    };
    getGraph();
    setBucketIdAndPerfMetricFormData(updatedFormData);
  };

  const buildPerformanceGraph = () => {
    if (!isEmpty(bucketIdAndPerfMetricFormData["clusterBucketId"])) {
      // return buildScatterData();
      return buildPerformance3DScatterGraph()
    }
  };

  const buildScatterData = () => {
    let allClusterIds = [];
    let performanceDatasets = [...performanceGraphDataToPlot];
    performanceDatasets.forEach((obj) => {
      if (!allClusterIds.includes(obj.cluster_name)) {
        allClusterIds.push(obj.cluster_name);
      }
    });

    allClusterIds.sort((a, b) => (a > b ? 1 : -1));
    let dataSetsBasedOnClusters = {};
    for (let val of allClusterIds) {
      let arr = [];
      performanceDatasets.forEach((obj, i) => {
        if (obj.cluster_name === val) {
          // For ST% on x and y axis, data is set in percentage format which is multiplied by 100
          if (
            PERCENTAGE_METRICS.includes(
              bucketIdAndPerfMetricFormData["x-axis"]
            ) &&
            PERCENTAGE_METRICS.includes(bucketIdAndPerfMetricFormData["y-axis"])
          ) {
            let axisOptions = {
              x: parseFloat(
                percentFormatter(
                  { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                  2,
                  true
                ).replace("%", "")
              ),
              y: parseFloat(
                percentFormatter(
                  { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                  2,
                  true
                ).replace("%", "")
              ),
              storeName: obj.store_name,
              color: obj.backgroundColor,
            };
            axisOptions.xVal = axisOptions.x;
            axisOptions.yVal = axisOptions.y;
            arr.push(axisOptions);
            dataSetsBasedOnClusters[val] = arr;
          } else {
            // data for rest of the x and y axis values is set to two decimal places
            let axisOptions = {
              xVal: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                2
              ),
              yVal: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                2
              ),
              x: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                2
              ),
              y: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                2
              ),
              storeName: replaceSpecialCharacter(obj.store_name),
              color: obj.backgroundColor,
            };
            arr.push(axisOptions);
            dataSetsBasedOnClusters[val] = arr;
          }
        }
      });
    }

    let seriesData = Object.keys(dataSetsBasedOnClusters).map((obj, i) => {
      return {
        name: obj,
        data: Object.values(dataSetsBasedOnClusters[obj]),
        color: Object.values(dataSetsBasedOnClusters[obj])[0].color,
        marker: {
          symbol: "circle",
          radius: 6,
        },
      };
    });

    return {
      type: props.performanceGraphData.type,
      chartType: "scatterChart",
      // no title required
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: attributeFormatter(bucketIdAndPerfMetricFormData["x-axis"]),
        },
        yaxis: {
          title: attributeFormatter(bucketIdAndPerfMetricFormData["y-axis"]),
        },
      },
      tooltip: {
        headerFormat: "<b>{series.name}</b><br>",
        pointFormat: "<b>{point.storeName}</b>:- {point.xVal}, {point.yVal}",
      },
      series: seriesData,
    };
  };

  const buildPerformance3DScatterGraph = () => {
    let allClusterIds = [];
    let performanceDatasets = [...performanceGraphDataToPlot];
    performanceDatasets.forEach((obj) => {
      if (!allClusterIds.includes(obj.cluster_name)) {
        allClusterIds.push(obj.cluster_name);
      }
    });

    allClusterIds.sort((a, b) => (a > b ? 1 : -1));
    let dataSetsBasedOnClusters = {};
    for (let val of allClusterIds) {
      let arr = [];
      performanceDatasets.forEach((obj, i) => {
        if (obj.cluster_name === val) {
          // For ST% on x, y, z axis, data is set in percentage format which is multiplied by 100
          if (
            PERCENTAGE_METRICS.includes(
              bucketIdAndPerfMetricFormData["x-axis"]
            ) &&
            PERCENTAGE_METRICS.includes(bucketIdAndPerfMetricFormData["y-axis"]) && PERCENTAGE_METRICS.includes(bucketIdAndPerfMetricFormData["z-axis"])
          ) {
            let axisOptions = {
              x: parseFloat(
                percentFormatter(
                  { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                  2,
                  true
                ).replace("%", "")
              ),
              y: parseFloat(
                percentFormatter(
                  { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                  2,
                  true
                ).replace("%", "")
              ),
              z: parseFloat(
                percentFormatter(
                  { value: obj[bucketIdAndPerfMetricFormData["z-axis"]] },
                  2,
                  true
                ).replace("%", "")
              ),
              storeName: obj.store_name,
              color: obj.backgroundColor,
            };
            axisOptions.xVal = axisOptions.x;
            axisOptions.yVal = axisOptions.y;
            arr.push(axisOptions);
            dataSetsBasedOnClusters[val] = arr;
          } else {
            // data for rest of the x and y axis values is set to two decimal places
            let axisOptions = {
              xVal: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                2
              ),
              yVal: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                2
              ),
              zVal: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["z-axis"]] },
                2
              ),
              x: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["x-axis"]] },
                2
              ),
              y: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["y-axis"]] },
                2
              ),
              z: decimalsFormatter(
                { value: obj[bucketIdAndPerfMetricFormData["z-axis"]] },
                2
              ),
              storeName: replaceSpecialCharacter(obj.store_name),
              color: obj.backgroundColor,
            };
            arr.push(axisOptions);
            dataSetsBasedOnClusters[val] = arr;
          }
        }
      });
    }

    let seriesData = Object.keys(dataSetsBasedOnClusters).map((obj, i) => {
      return {
        name: obj,
        data: Object.values(dataSetsBasedOnClusters[obj]),
        color: Object.values(dataSetsBasedOnClusters[obj])[0].color,
        marker: {
          symbol: "circle",
          radius: 5,
        },
      };
    });
    return {
      type: "scatter3d",
      chartType: "3DScatterChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: attributeFormatter(bucketIdAndPerfMetricFormData["x-axis"]),
        },
        yaxis: {
          title: attributeFormatter(bucketIdAndPerfMetricFormData["y-axis"]),
        },
        zaxis: {
          title: attributeFormatter(bucketIdAndPerfMetricFormData["z-axis"]),
        },
      },
      tooltip: {
        headerFormat: "<b>{series.name}</b><br>",
        pointFormat: "<b>{point.storeName}</b>:- {point.xVal}, {point.yVal}, {point.zVal}",
      },
      plotOptions: {
        scatter: {
          width: 10,
          height: 10,
          depth: 10,
        }
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemMarginTop: 10,
        itemMarginBottom: 10
      },
      options3d: {
        enabled: true,
        alpha: 10,
        beta: 30,
        depth: 250,
        viewDistance: 5,
        fitToPlot: false,
        frame: {
          bottom: { size: 1, color: "rgba(0,0,0,0.02)" },
          back: { size: 1, color: "rgba(0,0,0,0.04)" },
          side: { size: 1, color: "rgba(0,0,0,0.06)" },
        },
      },
      series: seriesData,
    }
  };

  const displayErrorMessage = (msg, type) => {
    props.set1_2_Loader(false);
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  return props.attributeSelection?.["performance"] ? (
    <Card className={`${classes.graphCard} ${globalClasses.paper}`}>
      <Typography variant="h5" gutterBottom>
        Performance Clusters
      </Typography>
      <div className={classes.dFlex}>
        {clusterType === "upload" && (
          <div style={{ width: "15%", marginRight: "1.4rem" }}>
            <span className={classes.bucketInputLabel}>Cluster Bucket</span>
            <TextField
              type={"text"}
              disabled={true}
              variant="outlined"
              size="small"
              className={classes.TextField}
              value={props.performanceClusterBucketInfo[0]?.bucket_id}
              name={"cluster_bucket"}
            />
          </div>
        )}
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={handleChange}
          fields={
            clusterType === "ia_recommended"
              ? PERFORMANCE_CLUSTER_FORM
              : PERFORMANCE_CLUSTER_UPLOAD_FORM
          }
          updateDefaultValue={false}
          defaultValues={bucketIdAndPerfMetricFormData}
          handleDropdownClose={true}
        ></Form>
        <InfoComponent clusterBucketData={props.performanceGraphData} />
      </div>
      {performanceGraphDatasetVisibility && (
        <Charts options={buildPerformanceGraph()} />
      )}
    </Card>
  ) : null;
};

PerformanceClusterChartComponent.defaultProps = {
  performanceClusterBucketInfo: [],
  performanceGraphData: {},
};

PerformanceClusterChartComponent.propTypes = {
  performanceClusterBucketInfo: PropTypes.array,
  performanceGraphData: PropTypes.object,
  getPerformanceGraphData: PropTypes.func.isRequired,
  setPerformanceGraphData: PropTypes.func.isRequired,
  set1_2_Loader: PropTypes.func.isRequired,
};

const mapStateToProps = (store) => {
  return {
    performanceClusterBucketInfo: finalizeClusterServiceActions.performanceGraphDataSelector(
      store
    )?.bucket_info,
    performanceGraphData: finalizeClusterServiceActions.performanceGraphDataSelector(
      store
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    importCluster: planDashboardServiceActions.importClusterSelector(store),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
    screenConfiguration: store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {
  set1_2_Loader,
  getPerformanceGraphData,
  setPerformanceGraphData,
  clearPerformanceGraphData,
  setImportClusterData,
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(PerformanceClusterChartComponent));
