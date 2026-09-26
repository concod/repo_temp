import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isNull } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import moment from "moment";
import {
  setLostSalesFiscalWeeksList,
  setLostSalesScreenLoader,
  clearLostSalesStates,
  setSelectedFilters,
  setLostSalesFilterConfig,
  getLostSalesFiscalWeek,
} from "../../../services-inventorysmart/Allocation-Reports/lost-sales-service";
import LostSalesTableViewComponent from "./lost-sales-table-view";
import LostSalesOpportunityComponent from "./lost-sales-opportunity";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { LOST_SALES_MODULE, LOST_SALES_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";

import { parseToYMD } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const LostSalesComponent = (props) => {
  const reportingClasses = useReportingStyles();
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);
  const [showLostSalesDetails, setShowLostSalesDetails] = useState(false);
  const [lostSalesTableRender, setLostSalesTableRender] = useState(false);
  const [dateRange, setDateRange] = useState({ start_date: "", end_date: "" });
  const lostSalesConfig = props?.moduleConfig?.[LOST_SALES_MODULE];
  const showGraph = lostSalesConfig?.showGraph ?? false;
  const addDateRangeFilter = lostSalesConfig?.addDateRangeFilter ?? false;


  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const dates = filterDates?.values;
    let filters = [];
    let date_range = undefined;
    filterDependency.forEach((filterKeysValue) => {
      if (
        filterKeysValue.attribute_name !== "range-picker" &&
        filterKeysValue.attribute_name !== "fiscal_date_range"
      ) {
        filters.push(filterKeysValue);
      } else {
        if (filterKeysValue.attribute_name === "range-picker") {
          date_range = {
            start_date: filterKeysValue.values[0],
            end_date: filterKeysValue.values[1],
          };
        } else {
          if (dates) {
            const startDate = parseToYMD(dates?.fiscalInfoStartDate?.actualSelectedDate);
            const endDate = parseToYMD(dates?.fiscalInfoEndDate?.actualSelectedDate);

            date_range = {
              start_date: startDate,
              end_date: endDate,
            };

            setDateRange({ ...date_range });
          }
        }
      }
    });
    props.setSelectedFilters(filters);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setLostSalesTableRender(false);
    const dates = dependencyData.find((dataItem, index) => {
      return dataItem.attribute_name === "fiscal_date_range";
    });
    applyFilters(filterData, dependencyData, dates);
  };

  const fetchLostSalesData = async () => {
    try {
      props.setLostSalesScreenLoader(true);
      let weekListRequest = {
        meta: tableConfigurationMetaData.meta,
        filters: props.selectedFilters,
      };
      if (addDateRangeFilter) {
        weekListRequest = { ...weekListRequest, date_range: dateRange };
      }
      // Get the list of weeks for the dropdown in table view
      let completeResponse = await props.getLostSalesFiscalWeek(
        weekListRequest
      );
      if (
        completeResponse &&
        completeResponse?.data?.data?.weeks_available.length > 0
      ) {
        let response = completeResponse?.data;
        // This will set the weeks
        props.setLostSalesFiscalWeeksList(response?.data);
        props.setLostSalesScreenLoader(false);
        response?.status && setShowLostSalesDetails(true);
        response?.data?.weeks_available.length && setLostSalesTableRender(true);
      } else {
        props.setLostSalesFiscalWeeksList([]);
        props.setLostSalesScreenLoader(false);
        const show_message = completeResponse?.data?.show_message;
        show_message && displaySnackMessages(
          completeResponse?.data?.message,
          "success"
        );
      }
    } catch (err) {
      props.setLostSalesFiscalWeeksList([]);
      handleErrorMessage(err);
      props.setLostSalesScreenLoader(false);
    }
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        // This fetches list of filters for the
        let response = await fetchFilterConfig("Report Lost Sales");
        props.setLostSalesFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };

    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setLostSalesFilterConfig(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    props.clearLostSalesStates();
    getInitialFilterConfiguration();
    return () => {
      props.clearLostSalesStates();
    };
  }, []);

  useEffect(() => {
    return () => {
      props.clearLostSalesStates();
    };
  }, []);

  useEffect(() => {
    setFiscalCalendarDetails(props?.fiscalCalendarData);
  }, [props?.fiscalCalendarData]);

  useEffect(() => {
    const onLoad = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.lostSalesFilterConfig) &&
        !isNull(fiscalCalendarDetails)
      ) {
        if (addDateRangeFilter) {
          moment.updateLocale("en", {
            week: {
              dow: fiscalCalendarDetails?.week_start_day || 0,
            },
          });
        }
        const getFilterValues = async (selected, current) => {
          try {
            props.setLostSalesScreenLoader(true);
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.lostSalesFilterConfig) || [],
              appliedFilters: selected,
              current: current,
              rolesBasedAccess:
                props.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: LOST_SALES_SCREEN_NAME,
              customDependency: [
                getActiveEntityFilter("product"),
                getActiveEntityFilter("store"),
              ],
              tenantFilterUamConfig: props.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);
            let filterConfigWithCustomFilters = [...response];
            if (addDateRangeFilter) {
              const fiscalCalendarConfig = cloneDeep(
                EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK
              );
              fiscalCalendarConfig.fc_code = response[0]?.fc_code;
              fiscalCalendarConfig.initialData =
                fiscalCalendarDetails?.data || [];
              fiscalCalendarConfig.disableFutureWeeks = true;
              fiscalCalendarConfig.disableOutSideFiscalRange = false;

                const otherfilters = response.filter((filter) => filter.column_name !== "range-picker" && filter.column_name !== "fiscal_date_range")

              filterConfigWithCustomFilters = [
                ...otherfilters,
                fiscalCalendarConfig
              ];
            }

            const filterConfigData = [
              {
                filterDashboardData: filterConfigWithCustomFilters,
                expectedFilterDimensions: getFilterDimensions(
                  filterConfigWithCustomFilters
                ),
                isCrossDimensionFilter: true,
                screen_name: "Report Lost Sales",
              },
            ];
            const filterConfig = formattedFilterConfiguration(
              "lostSalesFilterConfiguration",
              filterConfigData,
              "LOST_SALES_SCREEN_NAME"
            );

            props.setFilterConfiguration(filterConfig);
          } catch (error) {
            handleErrorMessage(error);
          } finally {
            props.setLostSalesScreenLoader(false);
          }
        };
        getFilterValues(props.savedFilterSelection);
      }
    };
    onLoad();
  }, [props.lostSalesFilterConfig, fiscalCalendarDetails]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setShowLostSalesDetails(true);
      fetchLostSalesData();
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
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showPageHeader={true}
        // Filter dashboard props
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"lostSalesFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        autoHideFilterButton={true}
        customClassName={reportingClasses.filterSectionSpacing}
      >
      <Loader loader={props.lostSalesScreenLoader }>
          {showLostSalesDetails && (
            <div>
              {showGraph && (
                <LostSalesOpportunityComponent
                  lostSalesGraph={props.lostSalesFiscalWeeks?.weeks_available}
                />
              )}
              {lostSalesTableRender && (
                <LostSalesTableViewComponent
                  weeksAvailable={
                    // This is where the list of weeks would go
                    props.lostSalesFiscalWeeks?.weeks_available
                  }
                  showAggregates={showGraph}
                  dateRange={dateRange}
                />
              )}
            </div>
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    fiscalCalendarData:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.fiscalCalendarData,
    selectedFilters:
      inventorysmartReducer.inventorySmartLostSalesService.selectedFilters,
    lostSalesScreenLoader:
      inventorysmartReducer.inventorySmartLostSalesService
        .lostSalesScreenLoader,
    lostSalesFilterConfig:
      inventorysmartReducer.inventorySmartLostSalesService
        .lostSalesFilterConfig,
    lostSalesFiscalWeeks:
      inventorysmartReducer.inventorySmartLostSalesService.lostSalesFiscalWeeks,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "lostSalesFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    fiscalCalendarDataState:
        inventorysmartReducer?.inventorySmartCommonService?.fiscalCalendarData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setLostSalesScreenLoader: (body) =>
      dispatch(setLostSalesScreenLoader(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setLostSalesFiscalWeeksList: (body) =>
      dispatch(setLostSalesFiscalWeeksList(body)),
    setLostSalesFilterConfig: (body) =>
      dispatch(setLostSalesFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    clearLostSalesStates: (body) => dispatch(clearLostSalesStates(body)),
    getLostSalesFiscalWeek: (body) => dispatch(getLostSalesFiscalWeek(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LostSalesComponent);
