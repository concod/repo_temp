import React from "react";
import { connect } from "react-redux";
import { PRE_SEASON_DASHBOARD_ROUTE } from "../../../../constants/route.constant";
import Dashboard from "../../Dashboard";
import {
  BREAD_CRUMBS_LABEL,
  PRE_SEASON_PLAN_PAGE_HEADER,
  FILTER_CONFIG_URL
} from "./preSeason.constant";
import { DASHBOARD_PAGES } from "../../dashboard.constant";

const PreSeasonDashboardComponent = (props) => {
  return (
    <Dashboard
      selectedScreenName={DASHBOARD_PAGES.PRE_SEASON}
      BreadCrumbsLabel={BREAD_CRUMBS_LABEL}
      planScreenRoute={PRE_SEASON_DASHBOARD_ROUTE}
      pageHeader={PRE_SEASON_PLAN_PAGE_HEADER}
      filterConfigUrl={FILTER_CONFIG_URL}
    />
  );
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps)(PreSeasonDashboardComponent);
