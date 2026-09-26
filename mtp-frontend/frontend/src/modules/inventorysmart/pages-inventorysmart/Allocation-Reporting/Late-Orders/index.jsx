import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  RANGE_FILTER_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
} from "../../inventorysmart-utility";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import LateOrdersProjections from "./components/LateOrdersProjections";
import { getOmsCoreFiscalCalendar } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import {
  setSelectedFilters,
  setIsFiltersValid,
  setLateOrdersFilterConfig,
  setLateOrdersFilterDependency,
  setLateOrdersFilterElements,
  setLateOrdersFilterLoader,
  setLateOrdersFiscalGraphData,
  setLateOrdersScreenLoader,
  clearLateOrdersStates,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/late-orders";

const LateOrders = (props) => {
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const isOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    const weekEndDay = moment().endOf("week");
    const lastWeekSelection = moment().endOf("week").day(27);
    return !moment(date).isBetween(
      weekStartDay,
      lastWeekSelection,
      undefined,
      "[]"
    );
  };

  useEffect(() => {
    const selectedFiltersDependency =
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setLateOrdersFilterDependency(selectedFiltersDependency);

    // reset store state on unmount
    const fetchFilters = async () => {
      try {
        props.setLateOrdersFilterLoader(true);
        const response = await fetchFilterConfig(
          "Inventorysmart Oms Reporting"
        );
        props.setLateOrdersFilterLoader(false);
        //props.setLateOrdersFilterConfig(response);
        setFilters(response);
      } catch (error) {
        props.setLateOrdersFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.clearLateOrdersStates();
    };
  }, []);

  useEffect(() => {
    const getCalendarDetails = async () => {
      try {
        props.setLateOrdersFilterLoader(true);
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } finally {
        props.setLateOrdersFilterLoader(true);
      }
    };

    //Removing Date Filters
    //getCalendarDetails();
  }, []);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  const getFiltersOptions = async (selected, current) => {
    try {
      const selectedFilters = [];
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      //For Date Filter
      const fiscalCalendarConfig = JSON.parse(
        JSON.stringify(INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK)
      );
      fiscalCalendarConfig.fc_code = response[0]?.fc_code;
      fiscalCalendarConfig.initialData = fiscalCalendarDetails;
      fiscalCalendarConfig.isOutsideRange = isOutsideRange;
      fiscalCalendarConfig.disabledType = "customRange";
      fiscalCalendarConfig.showClearDates = false;
      //fiscalCalendarConfig.is_mandatory = true;
      fiscalCalendarConfig.hideLabel = true;

      const responseWithFiscalCalendarConfig = [
        fiscalCalendarConfig,
        ...response,
      ];

      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: [...response],
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "lateOrdersFilterConfiguration",
          filterConfigData,
          "Late Orders",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setLateOrdersFilterLoader(false);
    }
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    let isFilterDatesSelected = true; // To verify if user has provided a date range. For now, it is set to true
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.lateOrdersFilterDependency,
      true
    );
    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: null,
      fiscal_year_week_type: null,
    };
    if (
      !localStorage.getItem("startDate") &&
      !localStorage.getItem("endDate")
    ) {
      var dates = filterDates?.values;
    }
    if (dates) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        //payload.isValid = false;
        isFilterDatesSelected = false;
      } else {
        const currentDate = moment().format(TENANT_DATE_FORMAT);
        const endDate = moment(
          dates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format(TENANT_DATE_FORMAT);
        const isFuturisticDate = moment(endDate).isSameOrAfter(
          currentDate,
          "day"
        );
        selectedFilters.fiscal_year_week =
          dates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = isFuturisticDate
          ? "future"
          : "historical";

        const startDate = moment(
          dates?.fiscalInfoStartDate?.calendar_week_start_date
        )
          .startOf("week")
          .format(TENANT_DATE_FORMAT);
        let dateParams = {
          start_date: startDate,
          end_date: endDate,
        };
        setStartEndDate(dateParams);
        isFilterDatesSelected = true;
      }
    }
    if (localStorage.getItem("startDate") && localStorage.getItem("endDate")) {
      let dateParams = {
        start_date: JSON.stringify(localStorage.getItem("startDate")),
        end_date: JSON.stringify(localStorage.getItem("endDate")),
      };
      setStartEndDate(dateParams);
      isFilterDatesSelected = true;
    }
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");
    if (isFilterDatesSelected) {
      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
    } else {
      displaySnackMessages(RANGE_FILTER_ERROR_MESSAGE, "error");

      props.setIsFiltersValid(false);
      return;
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

    // if (datesIndex > -1) {
    //   dependencyData.splice(datesIndex, 1);
    // }
    applyFilters(filterData, dependencyData, dates);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <>
      <CoreComponentScreen
        showPageHeader={true}
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"lateOrdersFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
      >
        {props.isFiltersValid && (
          <div>
            <LateOrdersProjections
              hideGraphComponent={props.hideGraphComponent}
              startEndDate={startEndDate}
              enableDownload={props.enableDownload}
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
    selectedFilters:
      inventorysmartReducer.inventorySmartLateOrdersService.selectedFilters,
    lateOrdersFilterElements:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersFilterElements,
    lateOrdersFilterDependency:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersFilterDependency,
    lateOrdersFilterLoader:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersFilterLoader,
    isFiltersValid:
      inventorysmartReducer.inventorySmartLateOrdersService.isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "lateOrdersFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    lateOrdersScreenLoader:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersScreenLoader,
    lateOrdersDataLoader:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersDataLoader,
    lateOrdersFilterConfig:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersFilterConfig,
    lateOrdersFiscalWeekGraph:
      inventorysmartReducer.inventorySmartLateOrdersService
        .lateOrdersFiscalWeekGraph,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setLateOrdersScreenLoader: (body) =>
      dispatch(setLateOrdersScreenLoader(body)),
    setLateOrdersFilterConfig: (body) =>
      dispatch(setLateOrdersFilterConfig(body)),
    setLateOrdersFiscalGraphData: (body) =>
      dispatch(setLateOrdersFiscalGraphData(body)),
    setLateOrdersFilterDependency: (body) =>
      dispatch(setLateOrdersFilterDependency(body)),
    setLateOrdersFilterLoader: (body) =>
      dispatch(setLateOrdersFilterLoader(body)),
    setLateOrdersFilterElements: (body) =>
      dispatch(setLateOrdersFilterElements(body)),
    clearLateOrdersStates: (body) => dispatch(clearLateOrdersStates(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LateOrders);
