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
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  setAllocationDeepDiveFilterConfiguration,
  clearAllocationDeepDiveStates,
  setAllocationDeepDiveTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/allocation-deep-dive-service";
import {
  ERROR_MESSAGE,
  rangePickerConstant,
  customDropDownConstant,
  AllocationTypeFilterConstant,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import AllocationDeepDiveTableComponent from "./allocation-deep-dive-table";

const AllocationDeepDiveComponent = (props) => {
  const globalClasses = globalStyles();
  const [showDeepDiveDetails, setShowDeepDiveDetails] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const { deepDivePastDate } = props.inventorysmartScreenConfig?.inventorysmart_allocation_report || {}

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setAllocationDeepDiveFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearAllocationDeepDiveStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.allocationDeepDiveFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.allocationDeepDiveFilterConfiguration) || [],
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

          let filterDataWithCustomFilter = [];
          let l_rangePickerConstant=[{
            ...rangePickerConstant[0],
            disableType: "disableFuture",
          }];

          if (dynamicLabelsBasedOnTenant("article") === "Material") {
            filterDataWithCustomFilter = [
              ...response,
              ...(deepDivePastDate ? l_rangePickerConstant : rangePickerConstant),
              ...customDropDownConstant,
              ...(props.inventorysmartScreenConfig.enableCustomFilter ? AllocationTypeFilterConstant : [])
            ];
          } else {
            filterDataWithCustomFilter = [...response, ...rangePickerConstant];
          }

          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "allocationDeepDiveFilterConfiguration",
            filterConfigData,
            "Allocation Deep Dive Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.allocationDeepDiveFilterConfiguration, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    let filterDatePicker = dependency.filter(
      (item) => item.attribute_name === "range-picker"
    );
    let maxSupressionIndex = dependency.findIndex(
      (item) => item.attribute_name === "max_supression_flag"
    );
    
    // as per MTP-76326 always send true/false instead of Yes/No for these 3 filers.
    dependency = dependency.map((item) => {
      if (
        item.attribute_name === "max_supression_flag" ||
        item.attribute_name === "min_influenced_allocation" ||
        item.attribute_name === "is_edited"
      ) {
        return {
          ...item,
          values: item.values.map((val) => {
            return val === "Yes" ? true : false;
          }),
        };
      } else return item;
    });
    
    if (filterDatePicker[0]?.values.some((obj) => !obj)) {
      displaySnackMessages("Select the range", "error");
    } else {
      setFilterDependency(dependency);
      setShowDeepDiveDetails(true);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowDeepDiveDetails(false)
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"allocationDeepDiveFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      <Loader loader={props.allocationDeepDiveTableLoader}>
        {showDeepDiveDetails && (
          <div className={globalClasses.marginHorizontal}>
            <AllocationDeepDiveTableComponent
              displaySnackMessages={displaySnackMessages}
              setAllocationDeepDiveTableLoader={
                props.setAllocationDeepDiveTableLoader
              }
              enableDownload={props.enableDownload}
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
    allocationDeepDiveTableLoader:
      inventorysmartReducer.inventoryAllocationDeepDiveService
        .allocationDeepDiveTableLoader,
    allocationDeepDiveFilterConfiguration:
      inventorysmartReducer.inventoryAllocationDeepDiveService
        .allocationDeepDiveFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
      "allocationDeepDiveFilterConfiguration"
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
    setAllocationDeepDiveFilterConfiguration: (body) =>
      dispatch(setAllocationDeepDiveFilterConfiguration(body)),
    clearAllocationDeepDiveStates: () =>
      dispatch(clearAllocationDeepDiveStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setAllocationDeepDiveTableLoader: (body) =>
      dispatch(setAllocationDeepDiveTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllocationDeepDiveComponent);
