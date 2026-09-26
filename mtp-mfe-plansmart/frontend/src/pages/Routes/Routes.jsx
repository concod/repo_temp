import React, { useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { withRouter } from "react-router-dom";
import preSeasonIcon from "../../../src/assets/preSeasonIcon.svg";
import inSeasonIcon from "../../../src/assets/in_season_icon.svg";
import reportIcon from "../../../src/assets/report_icon.svg";
import Layout from "core/commonComponents/layout";
import PlanningScreen from "../PlanningScreen/PlanningScreen";
import {
  CREATE_PLAN_ROUTE,
  IN_SEASON_DASHBOARD_ROUTE,
  PRE_SEASON_DASHBOARD_ROUTE,
  REPORT_ROUTE,
  REVIEW_IN_SEASON_ROUTE,
  MASTER_PLAN_ROUTE,
  CREATE_TARGET_PLAN_ROUTE,
  TARGET_PLAN_ROUTE
} from "constants/route.constant";
import TargetPlanIcon from "assets/targetPlan.svg";
import Report from "pages/Report/Report";
import MasterPlan from "pages/MasterPlan/MasterPlan";
import "core/commonComponents/layout/layout.css";
import CreateNewPlanScreen from "../CreateNewPlan/CreateNewPlan";
import TargetPlanComponent from "../CommonDashboard/pages/TargetPlanning/TargetPlan";
import PreSeasonDashboardComponent from "../CommonDashboard/pages/PreSeason/PreSeason";
import InSeasonDashboardComponent from "../CommonDashboard/pages/InSeason/InSeason";
import {
  TENANT_CONFIGURATION_ROUTE,
  PLANNING_SCREEN_ROUTE
} from "../../constants/route.constant";
import TenantConfiguration from "../TenantConfiguration/TenantConfiguration";
import * as userRoleViewManagementApis from "pages/ViewManagement/api/userRole.api";
import * as screensMappingViewManagementApis from "pages/ViewManagement/api/screensMapping.api";
import "../../styles/ag-grid-style-override.scss";
import "../../styles/v3-style-override.scss";

export const sideBarOptions = [
  {
    link: PRE_SEASON_DASHBOARD_ROUTE,
    title: "Pre-Season Planning",
    icon: React.createElement(preSeasonIcon),
    order: 1
  },
  {
    link: IN_SEASON_DASHBOARD_ROUTE,
    title: "In-Season Planning",
    icon: React.createElement(inSeasonIcon),
    order: 2
  },
  {
    link: TARGET_PLAN_ROUTE,
    title: "Target Planning",
    icon: React.createElement(TargetPlanIcon),
    order: 3
  },
  {
    link: REPORT_ROUTE,
    title: "Report",
    icon: React.createElement(reportIcon),
    order: 4
  }
];

const Routes = (props) => {
  const { getUserRole, getScreensMapping } = props;
  const routes = [
    {
      path: PRE_SEASON_DASHBOARD_ROUTE,
      component: PreSeasonDashboardComponent,
      title: "Pre-Season Planning"
    },
    {
      path: IN_SEASON_DASHBOARD_ROUTE,
      component: InSeasonDashboardComponent,
      title: "In-Season Planning"
    },
    {
      path: TARGET_PLAN_ROUTE,
      component: TargetPlanComponent,
      title: "Target Planning"
    },
    {
      path: `${PLANNING_SCREEN_ROUTE}/:mock/:viewType/:planCode`,
      component: PlanningScreen,
      title: "Planning Screen"
    },
    {
      path: CREATE_PLAN_ROUTE,
      component: CreateNewPlanScreen,
      title: "Create New Plan"
    },
    {
      path: CREATE_TARGET_PLAN_ROUTE,
      component: CreateNewPlanScreen,
      title: "Create New Plan"
    },
    {
      path: REVIEW_IN_SEASON_ROUTE,
      component: CreateNewPlanScreen,
      title: "Review In-season"
    },
    {
      path: REPORT_ROUTE,
      component: Report,
      title: "Reporting"
    },
    {
      path: `${PRE_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`,
      component: MasterPlan,
      title: "Pre-Season Master Plan"
    },
    {
      path: `${IN_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`,
      component: MasterPlan,
      title: "In-Season Master Plan"
    },
    {
      path: `${PLANNING_SCREEN_ROUTE}/:viewType/:planCode`,
      component: PlanningScreen,
      title: "Planning Screen"
    },
    {
      path: REPORT_ROUTE,
      component: Report,
      title: "Reports"
    },
    {
      path: TENANT_CONFIGURATION_ROUTE,
      component: TenantConfiguration,
      title: "Tenant Configuration"
    }
  ];

  useEffect(() => {
    // Fetching the user role and screen mapping for view management panel on app mount
    getUserRole();
    getScreensMapping();
  }, []);

  return (
    <>
      <Layout
        routes={routes}
        sideBarOptions={sideBarOptions}
        app={"plansmart"}
        showCommentScreenNameOption={false}
        commentBarPlaceholder="Add your notes"
      />
    </>
  );
};

const mapStateToProps = (state) => ({});

const mapActionsToProps = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...userRoleViewManagementApis, ...screensMappingViewManagementApis },
      dispatch
    )
  };
};

export default connect(mapStateToProps, mapActionsToProps)(withRouter(Routes));
