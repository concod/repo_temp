// @ts-nocheck
import { useEffect, useState, Children, cloneElement } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import {
  ERROR_MESSAGE,
  RANGE_FILTER_ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  rangePickerConstant,
  RANGE_FILTER_START_DATE_ERROR_MESSAGE,
  ALLOCATION_DETAILS_CUSTOM_FILTERS,
  VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S,
  VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME_S2S,
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
  setInventorysmartPastAllocationFilterDependencyS2S,
  setIsFiltersValidS2S,
  setSelectedFiltersS2S as invSetSelectedFiltersS2S,
  setBackButtonClickedS2S,
  setVpaConfigurationS2S,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";

/**
 * Store-to-Store (S2S) filter panel.
 * Owns its own filter state, effects, and CoreComponentScreen.
 * No DC-to-Store logic — purely S2S.
 */
const StoreToStoreFilterPanel = ({
  children,
  // shared
  viewPastAllocationModuleConfig,
  inventorysmartScreenConfig,
  screenName,
  tenantFilterUamConfig,
  isFilterStripVisible,
  // redux (S2S only)
  inventorysmartPastAllocationFilterDependencyS2S,
  vpaConfigurationS2S,
  selectedFiltersVPAS2S,
  backButtonClickedS2S,
  formFiltersS2S,
  filterDashboardConfigurationS2S,
  // dispatch
  setInventorysmartPastAllocationFilterLoader,
  setFilterConfiguration,
  setSelectedFilters,
  setIsFilterApplied,
  setInventorysmartPastAllocationFilterDependencyS2S,
  setIsFiltersValidS2S,
  invSetSelectedFiltersS2S,
  setBackButtonClickedS2S,
  setVpaConfigurationS2S,
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
    setInventorysmartPastAllocationFilterDependencyS2S(filterDependency);

    const payload = filtersPayload(
      filterElements || filterData,
      filterDependency || inventorysmartPastAllocationFilterDependencyS2S,
      true,
      false,
      backButtonClickedS2S ? true : false
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
    setIsFiltersValidS2S(true);
    setPreviewSelectedFilters(filterRequest);
    invSetSelectedFiltersS2S(filterRequest);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      setInventorysmartPastAllocationFilterLoader(true);
      const selectedFilters = backButtonClickedS2S
        ? cloneDeep(inventorysmartPastAllocationFilterDependencyS2S)
        : selected;
      let response;
      if (backButtonClickedS2S) {
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

      const fiscalCalendarConfig = cloneDeep(
        INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
      );
      fiscalCalendarConfig.fc_code = response[0]?.fc_code;

      // Fetch allocation plans for the Plan Name custom filter
      let allocationPlansResponse = [];
      const planRow = response?.find((f) => f.column_name === "plan_code");
      const useCachedPlansOnBack =
        backButtonClickedS2S &&
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
      const allocationPlanValues =
        allocationPlansResponse?.data?.data?.map((planInfo) => ({
          value: planInfo.plan_code,
          label: planInfo.allocation_name,
          id: planInfo.plan_code,
        })) || [];

      // Always add the date range picker + Plan Name custom filter — no config checks
      let planNameFilter = cloneDeep(ALLOCATION_DETAILS_CUSTOM_FILTERS[1]);
      planNameFilter.initialData = allocationPlanValues;
      const filterDataWithCustomFilter = [
        ...response,
        ...rangePickerConstant,
        planNameFilter,
      ];

      if (isEmpty(filterDashboardConfigurationS2S)) {
        const filterConfig = formattedFilterConfiguration(
          VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S,
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
          "View Past Allocation S2S",
          selectedFilters
        );
        setFilterConfiguration(filterConfig);
      }
      setFilterData(response);

      if (backButtonClickedS2S) {
        setVpaConfigurationS2S(vpaConfigurationS2S);
        setFilterConfiguration({
          [VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S]: vpaConfigurationS2S,
        });
        setSelectedFilters(selectedFiltersVPAS2S);
        setIsFilterApplied(true);
        onFilterDashboardClick(selectedFilters, response);
        setBackButtonClickedS2S(false);
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
          VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME_S2S
        );
        setFilters(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      filterDashboardConfigurationS2S &&
      filterDashboardConfigurationS2S?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      setFilters(
        filterDashboardConfigurationS2S?.filterConfig?.[0]?.filterDashboardData
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
    if (backButtonClickedS2S) {
      setSelectedDates(formFiltersS2S.selectedDates);
    }
  }, [backButtonClickedS2S, formFiltersS2S]);

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
      key={VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S}
      showPageRoute={false}
      showPageHeader={true}
      skipFirstRenderCheck
      showFilterDashboard={true}
      filterConfigKey={VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S}
      onApplyFilter={onFilterDashboardClick}
      showChipsOnLoad={backButtonClickedS2S}
      autoApplyEnabled={!backButtonClickedS2S}
      contained={true}
      filterDependency={selectedFiltersVPAS2S}
      chipsDependency={
        backButtonClickedS2S
          ? inventorysmartPastAllocationFilterDependencyS2S
          : null
      }
      autoHideFilterButton={true}
      noPaddingMarginFromCore={true}
      customMarginPaddingClass="vpa-marginBottom_4"
    >
      <div
        className={globalClasses.tabsContainerBody}
        style={{
          maxHeight: `calc(100vh - ${256 - (isFilterStripVisible ? 0 : 64)}px)`,
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
  inventorysmartPastAllocationFilterDependencyS2S:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .inventorysmartPastAllocationFilterDependencyS2S,
  vpaConfigurationS2S:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .vpaConfigurationS2S,
  selectedFiltersVPAS2S:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .selectedFiltersVPAS2S,
  backButtonClickedS2S:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .backButtonClickedS2S,
  formFiltersS2S:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .formFiltersS2S,
  filterDashboardConfigurationS2S:
    store.filterReducer.filterDashboardConfiguration[
      "viewPastAllocationFilterConfigurationS2S"
    ],
});

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartPastAllocationFilterLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterLoader(payload)),
  setFilterConfiguration: (cfg) => dispatch(setFilterConfiguration(cfg)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFilterApplied: (data) => dispatch(setIsFilterApplied(data)),
  setInventorysmartPastAllocationFilterDependencyS2S: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterDependencyS2S(payload)),
  setIsFiltersValidS2S: (payload) => dispatch(setIsFiltersValidS2S(payload)),
  invSetSelectedFiltersS2S: (payload) =>
    dispatch(invSetSelectedFiltersS2S(payload)),
  setBackButtonClickedS2S: (payload) =>
    dispatch(setBackButtonClickedS2S(payload)),
  setVpaConfigurationS2S: (data) => dispatch(setVpaConfigurationS2S(data)),
  getAllAllocationPlans: (payload) => dispatch(getAllAllocationPlans(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreToStoreFilterPanel);
