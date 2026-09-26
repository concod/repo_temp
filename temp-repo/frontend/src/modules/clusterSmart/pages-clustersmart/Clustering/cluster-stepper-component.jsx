//Stepper component and base setup for 1_1 screen
import { Typography, Button, Container } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { Stepper } from "impact-ui";
import LoadingOverlay from "core/Utils/Loader/loader";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { replaceCharacter } from "core/Utils/formatter";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getFiltersValues } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import {
  getDropdownValues,
  getTenantConfigApplicationLevel,
} from "core/actions/tenantConfigActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import { CLUSTER_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { ASSORT_CLUSTER_DASHBOARD } from "modules/assortsmart/constants-assortsmart/routesContants";
import { Clustering } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  addEcomCluster,
  resetClusterSelectionFields,
  runCluster,
  setDisplayAttribTable,
  updateAttributes,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  getPlanDetails,
  getPlanLevels,
  setLevelsJson,
  setPlanDetails,
  setPlanLevels,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  setActiveScreenName,
  setIntelligentClusterLoader,
  setScreenConfiguration,
} from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  getPlanPayload,
  isChannelMultiple,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { CLUSTERING_DASHBOARD } from "modules/clusterSmart/constants-clustersmart/routesConstants";
import {
  getClusterPlanDetails,
  setClusterPlanDetails,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  Plan,
  common,
} from "../../../assortsmart/constants-assortsmart/stringContants";
import "../../../assortsmart/pages-assortsmart/Plan/plan.scss";
import AssortBreadCrumbs from "../../../assortsmart/pages-assortsmart/assort-bread-crumbs";
import {
  finalClusterBucketSave,
  getClusterBreakdownData,
  set1_2_Loader,
} from "../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  channelContainsEcomPlan,
  generateLevelJson,
  isEcomPlan,
} from "../../../assortsmart/utils-assortsmart/utilityFunctions";
import ClusterInputComponent from "./Cluster-Input";
import {
  configureAttributeSelectionPayload,
  configureFiltersResponse,
} from "./Cluster-Input/components/common-functions";
import EditClusterNameComponent from "./Finalize-Cluster/edit-cluster-component";
import FinalizeClusterComponent from "./Finalize-Cluster/finalize-cluster-component";
import { ATTRIBUTES_CLUSTERING } from "modules/clusterSmart/constants-clustersmart/stringConstants";

