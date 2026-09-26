import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { ButtonGroup } from "impact-ui-v3";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { capitalize, cloneDeep, isArray, isEmpty } from "lodash";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import FilterChips from "core/commonComponents/filters/filterChips";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "modules/oms/utils-oms/oms-utility";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
} from "modules/oms/constants-oms/routeConstants";
import {
  ERROR_MESSAGE,
  OMS_PLACEMENT_DATE_MULTI_WEEK,
  OMS_RECEIPT_DATE_MULTI_WEEK,
  TENANT_DATE_FORMAT,
  OMS_HIGH_LEVEL_SUMMARY_TAB_LIST,
  REDIRECTION_ALERTS_LOCAL_STORAGE_KEYS,
} from "modules/oms/constants-oms/stringConstants";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  setOrderManagementFilterLoader,
  setOrderManagementFilterElements,
  setOrderManagementFilterDependency,
  setSelectedFilters,
  setIsFiltersValid,
  resetOrderManagementState,
  setRedirectFromDeepDive,
  setRecommRecieptDate,
  setOmsSku,
  getOmsCoreFiscalCalendar,
  setRopDate,
  getViewByHierarchyOptions,
  setViewByHierarchyOptions,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import HighLevelSummaryTable from "./components/HighLevelSummaryTable";
