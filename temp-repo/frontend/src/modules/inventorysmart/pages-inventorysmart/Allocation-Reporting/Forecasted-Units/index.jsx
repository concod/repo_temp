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
  setForecastedUnitsLoader,
  setForecastedUnitsFilterConfiguration,
  getForecastedUnitsTableData,
  clearForecastedUnitStates,
  setForecastedUnitsTableData,
} from "../../../services-inventorysmart/Allocation-Reports/forecasted-units-service";
import {
  ERROR_MESSAGE,
  rangePickerConstant,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ForecastedThresholdTables from "./forecasting-threshold-table";

const ForecastedUnitsComponent = (props) => {
  const globalClasses = globalStyles();
  const [forecastedUnitsFilterDependency, setForecastedUnitsFilterDependency] =
    useState();
  const [showForecastedUnitDetails, setShowForecastedUnitDetails] =
    useState(false);
  const [forecastedUnitsCalendar, setForecastedUnitsCalendar] = useState({
    rangePicker: "",
  });

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setForecastedUnitsLoader(true);
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setForecastedUnitsFilterConfiguration(response);
        props.setForecastedUnitsLoader(false);
      } catch (e) {
        props.setForecastedUnitsLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearForecastedUnitStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.forecastedUnitsFilterConfiguration)
    ) {
      props.setForecastedUnitsLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.forecastedUnitsFilterConfiguration),
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

          const filterDataWithCustomFilter = [
            ...response,
            ...rangePickerConstant,
          ];

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
            "forecastedUnitsFilterConfiguration",
            filterConfigData,
            "Forecasted Units Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setForecastedUnitsLoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setForecastedUnitsLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.forecastedUnitsFilterConfiguration, props.savedFilterSelection]);

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
    let filterDependency = dependency.filter(
      (item) => item.attribute_name !== "range-picker"
    );
    setForecastedUnitsFilterDependency(filterDependency);
    if (filterDatePicker[0]?.values.some((obj) => !obj)) {
      displaySnackMessages("Select the range", "error");
    } else {
      setForecastedUnitsCalendar({ rangePicker: filterDatePicker[0].values });
      setShowForecastedUnitDetails(true);
    }
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
        filterConfigKey={"forecastedUnitsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      <Loader loader={props.forecastedUnitsLoader}>
        <></>
      </Loader>

      {showForecastedUnitDetails && (
        <Loader loader={props.forecastedUnitsLoader}>
          <div className={globalClasses.marginHorizontal}>
            <ForecastedThresholdTables
              displaySnackMessages={displaySnackMessages}
              forecastedUnitsFilterDependency={forecastedUnitsFilterDependency}
              forecastedUnitsCalendar={forecastedUnitsCalendar}
              setForecastedUnitsLoader={props.setForecastedUnitsLoader}
              getForecastedUnitsTableData={props.getForecastedUnitsTableData}
              setForecastedUnitsTableData={props.setForecastedUnitsTableData}
            />
          </div>
        </Loader>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    forecastedUnitsLoader:
      inventorysmartReducer.inventoryForecastedUnitsService
        .forecastedUnitsLoader,
    forecastedUnitsFilterConfiguration:
      inventorysmartReducer.inventoryForecastedUnitsService
        .forecastedUnitsFilterConfiguration,
    forecastedTableData:
      inventorysmartReducer.inventoryForecastedUnitsService.forecastedTableData,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "forecastedUnitsFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setForecastedUnitsLoader: (body) =>
      dispatch(setForecastedUnitsLoader(body)),
    setForecastedUnitsTableData: (body) =>
      dispatch(setForecastedUnitsTableData(body)),
    setForecastedUnitsFilterConfiguration: (body) =>
      dispatch(setForecastedUnitsFilterConfiguration(body)),
    getForecastedUnitsTableData: (body) =>
      dispatch(getForecastedUnitsTableData(body)),
    clearForecastedUnitStates: () => dispatch(clearForecastedUnitStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastedUnitsComponent);