const ClusteringStepperComponent = (props) => {
  const globalClasses = globalStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [planDeptLevels, setplanDeptLevels] = useState([]); //Level Hierarchy array is mapped in this variable
  const [isPlanInfoFetched, setisPlanInfoFetched] = useState(false);
  const [performanceBucketId, setPerformanceBucketId] = useState({});
  const [attributeBucketId, setAttributeBucketId] = useState({});
  const [showSaveClusterDialog, setShowSaveClusterDialog] = useState(false);
  const [
    showFinalizedClusterEditInstance,
    setShowFinalizedClusterEditInstance,
  ] = useState(false);
  const [selectedValue, setSelectedValue] = useState({});
  const [enableStep, setEnableStep] = useState(1.1);
  const [clusterSmartNavigate, setClusterSmartNavigate] = useState(false);
  const [clusterEditTableData, setClusterEditTableData] = useState([]);
  const [perfAttrCharLabel, setPerfAttrCharLabel] = useState(null);
  const [perfLoader, setPerfLoader] = useState(false);
  const [prefFetching, setPrefFetching] = useState(false);
  const [editDataLoader, setEditDataLoader] = useState(false);
  const [attributeSelection, setAttributeSelection] = useState({
    performance: false,
    product: false,
  });
  const [planDataSelected, setPlanDataSelected] = useState({});
  const stepValue = { 0: 1.1, 1: 1.2 };
  var isDisplayChangeValid = true;
  const [steps, setSteps] = useState([
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Clustering.__cluster_input,
    },
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Clustering.__finalize_cluster,
    },
  ]);

  const PlanInfoData = async (planId, levels) => {
    props.setIntelligentClusterLoader(true);
    setplanDeptLevels(levels);
    //get the plan Information using the plan ID query param and store it in redux
    try {
      let response = await props.getClusterPlanDetails(parseInt(planId));
      props.setPlanDetails(response?.data);
      sessionStorage.setItem("planData", JSON.stringify(response?.data));

      //Fetch the plan step from the API response and add it to enable step
      //This will disable the stepper button if the plan step is less than
      //the corresponding stepper step
      //Example - if plan step is 1.1, then 1-2 stepper is disabled or not
      //clickable.

      const planStep = response?.data?.data?.plan_step;
      setEnableStep(planStep);
      props.setActiveScreenName(props.planStepNames[planStep]);
      sessionStorage.setItem("activeScreenName", props.planStepNames[planStep]);
      if (planStep > 1.1 && !isEcomPlan(response.data.data)) {
        setActiveStep(1);
      } else {
        setActiveStep(0);
      }
      setisPlanInfoFetched(true);
    } catch (error) {
      displaySnackMessages("Fetching plan details failed", "error");
    }
    props.setIntelligentClusterLoader(false);
  };
  const setPerformanceBucketIdFn = (id, chan = "") => {
    setPerfLoader(true);
    setPrefFetching(true);
    if (id) {
      let prefBucketId = performanceBucketId;
      let selectedChannel = chan
        ? chan
        : selectedValue?.value || props.planDetails?.data?.channel[0];
      prefBucketId[selectedChannel] = parseInt(id);
      setPerformanceBucketId(prefBucketId);
      let channelLength = props.planDetails?.data?.channel?.length;
      channelLength = channelContainsEcomPlan(props.planDetails?.data)
        ? channelLength - 1
        : channelLength;
      if (Object.keys(performanceBucketId)?.length === channelLength) {
        setPrefFetching(false);
      }
      setPerfLoader(false);
    }
  };

  const setAttributeBucketIdFn = (id, chan = "") => {
    if (id) {
      let attrBucketId = attributeBucketId;
      let selectedChannel = chan
        ? chan
        : selectedValue?.value || props.planDetails?.data?.channel[0];
      attrBucketId[selectedChannel] = parseInt(id);
      setAttributeBucketId(attrBucketId);
    }
  };

  useEffect(() => {
    // to avoid api call with the old plan code
    props.setPlanDetails([]);
    sessionStorage.setItem("planData", []);
    const planCode = props.match.params.planCode;
    const fetchData = async () => {
      props.setIntelligentClusterLoader(true);
      let perfAttrCharLabelResponse = await props.getDropdownValues(2, {
        attribute_name: "perf_attr_char_label",
      });
      if (perfAttrCharLabelResponse?.data?.status) {
        if (perfAttrCharLabelResponse?.data?.data?.length) {
          setPerfAttrCharLabel(
            perfAttrCharLabelResponse?.data?.data?.[0]?.attribute_value
          );
        }
      }
      //fetch all screen configurations
      if (isEmpty(props.screenConfiguration)) {
        let configResp = await props.getTenantConfigApplicationLevel(2, {
          attribute_name: "assort_smart_screen_configuration",
        });
        if (configResp?.data?.status) {
          props.setScreenConfiguration(
            configResp?.data?.data?.[0]?.attribute_value
          );
        }
      }
      //get the plan details
      let levelData = await props.getPlanLevels();
      props.setPlanLevels(levelData?.data);
      PlanInfoData(planCode, levelData?.data?.data?.level_info);
    };
    fetchData();
    if (props.location?.state?.planStep > 1.1) {
      setActiveStep(1);
    } else {
      setActiveStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateSteps();
  }, [activeStep, enableStep]);

  /**
   * @function
   * @desc Update stepper object on change of activeStep and enabled step
   */
  const updateSteps = () => {
    const tempSteps = cloneDeep(steps);
    tempSteps.forEach((step, index) => {
      step.label =
        !isEmpty(props.planStepNames) && props.planStepNames[step.screenCode];
      step.isCompleted = stepValue[index] < enableStep;
    });
    setSteps(tempSteps);
  };

  /**
   * @function
   * @desc Update active screen and active screen name on step button click
   * @param {Number} selectedIndex
   */
  const traverseToStep = (selectedIndex) => {
    setActiveStep(selectedIndex);
    const selectedScreenCode = steps.filter((_step, index) => {
      return index === selectedIndex;
    });
    props.setActiveScreenName(props.planStepNames[selectedScreenCode]);
    sessionStorage.setItem(
      "activeScreenName",
      props.planStepNames[selectedScreenCode]
    );
  };

  useEffect(() => {
    return () => {
      //This will reset the selections in 1-1 component when it is unmounted
      props.resetClusterSelectionFields();
      props.setDisplayAttribTable(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onClusteringFailure = (data) => {
    displaySnackMessages(data.message, "error");
    props.setIntelligentClusterLoader(false);
  };

  const onClusteringSucess = () => {
    setActiveStep(1);
    displaySnackMessages("Successfully ran the clustering", "success");
    props.setIntelligentClusterLoader(false);
  };

  const addEcom = async () => {
    let storeCode = [];
    props.planDetails?.data?.channel.forEach((chan) => {
      if (
        Plan.__Ecom_Channel.includes(chan) &&
        props.screenConfiguration?.["1.1"]?.ecomm_store_codes?.[chan]
      ) {
        storeCode.push(
          ...props.screenConfiguration?.["1.1"]?.ecomm_store_codes?.[chan]
        );
      }
    });
    if (
      props.planDetails?.data?.sub_channel &&
      JSON.stringify(props.planDetails?.data?.sub_channel) !==
        JSON.stringify(props.planDetails?.data?.channel)
    ) {
      props.planDetails?.data?.sub_channel.forEach((subChan) => {
        if (
          Plan.__Ecom_Channel.includes(subChan) &&
          props.screenConfiguration?.["1.1"]?.ecomm_store_codes?.[subChan]
        ) {
          storeCode.push(
            ...props.screenConfiguration?.["1.1"]?.ecomm_store_codes?.[subChan]
          );
        }
      });
    }
    let ecomClusterResponse = await props.addEcomCluster({
      cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
      cluster_name: Clustering.__ecom_cluster_name,
      store_code: storeCode,
      update_plan_step: props.planDetails?.data?.channel?.length === 1,
    });
    return ecomClusterResponse;
  };

  const onSave = async () => {
    if (activeStep === 0) {
      if (!props.isMinAttributesSelected) {
        displaySnackMessages(
          "minimum number of attributes are not selected",
          "error"
        );
        return;
      }
      if (!isEmpty(planDataSelected)) {
        let totalWeightage = 0;
        for (const key in planDataSelected) {
          if (key.includes("weightage")) {
            totalWeightage = totalWeightage + parseInt(planDataSelected[key]);
          }
        }
        if (totalWeightage !== 100) {
          displaySnackMessages(
            "Total weightage should be equal to 100",
            "error"
          );
          return;
        }
      }
      try {
        //Update the attributes by calling update attributes API
        const updateAttribPayload = {
          cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
          performance_attributes: configureAttributeSelectionPayload(
            props.clusterAttributes,
            "performance_attributes",
            props.selectedPerformanceAttributes
          ),
          product_attributes: configureAttributeSelectionPayload(
            props.clusterAttributes,
            "product_attributes",
            props.selectedProductAttributes
          ),
        };
        //API to update attributes
        props.setIntelligentClusterLoader(true);
        await props.updateAttributes(updateAttribPayload);
        setAttributeBucketId({});
        setPerformanceBucketId({});
        // If its a ecom plan
        if (
          isEcomPlan(props.planDetails?.data) &&
          props.planDetails?.data?.channel?.length === 1
        ) {
          props.setIntelligentClusterLoader(true);
          let ecomClusterResponse = await addEcom();
          if (ecomClusterResponse?.data?.status) {
            setShowSaveClusterDialog(true);
          }
          props.setIntelligentClusterLoader(false);
        } else {
          if (channelContainsEcomPlan(props.planDetails?.data)) {
            addEcom();
          }
          const reqBody = {
            cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
            performance_attributes: props.selectedPerformanceAttributes.map(
              (perf_attrb) => {
                return perf_attrb.attribute_name;
              }
            ),
            product_attributes: props.selectedProductAttributes.map(
              (prod_attrb) => {
                return prod_attrb.attribute_name;
              }
            ),
            filters: configureFiltersResponse(
              planDeptLevels,
              props.planDetails?.data
            ),
            store_group_code: props.selectedStoreGrp || 0,
            selected_attribute: props.planDetails?.data?.selected_attribute,
          };
          reqBody.filters.push({
            name: "channel",
            value: props.planDetails?.data?.channel,
          });
          if (props.planDetails?.data?.sub_channel?.length > 0) {
            reqBody.filters.push({
              name: "sub_channel",
              value: props.planDetails?.data?.channel,
            });
          }
          if (props.planDetails?.data?.selling_period) {
            reqBody.selling_period = props.planDetails?.data?.selling_period;
          } else {
            reqBody.selling_period = [
              {
                start_date: props.planDetails?.data?.selling_period_sdate,
                end_date: props.planDetails?.data?.selling_period_edate,
                weightage: "100",
              },
            ];
          }
          const clusterResp = await props.runCluster(reqBody);
          if (clusterResp.data.data.status) {
            const reqId = clusterResp.data.data.request_id;
            //Poll to the server till we receive the response
            pollingService(
              `${CLUSTER_POLL}${reqId}`,
              onClusteringSucess,
              onClusteringFailure
            );
            displaySnackMessages(
              "Please wait for sometime till we process the cluster",
              "success"
            );
          } else {
            displaySnackMessages("Clustering Failed", "error");
            props.setIntelligentClusterLoader(false);
          }
        }
      } catch (error) {
        props.setIntelligentClusterLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
      setEnableStep(1.2);
    } else {
      if (
        props.history.location.pathname.includes("cluster-smart") ||
        props.history.location.pathname.includes("cluster-dashboard")
      ) {
        setClusterSmartNavigate(true);
      } else {
        setShowSaveClusterDialog(true);
      }
    }
  };

  const getClusterName = (cluster) => {
    if (cluster.cluster_display_name) {
      return cluster.cluster_display_name;
    } else if (props.planDetails?.data?.selected_attribute?.length === 2) {
      return cluster.g_cluster;
    } else if (props.planDetails?.data?.selected_attribute?.length === 1) {
      if (props.planDetails?.data?.selected_attribute.includes("performance")) {
        return cluster.performance_cluster_name;
      } else {
        return cluster.attribute_cluster_name;
      }
    } else {
      return cluster.g_cluster;
    }
  };

  const getEditClusterData = () => {
    let editData = [];
    props.planDetails?.data?.channel.forEach(async (chan) => {
      if (!Plan.__Ecom_Channel.includes(chan)) {
        let planData = props.planDetails?.data;
        let filterData = getPlanPayload(
          planData,
          props.planLevels,
          false,
          true
        );
        filterData = filterData.filters.filter(
          (obj) => obj.attribute_name !== "plan_code"
        );
        filterData.push({
          attribute_name: "date",
          value: planData.selling_period?.length
            ? [
                planData?.selling_period?.[0]?.start_date,
                planData?.selling_period?.[0]?.end_date,
              ]
            : [planData.selling_period_sdate, planData.selling_period_edate],
          operator: "between",
        });
        filterData.push({
          attribute_name: "channel",
          operator: "in",
          value: chan ? [chan] : [planData.channel?.[0]],
        });
        let payload = {
          cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
          performance_bucket_id: parseInt(performanceBucketId[chan]),
          attribute_bucket_id: parseInt(attributeBucketId[chan]),
          channel: chan,
          filters: filterData,
        };
        let allChannelResponse = await props.getClusterBreakdownData(payload);

        let data =
          (await allChannelResponse?.data?.data?.length) &&
          allChannelResponse?.data?.data?.map((table, index) => {
            let attribute_name = table.attribute_cluster_name;
            let performance_name = table.performance_cluster_name;
            if (table.attribute_cluster_name.includes(chan)) {
              attribute_name = table.attribute_cluster_name.split(`${chan} `);
              attribute_name.unshift(chan);
            }
            if (table.performance_cluster_name.includes(chan)) {
              performance_name = table.performance_cluster_name.split(
                `${chan} `
              );
              performance_name.unshift(chan);
            }
            if (attribute_name?.length > 1) {
              table.cluster_code =
                attribute_name[0] +
                " " +
                attribute_name[2] +
                performance_name[2];
              table.g_cluster =
                attribute_name[0] +
                " " +
                attribute_name[2] +
                performance_name[2];
            } else {
              table.cluster_code =
                table.attribute_cluster_name + table.performance_cluster_name;
              table.g_cluster =
                table.attribute_cluster_name + table.performance_cluster_name;
            }
            table.uniqueID = table.g_cluster + index;
            table.channel = chan;
            editData.push(table);
            return table;
          });
        editData = uniqBy(editData, "g_cluster");
        let editTableData = editData.map((cluster) => {
          let jsonData = {
            cluster_code: cluster.g_cluster,
            attribute_cluster_name: cluster.attribute_cluster_name,
            performance_cluster_name: cluster.performance_cluster_name,
            cluster_name: getClusterName(cluster),
          };
          if (isChannelMultiple(props.planDetails?.data)) {
            jsonData.channel = cluster.channel;
          }
          return jsonData;
        });
        setEditDataLoader(false);
        setClusterEditTableData(editTableData);
        return editData;
      }
    });
  };

  useEffect(() => {
    let channelLength = props.planDetails?.data?.channel?.length;
    channelLength = channelContainsEcomPlan(props.planDetails?.data)
      ? channelLength - 1
      : channelLength;
    if (
      channelLength > 0 &&
      Object.keys(attributeBucketId)?.length === channelLength &&
      Object.keys(performanceBucketId)?.length === channelLength
    ) {
      setEditDataLoader(true);
      getEditClusterData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(attributeBucketId),
    JSON.stringify(performanceBucketId),
    !prefFetching,
  ]);

  //This will render the respective active Step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <LoadingOverlay loader={props.cluster_stepper_loader}>
            <ClusterInputComponent
              isPlanInfoFetched={isPlanInfoFetched}
              filters={planDeptLevels}
              planDeptLevels={planDeptLevels}
              attributeSelection={attributeSelection}
              setAttributeSelection={setAttributeSelection}
              setPlanDataSelected={setPlanDataSelected}
            />
          </LoadingOverlay>
        );
      case 1:
        return (
          <FinalizeClusterComponent
            setAttributeBucketId={setAttributeBucketIdFn}
            setPerformanceBucketId={setPerformanceBucketIdFn}
            selectedValue={selectedValue}
            setSelectedValue={setSelectedValue}
            setClusterEditTableData={setClusterEditTableData}
            clusterEditTableData={clusterEditTableData}
            perfAttrCharLabel={perfAttrCharLabel}
            attributeBucketId={attributeBucketId}
            performanceBucketId={performanceBucketId}
            getEditClusterData={getEditClusterData}
            editDataLoader={editDataLoader}
            perfLoader={perfLoader}
            attributeSelection={attributeSelection}
          />
        );
      default:
        return;
    }
  };
  const closeSaveClusterDialog = () => {
    setShowSaveClusterDialog(false);
  };
  const closeClusterSmartNavigate = () => {
    setClusterSmartNavigate(false);
  };

  const navigateToClusterDashboard = () => {
    //TODO: finalizecluster api integration for cluster smart
    props.history.push(CLUSTERING_DASHBOARD);
  };

  const getFinalClusterBucketSavePayload = (clusterEditInstance) => {
    let payload = {
      cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
    };
    let bucketsJson = {};
    let clusterNameJson = {};
    if (clusterEditInstance) {
      let displayData = [];
      clusterEditInstance?.current?.api?.forEachNode((node) => {
        if (node?.data?.cluster_name) {
          displayData.push(node?.data);
        } else {
          let dataset = cloneDeep(node?.data);
          if (perfAttrCharLabel?.perf_char_label === "True") {
            dataset.cluster_name =
              dataset.attribute_cluster_name.match(/\d+/)[0] +
              dataset.performance_cluster_name;
          } else {
            dataset.cluster_name =
              dataset.attribute_cluster_name +
              dataset.performance_cluster_name.match(/\d+/)[0];
            displayData.push(dataset);
          }
          displayData.push(dataset);
        }
      });
      displayData?.forEach((data) => {
        if (
          data.attribute_cluster_name !== "null" &&
          data.performance_cluster_name !== "null"
        ) {
          if (perfAttrCharLabel?.perf_char_label === "True") {
            let prefId = data.performance_cluster_name;
            if (isEmpty(clusterNameJson[data.cluster_name])) {
              clusterNameJson[data.cluster_name] = {
                attribute_bucket_id: data.attribute_cluster_name.match(
                  /\d+/
                )[0],
                performance_bucket_id: prefId,
              };
            } else {
              isDisplayChangeValid = false;
              displaySnackMessages(
                "Display cluster name should be unique",
                "error"
              );
            }
          } else {
            let prefId = data.performance_cluster_name.match(/\d+/)[0];
            if (isEmpty(clusterNameJson[data.cluster_name])) {
              clusterNameJson[data.cluster_name] = {
                attribute_bucket_id: data.attribute_cluster_name,
                performance_bucket_id: prefId,
              };
            } else {
              isDisplayChangeValid = false;
              displaySnackMessages(
                "Display cluster name should be unique",
                "error"
              );
            }
          }
        }
      });
    }
    props.planDetails?.data?.channel.forEach((chan) => {
      if (Plan.__Ecom_Channel.includes(chan)) {
        bucketsJson[chan] = {
          attribute_bucket_id: 1,
          performance_bucket_id: 1,
        };
        if (isEmpty(clusterNameJson[chan])) {
          clusterNameJson[chan] = {
            attribute_bucket_id: "ECOMM A",
            performance_bucket_id: "1",
          };
        }
      } else {
        bucketsJson[chan] = {
          attribute_bucket_id: attributeBucketId[chan],
          performance_bucket_id: performanceBucketId[chan],
        };
      }
    });
    payload.buckets = bucketsJson;
    payload.cluster_display_name = clusterNameJson;

    return payload;
  };

  const navigateToPlanComponent = async (clusterEditInstance = "") => {
    setShowSaveClusterDialog(false);
    set1_2_Loader(true);
    if (!isEcomPlan(props.planDetails?.data)) {
      let payload = await getFinalClusterBucketSavePayload(clusterEditInstance);
      if (isDisplayChangeValid) {
        const finalClusterBucketSaveResponse = await props.finalClusterBucketSave(
          payload
        );
        if (finalClusterBucketSaveResponse) {
          if (props.history.location.pathname.includes("cluster-smart")) {
            navigateToClusterDashboard();
          } else if (
            props.history.location.pathname.includes("cluster-dashboard")
          ) {
            props.history.push(ASSORT_CLUSTER_DASHBOARD);
          }
        }
      }
    } else {
      props.history.push(ASSORT_CLUSTER_DASHBOARD);
    }

    set1_2_Loader(false);
  };

  useEffect(() => {
    if (props.planDetails?.status) {
      setEnableStep(props.planDetails?.data?.plan_step);
      if (isEcomPlan(props.planDetails?.data)) {
        setActiveStep(0);
      }
      if (props.planDetails?.data?.selected_attribute) {
        ATTRIBUTES_CLUSTERING?.forEach((attr) => {
          if (
            props.planDetails?.data?.selected_attribute?.includes(attr.value)
          ) {
            attributeSelection[attr.value] = true;
          } else {
            attributeSelection[attr.value] = false;
          }
        });
        setAttributeSelection(attributeSelection);
      } else {
        attributeSelection["performance"] = true;
        attributeSelection["product"] = true;
        setAttributeSelection(attributeSelection);
      }
      //TODO: change attribute selection based on plandetails api response
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (props.planLevels?.status && props.planDetails?.data) {
      props.setLevelsJson(generateLevelJson(props.planLevels.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planLevels, props.planDetails]);

  const classes = useStyles();
  return (
    <>
      <AssortBreadCrumbs
        planStep={1.1}
        location={props?.history?.location?.pathname}
      />
      <Container maxWidth={false}>
        <div className={globalClasses.marginBottom}>
          <Stepper
            steps={steps}
            activeIndex={activeStep}
            setActiveIndex={traverseToStep}
          />
        </div>
        <div>
          <Typography component={"span"}>
            {getStepContent(activeStep)}
          </Typography>
          <div className={classes.textCenter}>
            {activeStep > 0 ? (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setActiveStep(activeStep - 1)}
                id="assortClusterBackBtn"
                className={classes.smallPrimaryButton}
              >
                Back
              </Button>
            ) : null}
            {activeStep >= 0 &&
              !(activeStep === 0 && !props.displayAttribTable) && (
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  onClick={onSave}
                  id={
                    activeStep === 1
                      ? "assortClusterSaveBtn"
                      : "assortClusterRunClusterGrpsBtn"
                  }
                  endIcon={<ChevronRightIcon />}
                  className={classes.smallPrimaryButton}
                  disabled={
                    activeStep === 0
                      ? props.loader_1_1 || props.cluster_stepper_loader
                      : props.isLoading || props.cluster_stepper_loader
                  }
                >
                  {activeStep === 1 ||
                  (isEcomPlan(props.planDetails?.data) &&
                    props.planDetails?.data?.channel?.length === 1)
                    ? "Save"
                    : "Run Cluster Groups"}
                </Button>
              )}
          </div>
        </div>
      </Container>

      <Prompt
        isOpen={showSaveClusterDialog}
        title="Confirm Saving cluster"
        subHeading={
          isEcomPlan(props.planDetails?.data)
            ? "Do you want to continue creating the plan?"
            : "You have successfully created the cluster(s). Do you want to continue creating the plan?"
        }
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            navigateToPlanComponent();
            closeSaveClusterDialog();
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => closeSaveClusterDialog(),
        }}
      />

      <Prompt
        isOpen={showFinalizedClusterEditInstance}
        title="Confirm Saving cluster"
        subHeading={
          "This plan is already in use do you want to continue to change?"
        }
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            navigateToPlanComponent(showFinalizedClusterEditInstance);
            setShowFinalizedClusterEditInstance(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowFinalizedClusterEditInstance(false),
        }}
        variant="warning"
      />

      {clusterSmartNavigate && (
        <EditClusterNameComponent
          tableData={clusterEditTableData}
          showEditCluster={setClusterSmartNavigate}
          closeClusterSmartNavigate={closeClusterSmartNavigate}
          navigateToPlanComponent={navigateToPlanComponent}
          setShowFinalizedClusterEditInstance={
            setShowFinalizedClusterEditInstance
          }
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    cluster_stepper_loader: commonAssortServiceActions.intelligent_cluster_stepper_loaderSelector(
      store
    ),
    clusterAttributes: clusterInputServiceActions.clusterAttributesSelector(
      store
    ),
    selectedProductAttributes: clusterInputServiceActions.selectedProductAttributesSelector(
      store
    ),
    selectedPerformanceAttributes: clusterInputServiceActions.selectedPerformanceAttributesSelector(
      store
    ),
    isMinAttributesSelected: clusterInputServiceActions.isMinAttributesSelectedSelector(
      store
    ),
    selectedStoreGrp: clusterInputServiceActions.selectedStoreGrpSelector(
      store
    ),
    displayAttribTable: clusterInputServiceActions.displayAttribTableSelector(
      store
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    planStepNames: commonAssortServiceActions.planStepNamesSelector(store),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(store),
    isLoading: finalizeClusterServiceActions.loader_1_2Selector(store),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
    loader_1_1:
      clusterInputServiceActions.clusterInputIndexLoader_1_1Selector(store) ||
      clusterInputServiceActions.clusterInputEditPlanLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputStoreSelectionLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputAttributesTableLoader_1_1Selector(
        store
      ),
  };
};
const mapActionsToProps = {
  setIntelligentClusterLoader,
  getPlanDetails,
  setPlanDetails,
  getFiltersValues,
  getPlanLevels,
  setPlanLevels,
  addSnack,
  runCluster,
  finalClusterBucketSave,
  updateAttributes,
  setLevelsJson,
  addEcomCluster,
  setActiveScreenName,
  getTenantConfigApplicationLevel,
  set1_2_Loader,
  setDisplayAttribTable,
  resetClusterSelectionFields,
  getClusterPlanDetails,
  setClusterPlanDetails,
  setScreenConfiguration,
  getDropdownValues,
  getClusterBreakdownData,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(ClusteringStepperComponent));
