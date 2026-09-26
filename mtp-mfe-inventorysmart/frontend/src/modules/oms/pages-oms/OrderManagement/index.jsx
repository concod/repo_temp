import React, { useState, useEffect, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import { useHistory } from "react-router";
import { isEmpty } from "lodash";
import moment from "moment";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "modules/oms/utils-oms/oms-utility";
import {
  setOrderManagementFilterLoader,
  setOrderManagementFilterElements,
  setOrderManagementFilterDependency,
  setSelectedFilters,
  setSelectedDcs,
  setIsFiltersValid,
  resetOrderManagementState,
  getOmsCoreFiscalCalendar,
  getOmsReceiptCalendarData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { setFiscalCalendar } from "./slices/orderManagementView.slice.js";
import { buildFiscalCalendarState } from "./utils/fiscalCalendarState.util.js";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V4,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
} from "modules/oms/constants-oms/routeConstants";
import {
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import DcFilter from "../common/DcFilter";
import OrderManagementTable from "./OrderManagement";

const ORDER_MANAGEMENT_ROUTE_PATHS = [
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V4,
];

const ORDER_MANAGEMENT_CHILD_ROUTE_PATHS = [
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
];

const OrderManagementPage = (props) => {
  const location = useLocation();
  const history = useHistory();
  const globalClasses = globalStyles();

  const selectedScreenViewName =
    props.screenName || ORDER_MANAGEMENT_FILTER_CONFIG;
  const filterConfigScreenName = ORDER_MANAGEMENT_FILTER_CONFIG;
  const sessionLoadedKey = `orderManagementLoaded:${props.module || "default"}`;

  const [pageLoader, setPageLoader] = useState(false);
  const [filters, setFilters] = useState([]);
  const filterConfigSeededRef = useRef(false);
  const filterOptionsRequestedRef = useRef(false);
  const [tableSessionKey, setTableSessionKey] = useState(0);

  const displaySnack = useCallback(
    (message, variant = "error") => {
      props.addSnack({ message, options: { variant } });
    },
    [props.addSnack]
  );

  const getFiltersOptions = useCallback(
    async (current, { isMounted = () => true } = {}) => {
      try {
        if (isMounted()) {
          props.setOrderManagementFilterLoader(true);
        }

        const response = await fetchFilterOptions({
          allFilters: filters || [],
          appliedFilters: [],
          current,
          rolesBasedAccess: props.roleBasedAccess,
          screenName: filterConfigScreenName,
          tenantFilterUamConfig: props.tenantFilterUamConfig,
        });

        if (!isMounted()) return;

        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: filterConfigScreenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "orderManagementFilterConfiguration",
          filterConfigData,
          "Order Management",
          []
        );

        // Seed redux once — re-writing after FilterPanelDashboard init corrupts the panel
        if (!filterConfigSeededRef.current) {
          props.setFilterConfiguration(filterConfig);
          filterConfigSeededRef.current = true;
        }
        props.setOrderManagementFilterElements(response);
      } catch (error) {
        if (!isMounted()) return;
        console.error("Error fetching filter options:", error);
        displaySnack(ERROR_MESSAGE);
      } finally {
        if (isMounted()) {
          props.setOrderManagementFilterLoader(false);
        }
      }
    },
    [
      filters,
      filterConfigScreenName,
      props.roleBasedAccess,
      props.tenantFilterUamConfig,
      props.setFilterConfiguration,
      props.setOrderManagementFilterElements,
      props.setOrderManagementFilterLoader,
      displaySnack,
    ]
  );

  // Phase 1: reset stale state, hydrate saved dependency, fiscal calendar + filter config
  useEffect(() => {
    let active = true;

    const isRefreshed = !sessionStorage.getItem(sessionLoadedKey);
    if (
      isRefreshed &&
      !ORDER_MANAGEMENT_CHILD_ROUTE_PATHS.includes(location.pathname)
    ) {
      filterConfigSeededRef.current = false;
      filterOptionsRequestedRef.current = false;
      props.resetOrderManagementState();
      props.setFilterConfiguration({
        orderManagementFilterConfiguration: undefined,
      });
    }
    sessionStorage.setItem(sessionLoadedKey, "true");

    const savedFiltersDependency =
      JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setOrderManagementFilterDependency(selectedFiltersDependency || []);
    localStorage.removeItem("selectedFiltersDependency");

    const fetchFilters = async () => {
      try {
        if (active) {
          props.setOrderManagementFilterLoader(true);
        }
        const startYear = moment().year();
        const endYear = moment().year() + 2;
        const queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        if (!active) return;
        const placementRows = getFinancialCalendarData?.data?.data?.data || [];
        const placementWeekStartDay =
          getFinancialCalendarData?.data?.data?.week_start_day || 0;
        let receiptRows = placementRows;
        let receiptWeekStartDay = null;
        try {
          const receiptCalendarData = await getOmsReceiptCalendarData(queryParams);
          if (!active) return;
          receiptRows =
            receiptCalendarData?.data?.data?.data || placementRows;
          receiptWeekStartDay = receiptCalendarData?.data?.data?.week_start_day;
        } catch (_receiptErr) {
          /* receipt calendar optional — fall back to placement rows */
        }
        // NOTE: `moment.updateLocale` mutates the GLOBAL "en" locale, so it
        // cannot hold both timelines' week-start-day at once. Previously this
        // always re-applied placement's dow last, permanently clobbering
        // receipt's — every receipt-tab date-range computation that relies on
        // `moment().startOf("week")` (isOutsideReceiptRange, fiscal week
        // math inside NormalCalendarFiscalMapping) silently used placement's
        // week-start-day instead. Seed with placement here (screen boots into
        // the placement tab); OrderManagement.jsx re-applies the correct one
        // whenever `selectedRoqDateTab` changes.
        moment.updateLocale("en", { week: { dow: placementWeekStartDay } });
        props.setFiscalCalendar(
          buildFiscalCalendarState(placementRows, receiptRows, {
            placementWeekStartDay,
            receiptWeekStartDay,
          })
        );
        const response = await fetchFilterConfig(filterConfigScreenName);
        if (active) {
          setFilters(response);
        }
      } catch (error) {
        if (!active) return;
        console.error("Error in fetchFilters", error);
        displaySnack(ERROR_MESSAGE);
      } finally {
        if (active) {
          props.setOrderManagementFilterLoader(false);
        }
      }
    };

    fetchFilters();

    const unlisten = history.listen((loc) => {
      if (
        !ORDER_MANAGEMENT_ROUTE_PATHS.includes(loc.pathname) &&
        !ORDER_MANAGEMENT_CHILD_ROUTE_PATHS.includes(loc.pathname)
      ) {
        filterConfigSeededRef.current = false;
        filterOptionsRequestedRef.current = false;
        props.resetOrderManagementState();
        props.setFilterConfiguration({
          orderManagementFilterConfiguration: undefined,
        });
        sessionStorage.removeItem(sessionLoadedKey);
      }
    });
    return () => {
      active = false;
      unlisten();
    };
  }, []);

  // Phase 2: cross-dimension filter options — once per filter-config load
  useEffect(() => {
    if (!filters?.length || filterOptionsRequestedRef.current) {
      return;
    }
    filterOptionsRequestedRef.current = true;
    let active = true;
    getFiltersOptions(props.savedFilterSelection, {
      isMounted: () => active,
    });
    return () => {
      active = false;
    };
    // Intentionally omit getFiltersOptions / savedFilterSelection to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onFilterDashboardClick = useCallback(
    (dependencyData, filterData) => {
      const payload = filtersPayload(filterData, dependencyData, true, true, true);
      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
      props.setOrderManagementFilterDependency(dependencyData);
      setTableSessionKey((currentKey) => currentKey + 1);
    },
    [
      props.setSelectedFilters,
      props.setIsFiltersValid,
      props.setOrderManagementFilterDependency,
    ]
  );

  const breadcrumb = (
    <HeaderBreadCrumbs
      options={[
        { label: "Home", to: "/home" },
        { label: "Order Management" },
      ]}
    />
  );

  const filterConfigReady = !isEmpty(
    props.filterDashboardConfiguration?.filterConfig?.[0]
      ?.filterDashboardClassification
  );

  if (props.orderManagementFilterLoader || !filterConfigReady) {
    return (
      <Loader
        loader={true}
        popUp={false}
        children={null}
        minHeight={null}
        gridLoader={false}
        text={"Loading"}
        showingLoadingOnTop={false}
        isCustomLoader={false}
        size={null}
        showSkeleton={false}
        customZIndex={null}
        applyDefaultCenterStyle
      />
    );
  }

  return (
    <div className={globalClasses.paddingAround}>
      <CoreComponentScreen
        autoHideFilterButton={true}
        headerBreadCrumb={breadcrumb}
        extraButtons={[<DcFilter key="om-pivot-dc-filter" />]}
        showStrip={true}
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey="orderManagementFilterConfiguration"
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        isDateLabelDerivedFromDimension={true}
        hideNoDataFound={props.selectedFilters?.length ? true : false}
        autoApplyEnabled={props.selectedFilters?.length > 0 ? false : true}
        screenName={selectedScreenViewName}
      >
        <Loader loader={pageLoader}>
          {props.isFiltersValid ? (
            <OrderManagementTable
              key={tableSessionKey}
              selectedFilters={props.selectedFilters}
              selectedDcs={props.selectedDcs}
              selectedScreenViewName={selectedScreenViewName}
            />
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <EmptyStateWrapper />
            </div>
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => ({
  isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
  selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  orderManagementFilterLoader:
    store.omsReducer.orderManagementService.orderManagementFilterLoader,
  orderManagementFilterElements:
    store.omsReducer.orderManagementService.orderManagementFilterElements,
  orderManagementFilterDependency:
    store.omsReducer.orderManagementService.orderManagementFilterDependency,
  filterDashboardConfiguration:
    store.filterReducer.filterDashboardConfiguration[
      "orderManagementFilterConfiguration"
    ],
  savedFilterSelection: store.filterReducer.savedFilterSelection,
  selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
  tenantFilterUamConfig:
    store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
      .filter_uam,
  roleBasedAccess:
    store.omsReducer.orderingCommonService.genericTenantConfig?.roleBasedAccess,
});

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementFilterLoader: (payload) =>
    dispatch(setOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setSelectedDcs: (payload) => dispatch(setSelectedDcs(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setOrderManagementFilterDependency: (payload) =>
    dispatch(setOrderManagementFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setFilterConfiguration: (config) => dispatch(setFilterConfiguration(config)),
  setFiscalCalendar: (payload) => dispatch(setFiscalCalendar(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderManagementPage);
