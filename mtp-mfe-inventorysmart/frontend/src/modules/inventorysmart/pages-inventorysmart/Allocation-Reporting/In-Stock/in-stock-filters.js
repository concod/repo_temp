import React, { useEffect, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { connect } from "react-redux";
import {
  clearInStockStates,
  getInStockKpiData,
  saveInStockFiltersState,
  setInStockFilterConfiguration,
  setInStockScreenLoader,
  setInStockTableLoader,
  setInStockKpiData,
  setShowInStockDetails,
  setIsFiltersValid,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/in-stock-report-services";
import { cloneDeep, isEmpty, isNull } from "lodash";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
  validateDateRange,
} from "../../inventorysmart-utility";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  IN_STOCK_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  tableConfigurationMetaData
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import { useTranslation } from "impact-ui-v3";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import { formatStringDate } from "core/Utils/functions/utils";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { IN_STOCK_MODULE } from "../CustomHooks/moduleConstants";
import { IN_STOCK_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";


const InStockFilters = (props) => {
  const { t } = useTranslation();
  const reportingClasses = useReportingStyles();
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);

  const fiscal_date_range = props.moduleConfig?.[IN_STOCK_MODULE]?.fiscal_date_range ?? true;
  const week_start_day = props.moduleConfig?.[IN_STOCK_MODULE]?.week_start_day ?? 0;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  useEffect(() => {
    setFiscalCalendarDetails(props?.fiscalCalendarData);
    moment.updateLocale("en", {
      week: {
        dow: props?.fiscalCalendarData?.week_start_day
          ? props?.fiscalCalendarData?.week_start_day
          : week_start_day,
      },
    });
  }, [props?.fiscalCalendarData]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setInStockScreenLoader(true);
        let response = await fetchFilterConfig(
          IN_STOCK_SCREEN_NAME
        );
        props.setInStockFilterConfiguration(response);
        props.setInStockScreenLoader(false);
      } catch (e) {
        props.setInStockScreenLoader(false);
        handleErrorMessage(e);
      }
    };
    
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setInStockFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    
    getInitialFilterConfiguration();
    
    return () => props?.clearInStockStates();
  }, []);

  useEffect(() => {
    const onLoad = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.inStockFilterConfiguration) &&
        !isNull(fiscalCalendarDetails)
      ) {
        props.setInStockScreenLoader(true);
        const getFilterValues = async (selected, current) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.inStockFilterConfiguration),
              appliedFilters: selected || [],
              current: current || [],
              rolesBasedAccess:
                props.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: IN_STOCK_SCREEN_NAME,
              customDependency: [
                getActiveEntityFilter("product"),
                getActiveEntityFilter("store"),
              ],
              tenantFilterUamConfig: props.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);
            const fiscalCalendarConfig = cloneDeep(
              IN_STOCK_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
            );
            fiscalCalendarConfig.fc_code = response[0]?.fc_code;
            fiscalCalendarConfig.initialData =
              fiscalCalendarDetails?.data || [];
            fiscalCalendarConfig.disableFutureWeeks = true;
            
            let filterDataWithCustomFilter;
            if (fiscal_date_range) {
              filterDataWithCustomFilter = [fiscalCalendarConfig, ...response];
            } 
            const filterConfigData = [
              {
                filterDashboardData: filterDataWithCustomFilter,
                expectedFilterDimensions: getFilterDimensions(
                  filterDataWithCustomFilter
                ),
                isCrossDimensionFilter: true,
                screen_name: IN_STOCK_SCREEN_NAME,
              },
            ];
            
            const filterConfig = formattedFilterConfiguration(
              "inStockFilterConfiguration",
              filterConfigData,
              "IN_STOCK_SCREEN_NAME"
            );
            
            props.setFilterConfiguration(filterConfig);
            props.setInStockScreenLoader(false);
          } catch (err) {
            handleErrorMessage(err);
            props.setInStockScreenLoader(false);
          }
        };
        getFilterValues(props.savedFilterSelection);
      }
    };
    
    onLoad();
  }, [
    props.inStockFilterConfiguration,
    props.savedFilterSelection,
    fiscalCalendarDetails,
  ]);


  const applyFilters = async (_filterElements, dependency, filterDates) => {
    props?.setShowInStockDetails(false);
    props.setInStockTableLoader(true);
    props.setInStockScreenLoader(true);
    try {
     
      props.setInStockKpiData([]);
      const selectedFilters = {
        filters: dependency.filter(
          (item) => item.attribute_name !== "fiscal_date_range" && item.attribute_name !== "range-picker"
        ),
      };
      const dates = dependency.find(
        (item) => item.attribute_name === "fiscal_date_range"
      )?.values;
  
      let isValid = true;
      let error = "";

      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        isValid = false;
        error = t("inventorysmart.pleaseSelectValidDateRange");
      } else {
        const dateRange = validateDateRange(dates, true);
        if (!dateRange.isValid) {
          isValid = false;
          error = dateRange.error;
        }
      }

      if (!isValid) {
        props.setInStockTableLoader(false);
        props.setInStockScreenLoader(false);
        displaySnackMessages(error || "Invalid date range", "error", props);
        return;
      }

      let date_range = undefined;
      if (dates && fiscal_date_range) {
        const startDate = formatStringDate(
          dates?.fiscalInfoStartDate?.calendar_week_start_date,
          true,
          true
        ).format("YYYY-MM-DD");
        const endDate = formatStringDate(
          dates?.fiscalInfoEndDate?.fiscal_week_end_date,
          true,
          true
        ).format("YYYY-MM-DD");

        date_range = {
          start_date: startDate,
          end_date: endDate,
        };
      }
     
      selectedFilters.date_range = date_range;
      selectedFilters.application_code = 1;
      props.saveInStockFiltersState(selectedFilters);
      props.setIsFiltersValid(isValid);

      const kpiRequestBody = {
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        filters: selectedFilters.filters,
        date_range: date_range,
        application_code: 1,
      };

      const kpiResponse = await props.getInStockKpiData(kpiRequestBody);

       props.setInStockKpiData(kpiResponse?.data?.data?.kpi_data?.data?.[0] || {});
    
       props.setShowInStockDetails(true);
    
    // props.setInStockScreenLoader(false);
    } catch (e) {
      props.setInStockTableLoader(false);
      props.setInStockScreenLoader(false);
      handleErrorMessage(e);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
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
      filterConfigKey="inStockFilterConfiguration"
      onApplyFilter={onFilterDashboardClick}
      contained={false}
      customDependencyValue={getCustomDependencyFilter}
      isOutsideRange={"disableOnlyFuture"}
      screenName={IN_STOCK_SCREEN_NAME}
      customClassName={reportingClasses.filterSectionSpacing}
    >
      {props.children}
    </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    inStockScreenLoader:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockScreenLoader,
    inStockTableLoader:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockTableLoader,
    inStockFilterConfiguration:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "inStockFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count || 10,
    fiscalCalendarData:
      inventorysmartReducer?.inventorySmartCommonService?.fiscalCalendarData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setInStockFilterConfiguration: (body) =>
      dispatch(setInStockFilterConfiguration(body)),
    clearInStockStates: () => dispatch(clearInStockStates()),
    setInStockScreenLoader: (body) =>
      dispatch(setInStockScreenLoader(body)),
    setInStockTableLoader: (body) =>
      dispatch(setInStockTableLoader(body)),
    setShowInStockDetails: (body) => 
      dispatch(setShowInStockDetails(body)),
    saveInStockFiltersState: (body) =>
      dispatch(saveInStockFiltersState(body)),
    getInStockKpiData: (body) =>
      dispatch(getInStockKpiData(body)),
    setInStockKpiData: (body) =>
      dispatch(setInStockKpiData(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InStockFilters); 