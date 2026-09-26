import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { Tabs, Tab } from "@mui/material";
import moment from "moment";
import VendorProjectionsOrders from "./Orders";
import VendorProjectionsForecast from "./Forecasts";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
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
import {
  setSelectedFilters,
  setIsFiltersValid,
  setOrdersScreenLoader,
  setOrdersFilterDependency,
  setOrdersFilterLoader,
  setOrdersFilterElements,
  setOrdersFilterConfig,
  clearOrdersStates,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/vendor-projections-orders-service";
import { getOmsCoreFiscalCalendar } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";

const VendorProjection = (props) => {
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showProjectionCosts, setShowProjectionCosts] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const [tabValue, setTabValue] = useState("orders");
  const VENDORTABS = [
    { label: "Receipts", value: "orders" },
    { label: "Forecast", value: "forecast" },
  ];

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const renderTabComponents = () => {
    switch (tabValue) {
      case "orders":
        return (
          <VendorProjectionsOrders
            hideGraphComponent={props.hideGraphComponent}
            selectedDates={selectedDates}
            enableDownload={props.enableDownload}
          />
        );
      case "forecast":
        return (
          <VendorProjectionsForecast
            hideGraphComponent={props.hideGraphComponent}
            selectedDates={selectedDates}
            enableDownload={props.enableDownload}
          />
        );
      default:
        return;
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

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
    props.setOrdersFilterDependency(selectedFiltersDependency);

    // reset store state on unmount
    const fetchFilters = async () => {
      try {
        props.setOrdersFilterLoader(true);
        const response = await fetchFilterConfig(
          "Inventorysmart Oms Reporting"
        );
        props.setOrdersFilterLoader(false);
        setFilters(response);
        //   props.setOrdersFilterConfig(response);
      } catch (error) {
        props.setOrdersFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.clearOrdersStates();
    };
  }, []);

  useEffect(() => {
    const getCalendarDetails = async () => {
      try {
        props.setOrdersFilterLoader(true);
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } finally {
        props.setOrdersFilterLoader(true);
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
          "ordersFilterConfiguration",
          filterConfigData,
          "Vendor Projections Orders",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOrdersFilterLoader(false);
    }
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    let isFilterDatesSelected = true; // To verify if user has provided a date range. For now, it is set to true
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.ordersFilterDependency,
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
      props.setIsFiltersValid(payload.isValid);
      props.setSelectedFilters(payload.reqBody);
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

  return (
    <>
      <CoreComponentScreen
        showPageHeader={true}
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"ordersFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
      >
        {props.isFiltersValid && (
          <>
            <Tabs
              value={tabValue}
              onChange={handleChangeTabValue}
              aria-label="allocation-reports-tab"
            >
              {VENDORTABS.map((tabOption) => (
                <Tab {...tabProps(tabOption)} />
              ))}
            </Tabs>
            {renderTabComponents()}
          </>
        )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedFilters:
      inventorysmartReducer.inventorySmartOrdersService.selectedFilters,
    isFiltersValid:
      inventorysmartReducer.inventorySmartOrdersService.isFiltersValid,
    ordersFilterDependency:
      inventorysmartReducer.inventorySmartOrdersService.ordersFilterDependency,
    ordersFilterElements:
      inventorysmartReducer.inventorySmartOrdersService.ordersFilterElements,
    ordersFilterLoader:
      inventorysmartReducer.inventorySmartOrdersService.ordersFilterLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "ordersFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    ordersScreenLoader:
      inventorysmartReducer.inventorySmartOrdersService.ordersScreenLoader,
    ordersDataLoader:
      inventorysmartReducer.inventorySmartOrdersService.ordersDataLoader,
    ordersFilterConfig:
      inventorysmartReducer.inventorySmartOrdersService.ordersFilterConfig,
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
    setOrdersFilterDependency: (body) =>
      dispatch(setOrdersFilterDependency(body)),
    setOrdersFilterLoader: (body) => dispatch(setOrdersFilterLoader(body)),
    setOrdersFilterElements: (body) => dispatch(setOrdersFilterElements(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setOrdersScreenLoader: (body) => dispatch(setOrdersScreenLoader(body)),
    setOrdersFilterConfig: (body) => dispatch(setOrdersFilterConfig(body)),
    clearOrdersStates: (body) => dispatch(clearOrdersStates(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VendorProjection);
