import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Typography, Card } from "@mui/material";
import PropTypes from "prop-types";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import Charts from "core/Utils/charts";
import Form from "core/Utils/form";
import { decimalsFormatter } from "core/Utils/formatter";
import globalStyles from "core/Styles/globalStyles";
import theme from "core/Styles/theme";
import {
  set1_2_Loader,
  getAttributeGraphData,
  setAttributeGraphData,
  clearAttributeGraphData,
} from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import { setImportClusterData } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  attributeFormatter,
  isChannelMultiple,
  prepareAttrGraphPayload,
} from "../../../../assortsmart/utils-assortsmart/utilityFunctions";
import {
  ATTRIBUTE_GRADE_FORM,
  Plan,
} from "../../../../assortsmart/constants-assortsmart/stringContants";
import InfoComponent from "./InfoComponent";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const AttributeGradeChartComponent = (props) => {
  const clusterType = props?.isPlanInfoFetched
    ? props.selectedClusterTab === 0
      ? "ia_recommended"
      : "upload"
    : props?.clusterPlanDetails?.data?.cluster_type ||
      props?.planDetails?.data.cluster_type;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [
    bucketIdAndAttributeFormData,
    setBucketIdAndAttributeFromData,
  ] = useState({});
  const [
    attributeGraphDatasetVisibility,
    setAttributeGraphDatasetVisibility,
  ] = useState(false);
  const [attributeGraphDataToPlot, setAttributeGraphDataToPlot] = useState([]);
  const [finalGraphDataStatus, setFinalGraphDataStatus] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (props.planDetails?.data?.cluster_plan_code) {
      const fetchData = async () => {
        try {
          props.clearAttributeGraphData();
          props.planDetails?.data?.channel.forEach(async (chan) => {
            if (!Plan.__Ecom_Channel.includes(chan) && initialLoad) {
              setInitialLoad(false);
              let planData = props.planDetails?.data;
              let clusterPlanData = props.clusterPlanDetails?.data;
              let formData = {};
              let isPlanInfoFetched = props.isPlanInfoFetched;
              if (isChannelMultiple(planData)) {
                formData.channel = chan;
              }
              let reqBodyAttrGraph = prepareAttrGraphPayload(
                planData,
                formData,
                props,
                clusterPlanData,
                isPlanInfoFetched
              );
              let graphResponse = await props.getAttributeGraphData(
                reqBodyAttrGraph,
                props.clusterPlanDetails?.data?.cluster_plan_code
              );
              if (!props.attributeBucketId?.[chan]) {
                graphResponse?.data?.data?.bucket_info.forEach((info) => {
                  if (info.is_optimal) {
                    props.setAttributeBucketId(parseInt(info.bucket_id), chan);
                  }
                });
              }
              if (
                chan === props.channelSelected ||
                !isChannelMultiple(props.planDetails?.data)
              ) {
                props.setAttributeGraphData(graphResponse.data);
              }
            }
          });
        } catch (err) {
          displayErrorMessage("Something went wrong", "error");
        }
      };
      if (
        (props.channelSelected && isChannelMultiple(props.planDetails?.data)) ||
        !isChannelMultiple(props.planDetails?.data)
      ) {
        fetchData();
        props.set1_2_Loader(true);
      }
    }
    return () => {
      props.clearAttributeGraphData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data, props.channelSelected]);

  useEffect(() => {
    if (!isEmpty(props.attributeClusterBucketInfo)) {
      if (!finalGraphDataStatus) {
        props.clearAttributeGraphData();
        (async function () {
          let planData = props.planDetails?.data;
          let clusterPlanData = props.clusterPlanDetails?.data;
          let isPlanInfoFetched = props.isPlanInfoFetched;
          let selectedChannel =
            props.channelSelected || props.planDetails?.data?.channel[0];
          let formData = {
            attributeBucketId: props.attributeBucketId?.[selectedChannel]
              ? props.attributeBucketId?.[selectedChannel]
              : props.attributeClusterBucketInfo.filter(
                  (obj) => obj.is_optimal
                )[0].bucket_id,
            attribute: props.attributesData[0],
          };
          if (props.channelSelected) {
            formData.channel = props.channelSelected;
          }
          let reqBodyAttrGraph = prepareAttrGraphPayload(
            planData,
            formData,
            props,
            clusterPlanData,
            isPlanInfoFetched
          );
          let graphResponse = await props.getAttributeGraphData(
            reqBodyAttrGraph,
            props.clusterPlanDetails?.data?.cluster_plan_code
          );
          props.setAttributeGraphData(graphResponse.data);
        })();
        setFinalGraphDataStatus(true);
      } else {
        populateClusterBucketIDs();
        populateAttributeValues();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    finalGraphDataStatus,
    props.attributeGraphData,
    props.attributeClusterBucketInfo,
    props.attributesData,
  ]);

  useEffect(() => {
    if (props.channelSelected && !isEmpty(bucketIdAndAttributeFormData)) {
      bucketIdAndAttributeFormData["clusterBucketId"] = "";
      bucketIdAndAttributeFormData["attribute"] = "";
      setBucketIdAndAttributeFromData({});
      populateClusterBucketIDs();
      populateAttributeValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.channelSelected]);

  const populateClusterBucketIDs = async () => {
    // setting cluster bucket id
    let requiredBucketId;
    ATTRIBUTE_GRADE_FORM[0].options = props.attributeClusterBucketInfo.map(
      (obj) => {
        return {
          value: obj.bucket_id,
          label: obj.bucket_id,
          id: obj.bucket_id,
        };
      }
    );
    ATTRIBUTE_GRADE_FORM[0].options.sort((a, b) =>
      a.value > b.value ? 1 : -1
    );
    if (
      !bucketIdAndAttributeFormData["clusterBucketId"] ||
      props.importCluster
    ) {
      let list = props.attributeClusterBucketInfo.filter((obj) =>
        props.fromPlanBudgetScreen ? obj.is_final : obj.is_optimal
      );
      requiredBucketId = list?.length ? list[0].bucket_id : "";
      let selectedChannel =
        props.channelSelected || props.planDetails?.data?.channel[0];
      if (
        requiredBucketId &&
        props.attributeBucketId?.[selectedChannel] &&
        requiredBucketId !==
          props.attributeBucketId?.[selectedChannel]?.toString()
      ) {
        requiredBucketId = props.attributeBucketId?.[
          selectedChannel
        ]?.toString();
      }
      bucketIdAndAttributeFormData["clusterBucketId"] = requiredBucketId;
      props.fetchAttributeBucketId(requiredBucketId, "attribute");
    }
    if (props.importCluster) {
      let planData = props.planDetails?.data;
      let clusterPlanData = props.clusterPlanDetails?.data;
      let isPlanInfoFetched = props.isPlanInfoFetched;
      let formData = {
        attributeBucketId: bucketIdAndAttributeFormData["clusterBucketId"],
        attribute: props.attributesData[1],
      };
      let reqBodyAttrGraph = prepareAttrGraphPayload(
        planData,
        formData,
        props,
        clusterPlanData,
        isPlanInfoFetched
      );
      const graphResponse = await props.getAttributeGraphData(
        reqBodyAttrGraph,
        props.clusterPlanDetails?.data?.cluster_plan_code
      );
      props.setAttributeGraphData(graphResponse.data);
      props.setImportClusterData(false);
    }
    setBucketIdAndAttributeFromData(bucketIdAndAttributeFormData);
  };

  const populateAttributeValues = () => {
    if (!isEmpty(props.attributesData)) {
      ATTRIBUTE_GRADE_FORM[1].options = props.attributesData.map((obj) => {
        let attrJson = {};
        if (props.levelsJson?.[obj]) {
          attrJson[obj] = props.levelsJson?.[obj];
          props.setAttributeJson(attrJson);
        }
        return {
          value: obj,
          label: attributeFormatter(
            props.levelsJson?.[obj] ? props.levelsJson?.[obj] : obj
          ),
          id: obj,
        };
      });
      if (!bucketIdAndAttributeFormData["attribute"]) {
        bucketIdAndAttributeFormData["attribute"] = props.attributesData[0];
        props.fetchActiveProductAttributeValue(props.attributesData[0]);
      }
      setBucketIdAndAttributeFromData(bucketIdAndAttributeFormData);
    }
  };

  useEffect(() => {
    if (!props.isLoading && !isEmpty(props.attributeGraphData.datasets)) {
      setAttributeGraphDatasetVisibility(true);
      setAttributeGraphDataToPlot(props.attributeGraphData.datasets);
    }
    if (props.isLoading) {
      setAttributeGraphDatasetVisibility(false);
    }
  }, [props.isLoading, props.attributeGraphData]);

  useEffect(() => {
    if (props.fromPlanBudgetScreen) {
      ATTRIBUTE_GRADE_FORM[0].isDisabled = true;
    } else {
      ATTRIBUTE_GRADE_FORM[0].isDisabled = false;
    }
  }, [props.fromPlanBudgetScreen]);

  const handleChange = (updatedFormData) => {
    props.fetchAttributeBucketId(
      updatedFormData.clusterBucketId,
      "attribute",
      true
    );
    props.fetchActiveProductAttributeValue(updatedFormData.attribute);
    props.set1_2_Loader(true);
    props.clearAttributeGraphData();
    const fetchData = async () => {
      try {
        let planData = props.planDetails?.data;
        let clusterPlanData = props.clusterPlanDetails?.data;
        let formData = {
          attributeBucketId: updatedFormData.clusterBucketId,
          attribute: updatedFormData.attribute,
        };
        if (props.channelSelected) {
          formData.channel = props.channelSelected;
        }
        let reqBodyAttrGraph = prepareAttrGraphPayload(
          planData,
          formData,
          props,
          clusterPlanData,
          props.attributeJson
        );
        let graphResponse = await props.getAttributeGraphData(
          reqBodyAttrGraph,
          props.clusterPlanDetails?.data?.cluster_plan_code
        );
        props.setAttributeGraphData(graphResponse.data);
      } catch (err) {
        displayErrorMessage("Something went wrong", "error");
      }
    };
    fetchData();
    setBucketIdAndAttributeFromData(updatedFormData);
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

  const buildAttributeGradeGraphData = () => {
    if (
      !isEmpty(bucketIdAndAttributeFormData["clusterBucketId"]) &&
      !isEmpty(bucketIdAndAttributeFormData["attribute"])
    ) {
      let datasetValues = [...attributeGraphDataToPlot];
      let seriesData = datasetValues.map((obj, i) => {
        let decimalFormattedData = obj.data.map((item) => {
          let formattedData = decimalsFormatter({ value: item }, 2);
          return formattedData === "0.00" ? 0 : formattedData;
        });
        return {
          name: replaceSpecialCharacter(obj.label),
          data: decimalFormattedData,
          color: theme.palette.graphColours[i],
          marker: {
            symbol: "circle",
          },
        };
      });
      return {
        type: props.attributeGraphData?.type,
        chartType: "stackedBarChart",
        chartTitle: "",
        axisLegends: {
          xaxis: {
            title: "Cluster",
            categories: props.attributeGraphData?.labels,
          },
          yaxis: {
            title: "Grade",
          },
        },
        series: seriesData,
        plotOptions: {
          series: {
            states: {
              hover: {
                enabled: true,
              },
            },
            events: {},
          },
        },
      };
    }
  };

  useEffect(() => {
    if (props.screenConfiguration?.["1.2"]?.attributeFilter) {
      ATTRIBUTE_GRADE_FORM[1].isMulti =
        props.screenConfiguration?.["1.2"]?.attributeFilter === "multiple"
          ? true
          : false;
    }
  }, [props.screenConfiguration]);

  return props.attributeSelection?.["product"] &&
    clusterType === "ia_recommended" ? (
    <Card className={`${classes.graphCard} ${globalClasses.paper}`}>
      <Typography variant="h5" gutterBottom>
        Attribute Grades
      </Typography>
      <div className={classes.dFlex}>
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={handleChange}
          fields={ATTRIBUTE_GRADE_FORM}
          updateDefaultValue={false}
          defaultValues={bucketIdAndAttributeFormData}
          handleDropdownClose={true}
        ></Form>
        <InfoComponent clusterBucketData={props.attributeGraphData} />
      </div>
      {attributeGraphDatasetVisibility && (
        <Charts
          options={buildAttributeGradeGraphData()}
          chartName="ClusterChart"
        />
      )}
    </Card>
  ) : null;
};

AttributeGradeChartComponent.defaultProps = {
  attributeClusterBucketInfo: [],
  attributesData: [],
  attributeGraphData: {},
};

AttributeGradeChartComponent.propTypes = {
  attributeClusterBucketInfo: PropTypes.array,
  attributesData: PropTypes.array,
  attributeGraphData: PropTypes.object,
  getAttributeGraphData: PropTypes.func.isRequired,
  setAttributeGraphData: PropTypes.func.isRequired,
  set1_2_Loader: PropTypes.func.isRequired,
};

const mapStateToProps = (store) => {
  return {
    isLoading: finalizeClusterServiceActions.loader_1_2Selector(store),
    attributeClusterBucketInfo: finalizeClusterServiceActions.attributeGraphDataSelector(
      store
    )?.bucket_info,
    attributesData: finalizeClusterServiceActions.attributeGraphDataSelector(
      store
    )?.attributes,
    attributeGraphData: finalizeClusterServiceActions.attributeGraphDataSelector(
      store
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
    importCluster: planDashboardServiceActions.importClusterSelector(store),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(store),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(store),
  };
};

const mapActionsToProps = {
  getAttributeGraphData,
  setAttributeGraphData,
  set1_2_Loader,
  clearAttributeGraphData,
  setImportClusterData,
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(AttributeGradeChartComponent));
