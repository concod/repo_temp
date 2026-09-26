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
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  setAllocationDeepDiveFilterConfiguration,
  clearAllocationDeepDiveStates,
  setAllocationDeepDiveTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/allocation-deep-dive-service";
import {
  ERROR_MESSAGE,
  rangePickerConstant,
  DEEP_DIVE_CUSTOM_DROPDOWNS
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import AllocationDeepDiveTableComponent from "./allocation-deep-dive-table";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { DEEP_DIVE_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";


const AllocationDeepDiveComponent = (props) => {
  const reportingClasses = useReportingStyles();
  const [showDeepDiveDetails, setShowDeepDiveDetails] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);

  const customDropDownConstant = DEEP_DIVE_CUSTOM_DROPDOWNS;

  const handleErrorMessage = (e) => {
        const errObj = e?.response?.data;
        if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
        else displaySnackMessages(ERROR_MESSAGE, "error");
      };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setAllocationDeepDiveFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setAllocationDeepDiveFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
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
            screenName: DEEP_DIVE_SCREEN_NAME,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          let filterDataWithCustomFilter = [];
          if (dynamicLabelsBasedOnTenant("article") === "Material") {
            filterDataWithCustomFilter = [
              ...response,
              ...rangePickerConstant,
              ...customDropDownConstant
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
              screen_name: DEEP_DIVE_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "allocationDeepDiveFilterConfiguration",
            filterConfigData,
            "DEEP_DIVE_SCREEN_NAME"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err);
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
    if (maxSupressionIndex !== -1) {
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
    }
    if (filterDatePicker[0]?.values.some((obj) => !obj)) {
      displaySnackMessages("Select the range", "error");
    } else {
      setFilterDependency(dependency);
      setShowDeepDiveDetails(true);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowDeepDiveDetails(false);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"allocationDeepDiveFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        autoHideFilterButton={true}
        customClassName={reportingClasses.filterSectionSpacing}
      >
        <Loader loader={props.allocationDeepDiveTableLoader }>
          {showDeepDiveDetails && (
              <AllocationDeepDiveTableComponent
                displaySnackMessages={displaySnackMessages}
                setAllocationDeepDiveTableLoader={
                  props.setAllocationDeepDiveTableLoader
                }
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
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
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
