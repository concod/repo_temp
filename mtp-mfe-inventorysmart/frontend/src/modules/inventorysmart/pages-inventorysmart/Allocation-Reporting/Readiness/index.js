import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  setReadinessFilterConfiguration,
  clearReadinessStates,
  setReadinessTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/readiness-report-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import TableView from "./tableView";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { READINESS_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";

const ReadinessReport = (props) => {
  const reportingClasses = useReportingStyles();
  const [showTable, setShowTable] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Readiness Report Filters");
        props.setReadinessFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setReadinessFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => props.clearReadinessStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.readinessFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.readinessFilterConfiguration) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: READINESS_SCREEN_NAME,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions([...response]),
              isCrossDimensionFilter: true,
              screen_name: READINESS_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "readinessFilterConfiguration",
            filterConfigData,
            "READINESS_SCREEN_NAME"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.readinessFilterConfiguration, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    setFilterDependency(dependency);
    setShowTable(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowTable(false);
    applyFilters(filterData, dependencyData);
  };


  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"readinessFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customClassName={reportingClasses.filterSectionSpacing}
      >
      <Loader loader={props.readinessTableLoader}>
        {showTable && (
        <TableView
        displaySnackMessages={displaySnackMessages}
        setReadinessTableLoader={props.setReadinessTableLoader}
        filterDependency={filterDependency}
      />
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    readinessTableLoader:
      inventorysmartReducer.inventorySmartReadinessReportService
        .readinessTableLoader,
    readinessFilterConfiguration:
      inventorysmartReducer.inventorySmartReadinessReportService
        .readinessFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "readinessFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setReadinessFilterConfiguration: (body) =>
      dispatch(setReadinessFilterConfiguration(body)),
    clearReadinessStates: () => dispatch(clearReadinessStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setReadinessTableLoader: (body) => dispatch(setReadinessTableLoader(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ReadinessReport);
