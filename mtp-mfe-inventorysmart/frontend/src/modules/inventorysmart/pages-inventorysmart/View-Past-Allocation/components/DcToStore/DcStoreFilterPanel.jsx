// @ts-nocheck
import { useEffect, useState, Children, cloneElement } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import {
  ERROR_MESSAGE,
  RANGE_FILTER_ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  rangePickerConstant,
  singleDatePickerConstant,
  RANGE_FILTER_START_DATE_ERROR_MESSAGE,
  ALLOCATION_DETAILS_CUSTOM_FILTERS,
  uploadedOption,
  VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY,
  VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../../../inventorysmart-utility";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  setFilterConfiguration,
  setSelectedFilters,
  setIsFilterApplied,
} from "core/actions/filterAction";
import { getAllAllocationPlans } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import {
  setInventorysmartPastAllocationFilterLoader,
  setInventorysmartPastAllocationFilterDependency,
  setIsFiltersValid,
  setSelectedFilters as invSetSelectedFilters,
  setBackButtonClicked,
  setVpaConfiguration,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";

/**
 * DC-to-Store filter panel.
 * Owns its own filter state, effects, and CoreComponentScreen.
 * No S2S logic — purely DC-to-Store.
 */
const DcStoreFilterPanel = ({
  children,
  showHeader,
  // shared
  viewPastAllocationModuleConfig,
  inventorysmartScreenConfig,
  screenName,
  tenantFilterUamConfig,
  isFilterStripVisible,
  // redux
  inventorysmartPastAllocationFilterDependency,
  vpaConfiguration,
  selectedFiltersVPA,
  backButtonClicked,
  formFilters,
  filterDashboardConfiguration,
  // dispatch
  setInventorysmartPastAllocationFilterLoader,
  setFilterConfiguration,
  setSelectedFilters,
  setIsFilterApplied,
  setInventorysmartPastAllocationFilterDependency,
  setIsFiltersValid,
  invSetSelectedFilters,
  setBackButtonClicked,
  setVpaConfiguration,
  getAllAllocationPlans,
  addSnack,
}) => {
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [previewSelectedFilters, setPreviewSelectedFilters] = useState([]);
  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const displaySnackMessages = (message, variance) => {
    addSnack({ message, options: { variant: variance } });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    setInventorysmartPastAllocationFilterLoader(false);
  };

  const applyFilters = (filterElements, filterDependency) => {
    let datesIndex = -1;
    filterElements = filterElements.filter(
      (item) => item.column_name !== "range-picker"
    );
    if (datesIndex > -1) filterDependency.splice(datesIndex, 1);
    setInventorysmartPastAllocationFilterDependency(filterDependency);

    const payload = filtersPayload(
      filterElements || filterData,
      filterDependency || inventorysmartPastAllocationFilterDependency,
      true,
      false,
      backButtonClicked ? true : false
    );

    let l_dates = filterDependency?.filter(
      (val) => val.filter_id === "range-picker"
    )[0]?.values;
    const isSingleDateFilter =
      viewPastAllocationModuleConfig?.view_past_allocation_table
        ?.singleDateFilter;
    if (isSingleDateFilter && typeof l_dates === "string") {
      l_dates = l_dates ? [l_dates, l_dates] : [];
    }
    let formattedDates = ["Invalid date"];

    if (l_dates?.[0]?.length && l_dates?.[1]?.length) {
      setSelectedDates({
        fiscalInfoStartDate: l_dates[0],
        fiscalInfoEndDate: l_dates[1],
      });
      setStartEndDate({ start_date: l_dates[0], end_date: l_dates[1] });
      formattedDates = [
        moment(l_dates[0]).format("YYYY-MM-DD"),
        moment(l_dates[1]).format("YYYY-MM-DD"),
      ];
    }

    if (formattedDates?.includes("Invalid date")) {
      if (
        !(
          formattedDates[0] === "Invalid date" &&
          formattedDates[1] === "Invalid date"
        )
      ) {
        if (moment().isSame(l_dates[0], "day") && !l_dates[1])
          displaySnackMessages(RANGE_FILTER_START_DATE_ERROR_MESSAGE, "error");
        else displaySnackMessages(RANGE_FILTER_ERROR_MESSAGE, "error");
        return;
      } else {
        setStartEndDate({ start_date: null, end_date: null });
      }
    } else if (!isEmpty(formattedDates)) {
      setStartEndDate({
        start_date: formattedDates[0],
        end_date: formattedDates[1],
      });
    }

    let filterRequest = payload.reqBody.map((item) => {
      if (item.attribute_name === "type") {
        let result = [];
        item.values.forEach((val) => result.push(...JSON.parse(val)));
        return { ...item, values: result };
      }
      return item;
    });
    setIsFiltersValid(true);
    setPreviewSelectedFilters(filterRequest);
    invSetSelectedFilters(filterRequest);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      setInventorysmartPastAllocationFilterLoader(true);
      const selectedFilters = backButtonClicked
        ? cloneDeep(inventorysmartPastAllocationFilterDependency)
        : selected;
      let response;
      if (backButtonClicked) {
        response = cloneDeep(filters);
      } else {
        response = await fetchFilterOptions({
          allFilters: filters || [],
          appliedFilters: selectedFilters,
          current,
          rolesBasedAccess: inventorysmartScreenConfig?.roleBasedAccess,
          screenName,
          tenantFilterUamConfig,
        });
      }

      let allocationPlansResponse = [];
      if (
        viewPastAllocationModuleConfig?.view_past_allocation_table
          ?.displayAllocationNameCustomFilter
      ) {
        const planRow = response?.find((f) => f.column_name === "plan_code");
        const useCachedPlansOnBack =
          backButtonClicked &&
          Array.isArray(planRow?.initialData) &&
          planRow.initialData.length > 0;
        if (!useCachedPlansOnBack) {
          allocationPlansResponse = await getAllAllocationPlans({
            filters: [
              {
                attribute_name: "status",
                dimension: "Others",
                filter_type: "cascaded",
                operator: "in",
                values: [3],
              },
            ],
          });
        }
      }

      const allocationPlanValues =
        allocationPlansResponse?.data?.data?.map((planInfo) => ({
          value: planInfo.plan_code,
          label: planInfo.allocation_name,
          id: planInfo.plan_code,
        })) || [];

      const fiscalCalendarConfig = cloneDeep(
        INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
      );
      fiscalCalendarConfig.fc_code = response[0]?.fc_code;
      const datePickerConstant = viewPastAllocationModuleConfig
        ?.view_past_allocation_table?.singleDateFilter
        ? singleDatePickerConstant
        : rangePickerConstant;

      let filterDataWithCustomFilter = [];
      if (
        viewPastAllocationModuleConfig?.view_past_allocation_table
          ?.displayAllocationNameCustomFilter
      ) {
        if (
          viewPastAllocationModuleConfig?.view_past_allocation_table
            ?.displayUploadedAllocationType
        ) {
          ALLOCATION_DETAILS_CUSTOM_FILTERS[0].initialData = [
            ...ALLOCATION_DETAILS_CUSTOM_FILTERS[0].initialData,
            uploadedOption,
          ];
        }
        let clone = cloneDeep(ALLOCATION_DETAILS_CUSTOM_FILTERS);
        clone[1].initialData = allocationPlanValues;
        filterDataWithCustomFilter = [
          ...response,
          ...datePickerConstant,
          ...clone,
        ];
      } else {
        filterDataWithCustomFilter = [...response, ...datePickerConstant];
      }

      if (isEmpty(filterDashboardConfiguration)) {
        const filterConfig = formattedFilterConfiguration(
          VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY,
          [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: screenName,
            },
          ],
          "View Past Allocation",
          selectedFilters
        );
        setFilterConfiguration(filterConfig);
      }
      setFilterData(response);

      if (backButtonClicked) {
        setVpaConfiguration(vpaConfiguration);
        setFilterConfiguration({
          [VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY]: vpaConfiguration,
        });
        setSelectedFilters(selectedFiltersVPA);
        setIsFilterApplied(true);
        onFilterDashboardClick(selectedFilters, response);
        setBackButtonClicked(false);
      }
    } catch (e) {
      console.error("getFiltersOptions error", e);
      handleErrorMessage(e);
    } finally {
      setInventorysmartPastAllocationFilterLoader(false);
    }
  };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setInventorysmartPastAllocationFilterLoader(true);
        const response = await fetchFilterConfig(
          VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME
        );
        setFilters(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      filterDashboardConfiguration &&
      filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      setFilters(
        filterDashboardConfiguration?.filterConfig?.[0]?.filterDashboardData
      );
      return;
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) return;
    getFiltersOptions();
  }, [filters, viewPastAllocationModuleConfig]);

  useEffect(() => {
    if (backButtonClicked) {
      setSelectedDates(formFilters.selectedDates);
    }
  }, [backButtonClicked, formFilters]);

  const childProps = {
    filters,
    selectedDates,
    startEndDate,
    previewSelectedFilters,
  };
  const renderedChildren = Children.map(children, (child) =>
    cloneElement(child, childProps)
  );

  return (
    <CoreComponentScreen
      key={VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY}
      headerBreadCrumb={
        showHeader ? (
          <HeaderBreadCrumbs
            options={[
              { label: "Home", to: "/home" },
              { label: "View Past Allocations", id: 1 },
            ]}
          />
        ) : undefined
      }
      showPageRoute={false}
      showPageHeader={true}
      skipFirstRenderCheck
      showFilterDashboard={true}
      filterConfigKey={VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY}
      onApplyFilter={onFilterDashboardClick}
      showChipsOnLoad={backButtonClicked}
      autoApplyEnabled={!backButtonClicked}
      contained={true}
      filterDependency={selectedFiltersVPA}
      chipsDependency={
        backButtonClicked ? inventorysmartPastAllocationFilterDependency : null
      }
      autoHideFilterButton={true}
      noPaddingMarginFromCore={!showHeader}
      customMarginPaddingClass={!showHeader ? "vpa-marginBottom_4" : ""}
    >
      <div
        className={globalClasses.tabsContainerBody}
        style={{
          maxHeight: `calc(100vh - ${
            showHeader
              ? 200 - (isFilterStripVisible ? 0 : 60)
              : 256 - (isFilterStripVisible ? 0 : 64)
          }px)`,
          marginTop: "16px",
        }}
      >
        {renderedChildren}
      </div>
    </CoreComponentScreen>
  );
};

