import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Tabs, Tab, Typography } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  MODEL_STOCK_DEEP_DIVE_TABS,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ModelStockDeepDiveComponentTable from "./model-stock-deep-dive-table";
import {
  clearModelStockDeepDiveStates,
  getModelStockDeepDiveTableData,
  setModelStockDeepDiveFilterLoader,
  setModelStockDeepDiveTableData,
  setSelectedFilters,
  setIsFiltersValid,
  setModelStockDeepDiveFilterConfig,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/model-stock-deep-dive-service";
import moment from "moment";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formatStringDate } from "core/Utils/functions/utils";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const ModelStockDeepDiveComponent = (props) => {
  const globalClasses = globalStyles();
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [tabValue, setTabValue] = useState("article");

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(filterElements, filterDependency, true);

    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: null,
      fiscal_year_week_type: null,
    };

    const dates = filterDates?.values;

    if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
      payload.isValid = false;
    } else {
      const currentDate = formatStringDate(moment(), false, false);
      const endDate = formatStringDate(
        dates?.fiscalInfoEndDate?.calendar_week_start_date,
        true,
        true
      )
        .endOf("week")
        .format("YYYY-MM-DD");

      const isFuturisticDate = moment(endDate).isSameOrAfter(
        currentDate,
        "day"
      );
      selectedFilters.fiscal_year_week =
        dates.fiscalInfoEndDate?.fiscal_year_week;
      selectedFilters.fiscal_year_week_type = isFuturisticDate
        ? "future"
        : "historical";
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
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);

        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setModelStockDeepDiveFilterConfig(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();
    return () => props.clearModelStockDeepDiveStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.modelStockDeepDiveFilterConfig) &&
      !isEmpty(fiscalCalendarDetails)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setModelStockDeepDiveFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.modelStockDeepDiveFilterConfig) || [],
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
            INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
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
            "modeStockDeepDiveFilterConfiguration",
            filterConfigData,
            "Model Stock Deep Dive"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setModelStockDeepDiveFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.modelStockDeepDiveFilterConfig, fiscalCalendarDetails]);

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
          <ModelStockDeepDiveComponentTable
            tableConfigName="model_stock_deep_dive"
            tabValue={tabValue}
            uniqueKey={"product_code"}
            enableDownload={props.enableDownload}
            displaySnackMessages={displaySnackMessages}
          />
        );
      case "store":
        return (
          <ModelStockDeepDiveComponentTable
            tableConfigName="model_stock_deep_dive_store"
            tabValue={tabValue}
            uniqueKey={"key"}
            enableDownload={props.enableDownload}
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
        showPageHeader={true}
        // Filter dashboard props
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"modeStockDeepDiveFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      >
        {props.isFiltersValid && (
          <div className={globalClasses.marginHorizontal}>
            <Typography variant="h5" className={globalClasses.paddingVertical}>
              Model Stock Deep Dive
            </Typography>
            <Tabs
              value={tabValue}
              onChange={handleChangeTabValue}
              aria-label="allocation-reports-tab"
            >
              {MODEL_STOCK_DEEP_DIVE_TABS.map(
                (tabOption) =>
                  !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
                    tabOption.value
                  ) && <Tab {...tabProps(tabOption)} />
              )}
            </Tabs>
            {renderTabComponents()}
          </div>
        )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    modelStockDeepDiveFilterLoader:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        ?.modelStockDeepDiveFilterLoader,
    modelStockDeepDiveTableData:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDiveTableData,
    isFiltersValid:
      inventorysmartReducer.inventoryModelStockDeepDiveService.isFiltersValid,
    modelStockDeepDiveFilterConfig:
      store.inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDiveFilterConfig,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "modeStockDeepDiveFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setModelStockDeepDiveFilterLoader: (body) =>
      dispatch(setModelStockDeepDiveFilterLoader(body)),
    setModelStockDeepDiveTableData: (body) =>
      dispatch(setModelStockDeepDiveTableData(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setModelStockDeepDiveFilterConfig: (payload) =>
      dispatch(setModelStockDeepDiveFilterConfig(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    getModelStockDeepDiveTableData: (body) =>
      dispatch(getModelStockDeepDiveTableData(body)),
    clearModelStockDeepDiveStates: (body) =>
      dispatch(clearModelStockDeepDiveStates(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModelStockDeepDiveComponent);
