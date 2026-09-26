import { Button, Paper } from "@mui/material";
import StoresDropDown from "./stores-dropdown";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import {
  getStoreChannels,
  updatePlanAPI,
  calculateSigScore,
  setClusterInputLoader,
  setDisplayAttribTable,
  setSelectedStoreGrp,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import { connect } from "react-redux";
import { setPlanDetails } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  isEcomPlan,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  runSigScore,
  generateStoreGrps,
  onStoreGrpChange,
  handleAttributeChange,
} from "./store-selection-functions";
import AttributeSelection from "./attribute-selection";
import { updateClusterPlan } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { extractDropsArr } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { configureFiltersResponse } from "./common-functions";
import { cloneDeep } from "lodash";
import { useHistory } from "react-router";
const StoreSelection = (props) => {
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();
  const history = useHistory();
  const location = history.location.pathname;

  const handleNextStep = async () => {
    let planDetails = cloneDeep(props.planDetails);
    const selectedAttribute = [];
    for (const key in props.attributeSelection) {
      //Take selected attributes into an array & check if array is non-empty to proceed
      if (props.attributeSelection[key]) {
        selectedAttribute.push(key);
      }
    }
    if (!selectedAttribute?.length) {
      props.addSnack({
        message: "Please select attribute before proceeding",
        options: {
          variant: "error",
        },
      });
      return;
    }
    planDetails["data"]["selected_attribute"] = selectedAttribute;
    props.setPlanDetails(planDetails);
    sessionStorage.setItem("planData", JSON.stringify(planDetails));
    const reqBody = {
      ...planDetails.data,
      drops: extractDropsArr(props.planDetails["data"], "edit"),
      flow: extractDropsArr(props.planDetails["data"], "edit"),
      ...(typeof props.selectedStoreGroup === "number" &&
        props.selectedStoreGroup % 1 === 0 && {
          store_group_id: props.selectedStoreGroup,
        }),
      filters: configureFiltersResponse(
        props.planDeptLevels,
        props.planDetails["data"]
      ),
    };
    if (
      location.includes("cluster-smart") ||
      location.includes("cluster-dashboard")
    ) {
      let sellingPeriod = [];
      if (!props.planDetails?.data?.selling_period) {
        sellingPeriod.push({
          end_date: props.planDetails["data"].selling_period_edate,
          start_date: props.planDetails["data"].selling_period_sdate,
          weightage: 100,
        });
        reqBody["selling_period"] = sellingPeriod;
      }
    }
    try {
      const updatePlan = await props.updateClusterPlan(
        reqBody,
        props.planDetails?.data?.cluster_plan_code
      );
      if (updatePlan?.data?.status) {
        const response = await props.getClusterPlanDetails(
          props.planDetails?.data?.cluster_plan_code
        );
        if (response?.data.status) {
          props.setPlanDetails(response?.data);
          props.addSnack({
            message: "Plan updated successfully",
            options: {
              variant: "success",
            },
          });
          sessionStorage.setItem("planData", JSON.stringify(response?.data));
          runSigScore(response?.data, props);
        }
      }
    } catch (error) {
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  return (
    <>
      <Paper className={globalClasses.paper}>
        <AttributeSelection
          attributeSelection={props.attributeSelection}
          onChange={(option) => handleAttributeChange(props, option)}
          {...props}
        />
        <StoresDropDown
          selectedGrp={props.selectedStoreGrp}
          selectedChannel={props.selectedChannel}
          onChange={(option) => onStoreGrpChange(props, option)}
          stores={generateStoreGrps(
            props,
            props.storeGrps,
            isEcomPlan(props.planDetails.data) ||
              isWholesalePlan(props.planDetails.data)
              ? "All Stores"
              : ""
          )}
        />
        {!props.displayAttributes && (
          <div className={sharedClasses.buttonDiv}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNextStep}
              disabled={props.selectedStoreGrp === ""}
              id="assortClusterNextStpBtn"
            >
              Proceed to next Step
            </Button>
          </div>
        )}
      </Paper>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    selectedStoreGrp: clusterInputServiceActions.selectedStoreGrpSelector(
      store
    ),
    displayAttributes: clusterInputServiceActions.displayAttribTableSelector(
      store
    ),
    clusterInputFilterData: clusterInputServiceActions.clusterInputFilterDataSelector(
      store
    ),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
  };
};
const mapActionsToProps = {
  getStoreChannels,
  setPlanDetails,
  updatePlanAPI,
  calculateSigScore,
  setClusterInputLoader,
  setDisplayAttribTable,
  setSelectedStoreGrp,
  addSnack,
  updateClusterPlan,
};
export default connect(mapStateToProps, mapActionsToProps)(StoreSelection);
