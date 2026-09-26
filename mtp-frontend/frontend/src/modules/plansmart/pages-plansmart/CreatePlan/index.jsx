import React from "react";
import { useHistory } from "react-router-dom";
import HeaderBreadCrumbs from "../../../../core/Utils/HeaderBreadCrumbs";
import CreateNewPlan from "./create-new-plan";
import {
  PLAN_SMART_PRE_SEASON_DASHBOARD,
  PLAN_CREATE_NEW_PLAN,
} from "../../constants-plansmart/routesConstants";
import { useStyles } from "../plansmart-styles";
import {
  createPlanGetSeasonType,
  getMasterPlanCrumbsUrl,
} from "../plansmart-utility";

const CreatePlan = (props) => {
  const classes = useStyles();
  const history = useHistory();

  const seasonType = createPlanGetSeasonType(props.location.search);
  const dashboardRedirectionUrl = getMasterPlanCrumbsUrl(seasonType);

  const getPlanType = () => {
    let planType = "";
    if (window.location.pathname.includes("create-receipt-plan")) {
      planType = "receiptPlan";
    }
    return planType;
  };
  
  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Dashboard",
            id: 1,
            action: () => {
              history.push(dashboardRedirectionUrl);
            },
          },
          {
            label: "Create New Plan",
            id: 2,
            action: () => {
              history.push(PLAN_CREATE_NEW_PLAN);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      <div className={classes.root}>
        <CreateNewPlan planType={() => getPlanType()} />
      </div>
    </>
  );
};

export default CreatePlan;
