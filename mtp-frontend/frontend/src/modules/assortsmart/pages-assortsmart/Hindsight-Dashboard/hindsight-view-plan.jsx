import { useState, useEffect } from "react";
import { connect } from "react-redux";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  getHindsightPlanDetails,
  setHindsightPlanDetails,
  setHindsightLoader
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightCreateNewView from "./hindsight-create-new-view";
import { isEmpty } from "lodash";

const HindsightViewPlan = (props) => {

  const fetchPlanDetails = async () => {
    try {
      props.setHindsightLoader(true);
      const plandetails = await props.getHindsightPlanDetails(
        props.match.params.planCode,
        "assort-smart"
      );
      if (plandetails?.data?.status) {
        props.setHindsightPlanDetails(plandetails?.data?.data);
      }
    } catch (error) {
      props.setHindsightLoader(false);
      props.addSnack({
        message: "Fetching hindsight plan details failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, []);

  return (
    <>
      {!isEmpty(props.hindsightPlanDetails) && (
        <HindsightCreateNewView view_type={"edit"} />
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    loader: HindsightServiceActions.setHindsightLoaderSelector(state),
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  getHindsightPlanDetails,
  setHindsightPlanDetails,
  setHindsightLoader
};
export default connect(mapStateToProps, mapActionsToProps)(HindsightViewPlan);
