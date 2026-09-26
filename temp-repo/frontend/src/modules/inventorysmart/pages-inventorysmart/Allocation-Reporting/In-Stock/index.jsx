import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Tabs, Tab, Typography } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import {
  datePickerConstant,
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  IN_STOCK_TABS,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  validateDateRange,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";

import InStockTableComponent from "./instock-table";
import {
  clearInStockStates,
  getInStockTableData,
  setInStockFilterDependency,
  setInStockFilterElements,
  setInStockFilterLoader,
  setInStockTableData,
  setSelectedFilters,
  setIsFiltersValid,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/in-stock-service";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import { formatStringDate } from "core/Utils/functions/utils";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const InStockComponent = (props) => {
  const globalClasses = globalStyles();

  const [tabValue, setTabValue] = useState("article");
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const onFilterDependency = useRef([]);

  const applyFilters = (filterElements, filterDependency, reset) => {
    const selectedFilters = {
      filters: filterDependency.filter(
        (item) => item.filter_id !== "fiscal_date_range"
      ),
    };
    const dates = filterDependency.find(
      (item) => item.filter_id === "fiscal_date_range"
    )?.values;

    let isValid = true;

    let error = FILL_MANDATORY_FIELDS;

    if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
      isValid = false;
    } else {
      const dateRange = validateDateRange(dates, true);
      if (!dateRange.isValid) {
        /** Setting default dates to throw error when applier invalid dates or date out of range in case past or future dates restrictions */
        isValid = false;
        error = dateRange.error;
      }
    }

    selectedFilters.fiscal_year_week =
      dates?.fiscalInfoStartDate?.fiscal_year_week;

    props.setIsFiltersValid(isValid);
    props.setSelectedFilters(selectedFilters);

    if (!isValid) {
      displaySnackMessages(error, "error");
    }
  };
  // };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setInStockFilterLoader(true);

        if (isEmpty(props.filterDashboardConfiguration)) {
          let filtersData = await fetchFilterConfig(
            "Inventorysmart Reportings"
          );

          const getFinancialCalendarData = await getCoreFiscalCalendar();
          moment.updateLocale("en", {
            week: {
              dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
            },
          });
          let requiredFilterObjParams = {
            allFilters: cloneDeep(filtersData),
            appliedFilters: props.savedFilterSelection,
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
            INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
          );
          fiscalCalendarConfig.disableFutureWeeks = true;
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData =
            getFinancialCalendarData?.data?.data?.data;

          const filterDataWithCustomFilter = [
            ...response,
            fiscalCalendarConfig,
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
            "report_instock_filters",
            filterConfigData,
            "In Stock Report"
          );
          props.setFilterConfiguration(filterConfig);
          setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        }
      } catch (error) {
        props.setInStockFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    fetchFilters();

    return () => props.clearInStockStates();
  }, []);

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const renderTabComponents = () => {
    switch (tabValue) {
      case "article":
        return (
          <InStockTableComponent
            tableConfigName="in_stock_sku_report"
            tabValue={tabValue}
            enableDownload={props.enableDownload}
            displaySnackMessages={displaySnackMessages}
          />
        );
      case "store":
        return (
          <InStockTableComponent
            tableConfigName="in_stock_store_report"
            tabValue={tabValue}
            enableDownload={props.enableDownload}
            displaySnackMessages={displaySnackMessages}
          />
        );
      default:
        return;
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"report_instock_filters"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      {props.isFiltersValid && (
        <div className={globalClasses.marginHorizontal}>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            In Stock
          </Typography>
          <Tabs
            value={tabValue}
            onChange={handleChangeTabValue}
            aria-label="allocation-reports-tab"
          >
            {IN_STOCK_TABS.map(
              (tabOption) =>
                !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
                  tabOption.value
                ) && <Tab {...tabProps(tabOption)} />
            )}
          </Tabs>
          {renderTabComponents()}
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    InStockFilterLoader:
      inventorysmartReducer.inventoryInStockService?.inStockFilterLoader,
    inStockFilterElements:
      inventorysmartReducer.inventoryInStockService.inStockFilterElements,
    inStockFilterDependency:
      inventorysmartReducer.inventoryInStockService.inStockFilterDependency,
    inStockTableData:
      inventorysmartReducer.inventoryInStockService.inStockTableData,
    isFiltersValid:
      inventorysmartReducer.inventoryInStockService.isFiltersValid,
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "report_instock_filters"
      ],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setInStockFilterLoader: (body) => dispatch(setInStockFilterLoader(body)),
    setInStockTableData: (body) => dispatch(setInStockTableData(body)),
    setInStockFilterElements: (body) =>
      dispatch(setInStockFilterElements(body)),
    setInStockFilterDependency: (body) =>
      dispatch(setInStockFilterDependency(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    getInStockTableData: (body) => dispatch(getInStockTableData(body)),
    clearInStockStates: (body) => dispatch(clearInStockStates(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InStockComponent);
