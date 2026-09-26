import React from "react";
import { connect } from "react-redux";
import { IN_SEASON_DASHBOARD_ROUTE } from "../../../../constants/route.constant";
import Dashboard from "../../Dashboard";
import {
  IN_SEASON_PLAN_PAGE_HEADER,
  BREAD_CRUMBS_LABEL,
  FILTER_CONFIG_URL
} from "./inSeason.constant";
import { DASHBOARD_PAGES } from "../../dashboard.constant";

const InSeasonDashboardComponent = (props) => {
  return (
    <Dashboard
      selectedScreenName={DASHBOARD_PAGES.IN_SEASON}
      BreadCrumbsLabel={BREAD_CRUMBS_LABEL}
      planScreenRoute={IN_SEASON_DASHBOARD_ROUTE}
      pageHeader={IN_SEASON_PLAN_PAGE_HEADER}
      filterConfigUrl={FILTER_CONFIG_URL}
    />
  );
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps)(InSeasonDashboardComponent);
