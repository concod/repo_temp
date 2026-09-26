import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";

import {
  setLostSalesFiscalGraphData,
  setLostSalesScreenLoader,
  getLostSalesFiscalWeekGraph,
  clearLostSalesStates,
  setSelectedFilters,
  setIsFiltersValid,
  setLostSalesFilterConfig,
} from "../../../services-inventorysmart/Allocation-Reports/lost-sales-service";
import LostSalesOpportunityComponent from "./lost-sales-opportunity";
import LostSalesTableViewComponent from "./lost-sales-table-view";
import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  validateDateRange,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const LostSalesComponent = (props) => {
  const globalClasses = globalStyles();
  const [showLostSalesDetails, setShowLostSalesDetails] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(filterElements, filterDependency, true);
    const dates = filterDates?.values;
    let error = FILL_MANDATORY_FIELDS;

    if (props.showFiscalCalendar) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        payload.isValid = false;
      } else {
        const dateRange = validateDateRange(dates, true);
        if (!dateRange.isValid) {
          /** Setting default dates to throw error when applier invalid dates or date out of range in case past or future dates restrictions */
          payload.isValid = false;
          error = dateRange.error;
          setSelectedDates({
            fiscalInfoStartDate: null,
            fiscalInfoEndDate: null,
          });
        }
      }
    }

    const selectedFilters = payload.reqBody?.filter(
      (filterItem) => filterItem.values?.length > 0
    );

    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(selectedFilters);

    if (!payload.isValid) {
      displaySnackMessages(error, "error");
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
      setSelectedDates(dates.values);
      dependencyData.splice(datesIndex, 1);
    }

    applyFilters(filterData, dependencyData, dates);
  };

  const fetchLostSalesData = async () => {
    try {
      props.setLostSalesScreenLoader(true);
      let graphReqBody = {
        meta: tableConfigurationMetaData.meta,
        filters: props.selectedFilters,
      };
      let response = await props.getLostSalesFiscalWeekGraph(graphReqBody);
      props.setLostSalesFiscalGraphData(response.data?.data);
      props.setLostSalesScreenLoader(false);
      response.data?.status && setShowLostSalesDetails(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setLostSalesScreenLoader(false);
    }
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        if (props.showFiscalCalendar) {
          const getFinancialCalendarData = await getCoreFiscalCalendar();
          moment.updateLocale("en", {
            week: {
              dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
            },
          });
          setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        }

        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setLostSalesFilterConfig(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.clearLostSalesStates();
    };
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.lostSalesFilterConfig) &&
      (!props.showFiscalCalendar || !isEmpty(fiscalCalendarDetails))
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setLostSalesScreenLoader(true);
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.lostSalesFilterConfig) || [],
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

          let responseWithFiscalCalendarConfig = [...response];

          if (props?.showFiscalCalendar) {
            responseWithFiscalCalendarConfig = [
              fiscalCalendarConfig,
              ...response,
            ];
          }

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
            "lostSalesFilterConfiguration",
            filterConfigData,
            "Lost Sales"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setLostSalesScreenLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.lostSalesFilterConfig, fiscalCalendarDetails]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      if (props.hideGraphComponent) {
        setShowLostSalesDetails(true);
      } else {
        fetchLostSalesData();
      }
    }
  }, [props.selectedFilters]);

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
        filterConfigKey={"lostSalesFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      >
        <Loader
          loader={props.lostSalesScreenLoader || props.lostSalesDataLoader}
        >
          {showLostSalesDetails && props.isFiltersValid && (
            <div className={globalClasses.marginHorizontal}>
              {!props.hideGraphComponent && (
                <LostSalesOpportunityComponent
                  lostSalesGraph={
                    props.lostSalesFiscalWeekGraph?.lost_sales_graph
                  }
                />
              )}
              <LostSalesTableViewComponent
                hideGraphComponent={props.hideGraphComponent}
                selectedDates={selectedDates}
                weeksAvailable={props.lostSalesFiscalWeekGraph?.weeks_available}
              />
            </div>
          )}
        </Loader>
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedFilters:
      inventorysmartReducer.inventorySmartLostSalesService?.selectedFilters,
    isFiltersValid:
      inventorysmartReducer.inventorySmartLostSalesService.isFiltersValid,
    lostSalesScreenLoader:
      inventorysmartReducer.inventorySmartLostSalesService
        .lostSalesScreenLoader,
    lostSalesDataLoader:
      inventorysmartReducer.inventorySmartLostSalesService.lostSalesDataLoader,
    lostSalesFilterConfig:
      inventorysmartReducer.inventorySmartLostSalesService
        .lostSalesFilterConfig,
    lostSalesFiscalWeekGraph:
      inventorysmartReducer.inventorySmartLostSalesService
        .lostSalesFiscalWeekGraph,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "lostSalesFilterConfiguration"
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
    setLostSalesScreenLoader: (body) =>
      dispatch(setLostSalesScreenLoader(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setLostSalesFiscalGraphData: (body) =>
      dispatch(setLostSalesFiscalGraphData(body)),
    setLostSalesFilterConfig: (body) =>
      dispatch(setLostSalesFilterConfig(body)),
    getLostSalesFiscalWeekGraph: (body) =>
      dispatch(getLostSalesFiscalWeekGraph(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    clearLostSalesStates: (body) => dispatch(clearLostSalesStates(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LostSalesComponent);
