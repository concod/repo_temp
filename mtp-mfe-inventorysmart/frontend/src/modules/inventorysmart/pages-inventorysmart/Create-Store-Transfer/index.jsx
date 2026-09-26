import React, { useEffect, useState, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { Input, Button, Stepper, useTranslation } from "impact-ui-v3";
import globalStyles from "../../../../core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import FilterIcon from "assets/impactv3/filterIcon.svg";
import { CREATE_STORE_TRANSFER } from "../../constants-inventorysmart/routesConstants";
import Loader from "core/Utils/Loader/loader";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import CreateStoreTransferTable from "./components/CreateStoreTransferTable";
import StoreTransferOptimizationScreen from "./components/StoreTransferOptimizationScreen";
import CreateTransferRecommendations from "../Create-Transfer-Recommendations-S2S";
import { addSnack } from "core/actions/snackbarActions";
import {
  setFilterConfiguration,
  setSelectedFilters,
  setIsFilterApplied,
} from "core/actions/filterAction";
import { isEmpty, cloneDeep } from "lodash";
import {
  getCreateStoreTransferList,
  setCreateStoreTransferLoader,
  setTransferName,
  setCreateStoreTransferSetAll,
  setCreateStoreTransferFilterConfiguration,
  setCreateStoreTransferModuleConfig,
  setCreateStoreTransferTableName,
  resetCreateStoreTransferState,
  saveStoreTransferDraft,
  createStoreTransferApi,
  setAllocationId,
  setAllocationName,
  setMandatoryFilter,
  setCreateStoreTransferArticles,
  setCreateStoreTransferFilterDependency,
  setCreateStoreTransferRecommFilterDependency,
  setMicroStep1SelectedFilters,
} from "../../services-inventorysmart/Create-Store-Transfer/create-store-transfer-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  displaySnackMessages,
} from "../inventorysmart-utility";
import {
  formattedFilterConfiguration,
  fetchFilterFieldData,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  ROLES_ACCESS_MODULES_MAPPING,
  FULL_ACCESS_PERMISSIONS_LIST,
  tableConfigurationMetaData,
} from "../../constants-inventorysmart/stringConstants";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
} from "../../services-inventorysmart/common/inventory-smart-common-services";
import { getDrafts } from "../../services-inventorysmart/Finalize/store-view-services";
import {
  APP_NAME,
  CREATE_STORE_TRANSFER_CACHE,
} from "../../constants-inventorysmart/stringConstants";
import MicroFilter from "./components/MicroFilter/MicroFilter";
import { makeMicroFilters } from "./components/MicroFilter/microFilterUtils";

const useStyles = makeStyles((theme) => ({
  breadcrumbSection: {
    marginBottom: "20px",
  },
  filterDashboardSpacing: {
    marginBottom: "16px !important",
  },
  contentContainer: {
    minHeight: "500px",
  },
  transferNameSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
    marginTop: "24px",
  },
  transferNameLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#60697D",
    margin: 0,
  },
  filterSection: {
    padding: "12px 24px 0px 24px",
  },
  stickyFooterRight: {
    justifyContent: "flex-end",
    gap: "16px",
    padding: "16px 24px",
  },
  stepperRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  stepperContainer: {
    display: "flex",
    justifyContent: "center",
    margin: "0 auto",
    width: "786px",
  },
  toggleKpiButton: {
    position: "absolute",
    right: 0,
    display: "flex",
    alignItems: "center",
    "& .inv-divider": {
      width: "1px",
      height: "12px",
      backgroundColor: "#D9DDE7",
      margin: "0px 12px",
    },
  },
  tabsContentContainer: {
    maxHeight: "calc(100vh - 260px)",
  },
  microFilter: {
    margin: "8px -24px 0px -24px",
  },
  optimizerScreen: {
    height: "calc(100vh - 136px)",
  }
}));

const calculateOptimizationDetails = (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) {
    return {
      products: 0,
      stores: 0,
      rules: 0,
      dataPoints: "-",
    };
  }

  let totalProducts = 0;
  let totalStores = 0;
  let totalRules = 0;

  selectedRows.forEach((row) => {
    totalProducts += 1;

    if (row.total_stores != null) {
      totalStores += Number(row.total_stores) || 0;
    }
    const transferRule = row.transfer_rule;
    if (transferRule && typeof transferRule === "object") {
      const ruleId = transferRule.value || transferRule.label;
      if (ruleId) {
        totalRules += 1;
      }
    }
  });
  const dataPoints =
    totalProducts > 0 && totalStores > 0 && totalRules > 0
      ? totalProducts * totalStores * totalRules
      : "-";

  return {
    products: totalProducts,
    stores: totalStores,
    rules: totalRules,
    dataPoints: dataPoints,
  };
};

