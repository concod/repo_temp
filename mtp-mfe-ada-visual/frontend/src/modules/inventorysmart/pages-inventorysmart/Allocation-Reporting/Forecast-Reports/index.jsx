import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ForecastReportsComponentTable from "./forecast-reports";
import {
  setForecastReportsFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  clearForecastReportsStates,
  setForecastReportsFilterConfig,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/forecast-reports-service";
import {
  fetchFiscalWeeks,
  getCoreFiscalCalendar,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import moment from "moment";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";

const ForecastReportsComponent = (props) => {
  const globalClasses = globalStyles();
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [currentFiscalWeek, setCurrentFiscalWeek] = useState(null);

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(filterElements, filterDependency, true);

    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: [],
    };

    const dates = filterDates?.values;

    if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
      payload.isValid = false;
    } else {
      // let historicalDates = [];
      // let futuristicDates = [];

      /** Segregating Future & Historical Fiscal Weeks */
      for (
        let fiscalWeek = dates?.fiscalInfoStartDate?.fiscal_year_week;
        fiscalWeek <= dates?.fiscalInfoEndDate?.fiscal_year_week;
        fiscalWeek++
      ) {
        if (fiscalWeek >= currentFiscalWeek) {
          selectedFilters.fiscal_year_week.push({
            future: fiscalWeek,
          });
        } else {
          selectedFilters.fiscal_year_week.push({
            historical: fiscalWeek,
          });
        }
      }
    }

    props.setSelectedFilters(selectedFilters);
    props.setIsFiltersValid(payload.isValid);

    if (!payload.isValid) {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    let datesIndex = -1;
    const dates = dependencyData.find((dataItem, index) => {
      if (dataItem.attribute_name === "fiscal_date_range") {
        datesIndex = index;
      }
      return dataItem.attribute_name === "fiscal_date_range";
    });

    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );

    if (datesIndex > -1) {
      dependencyData.splice(datesIndex, 1);
    }

    applyFilters(filterData, dependencyData, dates);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let currentDate = moment().format("YYYY/MM/DD");
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        const fiscalWeeks = await fetchFiscalWeeks(currentDate, currentDate);
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        setCurrentFiscalWeek(fiscalWeeks?.data?.data?.start_date?.end_fw);

        let response = await fetchFilterConfig(
          "Inventorysmart Forecast Report"
        );
        props.setForecastReportsFilterConfig(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();
    return () => props.clearForecastReportsStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.forecastReportsFilterConfig) &&
      !isEmpty(fiscalCalendarDetails)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setForecastReportsFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.forecastReportsFilterConfig) || [],
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
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData = fiscalCalendarDetails;

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
            "forecastReportsFilterConfiguration",
            filterConfigData,
            "Forecast Reports"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setForecastReportsFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.forecastReportsFilterConfig, fiscalCalendarDetails]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showPageHeader={true}
        // Filter dashboard props
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"forecastReportsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      >
        {props.isFiltersValid && (
          <div className={globalClasses.marginHorizontal}>
            <ForecastReportsComponentTable
              displaySnackMessages={displaySnackMessages}
            />
          </div>
        )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    forecastReportsFilterLoader:
      inventorysmartReducer.inventoryForecastReportsService
        .forecastReportsFilterLoader,
    isFiltersValid:
      inventorysmartReducer.inventoryForecastReportsService.isFiltersValid,
    forecastReportsFilterConfig:
      store.inventorysmartReducer.inventoryForecastReportsService
        .forecastReportsFilterConfig,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "forecastReportsFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setForecastReportsFilterLoader: (body) =>
      dispatch(setForecastReportsFilterLoader(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setForecastReportsFilterConfig: (payload) =>
      dispatch(setForecastReportsFilterConfig(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    clearForecastReportsStates: (body) =>
      dispatch(clearForecastReportsStates(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastReportsComponent);
