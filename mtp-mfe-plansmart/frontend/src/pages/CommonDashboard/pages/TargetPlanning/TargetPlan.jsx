import React from "react";
import { connect } from "react-redux";
import { TARGET_PLAN_ROUTE } from "../../../../constants/route.constant";
import Dashboard from "../../Dashboard";
import {
  TARGET_PLAN_FILTER_CONFIG,
  FETCH_FILTER_CONF_MODEL_API_DATA
} from "constants/modalApi.constant";
import {
  PLANS_LIST_STATUS_FILTER_PAYLOAD,
  DASHBOARD_PAGES
} from "../../dashboard.constant";
import {
  BREAD_CRUMBS_LABEL,
  TARGET_PLAN_PAGE_HEADER
} from "./targetPlan.constant";

const TargetPlanComponent = (props) => {
  return (
    <Dashboard
      selectedScreenName={DASHBOARD_PAGES.TARGET_PLAN}
      BreadCrumbsLabel={BREAD_CRUMBS_LABEL}
      planScreenRoute={TARGET_PLAN_ROUTE}
      pageHeader={TARGET_PLAN_PAGE_HEADER}
      filterConfigUrl={TARGET_PLAN_FILTER_CONFIG}
      filterConfigPayload={FETCH_FILTER_CONF_MODEL_API_DATA}
      plansListStatusFilterPayload={PLANS_LIST_STATUS_FILTER_PAYLOAD.targetPlan}
    />
  );
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps)(TargetPlanComponent);
