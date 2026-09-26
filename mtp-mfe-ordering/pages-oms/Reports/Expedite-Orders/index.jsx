import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  ERROR_MESSAGE,
  OMS_REPORTS_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  RANGE_FILTER_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
} from "modules/oms/utils-oms/oms-utility";
import ExpediteOrdersProjections from "./components/ExpediteOrdersProjections";
import {
  setSelectedFilters,
  setIsFiltersValid,
  setExpediteOrdersFilterConfig,
  setExpediteOrdersFilterDependency,
  setExpediteOrdersFilterElements,
  setExpediteOrdersFilterLoader,
  setExpediteOrdersFiscalGraphData,
  setExpediteOrdersScreenLoader,
  clearExpediteOrdersStates,
} from "modules/oms/services-oms/Reports/expedite-orders";
import { REPORTS_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH, IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
const ExpediteOrders = (props) => {
  const classes = useStyles();
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

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
    props.setExpediteOrdersFilterDependency(selectedFiltersDependency);

    // reset store state on unmount
    const fetchFilters = async () => {
      try {
        props.setExpediteOrdersFilterLoader(true);
        const response = await fetchFilterConfig(REPORTS_FILTER_CONFIG);
        props.setExpediteOrdersFilterLoader(false);
        //props.setExpediteOrdersFilterConfig(response);
        setFilters(response);
      } catch (error) {
        props.setExpediteOrdersFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.clearExpediteOrdersStates();
    };
  }, []);

  useEffect(() => {
    const getCalendarDetails = async () => {
      try {
        props.setExpediteOrdersFilterLoader(true);
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } finally {
        props.setExpediteOrdersFilterLoader(true);
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
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      //For Date Filter
      const fiscalCalendarConfig = JSON.parse(
        JSON.stringify(OMS_REPORTS_FISCAL_CALENDAR_FILTER_SINGLE_WEEK)
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
          "expediteOrdersFilterConfiguration",
          filterConfigData,
          "Expedite Orders",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setExpediteOrdersFilterLoader(false);
    }
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    let isFilterDatesSelected = true; // To verify if user has provided a date range. For now, it is set to true
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.expediteOrdersFilterDependency,
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
        const currentDate = moment().format(DATE_FORMAT);
        const endDate = moment(
          dates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format(DATE_FORMAT);
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
          .format(DATE_FORMAT);
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
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        showPageHeader={true}
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"expediteOrdersFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        customClassName={classes.customMarginBlock}
      >
        {props.isFiltersValid && (
          <div>
            <ExpediteOrdersProjections
              hideGraphComponent={props.hideGraphComponent}
              startEndDate={startEndDate}
              enableDownload={props.enableDownload}
            />
          </div>
        )}
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { filterReducer, omsReducer } = store;
  return {
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "expediteOrdersFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    roleBasedAccess:
      omsReducer.orderingCommonService.genericTenantConfig?.roleBasedAccess,
    selectedFilters: omsReducer.reportsExpediteOrdersService.selectedFilters,
    expediteOrdersFilterElements:
      omsReducer.reportsExpediteOrdersService.expediteOrdersFilterElements,
    expediteOrdersFilterDependency:
      omsReducer.reportsExpediteOrdersService.expediteOrdersFilterDependency,
    expediteOrdersFilterLoader:
      omsReducer.reportsExpediteOrdersService.expediteOrdersFilterLoader,
    isFiltersValid: omsReducer.reportsExpediteOrdersService.isFiltersValid,
    expediteOrdersScreenLoader:
      omsReducer.reportsExpediteOrdersService.expediteOrdersScreenLoader,
    expediteOrdersDataLoader:
      omsReducer.reportsExpediteOrdersService.expediteOrdersDataLoader,
    expediteOrdersFilterConfig:
      omsReducer.reportsExpediteOrdersService.expediteOrdersFilterConfig,
    expediteOrdersFiscalWeekGraph:
      omsReducer.reportsExpediteOrdersService.expediteOrdersFiscalWeekGraph,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setExpediteOrdersScreenLoader: (body) =>
      dispatch(setExpediteOrdersScreenLoader(body)),
    setExpediteOrdersFilterConfig: (body) =>
      dispatch(setExpediteOrdersFilterConfig(body)),
    setExpediteOrdersFiscalGraphData: (body) =>
      dispatch(setExpediteOrdersFiscalGraphData(body)),
    setExpediteOrdersFilterDependency: (body) =>
      dispatch(setExpediteOrdersFilterDependency(body)),
    setExpediteOrdersFilterLoader: (body) =>
      dispatch(setExpediteOrdersFilterLoader(body)),
    setExpediteOrdersFilterElements: (body) =>
      dispatch(setExpediteOrdersFilterElements(body)),
    clearExpediteOrdersStates: (body) =>
      dispatch(clearExpediteOrdersStates(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ExpediteOrders);