import VendorStore from "./VendorStore/VendorStore.jsx";
import { useStyles as omsUseStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const OrderManagement = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const history = useHistory();

  const globalClasses = globalStyles();
  const classes = useStyles();
  const omsClasses = omsUseStyles();
  const TAB_LIST_OPTIONS =
    props?.screenConfig?.tab_list || OMS_HIGH_LEVEL_SUMMARY_TAB_LIST;

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.screenConfig?.order_placement_weeks_limit || 26;

  const tabOptions =
    props.vendorToStoreScreenConfig?.high_level_summary?.headers_tab;

  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);
  const [pageLoader, setPageLoader] = useState(false);
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [filterDependency, setFilterDependency] = useState({});
  const [renderFiltersComponent, setRenderFiltersComponent] = useState(false);
  const [filterChipsDependency, setFilterChipsDependency] = useState([]);
  const [dateFilters, setDateFilters] = useState([]);
  const [selectedTab, setSelectedTab] = useState(
    location.state?.selectedTab || "vendor_dc"
  );

  const [ropDate, setRopDate] = useState({
    start_date: null,
    end_date: null,
  });
  const [recommRecieptDate, setRecommRecieptDate] = useState({
    start_date: null,
    end_date: null,
  });

  const redirectedFromDeepDive =
    sessionStorage.getItem("isRedirectedFromMatrixSummary") === "true";

  const [redirectedFilterDependency, setRedirectedFilterDependency] = useState(
    props?.selectedFilters
  );

  const type = new URLSearchParams(window.location.search).get("type");
  const redirectedFromDifferentPage = type ? true : false;

  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(redirectedFromDifferentPage);

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const startDateDashboard = JSON.parse(localStorage.getItem("startDate"));
  const endDatedashboard = JSON.parse(localStorage.getItem("endDate"));
  const storedSku = JSON.parse(localStorage.getItem("selectedSku")) || [];

  const [selectedMonthTab, setSelectedMonthTab] = useState(
    TAB_LIST_OPTIONS[0].value
  );

  const handleMonthTab = (event, newSelection) => {
    if (newSelection !== null) {
      setSelectedMonthTab(newSelection);
    }
  };

  //Handles the Vendor To Store and Vendor DC Tabs
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  useEffect(() => {
    const VIEWBY_DROPDOWN_OPTIONS =
      props?.screenConfig?.view_by_dropdown_options || [];

    const fetchViewByHierarchyOptions = async () => {
      const response = await props.getViewByHierarchyOptions();

      if (response?.data?.status && VIEWBY_DROPDOWN_OPTIONS?.length) {
        const viewByDropdownValues = VIEWBY_DROPDOWN_OPTIONS.map(
          (item) => item.value
        );
        const viewByHierarchyOptions = response?.data?.data?.filter((item) =>
          viewByDropdownValues.includes(item.value)
        );
        props.setViewByHierarchyOptions(viewByHierarchyOptions);
      }
    };
    if (props?.screenConfig?.fetch_view_by_from_api) {
      fetchViewByHierarchyOptions();
    } else {
      props.setViewByHierarchyOptions(VIEWBY_DROPDOWN_OPTIONS);
    }
  }, [
    props?.screenConfig?.fetch_view_by_from_api,
    props?.screenConfig?.view_by_dropdown_options,
  ]);

  // Loop through the localStorage items used for redirections from Alerts and remove them
  useEffect(() => {
    REDIRECTION_ALERTS_LOCAL_STORAGE_KEYS.forEach((item) => {
      if (localStorage.getItem(item)) {
        localStorage.removeItem(item);
      }
    });
  }, []);

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props.isFiltersValid) setPageLoader(false);
      else setPageLoader(true);
    }
    if (isRedirectedFromDifferentPage) {
      if (storedSku.length > 0) localStorage.removeItem("selectedSku");
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  // Handle selectedTab from location state (for redirections from Order Details)
  useEffect(() => {
    if (
      location.state?.selectedTab &&
      location.state?.isRedirectedFromOrderDetails
    ) {
      setSelectedTab(location.state.selectedTab);
    }
  }, [
    location.state?.selectedTab,
    location.state?.isRedirectedFromOrderDetails,
  ]);

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setOrderManagementFilterDependency(selectedFiltersDependency);
    localStorage.removeItem("selectedFiltersDependency");

    const selectedSku =
      storedSku?.length > 0 ? storedSku : props.selectedOmsSku;

    props.setOmsSku(selectedSku);

    //Loads Fiscal Calendar and Filter Config
    const fetchFilters = async () => {
      try {
        props.setOrderManagementFilterLoader(true);
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
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        const response = await fetchFilterConfig(
          ORDER_MANAGEMENT_FILTER_CONFIG
        );
        setFilters(response);
      } catch (error) {
        props.setOrderManagementFilterLoader(false);
        console.log("Error in fetchFilters", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      sessionStorage.removeItem("isRedirectedFromMatrixSummary");
    };
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const createDatePayload = (selectedDate, attribute_name) => {
    try {
      const currentDate = moment().format(DATE_FORMAT);
      const endDate = moment(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
      )
        .endOf("week")
        .format(DATE_FORMAT);
      const startDate = moment(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .startOf("week")
        .format(DATE_FORMAT);
      let dateParams = {
        attribute_name: attribute_name,
        start_date: startDate,
        end_date: endDate,
      };
      const isFuturisticDate = moment(endDate).isSameOrAfter(
        currentDate,
        "day"
      );
      const fiscalYearWeekType = isFuturisticDate ? "future" : "historical";
      return { dateParams, fiscalYearWeekType };
    } catch (error) {
      console.log("Error in createDatePayload", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const applyFilters = (
    filterElements,
    filterDependency,
    filterRopDates,
    filterRecommDates,
    isFiltersFromState
  ) => {
    let isFilterDatesSelected = false; // To verify if user has provided a date range
    if (!filterDependency) return;

    const payload = filtersPayload(
      filterElements,
      filterDependency || props.orderManagementFilterDependency,
      true,
      true,
      true
    );

    const currentDate = moment().format(DATE_FORMAT);
    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: null,
      fiscal_year_week_type: null,
    };

    if (isFiltersFromState) {
      if (props?.ropDate?.start_date && props?.ropDate?.end_date) {
        setRopDate(props?.ropDate);
      } else {
        const dateParams = {
          attribute_name: "order_placement_recom_date",
          start_date: null,
          end_date: null,
        };
        setRopDate(dateParams);
        props?.setRopDate(dateParams);
      }

      if (
        props?.recommRecieptDate?.start_date &&
        props?.recommRecieptDate?.end_date
      ) {
        setRecommRecieptDate(props?.recommRecieptDate);
      } else {
        const dateParams = {
          attribute_name: "not_before_date",
          start_date: null,
          end_date: null,
        };
        setRecommRecieptDate(dateParams);
        props?.setRecommRecieptDate(dateParams);
      }

      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
      return;
    }

    const dateFiltersValues = [filterRopDates, filterRecommDates].filter(
      (item) => item
    );
    setDateFilters(cloneDeep(dateFiltersValues));

    //Recommended Order Placement Filter Dates
    if (
      !localStorage.getItem("startDate") &&
      !localStorage.getItem("endDate")
    ) {
      var dates = filterRopDates?.values;
    }
    if (dates) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        //payload.isValid = false;
        isFilterDatesSelected = false;
      } else {
        const { dateParams, fiscalYearWeekType } = createDatePayload(
          dates,
          "order_placement_recom_date"
        );

        selectedFilters.fiscal_year_week =
          dates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = fiscalYearWeekType;

        if (startDateDashboard && endDatedashboard) {
          dateParams["start_date"] = startDateDashboard;
          dateParams["end_date"] = endDatedashboard;
        }

        setRopDate(dateParams);
        props?.setRopDate(dateParams);
        isFilterDatesSelected = true;
      }
    } else {
      let dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: null,
        end_date: null,
      };
      setRopDate(dateParams);
      props?.setRopDate(dateParams);
    }
    if (localStorage.getItem("startDate") && localStorage.getItem("endDate")) {
      let dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: JSON.parse(localStorage.getItem("startDate")),
        end_date: JSON.parse(localStorage.getItem("endDate")),
      };
      setRopDate(dateParams);
      props?.setRopDate(dateParams);
      isFilterDatesSelected = true;
    }
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");

    //Recom Receipt Date Filter Dates
    var recommReceiptFilterDates = filterRecommDates?.values;

    if (recommReceiptFilterDates) {
      if (
        recommReceiptFilterDates?.fiscalInfoStartDate ||
        recommReceiptFilterDates?.fiscalInfoEndDate
      ) {
        const { dateParams, fiscalYearWeekType } = createDatePayload(
          recommReceiptFilterDates,
          "not_before_date"
        );

        selectedFilters.fiscal_year_week =
          recommReceiptFilterDates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = fiscalYearWeekType;

        setRecommRecieptDate(dateParams);
        props?.setRecommRecieptDate(dateParams);
      }
    } else {
      let dateParams = {
        attribute_name: "not_before_date",
        start_date: null,
        end_date: null,
      };
      setRecommRecieptDate(dateParams);
      props?.setRecommRecieptDate(dateParams);
    }

    props.setSelectedFilters(payload.reqBody);
    props.setIsFiltersValid(payload.isValid);
  };

  //For Reco Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  //For Order Receipt date
  const isReceiptDateOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().add(1, "years").endOf("week");
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const createDateFilterDependency = (filters, isFiltersReadFromState) => {
    //For Recomm Reciept Date Filter
    const recommRecieptCalendarConfig = JSON.parse(
      JSON.stringify(OMS_PLACEMENT_DATE_MULTI_WEEK)
    );
    recommRecieptCalendarConfig.fc_code = filters[0]?.fc_code;
    recommRecieptCalendarConfig.initialData = fiscalCalendarDetails;
    recommRecieptCalendarConfig.isOutsideRange = isOutsideRange;
    recommRecieptCalendarConfig.order = 3;

    //For Rop Date Filter
    const ropCalendarConfig = JSON.parse(
      JSON.stringify(OMS_RECEIPT_DATE_MULTI_WEEK)
    );
    ropCalendarConfig.fc_code = filters[0]?.fc_code;
    ropCalendarConfig.initialData = fiscalCalendarDetails;
    ropCalendarConfig.isOutsideRange = isReceiptDateOutsideRange;
    ropCalendarConfig.order = 4;

    if (isFiltersReadFromState) {
      ropCalendarConfig.selectedDate = props?.redirectDetails?.dateFilters?.filter(
        (item) => item.filter_id === "fiscal_date_range"
      )[0]?.values;
      recommRecieptCalendarConfig.selectedDate = props?.redirectDetails?.dateFilters?.filter(
        (item) => item.filter_id === "fiscal_date_range_receipt"
      )[0]?.values;
    }
    // const responseWithFiscalCalendarConfig = [
    //   ...filters,
    //   recommRecieptCalendarConfig,
    //   ropCalendarConfig,
    // ];
    const responseWithFiscalCalendarConfig = [...filters];
    return responseWithFiscalCalendarConfig;
  };

  //Prepares Filter Dependency for the CoreComponent
  const prepareFilterDependency = (
    redirectedFilterDependency,
    filterConfigData,
    response
  ) => {
    const redirectedFilters = redirectedFilterDependency
      ?.map((item) => {
        if (item.dimension !== "custom") {
          let filter = {
            ...item,
            filter_id: item.attribute_name,
            filter_type: "cascaded",
            display_type: "dropdown",
          };

          if (!filter.filter_name) {
            let labeledFilter = response.find(
              (data) => data.column_name === filter.attribute_name
            );
            if (labeledFilter) filter.filter_name = labeledFilter.label;
            else filter.filter_name = item.dimension;
          }

          if (filter?.values?.length) {
            return filter;
          }
          return undefined;
        }
      })
      .filter(Boolean);

    const redirectedDateFilters = cloneDeep(
      props?.redirectDetails?.dateFilters
    );

    const validRedirectedDateFilters = Array.isArray(redirectedDateFilters)
      ? redirectedDateFilters?.map((item) => {
          item.initialData = fiscalCalendarDetails;
        })
      : [];

    const responseWithFiscalCalendarConfig = [
      ...redirectedFilters,
      ...validRedirectedDateFilters,
    ];

    const formattedSelectedFilters = formatSelectedFiltersData(
      filterConfigData,
      "Order Management",
      responseWithFiscalCalendarConfig
    );

    setFilterDependency(formattedSelectedFilters);
    onFilterDashboardClick(redirectedFilters, response, true);
    createCustomFilterChips(responseWithFiscalCalendarConfig);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      let selectedFilters = [];

      let redirectedToOMS = false;
      if (
        redirectedFromDeepDive ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage ||
        isRedirectedFromDifferentPage
      ) {
        redirectedToOMS = true;
        selectedFilters = cloneDeep(props.orderManagementFilterDependency);
      }

      props.setOrderManagementFilterLoader(true);
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: redirectedToOMS ? selectedFilters : [],
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      const responseWithFiscalCalendarConfig = createDateFilterDependency(
        response
      );

      if (isEmpty(props?.filterDashboardConfiguration) || redirectedToOMS) {
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
          "orderManagementFilterConfiguration",
          filterConfigData,
          "Order Management",
          selectedFilters
        );

        //Handling Redirection case from Dashboard
        if (isRedirectedFromDifferentPage) {
          prepareFilterDependency(
            props?.orderManagementFilterDependency,
            filterConfigData,
            response
          );
        }

        //Handling Back Button cases of both Deep Dive and Create Scenario
        if (redirectedFromDeepDive) {
          prepareFilterDependency(
            redirectedFilterDependency,
            filterConfigData,
            response
          );
        }

        props.setFilterConfiguration(filterConfig);
      }
      let filterElements = cloneDeep(response);
      setFilterData(response);
    } catch (error) {
      console.log("error123", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOrderManagementFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    if (!isEmpty(fiscalCalendarDetails))
      getFiltersOptions(props.savedFilterSelection);
  }, [filters, fiscalCalendarDetails]);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    isFiltersFromState
  ) => {
    setRedirectedFilterDependency(null);
    setFilterChipsDependency([]);
    const fiscal_date_range = dependencyData?.find(
      (dataItem) => dataItem.attribute_name === "fiscal_date_range"
    );
    const fiscal_date_range_receipt = dependencyData?.find(
      (dataItem) => dataItem.attribute_name === "fiscal_date_range_receipt"
    );
    filterData = filterData.filter(
      (item) =>
        item.column_name !== "fiscal_date_range" &&
        item.column_name !== "fiscal_date_range_receipt"
    );

    applyFilters(
      filterData,
      dependencyData,
      fiscal_date_range,
      fiscal_date_range_receipt,
      isFiltersFromState
    );
  };

  const accordionOnChange = (event, isExpanded) => {
    setIsAccordionExpanded(isExpanded);
  };

  //Creating Dependency for FilterChips when redirected from other screens
  const createCustomFilterChips = (redirectedFilters) => {
    let chipsDependencyData = [];
    cloneDeep(redirectedFilters)?.map((item) => {
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
        chipsDependencyData.push(item);
      }
      if (!item.filter_name) {
        item.filter_name = item.label || capitalize(item.dimension);
      }
    });
    setFilterChipsDependency(chipsDependencyData);
  };

  // Useffect to make sure that the CoreComponent is rendered only if FilterDependency has a value
  // When redirected from Deep Dive, Create Scenario and Dashboard
  useEffect(() => {
    if (redirectedFromDeepDive || isRedirectedFromDifferentPage) {
      if (!isEmpty(filterDependency)) {
        setRenderFiltersComponent(true);
        sessionStorage.removeItem("isRedirectedFromMatrixSummary");
      } else {
        setRenderFiltersComponent(false);
      }
    } else {
      setRenderFiltersComponent(true);
      setFilterChipsDependency([]);
    }
  }, [redirectedFromDeepDive, isRedirectedFromDifferentPage, filterDependency]);

  useEffect(() => {
    //Handling the case where user refreshes the page
    const isRefreshed = !sessionStorage.getItem("highLevelSummaryLoaded");
    if (
      isRefreshed &&
      location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
      location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS
    ) {
      props.resetOrderManagementState();
      sessionStorage.removeItem("isRedirectedFromMatrixSummary");
    }
    sessionStorage.setItem("highLevelSummaryLoaded", "true");
    sessionStorage.setItem("matrixSummaryLoaded", "true");
    sessionStorage.setItem("productDetailsLoaded", "true");

    //Handling the case where user navigates to different screen (out of OMS Module)
    const resetOrderManagementReduxState = history.listen((location) => {
      if (
        location.pathname !== ORDER_MANAGEMENT &&
        location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
        location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS
      ) {
        props.resetOrderManagementState();
        sessionStorage.removeItem("isRedirectedFromMatrixSummary");
      }
    });
    return () => {
      resetOrderManagementReduxState();
    };
  }, []);

  const breadCrumbOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Order management",
      id: 1,
      action: () => {
        navigate(ORDER_MANAGEMENT);
      },
    },
  ];

  //Handling Redirection cases
  useEffect(() => {
    return () => {
      localStorage.removeItem("omsRedirectionDetails");
    };
  }, []);

  const customHeaderComponent = () => {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexGrow: 1,
          marginBottom: "32px",
          marginTop: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {tabOptions && (
            <div style={{ fontWeight: 800 }}>High level summary</div>
          )}

          {tabOptions ? (
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className={`${globalClasses.centerAlign}`}
            >
              <ButtonGroup
                onChange={handleTabChange}
                options={tabOptions}
                selectedOption={selectedTab}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className={omsClasses.paddingLayout}>
      {/* <div className={globalClasses.marginBottom}> */}
      {/* <HeaderBreadCrumbs options={breadCrumbOptions} /> */}
      {/* </div> */}

      {selectedTab === "vendor_dc" ? (
        renderFiltersComponent ? (
          <CoreComponentScreen
            headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
            // customHeaderComponent={customHeaderComponent}
            showPageRoute={false}
            showPageHeader={true}
            showFilterDashboard={true}
            filterConfigKey={"orderManagementFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            contained={true}
            isDateLabelDerivedFromDimension={true}
            hideNoDataFound={props?.selectedFilters?.length ? true : false}
            filterDependency={filterDependency}
            autoApplyEnabled={props?.selectedFilters?.length > 0 ? false : true}
          >
            {filterChipsDependency?.length > 0 && (
              <FilterChips
                filterConfig={filterChipsDependency}
                dateFilter={dateFilters}
                isDateLabelDerivedFromDimension={true}
                hideSelectedFilterBadge={true}
              ></FilterChips>
            )}
            {tabOptions && customHeaderComponent()}
            <Loader loader={pageLoader}>
              {props?.isFiltersValid ? (
                <>
                  <div style={{ margin: "0.75rem 0 2rem 0" }}>
                    <HighLevelSummaryTable
                      ropDate={props?.ropDate}
                      recommRecieptDate={props?.recommRecieptDate}
                      selectedMonthTab={selectedMonthTab}
                      dateFilters={dateFilters}
                      handleMonthTab={handleMonthTab}
                      fiscalCalendarDetails={fiscalCalendarDetails}
                    />
                  </div>
                </>
              ) : (
                <div className={globalClasses.centerAlign}>
                  <EmptyStateWrapper />
                </div>
              )}
            </Loader>
          </CoreComponentScreen>
        ) : (
          <LoadingOverlay
            loader={true}
            spinner
            applyDefaultCenterStyle={true}
          />
        )
      ) : (
        <VendorStore
          headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
          customHeaderComponent={customHeaderComponent}
          renderFiltersComponent={renderFiltersComponent}
          onFilterDashboardClick={onFilterDashboardClick}
          selectedFilters={props?.selectedFilters}
          filterDependency={filterDependency}
          filterChipsDependency={filterChipsDependency}
          dateFilters={dateFilters}
          pageLoader={pageLoader}
          isFiltersValid={props?.isFiltersValid}
          ropDate={props?.ropDate}
          recommRecieptDate={props?.recommRecieptDate}
          selectedMonthTab={selectedMonthTab}
          handleMonthTab={handleMonthTab}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedOmsSku: store.omsReducer.orderManagementService.selectedSku,
    isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    orderManagementFilterLoader:
      store.omsReducer.orderManagementService.orderManagementFilterLoader,
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    backButtonClicked:
      store.omsReducer.orderManagementService.backButtonClicked,
    formFilters: store.omsReducer.orderManagementService.formFilters,
    redirectFromDeepDive:
      store.omsReducer.orderManagementService.redirectFromDeepDive,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.oms_dashboard?.high_level_summary,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementFilterLoader: (payload) =>
    dispatch(setOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setOrderManagementFilterDependency: (payload) =>
    dispatch(setOrderManagementFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setRedirectFromDeepDive: (filterConfiguration) =>
    dispatch(setRedirectFromDeepDive(filterConfiguration)),
  setRecommRecieptDate: (filterConfiguration) =>
    dispatch(setRecommRecieptDate(filterConfiguration)),
  setRopDate: (filterConfiguration) =>
    dispatch(setRopDate(filterConfiguration)),
  setOmsSku: (payload) => dispatch(setOmsSku(payload)),
  getViewByHierarchyOptions: () => dispatch(getViewByHierarchyOptions()),
  setViewByHierarchyOptions: (payload) =>
    dispatch(setViewByHierarchyOptions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderManagement);
