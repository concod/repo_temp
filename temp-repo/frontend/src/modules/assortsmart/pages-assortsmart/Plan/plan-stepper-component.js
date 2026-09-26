import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Button, Card, Container, Grid, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useHistory } from "react-router";
import { replaceCharacter } from "core/Utils/formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { Prompt, Stepper } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import { DASHBOARD } from "modules/assortsmart/constants-assortsmart/routesContants";
import {
  getPlanDetails,
  setLevelsJson,
  setColumnHeaderJson,
} from "../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { optimizeDropFlowConfiguration } from "../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";

import { setClusterPlanDetails } from "core/pages/commonModulesServices/cluster-plan-service";
import {
  Plan,
  common,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  setActiveScreenName,
  setScreenConfiguration,
} from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  generateLevelJson,
  getLevelFilters,
  isEcomPlan,
  updateLyColumnHeading,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { getClusterPlanDetails } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import moment from "moment";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  getPlanLevels,
  setDashboardLoader,
  setPlanDetails,
  setPlanLevels,
} from "../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { updateDepthChoiceData } from "../../services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import {
  clearFinalizeData,
  finalizePlan,
} from "../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import {
  getStoreEligibilityData,
  setDynamicLevelFilters,
  setStoreEligibilityData,
  updateClusterOptData,
} from "../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  updateStyleWedgeData,
  updateWedgeData,
} from "../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import BOPReceiptDrawerComponent from "./BOP-ReceiptDrawer/bop-receipt-drawer-root-component";
import PlanDepthChoiceComponent from "./Plan-Depth-Choice/depth-choice-root-component";
import PlanFinalizeComponent from "./Plan-Finalize/plan-finalize-root-component";
import PlanBudgetComponent from "./Plan-Initial/budget-root-component";
import PlanWedgeRootComponent from "./Plan-Wedge/plan-wedge-root-component";
import ViewClusterDetailsComponent from "./View-Cluster-Details/view-cluster-details-component";
import PlanDataComponent from "./plan-filter-data-component";
import "./plan.scss";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";

