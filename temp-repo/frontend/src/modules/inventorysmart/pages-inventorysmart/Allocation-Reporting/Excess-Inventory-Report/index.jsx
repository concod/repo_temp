import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Tabs, Tab, Typography } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  EXCESS_INVENTORY_TABS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";

import ExcessInventoryTableComponent from "./excess-inventory-table";
import {
  clearExcessInventoryStates,
  getExcessInventoryTableData,
  setExcessInventoryFilterDependency,
  setExcessInventoryFilterElements,
  setExcessInventoryFilterLoader,
  setExcessInventoryTableData,
  setSelectedFilters,
  setIsFiltersValid,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-fiscal-week-list-service";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import CustomFilter from "../filters/CustomFilter";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const ExcessInventoryComponent = (props) => {
  const globalClasses = globalStyles();
  const [tabValue, setTabValue] = useState("product_code");
  const onFilterDependency = useRef([]);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const selectedFilters = {
      filters: filterDependency,
    };
    const dates = filterDates.values;

    if (!dates?.fiscalInfoEndDate || !dates?.fiscalInfoStartDate) {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    } else {
      const max = dates?.fiscalInfoEndDate?.fiscal_year_week;
      const min = dates?.fiscalInfoStartDate?.fiscal_year_week;
      const range = [...Array(max - min + 1).keys()].map((i) => i + min);
      selectedFilters.fiscal_year_week = range;
      props.setSelectedFilters(selectedFilters);
      props.setIsFiltersValid(true);
    }
  };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setExcessInventoryFilterLoader(true);
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        if (isEmpty(props.filterDashboardConfiguration)) {
          let filtersData = await fetchFilterConfig(
            "Inventorysmart Reportings"
          );
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
            INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK
          );
          fiscalCalendarConfig.disablePastWeeks = true;
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData =
            getFinancialCalendarData?.data?.data?.data;

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
            "excess_reports_filters",
            filterConfigData,
            "Excess fiscal Report"
          );
          props.setFilterConfiguration(filterConfig);
        } else {
          onFilterDependency.current =
            props.filterDashboardConfiguration.appliedFilterData.dependencyData;
        }
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        props.setExcessInventoryFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    return () => props.clearExcessInventoryStates();
  }, []);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    let datesIndex = -1;
    onFilterDependency.current = dependencyData;
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
      case "product_code":
        return (
          <ExcessInventoryTableComponent
            tableConfigName="excess_inventory_sku_report"
            tabValue={tabValue}
            enableDownload={true}
            displaySnackMessages={displaySnackMessages}
          />
        );
      case "store":
        return (
          <ExcessInventoryTableComponent
            tableConfigName="excess_inventory_store_report"
            tabValue={tabValue}
            enableDownload={true}
            displaySnackMessages={displaySnackMessages}
          />
        );
      default:
        return;
    }
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"excess_reports_filters"}
        onApplyFilter={onFilterDashboardClick}
        customDependencyValue={getCustomDependencyFilter}
      />
      {props.isFiltersValid && (
        <div className={globalClasses.filterWrapper}>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Excess Inventory
          </Typography>
          <Tabs
            value={tabValue}
            onChange={handleChangeTabValue}
            aria-label="allocation-reports-tab"
          >
            {EXCESS_INVENTORY_TABS.map(
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
    ExcessInventoryFilterLoader:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        ?.excessInventoryFilterLoader,
    excessInventoryFilterElements:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryFilterElements,
    excessInventoryFilterDependency:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryFilterDependency,
    excessInventoryTableData:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryTableData,
    isFiltersValid:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .isFiltersValid,
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "excess_reports_filters"
      ],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setExcessInventoryFilterLoader: (body) =>
      dispatch(setExcessInventoryFilterLoader(body)),
    setExcessInventoryTableData: (body) =>
      dispatch(setExcessInventoryTableData(body)),
    setExcessInventoryFilterElements: (body) =>
      dispatch(setExcessInventoryFilterElements(body)),
    setExcessInventoryFilterDependency: (body) =>
      dispatch(setExcessInventoryFilterDependency(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    getExcessInventoryTableData: (body) =>
      dispatch(getExcessInventoryTableData(body)),
    clearExcessInventoryStates: (body) =>
      dispatch(clearExcessInventoryStates(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryComponent);
