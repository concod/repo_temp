import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

import {
  setDcAvailabilityReportFilterConfiguration,
  clearDcAvailabilityReportStates,
  setDcAvailabilityReportTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/dc-availability-report-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import DCAvailabilityTableComponent from "./dc-availability-table";

const DCAvailabilityReportComponent = (props) => {
  const globalClasses = globalStyles();
  const [showDCAvailableReportDetails, setShowDCAvailableReportDetails] =
    useState(false);
  const [filterDependency, setFilterDependency] = useState([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "inventorysmart_dc_availability"
        );
        props.setDcAvailabilityReportFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearDcAvailabilityReportStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcAvailabilityReportFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.dcAvailabilityReportFilterConfiguration) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "dcAvailabilityReportFilterConfiguration",
            filterConfigData,
            "DC Availability Report Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.dcAvailabilityReportFilterConfiguration,
    props.savedFilterSelection,
  ]);

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
    setShowDCAvailableReportDetails(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowDCAvailableReportDetails(false)
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"dcAvailabilityReportFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      <Loader loader={props.dcAvailabilityReportTableLoader}>
        {showDCAvailableReportDetails && (
          <div className={globalClasses.marginHorizontal}>
            <DCAvailabilityTableComponent
              inventorysmartScreenConfigForInfiniteScrolling={props.inventorysmartScreenConfigForInfiniteScrolling}
              displaySnackMessages={displaySnackMessages}
              setDcAvailabilityReportTableLoader={
                props.setDcAvailabilityReportTableLoader
              }
              filterDependency={filterDependency}
            />
          </div>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    dcAvailabilityReportTableLoader:
      inventorysmartReducer.inventorySmartDCAvailabilityReportService
        .dcAvailabilityReportTableLoader,
    dcAvailabilityReportFilterConfiguration:
      inventorysmartReducer.inventorySmartDCAvailabilityReportService
        .dcAvailabilityReportFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
      "dcAvailabilityReportFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDcAvailabilityReportFilterConfiguration: (body) =>
      dispatch(setDcAvailabilityReportFilterConfiguration(body)),
    clearDcAvailabilityReportStates: () =>
      dispatch(clearDcAvailabilityReportStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcAvailabilityReportTableLoader: (body) =>
      dispatch(setDcAvailabilityReportTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCAvailabilityReportComponent);