const PlanComponent = (props) => {
  const [activeStep, setActiveStep] = useState(0);
  const [disableNext, setDisableNext] = useState(true);
  const [clusterData, setClusterData] = useState([]);
  const [invalidL3Clusters, setInvalidL3Clusters] = useState([]);
  const [depthChoiceData, handleDepthChoiceData] = useState({});
  const [wedgeData, setWedgeData] = useState({});
  const [isDepthChoiceWarning, setIsDepthChoiceWarning] = useState(false);
  const [isDepthChoiceError, setIsDepthChoiceError] = useState(false);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);
  const [showBOP, setShowBOP] = useState(false);
  const [initialLoadBudgetComponent, setInitialLoadBudgetComponent] = useState(
    true
  );
  const [initialLoadDepthChoice, setInitialLoadDepthChoice] = useState(true);
  const [initialLoadWedge, setInitialLoadWedge] = useState(true);
  const [initialLoadFinalize, setInitialLoadFinalize] = useState(false);
  const [fromDashboardScreen_2_1, setFromDashboardScreen_2_1] = useState(false);
  const [fromDashboardScreen_2_2, setFromDashboardScreen_2_2] = useState(false);
  const [fromDashboardScreen_2_3, setFromDashboardScreen_2_3] = useState(false);
  const [fromDashboardScreen_2_4, setFromDashboardScreen_2_4] = useState(false);
  const [loadStepperContent, setLoadStepperContent] = useState(false);
  const [enableStep, setEnableStep] = useState(2.1);
  const [showViewClusterModal, setShowViewClusterModal] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [wedgeValidationMsg, setWedgeValidationMsg] = useState("");
  const [isClusterNameSet, setIsClusterNameSet] = useState(false);
  const [clusterEditTableData, setClusterEditTableData] = useState([]);
  const [callValidateWedgeData, setCallValidateWedgeData] = useState(false);
  const [currentBopPlan, setCurrentBopPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDepthChoiceChanged, setIsDepthChoiceChanged] = useState(false);
  const [statusImageMap, setStatusImageMap] = useState(false);

  const history = useHistory();

  const stepValue = { 0: 2.1, 1: 2.2, 2: 2.3, 3: 2.4 };

  const [steps, setSteps] = useState([
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Plan.__Plan,
    },
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Plan.__Depth_Choice,
    },
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Plan.__Wedge,
    },
    {
      isEditable: true,
      isCompleted: false,
      screenCode: Plan.__Finalize_Buy,
    },
  ]);

  useEffect(() => {
    props.setDashboardLoader(true);
    const planCode = props.match.params.planCode;
    const fetchData = async () => {
      if (isEmpty(props.screenConfiguration)) {
        let configResp = await getTenantConfigApplicationLevel(2, {
          attribute_name: "assort_smart_screen_configuration",
        })();
        if (configResp?.data?.status) {
          props.setScreenConfiguration(
            configResp?.data?.data?.[0]?.attribute_value
          );
        }
      }
      if (!isEmpty(props.screenConfiguration)) {
        let levelData = await props.getPlanLevels();
        let response = await props.getPlanDetails(
          parseInt(planCode || 0),
          props.screenConfiguration?.common?.endpoint_project_name ||
            "assort-smart"
        );
        if (!isEmpty(response?.data?.data)) {
          props.setPlanLevels(levelData?.data);
          props.setPlanDetails(response.data);
          sessionStorage.setItem("planData", JSON.stringify(response.data));
          setLoadStepperContent(true);
        } else {
          props.addSnack({
            message: response?.data?.message,
            options: {
              variant: "error",
            },
          });
        }
        props.setDashboardLoader(false);
      }
    };
    fetchData();
    activateStep(props.location?.state?.planStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.screenConfiguration]);

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
    activateStep(selectedIndex);
    setActiveStep(selectedIndex);
    const selectedScreenCode = steps.filter((_step, index) => {
      return index === selectedIndex;
    });
    props.setActiveScreenName(
      props.planStepNames[selectedScreenCode?.[0]?.screenCode]
    );
    sessionStorage.setItem(
      "activeScreenName",
      props.planStepNames[selectedScreenCode?.[0]?.screenCode]
    );
  };

  useEffect(() => {
    if (!isEmpty(props.levelsJson)) {
      let dynamicFilters = [];
      Object.keys(props.levelsJson).forEach((levelKey) => {
        if (props.planDetails?.data?.[levelKey]?.length > 1) {
          dynamicFilters.push(levelKey);
        }
      });
      setDynamicLevelFilters(dynamicFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, props.levelsJson);

  const sendWedgeTableData = async (wedgeTableData, updateWedge) => {
    setWedgeData(wedgeTableData);
    if (updateWedge) {
      let payload = {
        plan_wedge_data: wedgeTableData,
        is_scaling: false,
        is_update_plan_step: true,
        plan_sub_step: "finalize_table",
        is_value_changed: true,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        payload["wedge_level"] = "choice_level";
      }
      let updatedDataResult = await props.updateWedgeData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updatedDataResult?.status) {
        return true;
      }
    }
  };

  const activateStep = (plan_step) => {
    props.setActiveScreenName(props.planStepNames[plan_step]);
    sessionStorage.setItem("activeScreenName", props.planStepNames[plan_step]);
    if (plan_step === 2.1) {
      setActiveStep(0);
      setFromDashboardScreen_2_1(false);
    } else if (plan_step === 2.2) {
      setActiveStep(1);
      setFromDashboardScreen_2_1(true);
      if(props.planDetails?.data?.plan_sub_step === "depth-choice-table"){
        setFromDashboardScreen_2_2(true)
      }
    } else if (plan_step === 2.3) {
      setActiveStep(2);
      setFromDashboardScreen_2_1(true);
      setFromDashboardScreen_2_2(true);
      if (
        props.planDetails?.data?.plan_sub_step ===
        "optimization_constraint_table"
      ) {
        setFromDashboardScreen_2_3(false);
      }
      if(props.planDetails?.data?.plan_sub_step === "wedge_table"){
        setFromDashboardScreen_2_3(true)
      }
    } else if (plan_step === 2.4) {
      setActiveStep(3);
      setFromDashboardScreen_2_1(true);
      setFromDashboardScreen_2_2(true);
      setFromDashboardScreen_2_3(true);
    } else if (plan_step === 3 || plan_step === 4) {
      setActiveStep(3);
      setFromDashboardScreen_2_1(true);
      setFromDashboardScreen_2_2(true);
      setFromDashboardScreen_2_3(true);
      setFromDashboardScreen_2_4(true);
      setShowReceiptDrawer(true);
    }
  };

  useEffect(() => {
    if (props.planDetails?.status) {
      setEnableStep(props.planDetails?.data?.plan_step);
    }
    activateStep(props.planDetails?.data?.plan_step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  useEffect(() => {
    return () => {
      props.setPlanDetails([]);
      sessionStorage.setItem("planData", []);
    };
  }, []);

  const getClusterDetails = async () => {
    const response = await props.getClusterPlanDetails(
      props.planDetails?.data?.cluster_plan_code
    );
    let planData = cloneDeep(props.planDetails);
    planData.data.cluster_plan_name = response?.data?.data?.name;
    props.setPlanDetails(planData);
    sessionStorage.setItem("planData", JSON.stringify(planData));
    props.setClusterPlanDetails(response?.data);
    setIsClusterNameSet(true);
    setDashboardLoader(false);
  };

  useEffect(() => {
    if (props.planDetails?.data?.cluster_plan_code) {
      setDashboardLoader(true);
      getClusterDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data?.cluster_plan_code]);

  useEffect(() => {
    if (activeStep === 2) {
      setShowBOP(true);
    } else {
      setShowBOP(false);
    }
  }, [activeStep]);

  useEffect(() => {
    if (props.planLevels?.status && props.planDetails?.data) {
      props.setLevelsJson(generateLevelJson(props.planLevels.data));
      let tempLevelsJson = {
        LY:
          props.planDetails.data?.compare_year < 0
            ? updateLyColumnHeading(props.planDetails.data?.compare_year)
            : props.planDetails?.data?.compare_season || "Ref Season",
        ...generateLevelJson(props.planLevels.data),
      };
      props.setColumnHeaderJson(tempLevelsJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planLevels, props.planDetails]);

  const toggleViewClusterModal = (value) => {
    setShowViewClusterModal(value);
  };

  useEffect(() => {
    const fetchData = async () => {
      const planData = props.planDetails.data;
      let payload = {
        plan_code: planData.plan_code,
        filters: {
          l0_name: planData.l0_name,
          l1_name: planData.l1_name,
          l2_name: planData.l2_name,
        },
      };
      let getStoreEligibilityDataResponse = await props.getStoreEligibilityData(
        payload
      );
      if (getStoreEligibilityDataResponse?.data?.status) {
        props.setStoreEligibilityData(
          getStoreEligibilityDataResponse.data.data.summary
        );
      }
    };
    if (
      props.planDetails?.data?.plan_code &&
      props.screenConfiguration.common?.show_store_eligiblity
    ) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  useEffect(() => {
    if (activeStep === 2 && props.wedgeAttributeData?.length) {
      setCallValidateWedgeData(true);
    }
  }, [wedgeData, props.wedgeAttributeData]);

  const handleNext = async () => {
    props.setDashboardLoader(true);
    let planCode = props.planDetails?.data?.plan_code;
    let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
    if (planCode === AssortNLE) {
      localStorage.removeItem("AssortNLE");
    }
    if (activeStep === 0) {
      setInitialLoadDepthChoice(true);
      setFromDashboardScreen_2_2(false);
      setInitialLoadDepthChoice(true);
      setInitialLoadWedge(true);
      setInitialLoadFinalize(true);
      setFromDashboardScreen_2_3(false);
      setFromDashboardScreen_2_4(false);
      if (
        props.screenConfiguration["2.1"]?.budget_optimization_level?.includes(
          "carryover"
        ) &&
        props.planDetails?.data?.[
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        ] > 1
      ) {
        setActiveStep(activeStep + 1);
        setEnableStep(2.2);
        setDisableNext(true);
      } else {
        setLoading(true);
        if (invalidL3Clusters?.length > 0) {
          props.addSnack({
            message: `Penetration exceeding/less than 100% for ${invalidL3Clusters.join(
              ","
            )}`,
            options: {
              variant: "warning",
            },
          });
        }
        let updateResponse = await props.updateClusterOptData(
          {
            cluster_plan_data: clusterData.cluster_plan_data,
            is_update_plan_step: true,
            plan_sub_step: "aps_st_table",
            is_value_changed: clusterData.is_value_changed,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        setLoading(false);
        if (updateResponse?.data?.status) {
          if (
            props.screenConfiguration[
              "2.1"
            ]?.budget_optimization_level?.includes("carryover") &&
            props.planDetails?.data?.[
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
            ] === 1
          ) {
            const planData = props.planDetails?.data,
              drops = [];
            for (
              let index = 1;
              index <=
              planData?.[
                `${
                  props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              ];
              index++
            ) {
              drops.push(
                planData[
                  `${props.screenConfiguration?.common?.drop_key || "drops"}_` +
                    index
                ]
              );
            }
            const payload = {
              filters: [
                {
                  attribute_name: "plan_code",
                  value: [planData?.plan_code],
                  operator: "in",
                },
                ...getLevelFilters(planData, props.planLevels),
                {
                  attribute_name: "date",
                  value: [
                    "'" +
                      moment(planData.selling_period_sdate).format(
                        "YYYY-MM-DD"
                      ) +
                      "' and '" +
                      moment(planData.selling_period_edate).format(
                        "YYYY-MM-DD"
                      ) +
                      "'",
                  ],
                  operator: "between",
                },
                {
                  attribute_name:
                    props.screenConfiguration?.common?.drop_key || "drop",
                  value: drops,
                  prefix: "levels",
                  operator: "in",
                },
                {
                  attribute_name: "channel",
                  value: planData?.channel,
                  operator: "in",
                  prefix: "levels",
                },
                {
                  attribute_name: "sub_channel",
                  value: planData?.sub_channel
                    ? planData?.sub_channel
                    : planData?.channel,
                  operator: "in",
                  prefix: "levels",
                },
              ],
              compare_type: planData?.compare_year,
            };
            if (planData?.data_pull_source) {
              payload.data_pull_source = planData?.data_pull_source;
            }
            payload.compare_season = planData?.compare_season || "";
            let dropConfigResponse = await props.optimizeDropFlowConfiguration(
              payload
            );
            if (dropConfigResponse?.data?.data?.status) {
              setActiveStep(activeStep + 1);
              setEnableStep(2.2);
              setDisableNext(true);
            }
          } else {
            setActiveStep(activeStep + 1);
            setEnableStep(2.2);
            setDisableNext(true);
          }
        }
      }
    } else if (activeStep === 1) {
      if (isDepthChoiceError) {
        props.addSnack({
          message: `Depth/Choice can't be zero for all ${props?.levelsJson?.l3_name}`,
          options: {
            variant: "Error",
          },
        });
      } else {
        setInitialLoadWedge(true);
        setInitialLoadFinalize(true);
        setFromDashboardScreen_2_3(false);
        setFromDashboardScreen_2_4(false);
        if (isDepthChoiceWarning) {
          props.addSnack({
            message: "Depth/Choice has been modified without Recalculating",
            options: {
              variant: "warning",
            },
          });
        }
        setLoading(true);
        depthChoiceData.is_value_changed = isDepthChoiceChanged;
        depthChoiceData.plan_sub_step = "optimization_constraint_table";
        depthChoiceData.is_update_plan_step = true;
        depthChoiceData.plan_code = props.planDetails?.data?.plan_code;
        let updateResponse = await props.updateDepthChoiceData(
          depthChoiceData,
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        setLoading(false);
        if (updateResponse?.data?.status) {
          setActiveStep(activeStep + 1);
          setEnableStep(2.3);
          setDisableNext(true);
        }
      }
    } else if (activeStep === 2) {
      if (wedgeValidationMsg === "") {
        setInitialLoadFinalize(true);
        setInitialLoadFinalize(true);
        setFromDashboardScreen_2_4(false);
        let payload = {
          plan_wedge_data: wedgeData,
          is_completed: true,
          is_scaling: false,
          is_update_plan_step: true,
          plan_sub_step: "finalize_table",
          is_value_changed: true,
        };
        if (
          props.screenConfiguration?.common?.show_style_level ||
          props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
        ) {
          payload["wedge_level"] = "choice_level";
        }
        setLoading(true);
        let updateResponse = await props.updateWedgeData(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        setLoading(false);
        if (updateResponse?.data?.status) {
          if (
            props.screenConfiguration?.common?.endpoint_project_name ===
              "assort-smart" &&
            !props.screenConfiguration?.common?.show_style_level
          ) {
            setLoading(true);
            let updateStyleResponse = await props.updateStyleWedgeData(
              {
                plan_code: planCode,
              },
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort"
            );
            setLoading(false);
            if (updateStyleResponse?.data?.status) {
              setActiveStep(activeStep + 1);
              setEnableStep(2.4);
              setDisableNext(true);
              props.clearFinalizeData();
            } else {
              props.addSnack({
                message: "Something went wrong",
                options: {
                  variant: "error",
                },
              });
            }
          } else {
            setActiveStep(activeStep + 1);
            setEnableStep(2.4);
            setDisableNext(true);
            props.clearFinalizeData();
          }
        }
      } else {
        props.addSnack({
          message: wedgeValidationMsg,
          options: {
            variant: "error",
          },
        });
      }
    } else {
      setActiveStep(activeStep + 1);
      setDisableNext(true);
    }
    props.setDashboardLoader(false);
  };

  const onFinalize = () => {
    setShowFinalizeDialog(true);
  };

  const callFinalizePlan = async () => {
    props.setDashboardLoader(true);
    setShowFinalizeDialog(false);
    let finalizeResponse = await props.finalizePlan(
      props.planDetails?.data?.plan_code,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (finalizeResponse?.data?.status) {
      props.history.push(DASHBOARD);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <PlanBudgetComponent
            setDisableNext={setDisableNext}
            sendClusterTableData={setClusterData}
            initialLoadBudgetComponent={initialLoadBudgetComponent}
            setInitialLoadBudgetComponent={setInitialLoadBudgetComponent}
            fromDashboardScreen_2_1={fromDashboardScreen_2_1}
            setInitialLoadDepthChoice={setInitialLoadDepthChoice}
            setInitialLoadWedge={setInitialLoadWedge}
            setInitialLoadFinalize={setInitialLoadFinalize}
            setFromDashboardScreen_2_2={setFromDashboardScreen_2_2}
            setFromDashboardScreen_2_3={setFromDashboardScreen_2_3}
            setFromDashboardScreen_2_4={setFromDashboardScreen_2_4}
            setShowReceiptDrawer={setShowReceiptDrawer}
            clusterData={clusterData}
            invalidL3Clusters={invalidL3Clusters}
            setInvalidL3Clusters={setInvalidL3Clusters}
          />
        );
      case 1:
        return (
          <PlanDepthChoiceComponent
            setDisableNext={setDisableNext}
            handleDepthChoiceData={handleDepthChoiceData}
            setIsDepthChoiceError={setIsDepthChoiceError}
            initialLoadDepthChoice={initialLoadDepthChoice}
            setInitialLoadDepthChoice={setInitialLoadDepthChoice}
            setIsDepthChoiceWarning={setIsDepthChoiceWarning}
            fromDashboardScreen_2_2={fromDashboardScreen_2_2}
            setShowReceiptDrawer={setShowReceiptDrawer}
            setInitialLoadWedge={setInitialLoadWedge}
            setInitialLoadFinalize={setInitialLoadFinalize}
            setFromDashboardScreen_2_2={setFromDashboardScreen_2_2}
            setFromDashboardScreen_2_3={setFromDashboardScreen_2_3}
            setFromDashboardScreen_2_4={setFromDashboardScreen_2_4}
            setIsDepthChoiceChanged={setIsDepthChoiceChanged}
            isDepthChoiceChanged={isDepthChoiceChanged}
          />
        );
      case 2:
        return (
          <PlanWedgeRootComponent
            initialLoadWedge={initialLoadWedge}
            setInitialLoadWedge={setInitialLoadWedge}
            fromDashboardScreen_2_3={fromDashboardScreen_2_3}
            setDisableNext={setDisableNext}
            disableNext={disableNext}
            sendWedgeTableData={sendWedgeTableData}
            setShowReceiptDrawer={setShowReceiptDrawer}
            setWedgeValidationMsg={setWedgeValidationMsg}
            callValidateWedgeData={callValidateWedgeData}
            setInitialLoadFinalize={setInitialLoadFinalize}
            setFromDashboardScreen_2_4={setFromDashboardScreen_2_4}
            statusImageMap={statusImageMap}
            setStatusImageMap={setStatusImageMap}
            setFromDashboardScreen_2_3={setFromDashboardScreen_2_3}
          />
        );
      case 3:
        return (
          <PlanFinalizeComponent
            setDisableNext={setDisableNext}
            initialLoadFinalize={initialLoadFinalize}
            setInitialLoadFinalize={setInitialLoadFinalize}
            fromDashboardScreen_2_4={fromDashboardScreen_2_4}
            setShowReceiptDrawer={setShowReceiptDrawer}
          />
        );
      default:
        return;
    }
  };

  const classes = useStyles();
  const globalClasses = globalStyles();
  return (
    <>
      <AssortBreadCrumbs
        planStep={2.1}
        location={props?.history?.location?.pathname}
      />
      <LoadingOverlay loader={props.isLoading || loading} spinner>
        <div style={{ width: "100%" }}>
          <Container maxWidth={false} className={globalClasses.marginBottom}>
            <Grid container direction="row">
              <Grid Item xs="10">
                <Stepper
                  steps={steps}
                  activeIndex={activeStep}
                  setActiveIndex={traverseToStep}
                />
              </Grid>
              {!isEcomPlan(props.planDetails?.data) && (
                <Grid Item xs="2">
                  <Button
                    variant="contained"
                    color="primary"
                    id="view-cluster-grade"
                    className={classes.button}
                    onClick={() => {
                      toggleViewClusterModal(true);
                    }}
                    endIcon={<ChevronRightIcon />}
                  >
                    View Cluster Details
                  </Button>
                </Grid>
              )}
            </Grid>
          </Container>
          <Container maxWidth={false}>
            <Card className={`${globalClasses.paper} ${globalClasses.scroll}`}>
              <PlanDataComponent />
            </Card>
          </Container>
          <Container maxWidth={false}>
            <Typography component={"span"}>
              <BOPReceiptDrawerComponent
                activeStep={stepValue[activeStep]}
                showReceiptDrawerIcon={
                  activeStep === 0 ? false : showReceiptDrawer
                }
                showBopIcon={showBOP}
                showNonLinearEditIcon={activeStep > 1 ? true : false}
                isWedgeOpen={!disableNext}
                setCurrentBopPlan={setCurrentBopPlan}
                currentBopPlan={currentBopPlan}
              />

              {loadStepperContent &&
                isClusterNameSet &&
                getStepContent(activeStep)}
              {showViewClusterModal && (
                <ViewClusterDetailsComponent
                  showViewClusterModal={showViewClusterModal}
                  toggleViewClusterModal={toggleViewClusterModal}
                  planDetails={props.planDetails}
                  setClusterEditTableData={setClusterEditTableData}
                  type="view-cluster-detail"
                />
              )}
            </Typography>
            <div className={classes.rightAlignButtonAssort}>
              {activeStep > 0 ? (
                <Button
                  color="primary"
                  variant="contained"
                  style={{ marginRight: "0.5rem" }}
                  onClick={() => setActiveStep(activeStep - 1)}
                  id="plan-stepper-back"
                >
                  Back
                </Button>
              ) : null}
              {activeStep >= 0 &&
                activeStep < 3 &&
                !history.location.pathname.includes("view") && (
                  <Button
                    type="submit"
                    color="primary"
                    onClick={handleNext}
                    disabled={disableNext}
                    variant="contained"
                    id="plan-stepper-next"
                    endIcon={<ChevronRightIcon />}
                  >
                    {activeStep === 1 ? "Save & Next" : "Next"}
                  </Button>
                )}

              {activeStep === 3 && (
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  onClick={onFinalize}
                  id="final-action"
                  disabled={
                    (props.reviewByAttributeGrade?.data?.data?.length ||
                      props.reviewBySizeData?.data?.data?.length) &&
                    !props.isLoading &&
                    !props.is_2_4_Screen_Loading
                      ? false
                      : true
                  }
                >
                  {!isEmpty(props.planStepNames) &&
                    props.planStepNames["Final_Action"]}
                </Button>
              )}
            </div>
          </Container>
        </div>

        <Prompt
          isOpen={showFinalizeDialog}
          title="Confirm Finalizing plan"
          subHeading="Are you sure you want to finalize the plan?"
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => {
              callFinalizePlan();
              setShowFinalizeDialog(false);
            },
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowFinalizeDialog(false),
          }}
        />
      </LoadingOverlay>
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
    reviewByAttributeGrade: planFinalizeServiceActions.reviewByAttributeGradeSelector(
      store
    ),
    reviewBySizeData: planFinalizeServiceActions.reviewBySizeDataSelector(
      store
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(store),
  };
};

const mapDispatchToProps = (dispatch) => ({
  getPlanDetails: (payload, endpoint) =>
    dispatch(getPlanDetails(payload, endpoint)),
  setPlanDetails: (payload) => dispatch(setPlanDetails(payload)),
  setClusterPlanDetails: (payload) => dispatch(setClusterPlanDetails(payload)),
  setDashboardLoader: (payload) => dispatch(setDashboardLoader(payload)),
  getPlanLevels: (payload) => dispatch(getPlanLevels(payload)),
  setPlanLevels: (payload) => dispatch(setPlanLevels(payload)),
  setLevelsJson: (payload) => dispatch(setLevelsJson(payload)),
  updateClusterOptData: (payload, endpoint) =>
    dispatch(updateClusterOptData(payload, endpoint)),
  updateDepthChoiceData: (payload, endpoint) =>
    dispatch(updateDepthChoiceData(payload, endpoint)),
  setColumnHeaderJson: (payload) => dispatch(setColumnHeaderJson(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setDynamicLevelFilters: (payload) =>
    dispatch(setDynamicLevelFilters(payload)),
  updateWedgeData: (payload, endpoint) =>
    dispatch(updateWedgeData(payload, endpoint)),
  updateStyleWedgeData: (payload, endpoint) =>
    dispatch(updateStyleWedgeData(payload, endpoint)),
  finalizePlan: (payload, endpoint) =>
    dispatch(finalizePlan(payload, endpoint)),
  setActiveScreenName: (payload) => dispatch(setActiveScreenName(payload)),
  getStoreEligibilityData: (payload) =>
    dispatch(getStoreEligibilityData(payload)),
  setStoreEligibilityData: (payload) =>
    dispatch(setStoreEligibilityData(payload)),
  getClusterPlanDetails: (payload) => dispatch(getClusterPlanDetails(payload)),
  setScreenConfiguration: (payload) =>
    dispatch(setScreenConfiguration(payload)),
  optimizeDropFlowConfiguration: (payload) =>
    dispatch(optimizeDropFlowConfiguration(payload)),
  clearFinalizeData: (payload) => dispatch(clearFinalizeData(payload)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlanComponent));
