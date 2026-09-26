import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  RANGE_FILTER_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  validateDateRange,
} from "../../inventorysmart-utility";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  setSelectedFilters,
  setIsFiltersValid,
  setDropShipFilterConfig,
  setDropShipScreenLoader,
  clearDropShipStates,
  setDropShipFiscalGraphData,
  setDropShipFilterElements,
  setDropShipFilterLoader,
  setDropShipFilterDependency,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/drop-ship-service";
import DropShipGraph from "./components/DropShipGraph";
import DropShipProjections from "./components/DropShipProjections";
import DropShipSkuProjections from "./components/DropShipSkuProjections";
import globalStyles from "core/Styles/globalStyles";
import moment from "moment";
import { getOmsCoreFiscalCalendar } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";

const DropShip = (props) => {
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showDropShipDetails, setShowDropShipDetails] = useState(false);
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
    props.setDropShipFilterDependency(selectedFiltersDependency);

    // reset store state on unmount
    const fetchFilters = async () => {
      try {
        props.setDropShipFilterLoader(true);
        const response = await fetchFilterConfig(
          "Inventorysmart Oms Reporting"
        );
        props.setDropShipFilterLoader(false);
        //props.setDropShipFilterConfig(response);
        setFilters(response);
      } catch (error) {
        props.setDropShipFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.clearDropShipStates();
    };
  }, []);

  useEffect(() => {
    const getCalendarDetails = async () => {
      try {
        props.setDropShipFilterLoader(true);
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } finally {
        props.setDropShipFilterLoader(true);
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
      const selectedFilters = selected;
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
          "dropShipFilterConfiguration",
          filterConfigData,
          "Drop Ship",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setDropShipFilterLoader(false);
    }
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    let isFilterDatesSelected = true; // To verify if user has provided a date range. For now, it is set to true
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.dropShipFilterDependency,
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
        filterConfigKey={"dropShipFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
      >
        {props.isFiltersValid && (
          <div>
            <DropShipGraph
              hideGraphComponent={props.hideGraphComponent}
              startEndDate={startEndDate}
              showProjectionCosts={showProjectionCosts}
              setShowProjectionCosts={setShowProjectionCosts}
            />

            <DropShipProjections
              hideGraphComponent={props.hideGraphComponent}
              startEndDate={startEndDate}
              enableDownload={props.enableDownload}
              showProjectionCosts={showProjectionCosts}
            />

            <DropShipSkuProjections
              hideGraphComponent={props.hideGraphComponent}
              startEndDate={startEndDate}
              enableDownload={props.enableDownload}
              showProjectionCosts={showProjectionCosts}
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
      inventorysmartReducer.inventorySmartDropShipService.selectedFilters,
    dropShipFilterElements:
      inventorysmartReducer.inventorySmartDropShipService
        .dropShipFilterElements,
    dropShipFilterDependency:
      inventorysmartReducer.inventorySmartDropShipService
        .dropShipFilterDependency,
    dropShipFilterLoader:
      inventorysmartReducer.inventorySmartDropShipService.dropShipFilterLoader,
    isFiltersValid:
      inventorysmartReducer.inventorySmartDropShipService.isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "dropShipFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    dropShipScreenLoader:
      inventorysmartReducer.inventorySmartDropShipService.dropShipScreenLoader,
    dropShipDataLoader:
      inventorysmartReducer.inventorySmartDropShipService.dropShipDataLoader,
    dropShipFilterConfig:
      inventorysmartReducer.inventorySmartDropShipService.dropShipFilterConfig,
    dropShipFiscalWeekGraph:
      inventorysmartReducer.inventorySmartDropShipService
        .dropShipFiscalWeekGraph,
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
    setDropShipScreenLoader: (body) => dispatch(setDropShipScreenLoader(body)),
    setDropShipFilterConfig: (body) => dispatch(setDropShipFilterConfig(body)),
    setDropShipFiscalGraphData: (body) =>
      dispatch(setDropShipFiscalGraphData(body)),
    setDropShipFilterDependency: (body) =>
      dispatch(setDropShipFilterDependency(body)),
    setDropShipFilterLoader: (body) => dispatch(setDropShipFilterLoader(body)),
    setDropShipFilterElements: (body) =>
      dispatch(setDropShipFilterElements(body)),
    clearDropShipStates: (body) => dispatch(clearDropShipStates(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DropShip);