const CreateStoreTransfer = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get active step from URL
  const searchParams = new URLSearchParams(location.search);
  const activeStep = parseInt(searchParams.get("step")) || 0;
  const allocationCodeFromUrl = searchParams.get("allocation_code");
  const type = searchParams.get("type");
  const isRedirectedFromAlerts = type === "alerts";

  const safeJsonParse = (jsonString, fallback = null) => {
    if (!jsonString) return fallback;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return fallback;
    }
  };

  const [transferName, setTransferNameState] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [tableName, setTableName] = useState("");
  const [appliedFilters, setAppliedFilters] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [draftFilterDependency, setDraftFilterDependency] = useState([]);
  const [draftFilters, setDraftFilters] = useState(null);
  const [draftFiltersHydrated, setDraftFiltersHydrated] = useState(false);
  const [chipsRefreshToken, setChipsRefreshToken] = useState(0);
  const [
    step1InitialFilterDependencyByScreen,
    setStep1InitialFilterDependencyByScreen,
  ] = useState(null);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [editedRows, setEditedRows] = useState(new Map());
  const [selectedRows, setSelectedRows] = useState([]);
  const [showOptimizationScreen, setShowOptimizationScreen] = useState(false);
  const [showKpi, setShowKpi] = useState(true);
  const [showMicroFilterStrip, setShowMicroFilterStrip] = useState(false);
  const [optimizationDetails, setOptimizationDetails] = useState({
    products: 0,
    stores: 0,
    rules: 0,
    dataPoints: "-",
  });

  const tableGridInstance = useRef(null);
  const draftFiltersSyncedRef = useRef(false);

  const uniqueRowIdentifier =
    props?.createStoreTransferModuleConfig?.store_transfer_config
      ?.uniqueRowIdentifier || "article";

  // location.search so this re-runs on sidebar navigation (component doesn't unmount)
  useEffect(() => {
    if (!isRedirectedFromAlerts) {
      // Always reset table state on sidebar navigation
      setShowTable(false);
      setTableName("");
      setAppliedFilters([]);
      setFilterDependency([]);
      props.setCreateStoreTransferArticles([]);
      setSelectedArticles([]);

      // Clear stale dashboard filter config if present
      if (!isEmpty(props.filterDashboardConfigurationFromDashboard)) {
        props.setFilterConfiguration({
          decisionDashboardFilterConfiguration: {},
        });
      }
      return;
    }

    const storedArticles = safeJsonParse(
      localStorage.getItem("storeTransferSelectedArticles"),
      []
    );

    // Use Redux state for filter details (set by AlertsActionPopup)
    // Also read from localStorage as fallback (for backward compatibility)
    const filterDetailsFromRedux = props.createStoreTransferFilterDetails;
    const selectedFiltersFromRedux = props.selectedFiltersCreateStoreTransfer;
    const filterDependencyFromRedux = props.createStoreTransferFilterDependency;

    // Fallback to localStorage if Redux is empty (with safe parsing)
    const storedFilterDetails = safeJsonParse(
      localStorage.getItem("createStoreTransferFilterDetails"),
      null
    );
    const storedSelectedFilters = safeJsonParse(
      localStorage.getItem("selectedFiltersCreateStoreTransfer"),
      {}
    );

    // Use Redux if available, otherwise localStorage (use cloneDeep to avoid mutating Redux state)
    const filterDetails = !isEmpty(filterDetailsFromRedux)
      ? cloneDeep(filterDetailsFromRedux)
      : storedFilterDetails;

    const selectedFilters = !isEmpty(selectedFiltersFromRedux)
      ? cloneDeep(selectedFiltersFromRedux)
      : storedSelectedFilters;

    const resolvedFilterDependency =
      filterDependencyFromRedux?.length > 0
        ? filterDependencyFromRedux
        : filterDetails?.appliedFilterData?.dependencyData || [];

    if (filterDetails) {
      // Set filter configuration in Redux under the DD key so filterConfigKey="decisionDashboardFilterConfiguration" works
      props.setFilterConfiguration({
        decisionDashboardFilterConfiguration: filterDetails,
      });
    }

    if (!isEmpty(selectedFilters)) {
      // Set filterDependency state so CoreComponentScreen can show selected chips
      setFilterDependency(selectedFilters);
    }

    // Store selected articles in local state and Redux
    if (storedArticles?.length > 0) {
      setSelectedArticles(storedArticles);
      props.setCreateStoreTransferArticles(storedArticles);
    }

    // Clean up localStorage after reading
    localStorage.removeItem("storeTransferSelectedArticles");
    localStorage.removeItem("createStoreTransferFilterDetails");
    localStorage.removeItem("selectedFiltersCreateStoreTransfer");

    // Manually trigger onFilterDashboardClick for alerts redirection
    // This is needed because autoApplyEnabled is false when redirected from alerts
    if (filterDetails && resolvedFilterDependency?.length > 0) {
      const filterData =
        filterDetails?.filterConfig?.[0]?.filterDashboardData || [];
      onFilterDashboardClick(
        resolvedFilterDependency,
        filterData,
        storedArticles
      );
    }
  }, [location.search, location.key]);

  useEffect(() => {
    if (activeStep === 1 && showOptimizationScreen) {
      setShowOptimizationScreen(false);
    }
  }, [activeStep]);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  // Fetch module-based tenant configuration
  useEffect(() => {
    const fetchModuleConfigs = async () => {
      //for when user is redirected back to step 0 after creating a transfer
      if (props.createStoreTransferModuleConfig) {
        return;
      }

      try {
        props.setCreateStoreTransferLoader(true);

        let response = null;
        if (
          props.cache[CREATE_STORE_TRANSFER_CACHE] &&
          props.cache[CREATE_STORE_TRANSFER_CACHE][
            "create-store-transfer-config"
          ]
        ) {
          response =
            props.cache[CREATE_STORE_TRANSFER_CACHE][
              "create-store-transfer-config"
            ];
        } else {
          response = await props.getModuleBasedTenantConfig({
            module_name: "create-store-transfer-config",
            screen_name: props.screenName,
          });
          props.setKeyValueInCache({
            key: "create-store-transfer-config",
            value: response,
            module: CREATE_STORE_TRANSFER_CACHE,
            persist: true,
          });
        }
        props.setCreateStoreTransferModuleConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setCreateStoreTransferLoader(false);
      }
    };
    fetchModuleConfigs();
  }, [props.createStoreTransferModuleConfig]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setCreateStoreTransferLoader(true);
        let response = await fetchFilterConfig(props.screenName);
        props.setCreateStoreTransferFilterConfiguration(response);
        setFilters(response);
        props.setCreateStoreTransferLoader(false);
      } catch (e) {
        props.setCreateStoreTransferLoader(false);
        handleErrorMessage(e);
      }
    };

    // Check if filters already exist in Redux
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData &&
      !isEmpty(props.inventorysmartModulesPermission[props.module])
    ) {
      const cachedFilters =
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData;
      props.setCreateStoreTransferFilterConfiguration(cachedFilters);
      setFilters(cachedFilters);
      return;
    }

    // Fetch filters only after module permissions are loaded
    if (!isEmpty(props.inventorysmartModulesPermission[props.module])) {
      getInitialFilterConfiguration();
    }
  }, [props.inventorysmartModulesPermission]);

  useEffect(() => {
    const onLoad = async () => {
      if (isRedirectedFromAlerts) return;
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.createStoreTransferFilterConfiguration)
      ) {
        props.setCreateStoreTransferLoader(true);
        const getFilterValues = async (selected, current) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(
                props.createStoreTransferFilterConfiguration
              ),
              appliedFilters: selected || [],
              current: current || [],
              rolesBasedAccess:
                props?.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: props.screenName,
              tenantFilterUamConfig: props?.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);

            const filterDataWithCustomFilter = response;

            const filterConfigData = [
              {
                filterDashboardData: filterDataWithCustomFilter,
                expectedFilterDimensions: getFilterDimensions(
                  filterDataWithCustomFilter
                ),
                isCrossDimensionFilter: true,
                screen_name: props.screenName,
                originalFilterDashboardData:
                  props.createStoreTransferFilterConfiguration,
              },
            ];

            const filterConfig = formattedFilterConfiguration(
              "createStoreTransferFilterConfiguration",
              filterConfigData,
              props.screenName
            );

            props.setFilterConfiguration(filterConfig);

            props.setCreateStoreTransferLoader(false);
          } catch (e) {
            props.setCreateStoreTransferLoader(false);
            handleErrorMessage(e);
          }
        };

        await getFilterValues(props.savedFilterSelection);
      }
    };

    onLoad();
  }, [
    props.createStoreTransferFilterConfiguration,
    props.savedFilterSelection,
    location.search, // Use location.search to re-trigger when navigating from alerts (?type=alerts) to sidebar (no query params)
  ]);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props.module];

          let rolesBasedModulesPermission = {};

          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse;
            if (
              props.cache[CREATE_STORE_TRANSFER_CACHE] &&
              props.cache[CREATE_STORE_TRANSFER_CACHE][
                "getModuleLevelAccessUtility-CreateStoreTransfer"
              ]
            ) {
              accessDataResponse =
                props.cache[CREATE_STORE_TRANSFER_CACHE][
                  "getModuleLevelAccessUtility-CreateStoreTransfer"
                ];
            } else {
              accessDataResponse = await getModuleLevelAccessUtility({
                app: APP_NAME,
                module: subModules,
              })();
              props.setKeyValueInCache({
                key: "getModuleLevelAccessUtility-CreateStoreTransfer",
                value: accessDataResponse,
                module: CREATE_STORE_TRANSFER_CACHE,
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
            [props.module]: rolesBasedModulesPermission,
          });
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error", props);
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  const effectiveAllocationCode = allocationCodeFromUrl || props.allocationId;

  useEffect(() => {
    if (activeStep === 1 && effectiveAllocationCode) {
      fetchDraftFilters();
    }
  }, [activeStep, effectiveAllocationCode]);

  const fetchDraftFilters = async () => {
    setDraftFilters(null);
    setDraftFiltersHydrated(false);
    setStep1InitialFilterDependencyByScreen(null);
    draftFiltersSyncedRef.current = false;
    try {
      const draftResponse = await props.getDrafts(effectiveAllocationCode);
      if (draftResponse?.data?.status) {
        const draftData = draftResponse?.data?.data;
        setDraftFilterDependency(draftData?.filter_dependency || []);
        setDraftFilters(draftData?.filters || []);
        props.setCreateStoreTransferRecommFilterDependency(
          draftData?.filter_dependency || []
        );
        props.setMicroStep1SelectedFilters(
          draftData?.changed_rows?.microFilter || []
        );
      } else {
        setDraftFilters([]);
        props.setCreateStoreTransferRecommFilterDependency([]);
      }
    } catch (e) {
      handleErrorMessage(e);
      setDraftFilters([]);
    }
  };

  useEffect(() => {
    return () => {
      props.setCreateStoreTransferRecommFilterDependency([]);
    };
  }, []);

  const getDraftFiltersByScreen = (dependencyList, classification = []) => {
    const selectedFiltersByScreen = {};
    classification.forEach((item) => {
      selectedFiltersByScreen[item.screenName] = dependencyList.filter(
        (dependency) =>
          (dependency.dimension || "").toLowerCase() ===
          (item.dimension || "").toLowerCase()
      );
    });
    return selectedFiltersByScreen;
  };

  // On step 1, hydrate filter panel dropdowns from draft data. Chips only need
  // appliedFilterData, but dropdowns also require filterDashboardData.initialData
  // from fetchFilterFieldData so every selected value can render.
  useEffect(() => {
    const syncDraftFiltersToPanel = async () => {
      if (activeStep !== 1 || draftFilterDependency.length === 0) {
        if (activeStep !== 1) {
          draftFiltersSyncedRef.current = false;
          setDraftFiltersHydrated(false);
          setStep1InitialFilterDependencyByScreen(null);
        }
        return;
      }

      const filterConfig =
        props.filterDashboardConfiguration?.filterConfig?.[0];
      if (!filterConfig || draftFiltersSyncedRef.current) {
        return;
      }

      const classification = filterConfig.filterDashboardClassification || [];
      const originalFilterData =
        filterConfig.originalFilterDashboardData ||
        filterConfig.filterDashboardData ||
        [];
      const selectedFiltersByScreen = getDraftFiltersByScreen(
        draftFilterDependency,
        classification
      );

      try {
        const filterDataWithSelections = await fetchFilterFieldData(
          cloneDeep(originalFilterData),
          cloneDeep(draftFilterDependency),
          props.screenName
        );

        draftFiltersSyncedRef.current = true;

        const filterConfigurationPayload = {
          createStoreTransferFilterConfiguration: {
            ...props.filterDashboardConfiguration,
            filterConfig: [
              {
                ...filterConfig,
                filterDashboardData: filterDataWithSelections,
              },
            ],
            appliedFilterData: {
              filterHeader: "",
              dependencyData: draftFilterDependency,
            },
          },
        };

        flushSync(() => {
          props.setFilterConfiguration(filterConfigurationPayload);
        });
        props.setIsFilterApplied(true);
        props.setSelectedFilters(selectedFiltersByScreen);
        flushSync(() => {
          props.setFilterConfiguration({
            createStoreTransferFilterConfiguration: {
              ...filterConfigurationPayload.createStoreTransferFilterConfiguration,
              appliedFilterData: {
                filterHeader: "",
                dependencyData: draftFilterDependency,
              },
            },
          });
        });
        setDraftFiltersHydrated(true);
        setStep1InitialFilterDependencyByScreen(selectedFiltersByScreen);
      } catch (e) {
        handleErrorMessage(e);
        draftFiltersSyncedRef.current = true;

        const fallbackFilterConfiguration = {
          createStoreTransferFilterConfiguration: {
            ...props.filterDashboardConfiguration,
            appliedFilterData: {
              filterHeader: "",
              dependencyData: draftFilterDependency,
            },
          },
        };

        flushSync(() => {
          props.setFilterConfiguration(fallbackFilterConfiguration);
        });
        props.setIsFilterApplied(true);
        props.setSelectedFilters(selectedFiltersByScreen);
        flushSync(() => {
          props.setFilterConfiguration({
            createStoreTransferFilterConfiguration: {
              ...fallbackFilterConfiguration.createStoreTransferFilterConfiguration,
              appliedFilterData: {
                filterHeader: "",
                dependencyData: draftFilterDependency,
              },
            },
          });
        });
        setDraftFiltersHydrated(true);
        setStep1InitialFilterDependencyByScreen(selectedFiltersByScreen);
      }
    };

    syncDraftFiltersToPanel();
  }, [
    activeStep,
    draftFilterDependency,
    props.filterDashboardConfiguration?.filterConfig,
  ]);

  useEffect(() => {
    if (
      activeStep === 1 &&
      draftFiltersHydrated &&
      draftFilterDependency.length > 0
    ) {
      setChipsRefreshToken((token) => token + 1);
    }
  }, [
    activeStep,
    draftFiltersHydrated,
    draftFilterDependency,
    props.filterDashboardConfiguration?.filterConfig,
    props.filterDashboardConfiguration?.appliedFilterData,
  ]);

  const step1ChipsDependency = useMemo(() => {
    if (activeStep === 1 && draftFilterDependency.length > 0) {
      return [...draftFilterDependency];
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, draftFilterDependency, chipsRefreshToken]);

  // Helper function to build filters with articles when redirected from alerts
  // articlesParam is passed directly when calling from alerts effect to avoid state timing issues
  const buildFiltersWithArticles = (dependency, articlesParam = null) => {
    let selectedFilters = dependency || [];

    const articlesToUse = articlesParam || selectedArticles;

    if (isRedirectedFromAlerts && articlesToUse?.length > 0) {
      const articleFilter = {
        filter_type: "cascaded",
        attribute_name: "article",
        operator: "in",
        dimension: "Product",
        values: articlesToUse,
      };

      selectedFilters = selectedFilters.filter(
        (item) => item.attribute_name !== "article"
      );

      selectedFilters = [...selectedFilters, articleFilter];
    }

    return selectedFilters;
  };

  const applyRecommendationsFilters = (selectedFilters, dependency) => {
    const appliedDependency = dependency || selectedFilters;
    const filterConfig = props.filterDashboardConfiguration?.filterConfig?.[0];
    const classification = filterConfig?.filterDashboardClassification || [];
    const selectedFiltersByScreen = getDraftFiltersByScreen(
      appliedDependency,
      classification
    );

    setDraftFilters(selectedFilters);
    setDraftFilterDependency(appliedDependency);
    props.setCreateStoreTransferFilterDependency(appliedDependency);
    props.setCreateStoreTransferRecommFilterDependency(appliedDependency);
    props.setSelectedFilters(selectedFiltersByScreen);
    props.setIsFilterApplied(true);
    props.setFilterConfiguration({
      createStoreTransferFilterConfiguration: {
        ...props.filterDashboardConfiguration,
        appliedFilterData: {
          filterHeader: "",
          dependencyData: appliedDependency,
        },
      },
    });
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    articlesParam = null
  ) => {
    applyFilters(filterData, dependencyData, null, articlesParam);
  };

  const applyFilters = async (
    _filterElements,
    dependency,
    filterDates,
    articlesParam = null
  ) => {
    const selectedFilters = buildFiltersWithArticles(dependency, articlesParam);

    if (activeStep === 1) {
      applyRecommendationsFilters(selectedFilters, dependency);
      return;
    }

    try {
      props.setCreateStoreTransferLoader(true);

      const requestBody = {
        filters: selectedFilters,
        store_store_transfer_flow: true,
      };

      const tempTableName = await props.getCreateStoreTransferList(requestBody);

      if (!tempTableName?.data?.data?.table_name) {
        displaySnackMessages(
          "No table configuration found for the selected filters",
          "info",
          props
        );
        props.setCreateStoreTransferLoader(false);
        return;
      }

      const tableNameFromAPI = tempTableName?.data?.data?.table_name;
      setTableName(tableNameFromAPI);
      setAppliedFilters(selectedFilters);
      props.setCreateStoreTransferFilterDependency(dependency || []);
      props.setCreateStoreTransferRecommFilterDependency(dependency || []);

      // Set mandatory filter value (following Create Allocation pattern)
      const mandatoryFilterField = filters?.find(
        (filter) => filter?.is_mandatory
      );
      const mandatoryValue =
        dependency
          ?.find(
            (val) => val.attribute_name === mandatoryFilterField?.column_name
          )
          ?.values?.[0]?.replaceAll(" ", "") || "";
      props.setMandatoryFilter(mandatoryValue);

      setShowTable(true);

      props.setCreateStoreTransferTableName(tableNameFromAPI);

      // Trigger table refresh
      setRefreshTrigger((prev) => prev + 1);

      props.setCreateStoreTransferLoader(false);
    } catch (e) {
      props.setCreateStoreTransferLoader(false);
      handleErrorMessage(e);
    }
  };

  const handleTransferNameChange = (e) => {
    setTransferNameState(e.target.value);
    props.setTransferName(e.target.value);
  };

  const clearAllData = () => {
    // Reset all local state
    setTransferNameState("");
    setShowTable(false);
    setTableName("");
    setAppliedFilters([]);
    setRefreshTrigger(0);
    setFilters([]);
    setShowOptimizationScreen(false);
    setOptimizationDetails({
      products: 0,
      stores: 0,
      rules: 0,
      dataPoints: "-",
    });

    props.resetCreateStoreTransferState();
  };

  const handleGoToRecommendations = async () => {
    try {
      // Check if there are unsaved grid edits
      if (editedRows.size > 0) {
        displaySnackMessages(
          "Please save your grid edits before proceeding to transfer recommendations.",
          "warning",
          props
        );
        return;
      }

      props.setCreateStoreTransferLoader(true);

      const gridApi = tableGridInstance?.current?.api;

      const checkConfiguration = gridApi?.checkConfiguration || [];
      const isAllSelected =
        (checkConfiguration?.length > 0 &&
          checkConfiguration[checkConfiguration.length - 1]?.checkAll) ||
        false;

      let includedArticles = [];
      let excludedArticles = [];

      if (isAllSelected) {
        const deselectedRows = gridApi?.getDeselectedRows?.() || [];
        excludedArticles = deselectedRows.map(
          (row) => row[uniqueRowIdentifier]
        );
      } else {
        includedArticles = selectedRows.map((row) => row[uniqueRowIdentifier]);
      }

      const microFilter = makeMicroFilters(selectedRows);

      const draftPayload = {
        mandatory: props.mandatoryFilter,
        req_top_table: {
          ...(transferName.trim() && { allocation_name: transferName.trim() }),
          filters: appliedFilters,
          filter_dependency: props.createStoreTransferFilterDependency,
          store_store_transfer_flow: false,
        },
        data: {
          table_name: tableName,
          is_all_records_selected: isAllSelected,
          included_articles: includedArticles,
          excluded_articles: excludedArticles,
          microFilter,
        },
      };

      const draftResponse = await props.saveStoreTransferDraft(draftPayload);

      if (draftResponse?.data?.status) {
        const allocationId = draftResponse.data.data?.allocation_id;
        const allocationName = draftResponse.data.data?.allocation_name;

        if (allocationId && allocationName) {
          props.setAllocationId(allocationId);
          props.setAllocationName(allocationName);

          const createTransferPayload = {
            input_data: {
              table_name: tableName,
              is_all_records_selected: isAllSelected,
              included_articles: includedArticles,
              excluded_articles: excludedArticles,
            },
            allocation_code: allocationId,
            allocation_name: allocationName,
          };

          const createResponse = await props.createStoreTransferApi(
            createTransferPayload,
            props.isV3?.includes("store_transfer") || true
          );

          if (createResponse?.data?.status) {
            displaySnackMessages(
              createResponse.data.message ||
                "Store transfer plan creation started, you will be notified once complete.",
              "success",
              props
            );

            setShowOptimizationScreen(true);

            const optimizationData = calculateOptimizationDetails(selectedRows);
            setOptimizationDetails(optimizationData);
          } else {
            displaySnackMessages(
              createResponse?.data?.message ||
                "Failed to create store transfer",
              "error",
              props
            );
          }
        } else {
          displaySnackMessages(
            "Failed to get allocation details from draft",
            "error",
            props
          );
        }
      } else {
        displaySnackMessages(
          draftResponse?.data?.message || "Failed to save draft",
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setCreateStoreTransferLoader(false);
    }
  };

  const handleCreateNewStoreTransfer = () => {
    clearAllData();
    navigate(`${CREATE_STORE_TRANSFER}?step=0`);
  };

  const handleReturnToDashboard = () => {
    clearAllData();
    navigate("/inventory-smart/decision-dashboard");
  };

  const handleApply = async () => {
    try {
      props.setCreateStoreTransferLoader(true);

      if (editedRows.size === 0) {
        displaySnackMessages("No changes to apply", "info", props);
        props.setCreateStoreTransferLoader(false);
        return;
      }

      // Get all edited rows
      const allEditedRows = Array.from(editedRows.values());

      if (allEditedRows.length === 0) {
        displaySnackMessages(
          "No changes to apply. Please edit some rows first.",
          "info",
          props
        );
        props.setCreateStoreTransferLoader(false);
        return;
      }

      // Call setAll API for each edited row
      const setAllPromises = allEditedRows.map(async (editedRow) => {
        const rowId = editedRow[uniqueRowIdentifier];
        const { changes } = editedRow;

        const storeTransferAttributes = Object.entries(changes).map(
          ([columnName, value]) => {
            let attributeName = columnName;
            let attributeValue = value;

            if (columnName === "transfer_rule") {
              attributeName = "transfer_rule_id";
            }

            return {
              attribute_name: attributeName,
              attribute_value: attributeValue,
            };
          }
        );

        const payload = {
          meta: {
            ...tableConfigurationMetaData.meta,
            limit: { limit: 10, page: 1 },
          },
          filters: appliedFilters || [],
          excluded_rows: [],
          row_update: [rowId],
          store_transfer: [storeTransferAttributes],
          table_name: tableName,
        };

        return props.setCreateStoreTransferSetAll(payload);
      });

      const setAllResults = await Promise.allSettled(setAllPromises);

      const failedCalls = setAllResults.filter(
        (result) =>
          result?.status === "rejected" || !result?.value?.data?.status
      );

      if (failedCalls.length > 0) {
        displaySnackMessages(
          `Failed to update ${failedCalls.length} row(s)`,
          "error",
          props
        );
        props.setCreateStoreTransferLoader(false);
        return;
      }

      displaySnackMessages(
        setAllResults?.[0]?.value?.data?.message ||
          "Store Transfer Configuration updated successfully",
        "success",
        props
      );

      // Clear edited rows and refresh table
      setEditedRows(new Map());
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setCreateStoreTransferLoader(false);
    }
  };

  const handleCellEdit = (updatedEditedRows) => {
    setEditedRows(updatedEditedRows);
  };

  const handleSelectionChange = (selectedRowsData) => {
    setSelectedRows(selectedRowsData);
  };

  const breadcrumbsList = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Store to Store Transfer",
    },
  ];

  const steps = [
    {
      label: "Select product & set configuration",
    },
    {
      label: "Transfer recommendations",
    },
  ];

  const isContentAreaLoading = props.createStoreTransferLoader;

  const hasAppliedFilterDependency =
    props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
      ?.length > 0;

  const showPageBody =
    isRedirectedFromAlerts ||
    (props.isFilterApplied && hasAppliedFilterDependency) ||
    (activeStep === 1 && draftFilterDependency.length > 0);

  return (
    <div className={`${globalClasses.mainContainerBody}`}>
      {showOptimizationScreen ? (
        <div className={globalClasses.paddingAroundNew}>
          <div className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12}`}>
            <HeaderBreadCrumbs
              options={breadcrumbsList}
              breadCrumbRef={null}
              renderInContainer={false}
            />
          </div>
          <div className={`${classes.optimizerScreen} ${globalClasses.centerAlign}`}>
            <StoreTransferOptimizationScreen
              onPrimaryButtonClick={handleCreateNewStoreTransfer}
              onSecondaryButtonClick={handleReturnToDashboard}
              optimizationData={optimizationDetails}
            />
          </div>
        </div>
      ) : (
        <>
          <div className={classes.filterSection}>
            <CoreComponentScreen
              key={
                activeStep === 1 && draftFiltersHydrated
                  ? `${location.key}-step1-filters-ready`
                  : location.key
              }
              screenName={props.screenName}
              headerBreadCrumb={
                <HeaderBreadCrumbs
                  options={breadcrumbsList}
                  breadCrumbRef={null}
                  renderInContainer={false}
                />
              }
              filterConfigKey={
                isRedirectedFromAlerts
                  ? "decisionDashboardFilterConfiguration"
                  : "createStoreTransferFilterConfiguration"
              }
              onApplyFilter={onFilterDashboardClick}
              showFilterDashboard={true}
              customClassName={classes.filterDashboardSpacing}
              contained={false}
              disableFilters={isRedirectedFromAlerts}
              showChipsOnLoad={activeStep === 1 ? true : isRedirectedFromAlerts}
              filterDependency={
                isRedirectedFromAlerts
                  ? filterDependency
                  : step1InitialFilterDependencyByScreen || []
              }
              autoApplyEnabled={!isRedirectedFromAlerts && activeStep === 0}
              showStrip={activeStep === 1}
              hideNoDataFound={activeStep === 1}
              skipFirstRenderCheck={activeStep === 1}
              chipsDependency={step1ChipsDependency}
            />
          </div>

          {showPageBody && (
            <div
              className={`${globalClasses.tabsContainerBody} ${globalClasses.padding_0_24_0_24}`}
              style={{
                // For the Content Only we have 260px already for the Breadcrum + Header + FilterStrip
                maxHeight: `calc(100vh - ${
                  260 - (props.isFilterStripVisible ? 0 : 60)
                }px)`,
              }}
            >
              <div className={classes.stepperRow}>
                <div className={classes.stepperContainer}>
                  <Stepper steps={steps} activeStep={activeStep} />
                </div>
                {activeStep === 1 && (
                  <div className={classes.toggleKpiButton}>
                    <Button
                      icon={<FilterIcon />}
                      variant="tertiary"
                      onClick={() => setShowMicroFilterStrip((prev) => !prev)}
                    />
                    <div className="inv-divider" />
                    <Button
                      variant="tertiary"
                      onClick={() => setShowKpi((prev) => !prev)}
                    >
                      {showKpi
                        ? t("inventorysmart.hideTransferSummaryLabel")
                        : t("inventorysmart.showTransferSummaryLabel")}
                    </Button>
                  </div>
                )}
              </div>

              {activeStep === 1 && (
                <div className={classes.microFilter}>
                  <MicroFilter
                    screenName={props.screenName}
                    showMicroFilterStrip={showMicroFilterStrip}
                    microStep1SelectedFilters={props.microStep1SelectedFilters}
                  />
                </div>
              )}

              {activeStep === 1 ? (
                <CreateTransferRecommendations
                  screenName={props.screenName}
                  draftFilters={draftFilters}
                  showKpi={showKpi}
                  handleCreateNewStoreTransfer={handleCreateNewStoreTransfer}
                />
              ) : (
                <>
                  <div className={classes.transferNameSection}>
                    <label className={classes.transferNameLabel}>
                      Transfer name
                    </label>
                    <Input
                      placeholder="Enter transfer name"
                      value={transferName}
                      onChange={handleTransferNameChange}
                    />
                  </div>

                  <Loader loader={isContentAreaLoading} minHeight="500px">
                    <div
                      className={
                        isContentAreaLoading || showTable
                          ? classes.contentContainer
                          : ""
                      }
                    >
                      {showTable && (
                        <CreateStoreTransferTable
                          tableName={tableName}
                          appliedFilters={appliedFilters}
                          refreshTrigger={refreshTrigger}
                          onCellEdit={handleCellEdit}
                          onSelectionChange={handleSelectionChange}
                          onApply={handleApply}
                          editedRowsCount={editedRows.size}
                          loadTableInstance={loadTableInstance}
                          uniqueRowIdentifier={uniqueRowIdentifier}
                          isRedirectedFromAlerts={isRedirectedFromAlerts}
                        />
                      )}
                    </div>
                  </Loader>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Sticky Footer */}
      {showPageBody &&
        showTable &&
        activeStep === 0 &&
        !showOptimizationScreen && (
          <div
            className={`${globalClasses.stickyFooter} ${classes.stickyFooterRight}`}
          >
            <Button
              variant="primary"
              onClick={handleGoToRecommendations}
              disabled={selectedRows.length === 0}
              size="large"
            >
              Go to transfer recommendations &gt;
            </Button>
          </div>
        )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    createStoreTransferLoader:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferLoader,
    transferName:
      store?.inventorysmartReducer?.createStoreTransferService?.transferName,
    microStep1SelectedFilters:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.microStep1SelectedFilters,
    createStoreTransferFilterConfiguration:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferFilterConfiguration,
    createStoreTransferModuleConfig:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferModuleConfig,
    inventorysmartScreenConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorySmartPermissionLoader:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    filterDashboardConfiguration:
      store?.filterReducer?.filterDashboardConfiguration[
        "createStoreTransferFilterConfiguration"
      ],
    isFilterApplied: store?.filterReducer?.isFilterApplied,
    isFilterStripVisible: store?.filterReducer?.showFilters,
    filterDashboardConfigurationFromDashboard:
      store?.filterReducer?.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    savedFilterSelection: store?.filterReducer?.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    mandatoryFilter:
      store?.inventorysmartReducer?.createStoreTransferService?.mandatoryFilter,
    createStoreTransferArticles:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferArticles,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    createStoreTransferFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferFilterDependency,
    createStoreTransferFilterDetails:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferFilterDetails,
    selectedFiltersCreateStoreTransfer:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.selectedFiltersCreateStoreTransfer,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getCreateStoreTransferList: (payload) =>
    dispatch(getCreateStoreTransferList(payload)),
  setCreateStoreTransferLoader: (payload) =>
    dispatch(setCreateStoreTransferLoader(payload)),
  setTransferName: (payload) => dispatch(setTransferName(payload)),
  setCreateStoreTransferSetAll: (payload) =>
    dispatch(setCreateStoreTransferSetAll(payload)),
  setCreateStoreTransferFilterConfiguration: (payload) =>
    dispatch(setCreateStoreTransferFilterConfiguration(payload)),
  setCreateStoreTransferModuleConfig: (payload) =>
    dispatch(setCreateStoreTransferModuleConfig(payload)),
  setCreateStoreTransferTableName: (payload) =>
    dispatch(setCreateStoreTransferTableName(payload)),
  getModuleBasedTenantConfig: (payload) =>
    dispatch(getModuleBasedTenantConfig(payload)),
  resetCreateStoreTransferState: () =>
    dispatch(resetCreateStoreTransferState()),
  saveStoreTransferDraft: (payload) =>
    dispatch(saveStoreTransferDraft(payload)),
  createStoreTransferApi: (payload, isV3) =>
    dispatch(createStoreTransferApi(payload, isV3)),
  setAllocationId: (payload) => dispatch(setAllocationId(payload)),
  setAllocationName: (payload) => dispatch(setAllocationName(payload)),
  setMandatoryFilter: (payload) => dispatch(setMandatoryFilter(payload)),
  setCreateStoreTransferArticles: (payload) =>
    dispatch(setCreateStoreTransferArticles(payload)),
  setCreateStoreTransferFilterDependency: (payload) =>
    dispatch(setCreateStoreTransferFilterDependency(payload)),
  setCreateStoreTransferRecommFilterDependency: (payload) =>
    dispatch(setCreateStoreTransferRecommFilterDependency(payload)),
  setMicroStep1SelectedFilters: (payload) =>
    dispatch(setMicroStep1SelectedFilters(payload)),
  getDrafts: (payload) => dispatch(getDrafts(payload)),
  setFilterConfiguration: (payload) =>
    dispatch(setFilterConfiguration(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFilterApplied: (payload) => dispatch(setIsFilterApplied(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setKeyValueInCache: (payload) => dispatch(setKeyValueInCache(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateStoreTransfer);
