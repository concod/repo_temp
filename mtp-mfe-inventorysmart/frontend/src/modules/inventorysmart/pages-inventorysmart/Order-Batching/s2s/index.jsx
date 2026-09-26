import { createContext, useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  OrderBatchingCustomFiltersS2S,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setS2SSelectedFilters,
  setS2SIsFiltersValid,
  setS2SFilterDependency,
  setS2SFiltersFromS2S,
  resetS2SOrderBatchingState,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { addSnack } from "core/actions/snackbarActions";
import { tenantConfigApiCache } from "../../../../../core/actions/tenantConfigActions";
import CreateTransferRecommendationsS2S from "../../Create-Transfer-Recommendations-S2S";
import { getAllAllocationPlans } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";

export const OrderBatchingS2SContext = createContext(null);

const S2S_SCREEN_NAME = "Inventorysmart Order Batching S2S";

const OrderBatchingS2STab = (props) => {
  const [filters, setFilters] = useState([]);
  // Filters carried over from Create-Transfer-Recommendations-S2S when articles are
  // moved to order batching. Consumed into local state once and cleared from redux so
  // a later visit to this tab starts with an empty filter panel.
  const [redirectFilterDependency, setRedirectFilterDependency] = useState([]);
  const [filterDependencyByScreen, setFilterDependencyByScreen] = useState({});
  const selectedFiltersRef = useRef(props.s2sSelectedFilters);
  const redirectFiltersConsumedRef = useRef(false);
  const redirectFiltersMappedRef = useRef(false);

  useEffect(() => {
    selectedFiltersRef.current = props.s2sSelectedFilters;
  }, [props.s2sSelectedFilters]);

  // Initialize filters on mount
  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        const response = await fetchFilterConfig(S2S_SCREEN_NAME);
        setFilters(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    props.resetS2SOrderBatchingState();
    getInitialFilterConfiguration();

    return () => {
      props.resetS2SOrderBatchingState();
    };
  }, []);

  // The redirect dispatches setS2SFiltersFromS2S right after navigate, so this tab can
  // mount before redux holds the filters - consume them whenever they arrive, once.
  useEffect(() => {
    if (
      props.s2sFiltersFromS2S?.length > 0 &&
      !redirectFiltersConsumedRef.current
    ) {
      redirectFiltersConsumedRef.current = true;
      /** @type {any[]} */
      const dependencyList = cloneDeep(props.s2sFiltersFromS2S);
      // filter_id is what filtersPayload and the filter panel match on, but a
      // dependency restored from a saved draft may only carry attribute_name.
      setRedirectFilterDependency(
        dependencyList.map((dependency) => ({
          ...dependency,
          filter_id: dependency.filter_id || dependency.attribute_name,
          attribute_name: dependency.attribute_name || dependency.filter_id,
        }))
      );
      props.setS2SFiltersFromS2S([]);
    }
  }, [props.s2sFiltersFromS2S]);

  const isOutsideRangeFunc = (date) => {
    const today = moment().endOf("day");
    const fiveDaysAgo = moment().startOf("day").subtract(4, "days");
    return !moment(date).isBetween(fiveDaysAgo, today, undefined, "[]");
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: S2S_SCREEN_NAME,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      if (isEmpty(props.s2sFilterDashboardConfiguration)) {
        const responseWithDateRestrictions = response?.map((data_key) => {
          if (data_key?.column_name === "created_at") {
            data_key = {
              ...data_key,
              disableFuture: true,
              shouldDisableDate: isOutsideRangeFunc,
            };
          }
          return data_key;
        });

        //Adding custom filter for the screen from tenant_attribute_master
        let payload = {
          filters: [
            {
              attribute_name: "status",
              dimension: "Others",
              filter_type: "cascaded",
              operator: "in",
              values: [2],
            },
          ],
        };
        const allocationPlansResponse = await props.fetchAllocationPlan(
          payload
        );
        const allocationPlanValues =
          allocationPlansResponse?.data?.data?.map((planInfo) => {
            return {
              value: planInfo.plan_code,
              label: planInfo.allocation_name,
              id: planInfo.plan_code,
            };
          }) || [];

        // Add custom filters for now we will include levis case too in s2s
        let filteredItems = OrderBatchingCustomFiltersS2S;
        if (props?.no_po_filter) {
          filteredItems = OrderBatchingCustomFiltersS2S.filter(
            (filter) => filter.column_name !== "po_type"
          );
        }

        const orderBatchingCustomFilter =
          filteredItems.map((customFilter) => {
            let filter = {
              ...customFilter,
              fc_code: responseWithDateRestrictions[0]?.fc_code,
            };
            if (customFilter.column_name === "allocation_code") {
              filter = {
                ...filter,
                initialData: allocationPlanValues,
              };
            }
            return filter;
          }) || [];

        const responseWithCustomFilters = [
          ...responseWithDateRestrictions,
          ...orderBatchingCustomFilter,
        ];

        const filterConfigData = [
          {
            filterDashboardData: responseWithCustomFilters,
            expectedFilterDimensions: getFilterDimensions(
              responseWithCustomFilters
            ),
            isCrossDimensionFilter: true,
            screen_name: S2S_SCREEN_NAME,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "orderBatchingS2SFilterConfiguration",
          filterConfigData,
          "Order Batching S2S"
        );

        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      console.error("getFiltersOptions S2S error", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions();
  }, [filters]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const payload = filtersPayload(filterData, dependencyData, true);

    props.setS2SSelectedFilters(payload.reqBody);
    props.setS2SIsFiltersValid(payload.isValid);
    props.setS2SFilterDependency(dependencyData);
  };

  /**
   * Preselects the filters carried over from the transfer recommendations screen.
   * CoreComponentScreen expects them keyed by the classification screenName (see
   * getCombinedCustomFilterDependency) - a flat dependency list is ignored. The filter
   * panel then loads the dropdown options and auto-applies them, which is what calls
   * onFilterDashboardClick.
   *
   * Mapped once into state on purpose: the panel rewrites filterConfiguration while
   * processing this dependency, so deriving it from filterConfig on every render would
   * hand the panel a new object each time and loop it. Stays {} on a direct visit to
   * Order Batching, so none of this affects that flow.
   */
  useEffect(() => {
    if (
      redirectFiltersMappedRef.current ||
      redirectFilterDependency.length === 0
    ) {
      return;
    }
    /** @type {any[]} */
    const classification =
      props.s2sFilterDashboardConfiguration?.filterConfig?.[0]
        ?.filterDashboardClassification || [];
    if (classification.length === 0) {
      return;
    }
    redirectFiltersMappedRef.current = true;
    /** @type {Record<string, any[]>} */
    const dependencyByScreen = {};
    classification.forEach((item) => {
      dependencyByScreen[item.screenName] = redirectFilterDependency.filter(
        (dependency) =>
          (dependency.dimension || "").toLowerCase() ===
          (item.dimension || "").toLowerCase()
      );
    });
    setFilterDependencyByScreen(dependencyByScreen);
  }, [
    redirectFilterDependency,
    props.s2sFilterDashboardConfiguration?.filterConfig,
  ]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <CoreComponentScreen
      showPageRoute={false}
      showPageHeader={false}
      showFilterDashboard={true}
      filterConfigKey={"orderBatchingS2SFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
      contained={true}
      autoHideFilterButton={true}
      skipFirstRenderCheck
      filterDependency={filterDependencyByScreen}
    >
      <CreateTransferRecommendationsS2S
        screenName={props.screenName}
        draftFilters={props.s2sFilterDependency}
        showKpi={true}
        isOrderBatching={true}
      />
    </CoreComponentScreen>
  );
};

const mapStateToProps = (store) => {
  return {
    s2sSelectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSelectedFilters,
    s2sIsFiltersValid:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sIsFiltersValid,
    s2sFiltersFromS2S:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sFiltersFromS2S,
    s2sFilterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderBatchingS2SFilterConfiguration"
      ],
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    s2sFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sFilterDependency,
    no_po_filter:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_ob_s2s?.no_po_filter,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setS2SSelectedFilters: (payload) => dispatch(setS2SSelectedFilters(payload)),
  setS2SIsFiltersValid: (payload) => dispatch(setS2SIsFiltersValid(payload)),
  setS2SFilterDependency: (payload) =>
    dispatch(setS2SFilterDependency(payload)),
  setS2SFiltersFromS2S: (payload) => dispatch(setS2SFiltersFromS2S(payload)),
  resetS2SOrderBatchingState: () => dispatch(resetS2SOrderBatchingState()),
  fetchAllocationPlan: (payload) => dispatch(getAllAllocationPlans(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderBatchingS2STab);
