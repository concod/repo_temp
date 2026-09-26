import PropTypes from "prop-types";
import React, { useEffect, useMemo } from "react";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import { useLocation } from "react-router-dom-v5-compat";
import PlansTable from "./components/PlansList/PlansTable";
import Tab from "core/commonComponents/tabs";
import { preSeasonTabsData, inSeasonTabsData } from "./dashboard.util";
import { DASHBOARD_PAGES } from "./dashboard.constant";
import * as actions from "./dashboard.slice";
import * as apis from "./dashboard.api";
import * as planning from "../PlanningScreen/slice/planningScreen.slice";
import "./Dashboard.scss";
import BreadCrumbs from "../../components/planSmart/BreadCrumbs/BreadCrumbs";
import * as selectFilterApis from "./components/SelectFilter/apis/index";

const Dashboard = (props) => {
  const {
    BreadCrumbsLabel,
    pageHeader,
    filterConfigUrl,
    filterConfigPayload,
    plansListStatusFilterPayload,
    getDashboardTableData,
    setFilterLoader,
    setIsSnackDispatched
  } = props;

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setIsSnackDispatched(false));
  }, []);
  const location = useLocation();
  const selectedScreenName = location?.pathname.split("/")[2];

  const resetFilter = () => {
    setFilterLoader(true);
    getDashboardTableData(selectedScreenName);
  };

  const plansList = useMemo(() => {
    if (selectedScreenName === DASHBOARD_PAGES.PRE_SEASON) {
      return <Tab tabsData={preSeasonTabsData} />;
    } else if (selectedScreenName === DASHBOARD_PAGES.IN_SEASON) {
      return <Tab tabsData={inSeasonTabsData} />;
    } else if (selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN) {
      return (
        <PlansTable
          className={"targetPlanTable"}
          statusFilterPayload={plansListStatusFilterPayload}
          selectedScreenName={DASHBOARD_PAGES.TARGET_PLAN}
          filterConfigUrl={filterConfigUrl}
          filterConfigPayload={filterConfigPayload}
          resetFilter={resetFilter}
        />
      );
    }
  }, [selectedScreenName]);

  const labels = [
    {
      labelType: "icon",
      iconType: "home",
      to: "/"
    },
    {
      label: BreadCrumbsLabel,
      to: "#"
    }
  ];
  return (
    <>
      <div className="dashbord-bradcrumb-container">
        <BreadCrumbs labels={labels} />
      </div>
      <div className="table-container">
        <div className="dashboard-container">{plansList}</div>
      </div>
    </>
  );
};

Dashboard.propTypes = {
  BreadCrumbsLabel: PropTypes.string,
  filterConfigPayload: PropTypes.object,
  filterConfigUrl: PropTypes.string,
  pageHeader: PropTypes.string,
  planScreenRoute: PropTypes.string,
  plansListStatusFilterPayload: PropTypes.any,
  selectedScreenName: PropTypes.string,
  selectedRows: PropTypes.shape({
    length: PropTypes.number
  })
};

const mapStateToProps = (state) => ({
  selectedRows: actions.selectedRowsSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...actions, ...apis, ...selectFilterApis, ...planning },
      dispatch
    )
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
