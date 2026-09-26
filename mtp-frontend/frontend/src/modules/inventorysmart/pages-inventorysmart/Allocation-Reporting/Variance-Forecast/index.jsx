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
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";
import moment from "moment";

import {
  setForecastVarianceFilterConfiguration,
  clearForecastVarianceStates,
  setForecastVarianceTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/variance-in-forecast-service";

import {
  ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
  FILL_MANDATORY_FIELDS,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ForecastVarianceTableComponent from "./variance-forecast-table-view";

const VarianceForecastComponent = (props) => {
  const globalClasses = globalStyles();
  const [showVarianceInForecastDetails, setShowVarianceInForecastDetails] =
    useState(false);
  const [filterDependency, setFilterDependency] = useState([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "inventorysmart_variance_to_forecast"
        );
        props.setForecastVarianceFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearForecastVarianceStates();
  }, []);

  const isOutsideRange = (date) => {
    // 6 months back starting date to current week
    let weekStartDay = moment().subtract(6, "months").startOf("week");
    let weekEndDay = moment().startOf("week");
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.forecastVarianceFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.forecastVarianceFilterConfiguration) || [],
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

          const fiscalCalendarConfig = cloneDeep(
            INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK
          );
          fiscalCalendarConfig.disableFutureWeeks = true;
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData =
            getFinancialCalendarData?.data?.data?.data;
          fiscalCalendarConfig.isOutsideRange = isOutsideRange;

          const responseWithFiscalCalendarConfig = [
            fiscalCalendarConfig,
            ...response,
          ];

          const filterConfigData = [
            {
              filterDashboardData: responseWithFiscalCalendarConfig,
              expectedFilterDimensions: getFilterDimensions(
                responseWithFiscalCalendarConfig
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "forecastVarianceFilterConfiguration",
            filterConfigData,
            "Variance in Forecast Report Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.forecastVarianceFilterConfiguration, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    const dates = dependency.filter(
      (item) => item.filter_id === "fiscal_date_range"
    )[0];
    if (
      !dates?.values?.fiscalInfoEndDate ||
      !dates?.values?.fiscalInfoStartDate
    ) {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    } else {
      setFilterDependency(dependency);
      setShowVarianceInForecastDetails(true);
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
        filterConfigKey={"forecastVarianceFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

        {showVarianceInForecastDetails && (
          <div className={globalClasses.marginHorizontal}>
            <ForecastVarianceTableComponent
              displaySnackMessages={displaySnackMessages}
              filterDependency={filterDependency}
            />
          </div>
        )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    forecastVarianceTableLoader:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceTableLoader,
    forecastVarianceFilterConfiguration:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "forecastVarianceFilterConfiguration"
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
    setForecastVarianceFilterConfiguration: (body) =>
      dispatch(setForecastVarianceFilterConfiguration(body)),
    clearForecastVarianceStates: () => dispatch(clearForecastVarianceStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setForecastVarianceTableLoader: (body) =>
      dispatch(setForecastVarianceTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VarianceForecastComponent);
