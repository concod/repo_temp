import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isNull } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  setForecastAccuracyFilterConfiguration,
  clearForecastAccuracyStates,
  setForecastAccuracyTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/forecast-accuracy-service";
import {
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ForecastAccuracyTableComponent from "./forecast-accuracy-table-view";
import moment from "moment";
import { FORECAST_ACCURACY_FISCAL_CALENDAR_FILTER_MULTI_WEEK } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { FORECAST_ACCURACY_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";

const AllocationDeepDiveComponent = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const reportingClasses = useReportingStyles();
  const [showTable, setShowTable] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);


  useEffect(() => {
    setFiscalCalendarDetails(props?.fiscalCalendarData);
    moment.updateLocale("en", {
      week: {
        dow: props?.fiscalCalendarData?.week_start_day || 0,
      },
    });
  }, [props?.fiscalCalendarData]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "Forecast Accuracy Report Filters"
        );
        props.setForecastAccuracyFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setForecastAccuracyFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => props.clearForecastAccuracyStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.forecastAccuracyFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.forecastAccuracyFilterConfiguration) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: FORECAST_ACCURACY_SCREEN_NAME,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const fiscalCalendarConfig = cloneDeep(
            FORECAST_ACCURACY_FISCAL_CALENDAR_FILTER_MULTI_WEEK
          );
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData = fiscalCalendarDetails?.data || [];
          fiscalCalendarConfig.disableFutureWeeks = true;

          let filterDataWithCustomFilter = [fiscalCalendarConfig, ...response];

          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: FORECAST_ACCURACY_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "forecastAccuracyFilterConfiguration",
            filterConfigData,
            "FORECAST_ACCURACY_SCREEN_NAME"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.forecastAccuracyFilterConfiguration, props.savedFilterSelection]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

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
      (item) => item.attribute_name === "fiscal_date_range"
    );
    if (isNull(filterDatePicker[0]?.values?.fiscalInfoEndDate)) {
      displaySnackMessages(t("inventorysmart.selectDateRange"), "error");
      return;
    }
    setFilterDependency(dependency);
    setShowTable(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowTable(false);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"forecastAccuracyFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        customClassName={reportingClasses.filterSectionSpacing}
      >
      <Loader loader={props.forecastAccuracyTableLoader }>
          {showTable && (
            <div className={globalClasses.marginHorizontal}>
              <ForecastAccuracyTableComponent
                displaySnackMessages={displaySnackMessages}
                setForecastAccuracyTableLoader={
                  props.setForecastAccuracyTableLoader
                }
                filterDependency={filterDependency}
              />
            </div>
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    fiscalCalendarData:
      inventorysmartReducer?.inventorySmartCommonService?.fiscalCalendarData,
    forecastAccuracyTableLoader:
      inventorysmartReducer.inventorySmartForecastAccuracyService
        .forecastAccuracyTableLoader,
    forecastAccuracyFilterConfiguration:
      inventorysmartReducer.inventorySmartForecastAccuracyService
        .forecastAccuracyFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "forecastAccuracyFilterConfiguration"
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
    setForecastAccuracyFilterConfiguration: (body) =>
      dispatch(setForecastAccuracyFilterConfiguration(body)),
    clearForecastAccuracyStates: () => dispatch(clearForecastAccuracyStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setForecastAccuracyTableLoader: (body) =>
      dispatch(setForecastAccuracyTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllocationDeepDiveComponent);
