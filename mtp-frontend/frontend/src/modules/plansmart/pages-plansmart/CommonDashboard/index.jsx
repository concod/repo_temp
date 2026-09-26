import React, { useState, useEffect, useRef, useMemo } from "react";
import { useHistory, useLocation, withRouter } from "react-router-dom";
import { get } from "lodash";
import { useStyles } from "../plansmart-styles";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { connect, useSelector } from "react-redux";
import {
  getDefaultValues,
  fetchInitialPlans,
  onDashboardFilter,
  onDashboardReset,
  dashboardFilterChange,
} from "../plansmart-utility";
import {
  setPlansmartDashboardLoader,
  setPlansmartFilterLoader,
  setPlansmartDashboardData,
  getPlanSmartReceiptPlansData,
  fetchFilterConfig,
  plansmartFilterConfigSelector,
  setPlansmartDashboardFilterConf,
  fetchPlansmartDashboardData,
  fetchPlansmartDashboardColDef,
} from "../../services-plansmart/PlanSmart-Dashboard/plansmart-dashboard-services";
import PlansmartDashboardFilter from "./plansmart-dashboard-filter";
import PlansmartDashboardTable from "./plansmart-dashboard-table";
import HeaderBreadCrumbs from "../../../../core/Utils/HeaderBreadCrumbs";
import { PLAN_SMART_PRE_SEASON_DASHBOARD } from "../../constants-plansmart/routesConstants";
import {
  CreatePlan,
  dashboardDownloadOption,
} from "modules/plansmart/constants-plansmart/stringConstants";
import PlanSmartDownloadModal from "../PlanSmartDownloadModal";
import {
  getDownloadEntirePlanHierarchyValue,
  getHierarchyValuesForDownload,
  getSpecificDownloadOption,
} from "modules/plansmart/utils-plansmart";
import {
  fetchPlanHierarchy,
  planSmartDownloadLoaderSelector,
  planSmartDownloadPlan,
  planSmartPlanHierarchySelector,
} from "modules/plansmart/services-plansmart/common/plansmart-common-service";

