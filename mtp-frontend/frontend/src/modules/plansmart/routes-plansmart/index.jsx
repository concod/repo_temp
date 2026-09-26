import React, { useEffect } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  CalendarToday,
  FactCheck,
  Storefront,
  PieChart,
} from "@mui/icons-material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import Layout from "core/commonComponents/layout";
import {
  PLAN_SMART_PRE_SEASON_DASHBOARD,
  PLAN_CREATE_NEW_PLAN,
  PLAN_SMART_PLAN_DETAILS,
  PLAN_SMART_MASTER_PLAN,
  PLAN_SMART_REPORT,
  PLAN_SMART_IN_SEASON_DASHBOARD,
  EDIT_RECEIPT_PLAN,
  CREATE_RECEIPT_PLAN,
} from "../constants-plansmart/routesConstants";
import CreatePlan from "../pages-plansmart/CreatePlan";
import MasterPlan from "../pages-plansmart/Master-Plan";
import TestArea from "../pages-plansmart/playGroundArea";
import PlansmartDashboardComponent from "../pages-plansmart/CommonDashboard";
import PlansmartBudgetRootComponent from "../pages-plansmart/plansmart-budget-table/budget-table-root-component";
import Report from "../pages-plansmart/Report";
import "core/commonComponents/layout/layout.css";
import {
  getPlanSmartConfig,
  planSmartConfigSelector,
} from "../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import {
  PLAN_SMART_APPLICATION_CODE,
  PLAN_SMART_APPLICATION_CONFIG,
  PLAN_SMART_METRICS_FORMATTER,
} from "modules/plansmart/constants-plansmart/stringConstants";
import { getPlanSmartScreenConfig } from "../services-plansmart/common/plansmart-common-service";
import ReceiptPlan from "../pages-plansmart/Receipt-Plan";

export const sideBarOptions = [
  {
    link: PLAN_SMART_PRE_SEASON_DASHBOARD,
    title: "Pre-Season Planning",
    icon: React.createElement(CalendarToday),
    order: 1,
  },
  {
    link: PLAN_SMART_IN_SEASON_DASHBOARD,
    title: "In-Season Planning",
    icon: React.createElement(FactCheck),
    order: 2,
    componentToRender: "inSeasonPlan",
  },
  {
    link: PLAN_SMART_REPORT,
    title: "Reports",
    icon: React.createElement(PieChart),
    order: 3,
  },
];

const Routes = (props) => {
  useEffect(() => {
    props.getPlanSmartScreenConfig();
    props.getPlanSmartConfig(
      PLAN_SMART_APPLICATION_CODE,
      PLAN_SMART_APPLICATION_CONFIG
    );
    props.getPlanSmartConfig(
      PLAN_SMART_APPLICATION_CODE,
      PLAN_SMART_METRICS_FORMATTER
    );
  }, []);

  const routes = [
    {
      path: PLAN_SMART_PRE_SEASON_DASHBOARD,
      component: PlansmartDashboardComponent,
      title: "Dashboard",
    },
    {
      path: `${PLAN_SMART_PLAN_DETAILS}/:displayType/:plancode`,
      component: PlansmartBudgetRootComponent,
      title: "Plan Details",
      screenName: "Planning",
    },
    {
      path: PLAN_CREATE_NEW_PLAN,
      component: CreatePlan,
      title: "Create New Plan",
    },
    {
      path: `${CREATE_RECEIPT_PLAN}`,
      component: CreatePlan,
      title: "Create New Receipt Plan",
      screenName: "receiptPlan",
    },
    {
      path: PLAN_SMART_MASTER_PLAN,
      component: MasterPlan,
      title: "Master Plan",
      screenName: "Plansmart MasterPlan",
    },
    {
      path: PLAN_SMART_REPORT,
      component: Report,
      title: "Reports",
    },
    {
      path: "/plan-smart/test",
      component: TestArea,
    },
    {
      path: PLAN_SMART_IN_SEASON_DASHBOARD,
      component: PlansmartDashboardComponent,
      title: "Dashboard",
    },
    {
      path: `${EDIT_RECEIPT_PLAN}/:displayType/:plancode`,
      component: ReceiptPlan,
      title: "Plan Details",
    },
  ];
  const planConfKeys = Object.keys(props.plansmartConfigs);
  return (
    <>
      {planConfKeys.length > 0 && (
        <Layout
          routes={routes}
          sideBarOptions={sideBarOptions}
          app={"plansmart"}
          showCommentScreenNameOption={false}
          commentBarPlaceholder="Add your notes"
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => ({
  plansmartConfigs: planSmartConfigSelector(store),
});

const mapActionsToProps = (dispatch) => ({
  getPlanSmartConfig: (app_code, config_url) =>
    dispatch(getPlanSmartConfig(app_code, config_url)),
  getPlanSmartScreenConfig: () => dispatch(getPlanSmartScreenConfig()),
});

export default connect(mapStateToProps, mapActionsToProps)(withRouter(Routes));
