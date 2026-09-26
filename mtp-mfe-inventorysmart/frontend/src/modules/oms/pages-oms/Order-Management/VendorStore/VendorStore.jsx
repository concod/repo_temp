import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { ButtonGroup } from "impact-ui-v3";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import DcFilter from "../../common/DcFilter";
import FilterChips from "core/commonComponents/filters/filterChips";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import globalStyles from "core/Styles/globalStyles";
import { capitalize, cloneDeep, isArray, isEmpty } from "lodash";
import moment from "moment";
import HighLevelSummaryTableForVendorStore from "./components/HighLevelSummaryTableForVendorStore.jsx";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "modules/oms/utils-oms/oms-utility";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { setSelectedFilters } from "modules/oms/services-oms/Order-Management/order-management-service";
import { ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  ERROR_MESSAGE,
  OMS_ORDER_MANAGEMENT_SCREENNAME,
  OMS_PLACEMENT_DATE_MULTI_WEEK,
  OMS_RECEIPT_DATE_MULTI_WEEK,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/Order-Management/order-management-service";

const VendorStore = (props) => {
  const globalClasses = globalStyles();

  // Independent state for vendor store filters
  const [vendorStoreFilters, setVendorStoreFilters] = useState([]);
  const [vendorStoreFilterData, setVendorStoreFilterData] = useState([]);
  const [
    vendorStoreFiscalCalendarDetails,
    setVendorStoreFiscalCalendarDetails,
  ] = useState([]);
  const [
    vendorStoreFilterDependency,
    setVendorStoreFilterDependency,
  ] = useState({});
  const [
    vendorStoreRenderFiltersComponent,
    setVendorStoreRenderFiltersComponent,
  ] = useState(false);
  const [
    vendorStoreFilterChipsDependency,
    setVendorStoreFilterChipsDependency,
  ] = useState([]);
  const [vendorStoreDateFilters, setVendorStoreDateFilters] = useState([]);
  const [vendorStorePageLoader, setVendorStorePageLoader] = useState(false);
  const [vendorStoreSelectedFilters, setVendorStoreSelectedFilters] = useState(
    []
  );
  const [vendorStoreIsFiltersValid, setVendorStoreIsFiltersValid] = useState(
    false
  );
  const [vendorStoreFilterLoader, setVendorStoreFilterLoader] = useState(false);

  const [vendorStoreRopDate, setVendorStoreRopDate] = useState({
    start_date: null,
    end_date: null,
  });
  const [
    vendorStoreRecommRecieptDate,
    setVendorStoreRecommRecieptDate,
  ] = useState({
    start_date: null,
    end_date: null,
  });

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const ORDER_PLACEMENT_WEEKS_LIMIT = 26;

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

  const applyVendorStoreFilters = (
    filterElements,
    filterDependency,
    filterRopDates,
    filterRecommDates,
    isFiltersFromState
  ) => {
    let isFilterDatesSelected = false;
    if (!filterDependency) return;

    const payload = filtersPayload(
      filterElements,
      filterDependency,
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
      const dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: null,
        end_date: null,
      };
      setVendorStoreRopDate(dateParams);

      const recommDateParams = {
        attribute_name: "not_before_date",
        start_date: null,
        end_date: null,
      };
      setVendorStoreRecommRecieptDate(recommDateParams);

      setVendorStoreSelectedFilters(payload.reqBody);
      setVendorStoreIsFiltersValid(payload.isValid);
      return;
    }

    const dateFiltersValues = [filterRopDates, filterRecommDates].filter(
      (item) => item
    );
    setVendorStoreDateFilters(cloneDeep(dateFiltersValues));

    // Recommended Order Placement Filter Dates
    var dates = filterRopDates?.values;
    if (dates) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        isFilterDatesSelected = false;
      } else {
        const { dateParams, fiscalYearWeekType } = createDatePayload(
          dates,
          "order_placement_recom_date"
        );

        selectedFilters.fiscal_year_week =
          dates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = fiscalYearWeekType;

        setVendorStoreRopDate(dateParams);
        isFilterDatesSelected = true;
      }
    } else {
      let dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: null,
        end_date: null,
      };
      setVendorStoreRopDate(dateParams);
    }

    // Recom Receipt Date Filter Dates
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

        setVendorStoreRecommRecieptDate(dateParams);
      }
    } else {
      let dateParams = {
        attribute_name: "not_before_date",
        start_date: null,
        end_date: null,
      };
      setVendorStoreRecommRecieptDate(dateParams);
    }

    setVendorStoreSelectedFilters(payload.reqBody);
    setVendorStoreIsFiltersValid(payload.isValid);

    // update Redux state so that HighLevelSummaryTableForVendorStore gets the filters
    props.setSelectedFilters(payload.reqBody);
  };

  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const isReceiptDateOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().add(1, "years").endOf("week");
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const createVendorStoreDateFilterDependency = (filters) => {
    const recommRecieptCalendarConfig = JSON.parse(
      JSON.stringify(OMS_PLACEMENT_DATE_MULTI_WEEK)
    );
    recommRecieptCalendarConfig.fc_code = filters[0]?.fc_code;
    recommRecieptCalendarConfig.initialData = vendorStoreFiscalCalendarDetails;
    recommRecieptCalendarConfig.isOutsideRange = isOutsideRange;
    recommRecieptCalendarConfig.order = 3;

    const ropCalendarConfig = JSON.parse(
      JSON.stringify(OMS_RECEIPT_DATE_MULTI_WEEK)
    );
    ropCalendarConfig.fc_code = filters[0]?.fc_code;
    ropCalendarConfig.initialData = vendorStoreFiscalCalendarDetails;
    ropCalendarConfig.isOutsideRange = isReceiptDateOutsideRange;
    ropCalendarConfig.order = 4;

    const responseWithFiscalCalendarConfig = [...filters];
    return responseWithFiscalCalendarConfig;
  };

  const getVendorStoreFiltersOptions = async () => {
    try {
      setVendorStoreFilterLoader(true);
      let requiredFilterObjParams = {
        allFilters: vendorStoreFilters || [],
        appliedFilters: [],
        current: null,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: OMS_ORDER_MANAGEMENT_SCREENNAME,

        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      const responseWithFiscalCalendarConfig = createVendorStoreDateFilterDependency(
        response
      );

      const filterConfigData = [
        {
          filterDashboardData: responseWithFiscalCalendarConfig,
          expectedFilterDimensions: getFilterDimensions(
            responseWithFiscalCalendarConfig
          ),
          isCrossDimensionFilter: true,
          screen_name: OMS_ORDER_MANAGEMENT_SCREENNAME,
        },
      ];

      const filterConfig = formattedFilterConfiguration(
        "orderManagementVendorStoreFilterConfiguration",
        filterConfigData,
        "Order Management Vendor Store",
        []
      );

      props.setFilterConfiguration(filterConfig);
      setVendorStoreFilterData(response);
      setVendorStoreRenderFiltersComponent(true);

      // Initialize with empty filters to ensure table renders on first load
      setVendorStoreSelectedFilters([]);
      setVendorStoreIsFiltersValid(true);
      // Update Redux state so table component gets notified
      props.setSelectedFilters([]);
    } catch (error) {
      console.log("Error in getVendorStoreFiltersOptions", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setVendorStoreFilterLoader(false);
    }
  };

  const onVendorStoreFilterDashboardClick = (
    dependencyData,
    filterData,
    isFiltersFromState
  ) => {
    setVendorStoreFilterChipsDependency([]);
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

    applyVendorStoreFilters(
      filterData,
      dependencyData,
      fiscal_date_range,
      fiscal_date_range_receipt,
      isFiltersFromState
    );
  };

  const createVendorStoreCustomFilterChips = (redirectedFilters) => {
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
    setVendorStoreFilterChipsDependency(chipsDependencyData);
  };

  // Initialize vendor store filters
  useEffect(() => {
    const fetchVendorStoreFilters = async () => {
      try {
        setVendorStoreFilterLoader(true);
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
        setVendorStoreFiscalCalendarDetails(
          getFinancialCalendarData?.data?.data?.data
        );
        const response = await fetchFilterConfig(
          ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG
        );
        setVendorStoreFilters(response);
      } catch (error) {
        setVendorStoreFilterLoader(false);
        console.log("Error in fetchVendorStoreFilters", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchVendorStoreFilters();
  }, []);

  // Get filter options when filters and fiscal calendar are loaded
  useEffect(() => {
    if (!vendorStoreFilters || vendorStoreFilters?.length === 0) {
      return;
    }
    if (!isEmpty(vendorStoreFiscalCalendarDetails))
      getVendorStoreFiltersOptions();
  }, [vendorStoreFilters, vendorStoreFiscalCalendarDetails]);

  useEffect(() => {
    props.onVendorStoreCoreReadyChange?.(vendorStoreRenderFiltersComponent);
  }, [
    vendorStoreRenderFiltersComponent,
    props.onVendorStoreCoreReadyChange,
  ]);

  return (
    <div>
      {vendorStoreRenderFiltersComponent ? (
        <CoreComponentScreen
          autoHideFilterButton={true}
          headerBreadCrumb={props.highLevelSummaryBreadcrumbsOnly}
          extraButtons={[<DcFilter key="vendor-store-dc-filter" />]}
          renderAboveFilterDashboard={
            props.tabOptions ? (
              <div
                className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
              >
                <ButtonGroup
                  onChange={props.onDcVendorTabChange}
                  options={props.tabOptions}
                  selectedOption={props.selectedTab}
                />
              </div>
            ) : null
          }
          showPageRoute={false}
          showPageHeader={true}
          showFilterDashboard={true}
          filterConfigKey={"orderManagementVendorStoreFilterConfiguration"}
          onApplyFilter={onVendorStoreFilterDashboardClick}
          contained={true}
          isDateLabelDerivedFromDimension={true}
          hideNoDataFound={vendorStoreSelectedFilters?.length ? true : false}
          filterDependency={vendorStoreFilterDependency}
          autoApplyEnabled={
            vendorStoreSelectedFilters?.length > 0 ? false : true
          }
        >
          {vendorStoreFilterChipsDependency?.length > 0 && (
            <FilterChips
              filterConfig={vendorStoreFilterChipsDependency}
              dateFilter={vendorStoreDateFilters}
              isDateLabelDerivedFromDimension={true}
            ></FilterChips>
          )}
          <Loader loader={vendorStorePageLoader}>
            {vendorStoreIsFiltersValid ? (
              <>
                <div style={{ margin: "0.75rem 0 2rem 0" }}>
                  <HighLevelSummaryTableForVendorStore
                    ropDate={props.ropDate}
                    recommRecieptDate={props.recommRecieptDate}
                    selectedMonthTab={props.selectedMonthTab || "current_month"}
                    dateFilters={vendorStoreDateFilters}
                    handleMonthTab={props.handleMonthTab || (() => {})}
                    selectedFilters={vendorStoreSelectedFilters}
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
          loader={vendorStoreFilterLoader}
          spinner
          applyDefaultCenterStyle={true}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorStore);