const PlansmartDashboardComponent = (props) => {
  const {
    fetchPlanHierarchyReq,
    planHierarchy,
    fetchFilterConfigReq,
    filterElements,
    setFilterElements,
    fetchPlansmartDashboardColDefReq,
  } = props;
  const classes = useStyles();
  const history = useHistory();
  const tableRef = useRef(null);
  const [filterDependency, setFilterDependency] = useState({});
  const [planType, setPlanType] = useState(0);
  const [isInSeasonDashbaord, setInSeasonDashboard] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const selectedScreenName = useSelector(
    (store) => store.sideBarReducer.userPlatformScreenName
  );

  const location = useLocation();

  const downloadOptions = getSpecificDownloadOption(dashboardDownloadOption);
  const downloadHierarchyValue = useMemo(() => {
    if (selectedRows.length === 0 || selectedRows.length > 1) return [];
    const levelData = get(planHierarchy, "level_info", []);
    const [selectedPlan = {}] = selectedRows;
    if (levelData?.length > 0 && selectedPlan) {
      return getDownloadEntirePlanHierarchyValue(levelData, selectedPlan);
    }
    return [];
  }, [selectedRows, planHierarchy]);

  useEffect(() => {
    if (
      (selectedScreenName === "in-season" ||
        selectedScreenName === "pre-season") &&
      location.pathname.includes(selectedScreenName)
    ) {
      setInSeasonDashboard(selectedScreenName === "in-season");
      const tabValue = get(location, "tabValue", planType);
      fetchPlansmartDashboardColDefReq();
      fetchPlanHierarchyReq();
      fetchFilterConfigReq(selectedScreenName, async () => {
        setPlanType(tabValue);
        fetchInitialPlans(selectedScreenName, {
          ...props,
          tableRef,
          planType: tabValue,
        });
      });
    }
  }, [selectedScreenName]);

  const handlePlanType = (value) => {
    onDashboardFilter(filterElements, filterDependency, tableRef, value, props);
    setPlanType(value);
  };

  const handleReset = () => {
    onDashboardReset(setFilterDependency, selectedScreenName, props);
    dashboardFilterChange(
      {},
      CreatePlan.__plan_levels[0],
      setFilterDependency,
      props,
      {},
      filterElements,
      setFilterElements,
      props.tenantFilterUamConfig
    );
  };

  const handleDownload = (selectedOption, options) => {
    const value = selectedOption.value;
    if (value === "entire_plan") {
      const { selectedHierarchyLevel } = options;
      const [selectedPlan = {}] = selectedRows;
      const payload = {
        source: "client",
        plan_code: selectedPlan.plan_code,
        filters: getHierarchyValuesForDownload(
          selectedHierarchyLevel,
          selectedPlan
        ),
      };
      props.downloadPlanReq(payload, downloadPlanCallback);
    } else if (value === "high_level_plan") {
      const levels = downloadHierarchyValue.map((hierarchy) => hierarchy.value);
      const [selectedPlan = {}] = selectedRows;
      const payload = {
        source: "client",
        plan_code: selectedPlan.plan_code,
        filters: getHierarchyValuesForDownload(levels, selectedPlan),
        aggregated_single_sheet: true,
      };
      props.downloadPlanReq(payload, downloadPlanCallback);
    }
  };

  const downloadPlanCallback = () => {
    setDownloadModal(false);
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: isInSeasonDashbaord
              ? "In-Season Dashboard"
              : "Pre-Season Dashboard",
            id: 1,
            action: () => {
              history.push(PLAN_SMART_PRE_SEASON_DASHBOARD);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      <div className={classes.root}>
        <PlansmartDashboardFilter
          tableRef={tableRef}
          isInSeasonDashbaord={isInSeasonDashbaord}
          filterData={filterElements}
          filterDependency={filterDependency}
          handleChange={(updatedFormData, id) =>
            dashboardFilterChange(
              updatedFormData,
              id,
              setFilterDependency,
              props,
              filterDependency,
              filterElements,
              setFilterElements,
              props.tenantFilterUamConfig
            )
          }
          getDefaultValues={() =>
            getDefaultValues(filterElements, filterDependency)
          }
          onPlanSmartDashboardFilter={() =>
            onDashboardFilter(
              filterElements,
              filterDependency,
              tableRef,
              planType,
              props
            )
          }
          onReset={handleReset}
        />
        <div className={classes.dashboardTableWrapper}>
          <PlansmartDashboardTable
            isInSeasonDashbaord={isInSeasonDashbaord}
            setDownloadModal={setDownloadModal}
            tabValue={planType}
            setTabValue={handlePlanType}
            tableRef={tableRef}
            fetchTableData={() =>
              onDashboardFilter(
                filterElements,
                filterDependency,
                tableRef,
                planType,
                props
              )
            }
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            {...props}
          />
        </div>
      </div>
      {downloadModal && (
        <PlanSmartDownloadModal
          open={downloadModal}
          onClose={() => setDownloadModal(false)}
          onDownload={handleDownload}
          downloadLoader={props.downloadLoader}
          hierarchyList={downloadHierarchyValue}
          downloadOptions={downloadOptions}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    plansmartDashboardLoader:
      store.plansmartReducer.planDashboardReducer.plansmartDashboardLoader,
    plansmartScreenName: store.sideBarReducer.userPlatformScreenName,
    dashboardTableData:
      store.plansmartReducer.planDashboardReducer.plansmartDashboardData,
    downloadLoader: planSmartDownloadLoaderSelector(store),
    planHierarchy: planSmartPlanHierarchySelector(store),
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterElements: plansmartFilterConfigSelector(store),
  };
};
const mapDispatchToProps = (dispatch) => ({
  setPlansmartDashboardLoader: (payload) =>
    dispatch(setPlansmartDashboardLoader(payload)),
  setPlansmartFilterLoader: (payload) =>
    dispatch(setPlansmartFilterLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setPlansmartDashboardTableData: (payload) =>
    dispatch(setPlansmartDashboardData(payload)),
  fetchPlanHierarchyReq: () => dispatch(fetchPlanHierarchy()),
  downloadPlanReq: (payload, callback) =>
    dispatch(planSmartDownloadPlan(payload, callback)),
  getPlanSmartReceiptPlansData: (payload) =>
    dispatch(getPlanSmartReceiptPlansData(payload)),
  fetchFilterConfigReq: (screenName, successCallback) =>
    dispatch(fetchFilterConfig(screenName, successCallback)),
  setFilterElements: (payload) =>
    dispatch(setPlansmartDashboardFilterConf(payload)),
  fetchPlansmartDashboardDataReq: (payload, planType) =>
    dispatch(fetchPlansmartDashboardData(payload, planType)),
  fetchPlansmartDashboardColDefReq: (payload) =>
    dispatch(fetchPlansmartDashboardColDef(payload)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlansmartDashboardComponent));