const mapStateToProps = (store) => ({
  inventorysmartScreenConfig:
    store.inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfig,
  tenantFilterUamConfig:
    store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
      .filter_uam,
  isFilterStripVisible: store?.filterReducer?.showFilters,
  inventorysmartPastAllocationFilterDependency:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .inventorysmartPastAllocationFilterDependency,
  vpaConfiguration:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .vpaConfiguration,
  selectedFiltersVPA:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .selectedFiltersVPA,
  backButtonClicked:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .backButtonClicked,
  formFilters:
    store.inventorysmartReducer.inventorySmartPastAllocationService.formFilters,
  filterDashboardConfiguration:
    store.filterReducer.filterDashboardConfiguration[
      "viewPastAllocationFilterConfiguration"
    ],
});

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartPastAllocationFilterLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterLoader(payload)),
  setFilterConfiguration: (cfg) => dispatch(setFilterConfiguration(cfg)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFilterApplied: (data) => dispatch(setIsFilterApplied(data)),
  setInventorysmartPastAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterDependency(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  invSetSelectedFilters: (payload) => dispatch(invSetSelectedFilters(payload)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setVpaConfiguration: (data) => dispatch(setVpaConfiguration(data)),
  getAllAllocationPlans: (payload) => dispatch(getAllAllocationPlans(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DcStoreFilterPanel);
