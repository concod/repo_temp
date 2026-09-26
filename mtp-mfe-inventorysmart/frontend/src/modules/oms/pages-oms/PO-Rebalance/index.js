import React, { useState, useEffect, useRef, useMemo } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isArray } from "lodash";
import moment from "moment";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Paper } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { PO_REBALANCE_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  TENANT_DATE_FORMAT,
  ERROR_MESSAGE,
  SELECT_FILTERS_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import {
  setPoRebalanceFilterConfig,
  setPoRebalanceDataLoader,
  setPoRebalanceFilterDependency,
  setSelectedFilters,
  setIsFiltersValid,
  setFilterElements,
  setDateFilters,
  setBackButtonClicked,
  setRedirectDetails,
  resetPoRebalanceState,
  setTableData,
  setTableColumns,
  fetchPORebalanceTableFields,
  fetchPORebalanceTableData,
  fetchFiscalWeeks,
} from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import PORebalanceTable from "./PORebalanceTable";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  handleErrorMessage,
} from "modules/oms/utils-oms/oms-utility";
import { PO_REBALANCE } from "modules/oms/constants-oms/routeConstants";
import { useStyles as omsUseStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const PoRebalance = (props) => {
  const globalClasses = globalStyles();
  const omsClasses = omsUseStyles();
  const agGridInstance = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isRedirectedFromDashboardAlert = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("type") === "alerts";
  }, [location.search]);

  const [filterData, setFilterData] = useState([]);
  const [filterChipsDependency, setFilterChipsDependency] = useState([]);
  const [renderFiltersComponent, setRenderFiltersComponent] = useState(true);
  const [pageLoader, setPageLoader] = useState(true);
  const [processedFilters, setProcessedFilters] = useState(null);
  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [selectCalendarDate, setSelectCalendarDate] = useState({
    start_fw: null,
    end_fw: null,
    start_date: null,
    end_date: null,
  });
  const selectedDateRef = useRef(null);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);
  const [dateFilters, setDateFilters] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [calenderChangedDependency, setCalenderChangedDependency] = useState(0);
  const [isFiltersAndDateValid, setIsFiltersAndDateValid] = useState(false);

  const poRebalanceRedirectPayload = useMemo(() => {
    if (!isRedirectedFromDashboardAlert) return null;
    try {
      const storedPoRebalanceAlertPayload = localStorage.getItem(
        "omsPoRebalanceAlertPayload"
      );
      if (!storedPoRebalanceAlertPayload) return null;
      return JSON.parse(storedPoRebalanceAlertPayload);
    } catch (error) {
      console.log(
        "[PO Rebalance] unable to read omsPoRebalanceAlertPayload",
        error
      );
      return null;
    }
  }, [isRedirectedFromDashboardAlert]);

  const redirectedPoRebalanceFilters =
    poRebalanceRedirectPayload?.filters ||
    poRebalanceRedirectPayload?.dashboardFilters ||
    [];
  const isPoRebalanceRedirectFlow =
    isRedirectedFromDashboardAlert && redirectedPoRebalanceFilters.length > 0;


  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        const currentDate = new Date();
        // Calculate the date 8 weeks from now
        var datePlus8Weeks = new Date(currentDate);
        datePlus8Weeks.setDate(currentDate.getDate() + 8 * 7); // 8 weeks * 7 days
        // Format the dates for better readability
        const currentDateFormatted = currentDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const datePlus8WeeksFormatted = datePlus8Weeks
          .toISOString()
          .split("T")[0]; // Format: YYYY-MM-DD

        const response = await fetchFiscalWeeks(
          currentDateFormatted,
          datePlus8WeeksFormatted
        );

        const fiscalDatesInfo = response?.data?.data?.start_date;
        const initialFiscalDates = {
          start_fw: fiscalDatesInfo.start_fw,
          end_fw: fiscalDatesInfo.end_fw,
          start_date: formatStringDate(fiscalDatesInfo?.start_date, true),
          end_date: formatStringDate(fiscalDatesInfo?.end_date, true),
        };
        console.log("fiscalDates", initialFiscalDates);
        setSelectCalendarDate(initialFiscalDates);
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        console.log("error", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setPoRebalanceDataLoader(true);
        const filterSchemaList = await fetchFilterConfig(
          PO_REBALANCE_FILTER_CONFIG
        );
        if (filterSchemaList?.show_message) {
          displaySnackMessages(filterSchemaList?.message, "success", props);
        }
        props.setPoRebalanceFilterConfig(filterSchemaList);

        const schemaFilters = Array.isArray(filterSchemaList)
          ? filterSchemaList
          : filterSchemaList?.data?.data || [];

        if (schemaFilters.length > 0) {
          const initialFiltersForPoRebalance =
            redirectedPoRebalanceFilters?.length > 0
              ? redirectedPoRebalanceFilters
              : props.savedFilterSelection;
          await getFilterValues(
            initialFiltersForPoRebalance,
            undefined,
            schemaFilters
          );
          setRenderFiltersComponent(true);
        }
      } catch (e) {
        handleErrorMessage(e, props);
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setPoRebalanceDataLoader(false);
        setIsInitialLoad(false);
      }
    };
    getInitialData();
    return () => {
      props.resetPoRebalanceState();
      try {
        localStorage.removeItem("omsPoRebalanceAlertPayload");
      } catch (e) {
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isInitialLoad &&
      !isPoRebalanceRedirectFlow &&
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.poRebalanceFilterConfigs)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.poRebalanceFilterConfigs,
    props.savedFilterSelection,
    isInitialLoad,
  ]);

  const getFilterValues = async (selected, current, allFiltersOverride) => {
    try {
      const allFiltersRaw =
        allFiltersOverride != null
          ? allFiltersOverride
          : props.poRebalanceFilterConfigs;
      const allFiltersList = Array.isArray(allFiltersRaw)
        ? allFiltersRaw
        : allFiltersRaw?.data?.data || [];

      let requiredFilterObjParams = {
        allFilters: cloneDeep(allFiltersList),
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props?.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };

      const response = await fetchFilterOptions(requiredFilterObjParams);

      if (response && response.length > 0) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props?.screenName,
            saved_filter_screen_name: props?.screenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "poRebalanceFilterConfigs",
          filterConfigData,
          props?.screenName
        );

        props.setFilterConfiguration(filterConfig);
        setFilterData(response);

        if (selected && selected.length > 0) {
          const formattedSelectedFilters = isPoRebalanceRedirectFlow
            ? selected
            : formatSelectedFiltersData(
                filterConfigData,
                props?.screenName,
                selected
              );
          props.setPoRebalanceFilterDependency(formattedSelectedFilters);
          onFilterDashboardClick(selected, response, true);
        }
      } else {
        console.warn("No filter options returned from API");
      }
    } catch (err) {
      console.error("Error in getFilterValues:", err);
      handleErrorMessage(err, props);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchFiscalWeeks = async (startDate, endDate) => {
    try {
      // Make sure both dates are in the same format as required by the API
      const formattedStartDate = moment(startDate).format(TENANT_DATE_FORMAT);
      const formattedEndDate = moment(endDate).format(TENANT_DATE_FORMAT);

      // Directly call the function without the extra parentheses
      const response = await props.fetchFiscalWeeks(
        formattedStartDate,
        formattedEndDate
      );
      return response;
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return null;
    }
  };

  const createDatePayload = (selectedDate) => {
    try {
      const startDate = moment(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .startOf("week")
        .format(TENANT_DATE_FORMAT);
      const endDate = moment(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
      )
        .endOf("week")
        .format(TENANT_DATE_FORMAT);

      return {
        start_date: startDate,
        end_date: endDate,
        filter_id: "fiscal_date_range",
        display_type: "fiscalCalendar",
        filter_type: "date",
        operator: "between",
      };
    } catch (error) {
      console.error("Error in createDatePayload", error);
      displaySnackMessages(ERROR_MESSAGE, "error", props);
      return null;
    }
  };

  const handleDateChange = async (dates) => {
    setSelectedDate(dates);
    selectedDateRef.current = dates;
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    isFiltersFromState = false
  ) => {
    if (!dependencyData || dependencyData.length === 0) {
      displaySnackMessages(SELECT_FILTERS_MESSAGE, "error");
      return;
    }

    if (!isFiltersFromState || filterChipsDependency.length === 0) {
      createCustomFilterChips(dependencyData);
    }

    const filters = filterData.filter(
      (item) => item.display_type !== "fiscalCalendar"
    );


    const payload = filtersPayload(filters, dependencyData, true, true, true);

    if (payload.isValid || isPoRebalanceRedirectFlow) {
      setProcessedFilters({
        rawFilters: filters,
        dependencyData,
        processedFilters: payload.reqBody,
        timestamp: new Date().toISOString(),
      });

      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(
        isPoRebalanceRedirectFlow ? true : payload.isValid
      );
      props.setFilterElements(filters);
      props.setPoRebalanceFilterDependency(dependencyData);
      setPageLoader(false);
    }
  };

  const createCustomFilterChips = (redirectedFilters) => {
    if (!redirectedFilters || redirectedFilters.length === 0) return;

    let chipsDependencyData = [];
    cloneDeep(redirectedFilters)?.forEach((item) => {
      if (item.display_type !== "fiscalCalendar") {
        if (isArray(item.values)) {
          item.values = item.values.map((value) => {
            if (typeof value === "boolean")
              return mapDataToLabel(value.toString().toUpperCase());
            else return mapDataToLabel(value);
          });
        } else {
          item.values = [mapDataToLabel(item.values)];
        }
        if (item.values?.length > 0) {
          if (!item.filter_id) {
            item.filter_id = item.attribute_name;
          }
          if (!item.filter_type) {
            item.filter_type = "cascaded";
          }
          if (!item.display_type) {
            item.display_type = "dropdown";
          }
          if (!item.filter_name) {
            const labeledFilter = filterData.find(
              (data) => data.column_name === item.attribute_name
            );
            item.filter_name = labeledFilter
              ? labeledFilter.label
              : item.dimension;
          }
          chipsDependencyData.push(item);
        }
      }
    });

    setFilterChipsDependency(chipsDependencyData);
  };

  const onFilterApply = (data) => {
    setIsFiltersAndDateValid(false);
    const currentDates = selectedDateRef.current;
    if (currentDates?.fiscalInfoEndDate !== null) {
      const fiscalDates = {
        start_fw: currentDates?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: currentDates?.fiscalInfoEndDate?.fiscal_year_week,
      };
      setCalenderChangedDependency(calenderChangedDependency + 1);
      setSelectCalendarDate({ ...fiscalDates });
    } else {
      setCalenderChangedDependency(0);
    }
  };

  useEffect(() => {
    const allDateKeysValid = Object.values(selectCalendarDate).every(
      (value) => value !== null
    );
    const isDateValid = fiscalCalendarDetails !== null && allDateKeysValid;
    setIsFiltersAndDateValid(isDateValid && props.isFiltersValid);
  }, [
    calenderChangedDependency,
    selectCalendarDate,
    fiscalCalendarDetails,
    props.isFiltersValid,
  ]);

  const dateFilterOptions = [];
  dateFilterOptions.push(
    <>
      <div className={globalClasses.flexRow}>
        <NormalCalendarFiscalMapping
          disablePastWeeks={true}
          disableOutSideFiscalRange={false}
          showDefaultLabel={false}
          maxOneWeekSelection={true}
          maxEightWeekSelection={true}
          selectionRange={8}
          displayRow={true}
          resetOptions={true}
          fiscalCalendarData={fiscalCalendarDetails}
          onDateChange={handleDateChange}
          selectedDate={selectedDate}
          onPrimaryButtonClick={() => onFilterApply()}
        />
      </div>
    </>
  );

  const breadCrumbOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "PO Rebalance",
      id: 1,
      action: () => {
        navigate(PO_REBALANCE);
      },
    },
  ];

  return (
    <div
      className={globalClasses.paddingAround}
      style={{ paddingTop: "12px", paddingLeft: "24px" }}
    >
      <CoreComponentScreen
        autoHideFilterButton={true}
        showFilterDashboard={true}
        filterConfigKey={"poRebalanceFilterConfigs"}
        onApplyFilter={onFilterDashboardClick}
        showChipsOnLoad={isPoRebalanceRedirectFlow}
        customDependencyValue={{ addFilterExclusions: false }}
        hideNoDataFound={
          isPoRebalanceRedirectFlow || props?.selectedFilters?.length > 0
        }
        disableFilters={isPoRebalanceRedirectFlow}
        chipsDependency={
          filterChipsDependency?.length ? filterChipsDependency : null
        }
        filterDependency={
          isPoRebalanceRedirectFlow && redirectedPoRebalanceFilters?.length
            ? redirectedPoRebalanceFilters
            : null
        }
        preventFilterPreselection={isPoRebalanceRedirectFlow}
        dateFilter={dateFilters}
        isDateLabelDerivedFromDimension={true}
        headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
        autoApplyEnabled={isPoRebalanceRedirectFlow ? false : undefined}
      >
        <Loader loader={pageLoader}>
          {isFiltersAndDateValid ? (
            <div className={globalClasses.marginVertical1rem}>
              <Paper elevation={0}>
                <PORebalanceTable
                  startWeekId={selectCalendarDate?.start_fw}
                  endWeekId={selectCalendarDate?.end_fw}
                  dateFilterOptions={dateFilterOptions}
                  calenderChangedDependency={calenderChangedDependency}
                />
              </Paper>
            </div>
          ) : (
            ""
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { omsReducer, filterReducer } = store;
  return {
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["poRebalanceFilterConfigs"],
    poRebalanceFilterConfigs:
      omsReducer?.poRebalanceService?.poRebalanceFilterConfigs || [],
    poRebalanceFilterDependency:
      omsReducer?.poRebalanceService?.poRebalanceFilterDependency || [],
    selectedFilters: omsReducer?.poRebalanceService?.selectedFilters || [],
    isFiltersValid: omsReducer?.poRebalanceService?.isFiltersValid || false,
    filterElements: omsReducer?.poRebalanceService?.filterElements || [],
    dateFilters: omsReducer?.poRebalanceService?.dateFilters || [],
    tableData: omsReducer?.poRebalanceService?.tableData || null,
    tableColumns: omsReducer?.poRebalanceService?.tableColumns || [],
    savedFilterSelection: filterReducer.savedFilterSelection,
    omsScreenConfig:
      omsReducer?.orderingCommonService?.orderingScreensConfig?.po_rebalance,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer?.userRoleManagementReducer
        ?.tenantUamConfig?.filter_uam,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setPoRebalanceFilterConfig: (body) =>
      dispatch(setPoRebalanceFilterConfig(body)),
    setPoRebalanceDataLoader: (body) =>
      dispatch(setPoRebalanceDataLoader(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setPoRebalanceFilterDependency: (body) =>
      dispatch(setPoRebalanceFilterDependency(body)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setFilterElements: (body) => dispatch(setFilterElements(body)),
    setDateFilters: (body) => dispatch(setDateFilters(body)),
    setTableData: (body) => dispatch(setTableData(body)),
    setTableColumns: (body) => dispatch(setTableColumns(body)),
    resetPoRebalanceState: () => dispatch(resetPoRebalanceState()),
    fetchPORebalanceTableFields: (payload) =>
      dispatch(fetchPORebalanceTableFields(payload)),
    fetchPORebalanceTableData: (payload) =>
      dispatch(fetchPORebalanceTableData(payload)),
    fetchFiscalWeeks: (startDate, endDate) =>
      dispatch(fetchFiscalWeeks(startDate, endDate)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(PoRebalance);
