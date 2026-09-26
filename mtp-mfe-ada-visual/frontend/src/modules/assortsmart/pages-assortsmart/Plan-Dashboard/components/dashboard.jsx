import { Container } from "@mui/material";
import Plans from "./plans-table";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  setPlansData,
  setPlansTableCols,
  getPlanLevels,
  setPlanLevels,
  setDashboardLoader,
  getDashboardPlansTableConfig,
  getHindsightDashboardPlansTableConfig,
  getTableConfig,
  fetchMFPUploadData,
  getSummaryViewData,
} from "../../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { setScreenConfiguration } from "modules/assortsmart/services-assortsmart/common-assort-service";
import { getStoreChannels } from "../../../services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import { fetchClusterDashboardTableData } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import {
  getAllFilters,
  getFiltersValues,
} from "../../../../../core/actions/filterAction";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  Dashboard,
  PLAN_STEP_BGCOLOR_MAPPER,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  getFiltersRespArr,
  formatStringArray,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  configurePlanHierarchyLevels,
  filtersPayload,
} from "./common-plan-functions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import StyledChip from "core/Utils/chip/StyledChip";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "../../../../../core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getUserDetails } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Management/user-management-service";

const DashboardComponent = (props) => {
  const classes = useStyles();
  const [dashboardFilterConfig, setdashboardFilterConfig] = useState([]);
  const [dashboardFilterSelection, setdashboardFilterSelection] = useState({});
  const [selectedPlans, setselectedPlans] = useState([]); //selected plans to compare or delete
  const [seasonData, setSeasonData] = useState({});
  const [refreshDate, setRefreshDate] = useState({});
  const [filterValues, setFilterValues] = useState([]);
  const [excelHeadersList, setExcelHeadersList] = useState([]);
  let userId = useRef({});

  const dashboardFilterRef = useRef({});

  let filterRef = useRef({});

  useEffect(() => {
    const getTickerMsg = async () => {
      const tickerMsg = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "dashboard_date_ticker",
      });
      setRefreshDate(tickerMsg?.data?.data[0]?.attribute_value?.value);
    };
    getTickerMsg();
    return () => {
      props.setPlansTableCols([]);
      props.setPlansData({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPlanStepCell = (column) => {
    column.cellRenderer = (params) => {
      let planStep = params?.data?.plan_step;
      return (
        <StyledChip
          label={params?.data?.plan_step_desc}
          color={
            parseInt(planStep) === 3 || parseFloat(planStep) === 1.3
              ? PLAN_STEP_BGCOLOR_MAPPER["complete"]
              : PLAN_STEP_BGCOLOR_MAPPER["incomplete"]
          }
        />
      );
    };
  };

  const getHeadersForExcel = (columns) => {
    const headers = [];
    columns.forEach((col) => {
      headers.push({
        label: col.headerName,
        key: col.id,
      });
    });
    setExcelHeadersList(headers);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const postBody = {
        meta: {
          search: [],
          range: [],
          sort: [],
        },
      };
      const users = await props.getUserDetails(postBody);
      const loggedInUser = localStorage.getItem("name");
      const user = users?.data?.data?.filter((item) => {
        return item.email === loggedInUser;
      });
      userId.current = user[0]?.user_code;
    };
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configureDashboardColumns = async (location) => {
    let param, dashboardTableConfigResp;
    if (location?.includes("omnichannel")) {
      param = "assort omni dashboard filter";
      dashboardTableConfigResp = await getTableConfig("omnichannel");
    } else if (
      location?.includes("cluster-smart") ||
      location?.includes("cluster-dashboard")
    ) {
      param = "assort dashboard filter";
      dashboardTableConfigResp = await getTableConfig("clusterdashboard");
    } else if (location?.includes("master-plan-dashboard")) {
      param = "assort dashboard filter";
      dashboardTableConfigResp = await getColumnsAg(
        "table_name=master_plan_dashboard",
        props.columnHeaderJson,
        true
      )();
    } else if (location?.includes("MFP-dashboard")) {
      param = "MFP Dashboard Filter";
      dashboardTableConfigResp = await getColumnsAg(
        "table_name=mfp_upload_dashboard",
        props.columnHeaderJson,
        true
      )();
    } else if (location?.includes("hindsight-dashboard")) {
      param = "assort dashboard filter";
      dashboardTableConfigResp = await props.getHindsightDashboardPlansTableConfig(
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
    } else {
      param = "assort dashboard filter";
      dashboardTableConfigResp = await props.getDashboardPlansTableConfig(
        "dashboard"
      );
    }
    return {
      param: param,
      columns: dashboardTableConfigResp,
    };
  };

  const configureFilterConfig = async (location, param) => {
    const levels = await configurePlanHierarchyLevels(param);
    const channels = await props.getStoreChannels();
    let filters = levels;
    if (!location.includes("omnichannel")) {
      filters.forEach((item) => {
        if (item.accessor === "channel") {
          item.options = formatStringArray(channels.data.data.channels);
          item.initialData = formatStringArray(channels.data.data.channels);
        }
      });
    }
    let filterConfiguration = `assort${props.location}FilterConfiguration`,
      title;
    if (location?.includes("omnichannel")) {
      title = "Omni Dashboard";
    } else if (
      location?.includes("cluster-smart") ||
      location?.includes("cluster-dashboard")
    ) {
      title = "Clustersmart Dashboard";
    } else if (location?.includes("master-plan-dashboard")) {
      title = "Master Plan Dashboard";
    } else if (props.location.includes("MFP-dashboard")) {
      title = "MFP Dashboard";
    } else {
      title = "Assortsmart Dashboard";
    }
    if (isEmpty(props.filterDashboardConfiguration[filterConfiguration])) {
      const filterConfigData = [
        {
          filterSectionHeader: "Dashboard Filters",
          filterDashboardData: filters,
          expectedFilterDimensions: location.includes("omnichannel")
            ? ["product"]
            : ["product", "store"],
          isCrossDimensionFilter: true,
          onReset: onResetDashboardPlans,
          screen_name: title
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        filterConfiguration,
        filterConfigData,
        title
      );
      props.setFilterConfiguration(filterConfig);
    }
    setdashboardFilterConfig(filters);
  };

  useEffect(() => {
    const fetchData = async () => {
      //Fetch plan table columns if not already fetched
      props.setDashboardLoader(true);
      try {
        //fetch all screen config
        let configResp = await props.getTenantConfigApplicationLevel(2, {
          attribute_name: "assort_smart_screen_configuration",
        });
        if (configResp?.data?.status) {
          props.setScreenConfiguration(
            configResp?.data?.data?.[0]?.attribute_value
          );
        }
        let levelData = await props.getPlanLevels();
        props.setPlanLevels(levelData?.data);
        //fetch the table columns
        let dashboardData = await configureDashboardColumns(props.location);
        let dashboardTableConfigResp = dashboardData?.columns;
        let param = dashboardData?.param;
        if (
          dashboardTableConfigResp?.length &&
          props.location?.includes("MFP-dashboard")
        ) {
          getHeadersForExcel(dashboardTableConfigResp);
        }
        let dashboardTableConfig =
          props.location.includes("MFP-dashboard") ||
          props.location.includes("master-plan-dashboard")
            ? dashboardTableConfigResp
            : agGridColumnFormatter(dashboardTableConfigResp.data.data);
        dashboardTableConfig.forEach((col) => {
          if (col.column_name === "plan_step_desc") {
            //Render planstep coloring component except for omnichannel dashboard
            col = props.location.includes("omnichannel")
              ? col
              : renderPlanStepCell(col);
          }
        });
        props.setPlansTableCols(dashboardTableConfig);
        dashboardFilterRef.current = {};
        configureFilterConfig(props.location, param);
        props.setDashboardLoader(false);
      } catch (error) {
        props.setDashboardLoader(false);
        props.addSnack({
          message: "Fetching dashboard table data failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    props.setPlansTableCols([]);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.location]);

  const onFilterDashboardClick = (dependencyData) => {
    const filterData = {};
    dependencyData.forEach((data) => {
      filterData[data.filter_id] = data.values;
    });
    setdashboardFilterSelection(filterData);
    dashboardFilterRef.current = filterData;
    onFilterDashboardPlans();
  };

  const getTableData = async (param) => {
    let filters =
      param.length === 0 ? getFiltersRespArr(Dashboard.__plan_levels) : param;
    filterRef.current = cloneDeep(filters);
    setFilterValues(filters);
  };
  const onFilterDashboardPlans = async () => {
    props.setDashboardLoader(true);
    const payload = filtersPayload(
      dashboardFilterConfig,
      dashboardFilterRef.current
    );
    if (payload.isValid) {
      await getTableData(payload.reqBody);
    } else {
      props.addSnack({
        message: "Please provide complete range",
        options: {
          variant: "error",
        },
      });
    }
    props.setDashboardLoader(false);
  };

  const onResetDashboardPlans = async () => {
    props.setDashboardLoader(true);
    dashboardFilterRef.current = {};
    setdashboardFilterSelection({});
    if (props.location?.includes("MFP-dashboard")) {
      filterRef.current = [];
    } else {
      await getTableData([]);
    }
    props.setDashboardLoader(false);
  };

  return (
    <>
      <Container maxWidth={false}>
        <div className={classes.root}>
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={`assort${props.location}FilterConfiguration`}
            onApplyFilter={onFilterDashboardClick}
            hideSavedFilterMsg={true}
            resetFilterChips={true}
            noUAMFilterDependency={true}
          />
        </div>
        <div className={classes.dFlex}>
          <Plans
            dashboardFilterConfig={dashboardFilterConfig}
            selectedFilters={dashboardFilterSelection}
            selectedPlans={selectedPlans}
            setselectedPlans={setselectedPlans}
            seasonData={seasonData}
            location={props.location}
            filterRef={filterRef}
            filterValues={filterValues}
            filterData={dashboardFilterConfig}
            refreshDate={refreshDate}
            excelHeadersList={excelHeadersList}
            userId={userId.current}
          />
        </div>
      </Container>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    isLoading: state.assortsmartReducer.planDashboardReducer.dashboard_loader,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};
const mapActionsToProps = {
  getFiltersValues,
  getAllFilters,
  setPlansData,
  setPlansTableCols,
  getPlanLevels,
  setDashboardLoader,
  getDashboardPlansTableConfig,
  getHindsightDashboardPlansTableConfig,
  getStoreChannels,
  getTableConfig,
  addSnack,
  fetchClusterDashboardTableData,
  setScreenConfiguration,
  getTenantConfigApplicationLevel,
  setPlanLevels,
  setFilterConfiguration,
  fetchMFPUploadData,
  getSummaryViewData,
  getUserDetails,
};
export default connect(mapStateToProps, mapActionsToProps)(DashboardComponent);
