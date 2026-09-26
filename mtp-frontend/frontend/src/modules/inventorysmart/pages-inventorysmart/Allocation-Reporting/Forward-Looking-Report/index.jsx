import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

import {
  setForwardLookingAllocationFilterConfiguration,
  clearForwardLookingAllocationStates,
} from "../../../services-inventorysmart/Allocation-Reports/forward-looking-allocation-service";

import {
  ERROR_MESSAGE,
  customFLAReportFilterConstant,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ForwardLookingTableComponent from "./forward-looking-table-view";

const ForwardLookingAllocationComponent = (props) => {
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "inventorysmart_allocation_estimate"
        );
        props.setForwardLookingAllocationFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearForwardLookingAllocationStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.forwardLookingAllocationFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.forwardLookingAllocationFilterConfiguration) ||
              [],
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
          let filterConfigWithCustomFilters = [
            ...customFLAReportFilterConstant,
            ...response,
          ];

          const filterConfigData = [
            {
              filterDashboardData: filterConfigWithCustomFilters,
              expectedFilterDimensions: getFilterDimensions(
                filterConfigWithCustomFilters
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "forwardLookingAllocationFilterConfiguration",
            filterConfigData,
            "Forward Looking Allocation Report Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.forwardLookingAllocationFilterConfiguration,
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
    let dcOutOfStock = dependency.findIndex(
      (item) => item.attribute_name === "dc_out_of_stock"
    );
    if (dcOutOfStock !== -1) {
      dependency = dependency.map((item) => {
        if (item.attribute_name === "dc_out_of_stock") {
          return {
            ...item,
            values: item.values.map((val) => {
              return val === "TRUE" ? true : false;
            }),
          };
        } else return item;
      });
    }
    setFilterDependency(dependency);
    setShowReportDetails(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"forwardLookingAllocationFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      {showReportDetails && (
        <ForwardLookingTableComponent
          displaySnackMessages={displaySnackMessages}
          filterDependency={filterDependency}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    forwardLookingAllocationFilterConfiguration:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "forwardLookingAllocationFilterConfiguration"
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
    setForwardLookingAllocationFilterConfiguration: (body) =>
      dispatch(setForwardLookingAllocationFilterConfiguration(body)),
    clearForwardLookingAllocationStates: () =>
      dispatch(clearForwardLookingAllocationStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForwardLookingAllocationComponent);
