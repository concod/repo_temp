import { createContext } from "react";
import { useHistory, useLocation } from "react-router";
import { ORDER_BATCHING_PATH } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState, useRef, useMemo } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  CREATE_ALLOCATION_FORM,
  ERROR_MESSAGE,
  OrderBatchingCustomFilters,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  OB_SSE_CONNECTION_ERROR_MESSAGE,
  OB_SSE_NOTIFICATION_ERROR_MESSAGE,
  OB_DATA_REFRESH_SUCCESS_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";
import ViewCurrentAllocationsTables from "./components/ViewCurrentAllocationsTables";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Form from "core/Utils/form";
import OrderBatchingSummaryStoreTable from "./components/OrderBatchingSummaryStoreTable";
import OrderBatchingSummaryStyleTable from "./components/OrderBatchingSummaryStyleTable";
import {
  setOrderBatchingConfig,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  setNoOfButtonsNextToTab,
  getModuleBasedTenantConfig,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  setInventorysmartOrderBatchingFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartOrderBatchingFilterElements,
  setInventorysmartOrderBatchingFilterDependency,
  resetOrderBatchingStoreState,
  getOrderBatchingMetrics,
  setInventorysmartOrderBatchingMetricsLoader,
  setInventorysmartOrderBatchingToggleLoader,
  setInventorysmartOrderBatchingMetrics,
  setInventorysmartOrderBatchingFilterConfig,
  setBackButtonClicked,
  getAllAllocationPlans,
  setCacheKey,
  setCacheKeyPrepared,
  setCacheKeyPreparedAt,
  prepareOrderBatchingBaseData,
  fetchLockStatus,
  setInventorysmartReloadOrderBatchingData,
  releaseLock,
  callUpdateToggleAPI,
  setAllocationName,
  setInventorysmartOrderBatchingIconConfig,
  setOrderBatchingFilterDetails,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import { setIsProdCloudFunction } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import OrderBatchingMetrics from "./components/OrderBatchingMetrics";
import { generateIcon } from "core/Utils/icon-color-generator";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  setFilterConfiguration,
  setIsFilterApplied,
  setSavedFiltersList,
  setSelectedFilters as setSelectedFiltersCoreReducer,
} from "core/actions/filterAction";
import OrderBatchingSummaryTable from "./components/OrderBatchingSummaryTable";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  ORDER_BACHING_CACHE,
  ORDER_BATCHING_TABS,
} from "../../constants-inventorysmart/stringConstants";
import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import OrderBatchingRenderToggleSummary from "./components/OrderBatchingRenderToggleSummary";
import moment from "moment";
import { ButtonGroup, useTranslation } from "impact-ui-v3";
import { Prompt } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import DrawIcon from "assets/IS_icons/IS_Draw.svg";
import NewOrderBatchingEditedByPopup from "./components/NewOrderBatchingEditedByPopup";
import { BASE_API } from "config/api";
import { POLL_ORDER_BATCHING_SAVE_STATUS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { getToken } from "core/Utils/functions/helpers/authentication-helpers";
import { EventSourcePolyfill } from "event-source-polyfill";
import { tenantConfigApiCache } from "../../../../core/actions/tenantConfigActions";
import {
  capitalizeFirstLetterOfEachWord,
  checkS2SAvaiableOrNot,
} from "../../utils-inventorysmart/utilityFunctions";
import OrderBatchingS2STab from "./s2s";

export const OrderBatchingContext = createContext(null);

const OrderBatching = (props) => {
  const { t } = useTranslation();
  const orderBatchingLabel = t("inventorysmart.orderBatching", {
    module_label: props?.orderBatchingModuleLabel || "Order Batching",
  });
  const paths = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: orderBatchingLabel,
      to: "#",
    },
  ];
  const location = useLocation();
  const tabFromQuery = new URLSearchParams(location.search).get("tab");

  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const isS2SAvailable = checkS2SAvaiableOrNot(
    props.sideBarReducer.activeSideBarData || []
  );
  const visibleTabs = useMemo(() => {
    if (isS2SAvailable) {
      return ORDER_BATCHING_TABS;
    }
    return [ORDER_BATCHING_TABS[0]];
  }, [isS2SAvailable]);
  const [activeTab, setActiveTab] = useState(
    tabFromQuery && visibleTabs.some((t) => t.value === tabFromQuery)
      ? tabFromQuery
      : visibleTabs[0]?.value || "dc_to_store"
  );
  const [allocationForm, setAllocationForm] = useState({ allocationName: "" });
  const [selectedOption, setSelectedOption] = useState("view");
  const [sessionId, setSessionId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [extendTimer, setExtendTimer] = useState(false);
  const [createdAtDate, setCreatedAtDate] = useState("");
  const [editedByPopup, setEditedByPopup] = useState(false);
  const [lockAcquiredBy, setLockAcquiredBy] = useState("");
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [partialFinalize, setPartialFinalize] = useState(false);
  const [obBaseDataEnabled, setObBaseDataEnabled] = useState(false);
  const timeOutRef = useRef(null);
  const sseRef = useRef(null);
  const selectedOptionRef = useRef(selectedOption);
  const selectedFiltersRef = useRef(props.selectedFilters);
  const obBaseDataEnabledRef = useRef(false);
  const inFlightPrepareRef = useRef(null);
  const cacheKeyRef = useRef(props.cache_key);
  const cacheKeyPreparedAtRef = useRef(props.cacheKeyPreparedAt);
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Keep ref updated with current selectedOption value
  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);
  // Keep ref updated with current selectedFilters value
  useEffect(() => {
    selectedFiltersRef.current = props.selectedFilters;
  }, [props.selectedFilters]);
  useEffect(() => {
    obBaseDataEnabledRef.current = obBaseDataEnabled;
  }, [obBaseDataEnabled]);
  // Keep refs updated so ensureFreshCacheKey (captured in a stale AG Grid
  // datasource closure) always reads the latest cache_key/preparedAt.
  useEffect(() => {
    cacheKeyRef.current = props.cache_key;
  }, [props.cache_key]);
  useEffect(() => {
    cacheKeyPreparedAtRef.current = props.cacheKeyPreparedAt;
  }, [props.cacheKeyPreparedAt]);

  useEffect(() => {
    setObBaseDataEnabled(
      props.orderBatchingConfig?.is_ob_base_data_fetch === true
    );
  }, [props.orderBatchingConfig]);

  /**
   * When tenant_env's order_batching_config.value is true, synchronously calls
   * prepare-base-data with the given cache_key + filters before the 4 order-batching
   * fetch APIs fire.
   * On "ready" the 4 APIs are called with the same cache_key; any other outcome
   * (skipped/unavailable/error/timeout) falls back to the current /search-only approach.
   * Guards against firing two prepare calls in parallel for the same cache_key.
   */
  const prepareBaseDataForFilters = async (
    filtersForPrepare,
    cacheKeyForPrepare
  ) => {
    if (!obBaseDataEnabledRef.current) {
      props.setCacheKeyPrepared(false);
      return false;
    }
    if (inFlightPrepareRef.current?.key === cacheKeyForPrepare) {
      return inFlightPrepareRef.current.promise;
    }
    const promise = (async () => {
      try {
        props.setInventorysmartOrderBatchingToggleLoader(true);
        const response = await props.prepareOrderBatchingBaseData({
          filters: filtersForPrepare,
          cache_key: cacheKeyForPrepare,
        });
        const status = response?.data?.data?.status;
        if (status === "ready") {
          props.setCacheKeyPrepared(true);
          props.setCacheKeyPreparedAt(Date.now());
          return true;
        }
        props.setCacheKeyPrepared(false);
        return false;
      } catch (e) {
        props.setCacheKeyPrepared(false);
        return false;
      } finally {
        props.setInventorysmartOrderBatchingToggleLoader(false);
        inFlightPrepareRef.current = null;
      }
    })();
    inFlightPrepareRef.current = { key: cacheKeyForPrepare, promise };
    return promise;
  };

  /**
   * Used for meta-only reuse (pagination/sort) of an already-prepared cache_key.
   * Server-side prepared data expires ~1h; if idle past that, treat it like a
   * refresh - generate a new cache_key and re-prepare before the key is reused.
   */
  const ensureFreshCacheKey = async () => {
    const preparedAt = cacheKeyPreparedAtRef.current;
    const expired =
      obBaseDataEnabledRef.current &&
      preparedAt &&
      Date.now() - preparedAt > ONE_HOUR_MS;
    if (!expired) {
      return cacheKeyRef.current;
    }
    const newCacheKey = generateCacheKey();
    props.setCacheKey(newCacheKey);
    await prepareBaseDataForFilters(selectedFiltersRef.current, newCacheKey);
    return newCacheKey;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const generateCacheKey = () => {
    return (Math.random() + 1).toString(32).substring(3);
  };

  const closeSseConnection = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  const callRefreshLock = async () => {
    try {
      props.setInventorysmartOrderBatchingToggleLoader(true);
      let response = await props.fetchLockStatus({
        filters: props.selectedFilters,
        operation_type_id: 2,
      });
      let responseData = response.data?.data;
      // check for lock_received key in the response, if lock_received is true stay in edit mode else switch to view mode
      if (responseData?.lock_received) {
        displaySnackMessages(responseData?.message, "success");
      }
      setLockAcquiredBy(responseData?.lock_acquired_by);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setInventorysmartOrderBatchingToggleLoader(false);
    }
  };

  const rerunTimer = (type) => {
    if (type === "refreshLock") {
      callRefreshLock();
    }
    setExtendTimer(false);
    timeOutRef.current = setTimeout(() => {
      setExtendTimer(true);
    }, 1800000); // 30 mins
  };

  // for levis case we check only l0_name for matching filters
  const areMatchingFilterValuesEqual = (selectedFilters, savedFilters) => {
    if (!savedFilters || savedFilters.length === 0) {
      return false;
    }
    const savedFilter = savedFilters[0]; // Get the single object from savedFilters
    // Filter selectedFilters to find the object with attribute_name matching l0_name
    const matchingSelectedFilter = selectedFilters.find(
      (filter) => filter.attribute_name === "l0_name"
    );
    if (!matchingSelectedFilter) {
      return false;
    }
    // Compare the values arrays
    const selectedValues = matchingSelectedFilter.values || [];
    const savedValues = savedFilter.values || [];
    // Check if lengths are different
    if (selectedValues.length !== savedValues.length) {
      return false;
    }
    // Use Set-based comparison for order-independent matching
    const savedValuesSet = new Set(savedValues);
    // Check if every element in selectedValues exists in savedValues
    for (const val of selectedValues) {
      if (!savedValuesSet.has(val)) {
        return false;
      }
    }
    return true;
  };

  const checkForLastSaveActionToRefreshData = async (filters) => {
    const jobId = generateCacheKey();
    const token = await getToken();
    const url = `${BASE_API}${POLL_ORDER_BATCHING_SAVE_STATUS}${jobId}`;
    sseRef.current = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `${token}`,
      },
      heartbeatTimeout: 5 * 60000, // reconnect every 1 minute
    });
    sseRef.current.onmessage = async (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.status) {
          if (update.notification_type === "data_refresh") {
            /**
             * Compares the values of filters in selectedFilters and saved_filters
             * for those filters whose attribute_name matches.
             * Returns true if all matching filters have the same values (shallow comparison), false otherwise.
             */
            let appliedFilters =
              filters?.length > 0 ? filters : props.selectedFilters;
            let areFiltersEqual = areMatchingFilterValuesEqual(
              appliedFilters,
              update.saved_filters
            );
            if (areFiltersEqual && selectedOptionRef.current === "view") {
              let cache_key = generateCacheKey();
              // Data refresh -> new cache_key, re-prepare before reloading the 4 APIs.
              await prepareBaseDataForFilters(appliedFilters, cache_key);
              props.setCacheKey(cache_key);
              displaySnackMessages(OB_DATA_REFRESH_SUCCESS_MESSAGE, "success");
              props.setInventorysmartReloadOrderBatchingData(true);
              setTimeout(() => {
                props.setInventorysmartReloadOrderBatchingData(false);
              }, 1000);
            } else {
              return;
            }
          }
        } else if (!update.status) {
          displaySnackMessages(OB_SSE_NOTIFICATION_ERROR_MESSAGE, "error");
        }
      } catch (error) {
        displaySnackMessages(OB_SSE_NOTIFICATION_ERROR_MESSAGE, "error");
        closeSseConnection();
      }
    };
    sseRef.current.onerror = (error) => {
      displaySnackMessages(OB_SSE_CONNECTION_ERROR_MESSAGE, "error");
      closeSseConnection();
    };
  };

  const applyFilters = async (filterElements, filterDependency) => {
    props.setInventorysmartOrderBatchingFilterDependency(filterDependency);

    setSelectedOption("view");
    let findCreatedAt = filterDependency.find(
      (dep) => dep.attribute_name === "created_at"
    )?.values;
    if (props.renderToggleSummary && isOutsideRangeFunc(findCreatedAt)) {
      displaySnackMessages("Created at date is outside the range", "warning");
      return;
    } else {
      const updatedFilterDependency = filterDependency.map((dep) => {
        if (
          dep.attribute_name === "created_at" &&
          typeof dep.values === "string"
        ) {
          setCreatedAtDate(dep.values);
          return { ...dep, values: [dep.values] };
        }
        return dep;
      });
      const payload = filtersPayload(
        filterElements,
        updatedFilterDependency,
        true
      );
      let filtersUpdated = payload.reqBody;
      if (props.renderToggleSummary) {
        filtersUpdated = payload.reqBody?.filter((filter) => {
          if (filter.attribute_name !== "created_at") {
            return filter;
          }
        });
      }
      let cache_key = generateCacheKey();
      // New filters -> new cache_key, never reuse an old prepared key with new filters.
      await prepareBaseDataForFilters(filtersUpdated, cache_key);
      props.setCacheKey(cache_key);
      props.setIsFiltersValid(payload.isValid);
      props.setSelectedFilters(filtersUpdated);
      props.setIsFilterApplied(true);
      checkForLastSaveActionToRefreshData(filtersUpdated);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const fetchOrderBatchingMetrics = async () => {
    try {
      props.setInventorysmartOrderBatchingMetricsLoader(true);
      const body = {
        filters: props.selectedFilters,
        ...(props.cacheKeyPrepared && { cache_key: props.cache_key }),
        ...(props.renderToggleSummary && {
          ...(createdAtDate && { created_at: createdAtDate }),
          session_id: sessionId,
          ...(selectedOption === "edit" && { is_update_mode: true }),
        }),
      };
      let response = await props.getOrderBatchingMetrics(body);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      } else {
        const { render3DIcons, kpiIconMapping = [] } =
          props.inventorysmartOrderBatchingIconConfig || {};
        const metricsWithIcon = response.data.data.map((item) => {
          const formattedLabel = capitalizeFirstLetterOfEachWord(item?.label);

          if (render3DIcons) {
            const iconData = formattedLabel
              ? kpiIconMapping.find(
                  (kpiIconData) =>
                    kpiIconData.label?.toLowerCase() ===
                    formattedLabel.toLowerCase()
                )
              : null;
            const iconType = iconData?.iconType || "";
            return { ...item, label: formattedLabel, iconType };
          }
          const icon = generateIcon();
          return { ...item, label: formattedLabel, icon };
        });
        props.setInventorysmartOrderBatchingMetrics(metricsWithIcon);
      }
    } catch (err) {
      handleErrorMessage(err);
      return [];
    } finally {
      props.setInventorysmartOrderBatchingMetricsLoader(false);
    }
  };

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse;
            if (
              props.cache[ORDER_BACHING_CACHE] &&
              props.cache[ORDER_BACHING_CACHE]["getModuleLevelAccessUtility-OB"]
            ) {
              accessDataResponse =
                props.cache[ORDER_BACHING_CACHE][
                  "getModuleLevelAccessUtility-OB"
                ];
            } else {
              accessDataResponse = await getModuleLevelAccessUtility({
                app: APP_NAME,
                module: subModules,
              })();
              props.setKeyValueInCache({
                key: "getModuleLevelAccessUtility-OB",
                value: accessDataResponse,
                module: ORDER_BACHING_CACHE,
                persist: true,
              });
            }
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          console.log(error, "e");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      // Fetch the "Prod Cloud Function" tenant config independently so the
      // AI Smart Filter (shared AiSmartFilterButton component, used across
      // Order-Batching's summary/S2S tables) knows whether to call the
      // `-prod` cloud function URLs. Previously this was only fetched/
      // dispatched from Decision-Dashboard's own mount effect, so landing
      // directly on Order-Batching without visiting Dashboard first left
      // the flag at its default (false). Kept in its own try/catch so a
      // failure here never blocks the existing permissions flow above.
      const fetchProdCloudFunctionConfig = async () => {
        try {
          const prodCloudFunctionResponse = await props.getModuleBasedTenantConfig(
            { module_name: "Prod Cloud Function" }
          );
          props.setIsProdCloudFunction(
            prodCloudFunctionResponse?.isProdCloudFunction || false
          );
        } catch (error) {
          console.log(error, "prod cloud function config fetch error");
        }
      };
      fetchModulesAccess();
      fetchProdCloudFunctionConfig();
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setInventorysmartOrderBatchingFilterLoader(true);
        let response = await fetchFilterConfig(`Inventorysmart Order Batching`);
        setFilters(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    const getIconConfiguration = () => {
      const obConfig = props.orderBatchingConfig || {};
      props.setInventorysmartOrderBatchingIconConfig(
        obConfig?.orderbatching_icon_details || {}
      );
    };

    const getPartialFinalizationConfig = () => {
      const obConfig = props.orderBatchingConfig || {};
      const configValue = obConfig?.partial_finalization_enabled;
      setPartialFinalize(configValue === true);
    };

    const getOrderBatchingConfig = async () => {
      try {
        const response = await props?.tenantConfigApiCache(1, {
          attribute_name: "order_batching_config",
        });
        props.setOrderBatchingConfig(
          response?.data?.data?.[0]?.attribute_value || {}
        );
      } catch (e) {
        // silently fail - fall back to default row keys
      }
    };

    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      setFilters(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.filterDashboardData
      );
      return;
    }

    props.resetOrderBatchingStoreState();
    getInitialFilterConfiguration();
    getIconConfiguration();
    getPartialFinalizationConfig();
    getOrderBatchingConfig();
    return () => {
      // If user navigates away while in edit mode, release the lock
      if (selectedOptionRef.current === "edit") {
        removeLock();
      }
      props.resetOrderBatchingStoreState();
      clearTimeout(timeOutRef.current);
      timeOutRef.current = null;
      // Close SSE connection when component unmounts
      closeSseConnection();
    };
  }, []);

  const isOutsideRangeFunc = (date) => {
    // Number of days the date range spans (inclusive of today). Configurable via
    // order_batching_config tenant attribute, defaults to 5 days.
    const rangeDays = props.orderBatchingConfig?.date_range_days || 5;
    // This function returns true if the selected date is NOT within the last `rangeDays` days, else false
    const today = moment().endOf("day");
    const rangeStart = moment()
      .startOf("day")
      .subtract(rangeDays - 1, "days");
    // If date is not between rangeStart and today (inclusive), return true, else false
    return !moment(date).isBetween(rangeStart, today, undefined, "[]");
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventorysmartOrderBatchingFilterLoader(true);
      // Use saved filter dependency when coming back from Finalize-Allocation
      const selectedFilters = props.backButtonClicked
        ? cloneDeep(props.inventorysmartOrderBatchingFilterDependency)
        : selected;
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      // When coming back via back button, use saved filter config instead of rebuilding
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !props.backButtonClicked
      ) {
        // Apply date restrictions to created_at filter
        const responseWithDateRestrictions = response?.map((data_key) => {
          if (data_key?.column_name === "created_at") {
            data_key = {
              ...data_key,
              disableFuture: true,
              shouldDisableDate: isOutsideRangeFunc,
            };
            return data_key;
          }
          return data_key;
        });

        // Add custom filters (Allocation Type, Allocation Plan Name, etc.)
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

        let filteredItems = OrderBatchingCustomFilters;
        if (props?.no_po_filter) {
          filteredItems = OrderBatchingCustomFilters.filter(
            (filter) => filter.column_name !== "po_type"
          );
        }

        const orderBatchingCustomFilter =
          filteredItems.map((customFilter) => {
            if (customFilter.column_name === "allocation_code") {
              customFilter = {
                ...customFilter,
                initialData: allocationPlanValues,
              };
            }
            const filter = {
              ...customFilter,
              fc_code: responseWithDateRestrictions[0]?.fc_code,
            };
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
            screen_name: props.screenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "orderBatchingFilterConfiguration",
          filterConfigData,
          "Order Batching"
        );

        props.setFilterConfiguration(filterConfig);
      }
      setFilterData(response);

      // Handle back button click - restore saved filters
      if (props.backButtonClicked) {
        props.setOrderBatchingFilterDetails(props.orderBatchingFilterDetails);
        props.setFilterConfiguration({
          orderBatchingFilterConfiguration: props.orderBatchingFilterDetails,
        });
        props.setSelectedFiltersCoreReducer(
          props.selectedFiltersInOrderBatching
        );
        props.setIsFiltersValid(true);
        props.setBackButtonClicked(false);
        onFilterDashboardClick(selectedFilters, response);
      }
    } catch (error) {
      console.error("getFiltersOptions error", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartOrderBatchingFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions();
  }, [filters]);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.inventorysmartOrderBatchingFilterConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartOrderBatchingFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.inventorysmartOrderBatchingFilterConfig) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterDataWithCustomFilter = response?.map((data_key) => {
            if (data_key?.column_name === "created_at") {
              data_key = {
                ...data_key,
                disableFuture: true,
                shouldDisableDate: isOutsideRangeFunc,
              };
              return data_key;
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
          let filteredItems = OrderBatchingCustomFilters;
          if (props?.no_po_filter) {
            filteredItems = OrderBatchingCustomFilters.filter(
              (filter) => filter.column_name !== "po_type"
            );
          }
          const orderBatchingCustomFilter =
            filteredItems.map((customFilter) => {
              if (customFilter.column_name === "allocation_code") {
                customFilter = {
                  ...customFilter,
                  initialData: allocationPlanValues,
                };
              }
              const filter = {
                ...customFilter,
                fc_code: filterDataWithCustomFilter[0]?.fc_code,
              };
              return filter;
            }) || [];

          const responseWithCustomFilterConfig = [
            ...filterDataWithCustomFilter,
            ...orderBatchingCustomFilter,
          ];

          const filterConfigData = [
            {
              filterDashboardData: responseWithCustomFilterConfig,
              expectedFilterDimensions: getFilterDimensions(
                responseWithCustomFilterConfig
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "orderBatchingFilterConfiguration",
            filterConfigData,
            "Order Batching"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorysmartOrderBatchingFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.inventorysmartOrderBatchingFilterConfig,
    props.savedFilterSelection,
  ]);
  useEffect(() => {
    !isEmpty(props.selectedFilters) && fetchOrderBatchingMetrics();
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData && fetchOrderBatchingMetrics();
  }, [props.inventorysmartReloadOrderBatchingData]);

  useEffect(() => {
    if (props.isNameMandatory) {
      CREATE_ALLOCATION_FORM.find(
        (formElement) => formElement.accessor === "allocationName"
      ).required = true;
    }
  }, [props.isNameMandatory]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const routeOptions = [
    {
      label: t("inventorysmart.orderBatching", {
        module_label: props?.orderBatchingModuleLabel || "Order Batching",
      }),
      id: 1,
      action: () => {
        history.push(ORDER_BATCHING_PATH);
      },
    },
  ];

  const handleOnBlur = (event) => {
    props.setAllocationName(event.target.value);
  };

  const handlePlanNameChange = (updatedFormData) => {
    setAllocationForm(updatedFormData);
  };

  const updateDependencyHandler = async (
    dependency,
    dimension,
    filters,
    filterList,
    selectionDependency,
    allDependencies
  ) => {
    if (dependency[0]?.filter_id === "created_at" && dimension === "custom") {
      try {
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
          created_at: dependency[0].values,
        };
        if (selectedOption === "edit") {
          payload = {
            ...payload,
            session_id: sessionId,
            is_update_mode: true,
          };
        }
        const allocationPlansResponse = await props.fetchAllocationPlan(
          payload
        );
        if (allocationPlansResponse?.data?.show_message)
          displaySnackMessages(
            allocationPlansResponse?.data?.message,
            "success"
          );
        const allocationPlanValues =
          allocationPlansResponse?.data?.data?.map((planInfo) => {
            return {
              value: planInfo.plan_code,
              label: planInfo.allocation_name,
              id: planInfo.plan_code,
            };
          }) || [];
        // //  to check about setting it back to filter config
        let copyOfFilterConfig = cloneDeep(props.filterDashboardConfiguration);
        filterList.forEach((item) => {
          if (item.column_name === "allocation_code") {
            item.initialData = allocationPlanValues;
          }
        });
        let preSelectedDependency = copyOfFilterConfig?.filterConfig.map(
          (item) => {
            return {
              ...item,
              filterDashboardData: filterList,
            };
          }
        );
        copyOfFilterConfig = {
          ...copyOfFilterConfig,
          filterConfig: preSelectedDependency,
        };
        let obj = {};
        obj["orderBatchingFilterConfiguration"] = copyOfFilterConfig;
        props.setFilterConfiguration(obj);
      } catch (e) {
        handleErrorMessage(e);
      }
    }
  };

  const handlePostLockRelease = async () => {
    setSelectedOption("view");
    setShowDialog(false);
    setExtendTimer(false);
    setSessionId("");
    let cache_key = generateCacheKey();
    await prepareBaseDataForFilters(selectedFiltersRef.current, cache_key);
    props.setCacheKey(cache_key);
    clearTimeout(timeOutRef.current);
    timeOutRef.current = null;
    props.setInventorysmartReloadOrderBatchingData(true);
    setTimeout(() => {
      props.setInventorysmartReloadOrderBatchingData(false);
    }, 1000);
    if (isEmpty(sseRef.current)) {
      checkForLastSaveActionToRefreshData(); // check for last save action performed to refresh data
    }
  };

  const removeLock = async () => {
    try {
      props.setInventorysmartOrderBatchingToggleLoader(true);
      let response = await props.releaseLock({
        filters: selectedFiltersRef.current,
      });
      let responseData = response.data?.data;
      let released = responseData?.lock_released;
      if (released) {
        displaySnackMessages(responseData?.message, "success");
        handlePostLockRelease();
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setInventorysmartOrderBatchingToggleLoader(false);
    }
  };
  const onButtonGroupChange = async (event, newValue) => {
    // to edit mode
    if (newValue === "edit" && selectedOption === "view") {
      try {
        props.setInventorysmartOrderBatchingToggleLoader(true);
        let response = await props.fetchLockStatus({
          filters: props.selectedFilters,
          operation_type_id: 1,
        });
        let responseData = response.data?.data;
        setLockAcquiredBy(responseData?.lock_acquired_by);
        // check for lock_received key in the response, if lock_received is true stay in edit mode else switch to view mode
        if (responseData?.lock_received) {
          displaySnackMessages(responseData?.message, "success");
          setSelectedOption(newValue);
          let session_id = "";
          if (window.crypto && window.crypto.getRandomValues) {
            // Generate 16 random bytes and convert to hex string
            const array = new Uint8Array(16);
            window.crypto.getRandomValues(array);
            session_id = Array.from(array, (b) =>
              b.toString(16).padStart(2, "0")
            ).join("");
          }
          setSessionId(session_id);
          setSelectedOption(newValue);
          let toggleUpdateResponse = await props.callUpdateToggleAPI({
            filters: props.selectedFilters,
            ...(createdAtDate && { created_at: createdAtDate }),
            session_id: session_id,
            is_update_mode: true,
          });
          if (
            toggleUpdateResponse.data?.show_message ||
            toggleUpdateResponse.data?.status
          ) {
            displaySnackMessages(toggleUpdateResponse.data?.message, "success");
          }
          props.setInventorysmartReloadOrderBatchingData(true);
          setTimeout(() => {
            props.setInventorysmartReloadOrderBatchingData(false);
          }, 1000);
          // calling a timer for 30 mins
          rerunTimer();
        } else {
          setEditedByPopup(true);
        }
      } catch (e) {
        setSessionId("");
        setSelectedOption("view");
        handleErrorMessage(e);
      } finally {
        props.setInventorysmartOrderBatchingToggleLoader(false);
      }
    }
    // to view mode
    else if (newValue === "view" && selectedOption === "edit") {
      setShowDialog(true);
    }
  };

  const handleTabChange = async (event, newValue) => {
    if (activeTab === "dc_to_store" && newValue !== "dc_to_store") {
      // Close SSE connection when leaving DC-to-Store tab
      closeSseConnection();
      if (selectedOptionRef.current === "edit") {
        try {
          await props.releaseLock({ filters: selectedFiltersRef.current });
        } catch (e) {
          // silent release on tab switch
        }
        setSelectedOption("view");
        setSessionId("");
        clearTimeout(timeOutRef.current);
        timeOutRef.current = null;
      }
      // Reset DC-to-Store dynamic state so it re-initializes cleanly on return
      props.setSelectedFilters([]);
      props.setIsFiltersValid(false);
      props.setCacheKey(null);
      props.setCacheKeyPrepared(false);
      props.setCacheKeyPreparedAt(null);
      props.setFilterConfiguration({
        orderBatchingFilterConfiguration: null,
      });
      props.setIsFilterApplied(false);
      props.setSavedFiltersList([]);
      props.setSelectedFiltersCoreReducer({});
      props.setNoOfButtonsNextToTab(undefined);
    }
    if (activeTab === "store_to_store" && newValue !== "store_to_store") {
      // Reset S2S shared filter state when leaving S2S tab
      props.setFilterConfiguration({
        orderBatchingS2SFilterConfiguration: null,
      });
      props.setIsFilterApplied(false);
      props.setSavedFiltersList([]);
      props.setSelectedFiltersCoreReducer({});
      props.setNoOfButtonsNextToTab(undefined);
    }
    setActiveTab(newValue);
  };

  const showTabsBesideFilter = visibleTabs.length > 1;

  const calculateTabWidth = () => {
    if (props.no_of_buttons_next_to_tab === undefined) return "100%";
    if (props.no_of_buttons_next_to_tab === 1) return `calc(100% - 140px)`;
    return `calc(100% - ${
      140 + (props.no_of_buttons_next_to_tab - 1) * 142
    }px)`;
  };

  // Keep tab width in sync with Hide Filter visibility (isFilterApplied),
  // not stale appliedFilterData left behind after tab switches.
  useEffect(() => {
    if (!showTabsBesideFilter) {
      props.setNoOfButtonsNextToTab(undefined);
      return;
    }
    props.setNoOfButtonsNextToTab(props.isFilterApplied ? 1 : undefined);
  }, [showTabsBesideFilter, activeTab, props.isFilterApplied]);

  useEffect(
    () => () => {
      props.setNoOfButtonsNextToTab(undefined);
    },
    []
  );

  return (
    <div
      className={`${globalClasses.paddingTop_12} ${globalClasses.mainContainerBody}`}
    >
      <div
        className={`${globalClasses.breadcrumbPadding} ${globalClasses.paddingLeft_24} ${globalClasses.paddingRight_24} ${globalClasses.marginBottom_12}`}
      >
        <HeaderBreadCrumbs options={paths} />
      </div>
      {(() => {
        const dcToStorePanel = (
          <CoreComponentScreen
            showPageRoute={false}
            showPageHeader={false}
            routeOptions={routeOptions}
            showFilterDashboard={true}
            showChipsOnLoad={props.backButtonClicked}
            autoApplyEnabled={!props?.backButtonClicked}
            filterDependency={props.selectedFiltersInOrderBatching}
            filterConfigKey={"orderBatchingFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            contained={true}
            updateDependencyHandler={updateDependencyHandler}
            autoHideFilterButton={true}
            skipFirstRenderCheck
          >
            <div
              {...(visibleTabs.length === 1
                ? {
                    className: globalClasses.tabsContainerBody,
                    style: {
                      maxHeight: `calc(100vh - ${
                        196 -
                        (props.isFilterStripVisible ? 0 : 60) +
                        (selectedOption === "edit" ? 56 : 0) +
                        (!props.renderToggleSummary ? 56 : 0)
                      }px)`,
                    },
                  }
                : {})}
            >
              {props.inventorysmartOrderBatchingToggleLoader ? (
                <Loader
                  loader={props.inventorysmartOrderBatchingToggleLoader}
                  minHeight={600}
                >
                  <div></div>
                </Loader>
              ) : (
                <>
                  {props.renderToggleSummary && (
                    <div
                      className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
                    >
                      <ButtonGroup
                        onChange={onButtonGroupChange}
                        selectedOption={selectedOption}
                        options={[
                          {
                            label: t("inventorysmart.viewMode"),
                            value: "view",
                            icon: <EyeIcon />,
                          },
                          {
                            label: t("inventorysmart.editMode"),
                            value: "edit",
                            icon: <DrawIcon />,
                          },
                        ]}
                      />
                    </div>
                  )}
                  {props.orderBatchingConfig?.hidden?.indexOf(
                    "order_batching_plan_name"
                  ) === -1 && (
                    <div>
                      <div className={classes.inputLabel}>
                        <Form
                          layout={"vertical"}
                          maxFieldsInRow={1}
                          handleChange={handlePlanNameChange}
                          handleOnBlur={handleOnBlur}
                          fields={CREATE_ALLOCATION_FORM}
                          updateDefaultValue={false}
                          defaultValues={allocationForm}
                        ></Form>
                      </div>
                    </div>
                  )}
                  {props.isFiltersValid &&
                    props.orderBatchingConfig?.hidden?.indexOf(
                      "order_batching_metrics"
                    ) === -1 && (
                      <div
                        className={classNames(globalClasses.marginVertical1rem)}
                      >
                        <OrderBatchingMetrics />
                      </div>
                    )}
                  {props.isFiltersValid &&
                    props.orderBatchingConfig?.hidden?.indexOf(
                      "order_batching_summary"
                    ) === -1 && (
                      <div>
                        <CustomAccordion
                          label={t("inventorysmart.currentAllocationsSummary")}
                        >
                          {!props.orderBatchingConfig?.splitSummary && (
                            <OrderBatchingSummaryTable />
                          )}
                          {props.orderBatchingConfig?.splitSummary && (
                            <>
                              {props.renderToggleSummary ? (
                                <OrderBatchingContext.Provider
                                  value={{
                                    selectedOption,
                                    setSelectedOption,
                                    sessionId,
                                    createdAtDate,
                                  }}
                                >
                                  <OrderBatchingRenderToggleSummary
                                    selectedOption={selectedOption}
                                  />
                                </OrderBatchingContext.Provider>
                              ) : (
                                <>
                                  <OrderBatchingSummaryStoreTable />
                                  <OrderBatchingSummaryStyleTable />
                                </>
                              )}
                            </>
                          )}
                        </CustomAccordion>
                      </div>
                    )}

                  {props.isFiltersValid &&
                    props.orderBatchingConfig?.hidden?.indexOf(
                      "order_batching_details"
                    ) === -1 && (
                      <div>
                        <OrderBatchingContext.Provider
                          value={{
                            selectedOption,
                            setSelectedOption,
                            sessionId,
                            createdAtDate,
                            handlePostLockRelease,
                            partialFinalize,
                            ensureFreshCacheKey,
                          }}
                        >
                          <ViewCurrentAllocationsTables
                            isViewMode={
                              props?.renderToggleSummary &&
                              selectedOption === "view"
                            }
                            renderToggleSummary={props.renderToggleSummary}
                            module={props?.module}
                          />
                        </OrderBatchingContext.Provider>
                      </div>
                    )}
                </>
              )}
            </div>
          </CoreComponentScreen>
        );

        const storeToStorePanel = (
          <OrderBatchingS2STab
            module={props?.module}
            alignFilterWithTabs={showTabsBesideFilter}
          />
        );

        if (!showTabsBesideFilter) {
          return (
            <div
              className={`${globalClasses.paddingHorizontal_24}`}
              style={{
                marginTop: "-56px",
              }}
            >
              {activeTab === "store_to_store"
                ? storeToStorePanel
                : dcToStorePanel}
            </div>
          );
        }

        return (
          <div
            className={globalClasses.tabsContainerBody}
            style={{
              maxHeight: `calc(100vh - ${
                136 +
                (selectedOption === "edit" && activeTab === "dc_to_store"
                  ? 56
                  : 0) +
                (!props.renderToggleSummary && activeTab === "dc_to_store"
                  ? 56
                  : 0)
              }px)`,
            }}
          >
            <div className={globalClasses.centerAlign}>
              <ButtonGroup
                onChange={handleTabChange}
                selectedOption={activeTab}
                options={visibleTabs.map((tab) => ({
                  label: tab.label,
                  value: tab.value,
                }))}
              />
            </div>
            <div
              style={{ marginTop: "-44px" }}
              className={globalClasses.paddingHorizontal_24}
            >
              {activeTab === "dc_to_store" && dcToStorePanel}
              {activeTab === "store_to_store" && storeToStorePanel}
            </div>
          </div>
        );
      })()}
      <Prompt
        isOpen={showDialog}
        title={t("inventorysmart.switchToViewMode")}
        children={t("inventorysmart.switchToViewModeConfirm")}
        primaryButtonLabel={t("inventorysmart.yes")}
        onPrimaryButtonClick={() => {
          removeLock();
        }}
        secondaryButtonLabel={t("inventorysmart.no")}
        onSecondaryButtonClick={() => {
          setSelectedOption("edit");
          setShowDialog(false);
        }}
        variant="warning"
      />
      <Prompt
        isOpen={extendTimer}
        title={t("inventorysmart.inactive30Minutes")}
        children={t("inventorysmart.inactive30MinutesConfirm")}
        primaryButtonLabel={t("inventorysmart.continue")}
        onPrimaryButtonClick={() => {
          rerunTimer("refreshLock");
        }}
        secondaryButtonLabel={t("inventorysmart.discardExitEditMode")}
        onSecondaryButtonClick={() => handlePostLockRelease()}
        variant="warning"
      />
      <NewOrderBatchingEditedByPopup
        showEditedByPopup={editedByPopup}
        closeEditedByPopup={() => setEditedByPopup(false)}
        backToViewMode={() => handlePostLockRelease()}
        lockAcquiredBy={lockAcquiredBy}
        selectedFilters={props.selectedFilters}
        filterDashboardData={
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.filterDashboardData || []
        }
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    cache_key:
      store.inventorysmartReducer.inventorySmartOrderBatchingService.cache_key,
    cacheKeyPrepared:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .cacheKeyPrepared,
    cacheKeyPreparedAt:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .cacheKeyPreparedAt,
    inventorysmartOrderBatchingFilterLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .isFiltersValid,
    inventorysmartOrderBatchingFilterElements:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterElements,
    inventorysmartOrderBatchingFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterDependency,
    inventorysmartOrderBatchingFilterConfig:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterConfig,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderBatchingFilterConfiguration"
      ],
    isFilterApplied: store.filterReducer.isFilterApplied,
    no_of_buttons_next_to_tab:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.isNameMandatory,
    no_po_filter:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.no_po_filter,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    orderBatchingConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .orderBatchingConfig,
    renderToggleSummary:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.renderToggleSummary,
    inventorysmartOrderBatchingMetricsLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingMetricsLoader,
    inventorysmartOrderBatchingToggleLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingToggleLoader,
    inventorysmartOrderBatchingIconConfig:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingIconConfig,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .backButtonClicked,
    orderBatchingFilterDetails:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .orderBatchingFilterDetails,
    selectedFiltersInOrderBatching:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFiltersInOrderBatching,
    inventorysmartReducer: store.inventorysmartReducer,
    isFilterStripVisible: store?.filterReducer?.showFilters,
    sideBarReducer: store?.sideBarReducer,
    orderBatchingModuleLabel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.module_label,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setInventorysmartOrderBatchingFilterLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setCacheKey: (payload) => dispatch(setCacheKey(payload)),
  setCacheKeyPrepared: (payload) => dispatch(setCacheKeyPrepared(payload)),
  setCacheKeyPreparedAt: (payload) => dispatch(setCacheKeyPreparedAt(payload)),
  prepareOrderBatchingBaseData: (payload) =>
    dispatch(prepareOrderBatchingBaseData(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setAllocationName: (payload) => dispatch(setAllocationName(payload)),
  setInventorysmartOrderBatchingFilterElements: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterElements(payload)),
  setInventorysmartOrderBatchingFilterDependency: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterDependency(payload)),
  setInventorysmartOrderBatchingFilterConfig: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterConfig(payload)),
  setInventorysmartOrderBatchingMetricsLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingMetricsLoader(payload)),
  setInventorysmartOrderBatchingToggleLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingToggleLoader(payload)),
  setInventorysmartOrderBatchingMetrics: (payload) =>
    dispatch(setInventorysmartOrderBatchingMetrics(payload)),
  setInventorysmartOrderBatchingIconConfig: (payload) =>
    dispatch(setInventorysmartOrderBatchingIconConfig(payload)),
  setOrderBatchingConfig: (payload) =>
    dispatch(setOrderBatchingConfig(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  getOrderBatchingMetrics: (payload) =>
    dispatch(getOrderBatchingMetrics(payload)),
  resetOrderBatchingStoreState: (payload) =>
    dispatch(resetOrderBatchingStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  fetchAllocationPlan: (payload) => dispatch(getAllAllocationPlans(payload)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  fetchLockStatus: (payload) => dispatch(fetchLockStatus(payload)),
  setInventorysmartReloadOrderBatchingData: (payload) =>
    dispatch(setInventorysmartReloadOrderBatchingData(payload)),
  releaseLock: (payload) => dispatch(releaseLock(payload)),
  callUpdateToggleAPI: (payload) => dispatch(callUpdateToggleAPI(payload)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setOrderBatchingFilterDetails: (payload) =>
    dispatch(setOrderBatchingFilterDetails(payload)),
  setIsFilterApplied: (payload) => dispatch(setIsFilterApplied(payload)),
  setSavedFiltersList: (payload) => dispatch(setSavedFiltersList(payload)),
  setSelectedFiltersCoreReducer: (payload) =>
    dispatch(setSelectedFiltersCoreReducer(payload)),
  setNoOfButtonsNextToTab: (value) => dispatch(setNoOfButtonsNextToTab(value)),
  getModuleBasedTenantConfig: (payload) =>
    dispatch(getModuleBasedTenantConfig(payload)),
  setIsProdCloudFunction: (payload) =>
    dispatch(setIsProdCloudFunction(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderBatching);
