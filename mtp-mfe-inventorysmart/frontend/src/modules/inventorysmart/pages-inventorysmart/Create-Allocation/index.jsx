import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { CREATE_ALLOCATION } from "../../constants-inventorysmart/routesConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "../../../../core/Styles/globalStyles";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  ALERT,
  APP_NAME,
  CREATE_ALLOCATION_FORM,
  DEFAULT_CNA_OPTIMIZATION_SCREEN_DESCRIPTION,
  DEFAULT_CNA_OPTIMIZATION_SCREEN_HEADER,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVALID_DRAFT,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import CreateAllocationStepper from "./components/CreateAllocationStepper";
import ArticlesTable from "./components/ArticlesTable";
import {
  resetCreateAllocationStoreState,
  setAllocationName,
  setCreateAllocationArticles,
  setFilteredSelection,
  setInventorysmartCreateAllocationFilterDependency,
  setInventorysmartFilterLoader,
  setIsFiltersValid,
  setMandatoryFilter,
  setPOCode,
  setNewStoreAlertStatus,
  setAllocTypeStatus,
  setPopUpLinkFromDashbaord,
  setSelectedFilters,
  setShowInvalidDraftModal,
  setType,
  warmUpAllocation,
  setAsnCode,
  setDraftsResult,
  setArticleAgGridParams,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import FinalizeAllocation from "../Finalize-Allocation";
import { getDrafts } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setNotifications } from "core/actions/notificationActions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  Grid,
  Paper,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CloseIcon from "@mui/icons-material/Close";
import Form from "core/Utils/form";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setIsProdCloudFunction } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  setFilterConfiguration,
  resetFilterConfiguration,
  setIsFilterApplied,
  setSelectedFilters as setSelectedFiltersCoreReducer,
} from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import { generateCacheKey } from "../inventorysmart-utility";
import {
  BACKDOOR_CSV_CONFIG_CARTERS,
  BACKDOOR_FILE_UPLOAD_INSTRUCTIONS_CARTERS,
  CNA_CACHE,
} from "../../constants-inventorysmart/stringConstants";
import { getTenantConfigData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import UploadHandler from "../../../../core/commonComponents/uploadHandler";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Button, Input, EmptyState, useTranslation } from "impact-ui-v3";
import { uploadBackDoorAllocationFile } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import StoreDcDetails from "./components/StoreDcDetails";
import {
  setBackButtonClicked,
  setCreateAllocationFilterDetails,
  setSelectedFiltersCreateAllocation,
} from "../../services-inventorysmart/Create-Allocation/create-allocation-services";
import CnaOptimizationScreen from "./CNA-Optimization-Screen";
import { extractAllocationCodeFromUrl } from "./helperFunctions";
import {
  InfoPanel,
  InfoPanelButton,
} from "../Common/components/InfoPanel";
import { FINALIZE_ALLOCATION_GLOSSARY } from "../Finalize-Allocation/Finalize-Allocation-New-Flow/glossary/finalizeAllocationGlossary";

const FINALIZE_WS_LOG = "[CreateAllocation finalize-WS]";

const CreateNewAllocation = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // const [filterDependency, setFilterDependency] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [pageLimit, setPageLimit] = useState(null);
  const [showArticleTable, setShowArticleTable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const validationHandler = useRef();
  const { redirectFromDashboard } = useLocation().state || {};
  const articleTableGlobalInstance = useRef(null);
  const articleTableColumnRef = useRef(null);
  const hasCalledGetFiltersOptions = useRef(false);
  const cacheKeyRef = useRef(null);
  // when create-allocation API succeeds, it will set the allocation_code in the WS notification url
  const pendingFinalizeAllocationCodeRef = useRef(null);
  // Auto-navigate only while `CnaOptimizationScreen` is shown (post-create optimization wait).
  const allowFinalizeNavigateFromNotificationRef = useRef(false);

  const classes = useStyles();
  const globalClasses = globalStyles();

  // Flow flags for new finalize allocation views
  const isNewProductFlow = props.finalizeAllocationConfig?.enableNewFinalizeFlowProductView;
  const isNewStoreFlow = props.finalizeAllocationConfig?.enableNewFinalizeFlowStoreView;
  const isAnyNewFlow = isNewProductFlow || isNewStoreFlow;

  // Memoize URL parameters
  const urlParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      step: searchParams.get("step"),
      type: searchParams.get("type"),
      allocation_code: searchParams.get("allocation_code"),
      from: searchParams.get("from"),
    };
  }, [location.search]);

  // set the memoized URL parameters
  const activeStepParam = urlParams.step;
  const activeStep = Number.isInteger(parseInt(activeStepParam, 10))
    ? parseInt(activeStepParam, 10)
    : 0;
  const type = urlParams.type;
  const fromScreen = urlParams.from;
  //To know if user has been redirected to Create Allocation from different page
  const isRedirectedFromDifferentPage =
    type &&
    type !== "backButton" &&
    /* To modify later by maintaining objects of screens redirected from on backButtonClicked
       fromScreen === "ada" will be removed
    */
    (props?.createAllocationArticles?.length > 0 || fromScreen === "ada");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const articles = JSON.parse(localStorage.getItem("selectedArticles")) || [];
  const poCode = JSON.parse(localStorage.getItem("po_code") || null);
  const asnID = JSON.parse(localStorage.getItem("asn_id") || null);
  const l_filteredSelection =
    JSON.parse(localStorage.getItem("filtered_selection")) || [];
  const l_popUpLinkFromDashboard = JSON.parse(
    localStorage.getItem("popupLink") || null
  );
  const l_type = JSON.parse(localStorage.getItem("type") || null);
  const newStoreAlert = JSON.parse(
    localStorage.getItem("newstore_alert") || null
  );
  const alloc_type = JSON.parse(localStorage.getItem("alloc_type") || null);

  const onFilterDependency = useRef([]);
  const filterConfigRef = useRef(null);

  //If the user has been redirected to Create Allocation from different page then use previous page's selected filters
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showInValidDraftModal, setShowInValidDraftModal] = useState(true);
  const [allocationPlanName, setAllocationPlanName] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [actionType, setActionType] = useState(""); // 'draft' or 'allocation'
  const [draftDataLoaded, setDraftDataLoaded] = useState(false);
  const [optimizationDetails, setOptimizationDetails] = useState({});
  const [draftAllocationDetails, setDraftAllocationDetails] = useState({});

  /** Same condition as `CnaOptimizationScreen` render — only then may notification auto-navigate. */
  const isOnCnaOptimizationWaitScreen = useMemo(
    () => draftSaved && actionType === "allocation",
    [draftSaved, actionType]
  );

  // Keep ref updated with latest filterDashboardConfigurationFromReducer
  useEffect(() => {
    filterConfigRef.current = props.filterDashboardConfigurationFromReducer;
  }, [props.filterDashboardConfigurationFromReducer]);

  useEffect(() => {
    allowFinalizeNavigateFromNotificationRef.current = isOnCnaOptimizationWaitScreen;
  }, [isOnCnaOptimizationWaitScreen]);

  const leaveCnaOptimizationWaitScreen = useCallback(() => {
    setDraftSaved(false);
    setActionType("");
    pendingFinalizeAllocationCodeRef.current = null;
    allowFinalizeNavigateFromNotificationRef.current = false;
  }, []);

  const setPendingFinalizeAllocationCode = useCallback((allocationId) => {
    if (allocationId == null || allocationId === "") return;
    const asString = String(allocationId);
    pendingFinalizeAllocationCodeRef.current = asString;
  }, []);

  const navigateToFinalizeFromMatchedUrl = useCallback(
    (urlFromNotification) => {
      if (!allowFinalizeNavigateFromNotificationRef.current) {
        return;
      }
      leaveCnaOptimizationWaitScreen();
      try {
        const pathAndSearch = urlFromNotification.includes("://")
          ? new URL(urlFromNotification).pathname +
            new URL(urlFromNotification).search
          : urlFromNotification.startsWith("/")
          ? urlFromNotification
          : `/${urlFromNotification}`;
        console.info(`${FINALIZE_WS_LOG} Navigating to finalize step`, {
          to: pathAndSearch,
          rawUrl: urlFromNotification,
        });
        navigate(pathAndSearch, { replace: true });
      } catch (err) {
        console.error(
          `${FINALIZE_WS_LOG} navigate parse failed, fallback to step=2`,
          err
        );
        navigate(`${CREATE_ALLOCATION}?step=2`, { replace: true });
      }
    },
    [navigate, leaveCnaOptimizationWaitScreen]
  );

  useEffect(() => {
    const pending = pendingFinalizeAllocationCodeRef.current;
    const items = props.notificationFeedFromStore;
    if (!pending || !Array.isArray(items) || items.length === 0) return;
    if (!allowFinalizeNavigateFromNotificationRef.current) {
      return;
    }

    for (const n of items) {
      const url = n?.url;
      if (!url || typeof url !== "string") continue;
      const code = extractAllocationCodeFromUrl(url);
      if (code && code === pending) {
        console.info(`${FINALIZE_WS_LOG} Match via Redux notification feed`, {
          allocationId: pending,
        });
        navigateToFinalizeFromMatchedUrl(url);
        return;
      }
    }
  }, [
    props.notificationFeedFromStore,
    navigateToFinalizeFromMatchedUrl,
    isOnCnaOptimizationWaitScreen,
  ]);

  const handleOnBlur = (event) => {
    props.setAllocationName(event.target.value);
  };
  const applyFilters = (filterValues, dependency) => {
    // props.warmUpAllocation({}, props.isV3?.includes("warmupAllocation"));
    cacheKeyRef.current = generateCacheKey();
    props.setInventorysmartCreateAllocationFilterDependency(dependency);

    const payload = filtersPayload(
      filterValues || filterData,
      dependency || props.inventorysmartCreateAllocationFilterDependency,
      true,
      false,
      isRedirectedFromDifferentPage || props.backButtonClicked ? true : false
    );
    let filtersValid =
      isRedirectedFromDifferentPage || props.backButtonClicked
        ? true
        : payload.isValid;
    if (
      payload.isValid ||
      isRedirectedFromDifferentPage ||
      props.backButtonClicked
    ) {
      let filterValue = filters.length > 0 ? filters : filterValues;
      let l_mandatoryFilter = filterValue?.find(
        (filter) => filter?.is_mandatory
      )?.column_name;
      let l_selectedOption = payload.reqBody
        ?.filter((val) => val.attribute_name === l_mandatoryFilter)[0]
        ?.values[0]?.replaceAll(" ", "");
      props.setMandatoryFilter(l_selectedOption);
      let l_selectedFilters = payload.reqBody;
      if (props.createAllocationProps?.defaultChannel) {
        l_selectedFilters = [
          ...l_selectedFilters,
          props.createAllocationProps?.defaultChannel,
        ];
      }

      props.setSelectedFilters(l_selectedFilters);

      if (!isRedirectedFromDifferentPage && !props.backButtonClicked) {
        articleTableGlobalInstance.current = [];
      }
    }
    props.setIsFiltersValid(filtersValid);
    props.setIsFilterApplied(true);
    setShowArticleTable(filtersValid);
    setOpenModal(false);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    applyFilters(filterData, dependencyData);
  };

  const resetSelectedFilterValues = async () => {
    props.setInventorysmartCreateAllocationFilterDependency([]);
    applyFilters(filterData, []);
    setOpenModal(false);
  };

  const onCloseModalHandler = () => {
    setShowInValidDraftModal(true);
    props.setShowInvalidDraftModal(true);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventorysmartFilterLoader(true);
      const selectedFilters =
        isRedirectedFromDifferentPage || props.backButtonClicked
          ? cloneDeep(props.inventorysmartCreateAllocationFilterDependency)
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
      // if(isRedirectedFromDifferentPage || props.backButtonClicked){

      // }

      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "createAllocationFilterConfiguration",
          filterConfigData,
          "Create New Allocation",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
      setFilterData(response);
      if (isRedirectedFromDifferentPage || props.backButtonClicked) {
        props.setCreateAllocationFilterDetails(
          props.createAllocationFilterDetails
        );
        props.setFilterConfiguration({
          ["createAllocationFilterConfiguration"]:
            props.createAllocationFilterDetails,
        });
        props.setSelectedFilters(props.selectedFiltersCreateAllocation);
        props.setSelectedFiltersCoreReducer(
          props.selectedFiltersCreateAllocation
        );
        props.setIsFiltersValid(true);
        // if (props.backButtonClicked) {
        //   props.setBackButtonClicked(false);
        // }
        onFilterDashboardClick(selectedFilters, response);
        // clean up may require
        // props.setSelectedFiltersCreateAllocation({})
        // props.setCreateAllocationFilterDetails({})
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartFilterLoader(false);
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
              props.cache[CNA_CACHE] &&
              props.cache[CNA_CACHE]["getModuleLevelAccessUtility-CNA"]
            ) {
              accessDataResponse =
                props.cache[CNA_CACHE]["getModuleLevelAccessUtility-CNA"];
            } else {
              accessDataResponse = await getModuleLevelAccessUtility({
                app: APP_NAME,
                module: subModules,
              })();
              props.setKeyValueInCache({
                key: "getModuleLevelAccessUtility-CNA",
                value: accessDataResponse,
                module: CNA_CACHE,
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
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      // Fetch the "Prod Cloud Function" tenant config independently so the
      // AI Smart Filter (shared AiSmartFilterButton component, used across
      // CNA's Finalize-Allocation tables) knows whether to call the `-prod`
      // cloud function URLs. Previously this was only fetched/dispatched
      // from Decision-Dashboard's own mount effect, so landing directly on
      // CNA without visiting Dashboard first left the flag at its default
      // (false). Kept in its own try/catch so a failure here never blocks
      // the existing permissions flow above.
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
    if (props.isNameMandatory) {
      CREATE_ALLOCATION_FORM.find(
        (formElement) => formElement.accessor === "allocationName"
      ).required = true;
    }
  }, [props.isNameMandatory]);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    // Prevent multiple calls - only call once when filters are first loaded
    if (hasCalledGetFiltersOptions.current) {
      return;
    }
    const allocationCode = new URLSearchParams(window.location.search).get(
      "allocation_code"
    );
    const isDraftMode =
      new URLSearchParams(window.location.search).get("type") === "draft";
    const currentStep = new URLSearchParams(window.location.search).get("step");
    // If we are in draft mode at step > 0, skip the getFiltersOptions as filters aren't needed there
    if (allocationCode && isDraftMode && currentStep !== "0") {
      return;
    }

    hasCalledGetFiltersOptions.current = true;
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  // Fetch the page limit up front so the article table renders with the
  // correct pagination page size even when redirected from another page
  // (e.g. dashboard alert), where the table can render before filter options resolve.
  useEffect(() => {
    const fetchPageLimit = async () => {
      try {
        const getSetAllModalData = await getTenantConfigData(
          1,
          "strategy_details_page_limit"
        );
        if (getSetAllModalData.data?.data?.[0]?.attribute_value?.value) {
          setPageLimit(
            getSetAllModalData.data?.data?.[0]?.attribute_value?.value || null
          );
        }
      } catch (error) {
        console.error("Error fetching strategy details page limit:", error);
      }
    };
    fetchPageLimit();
  }, []);

  useEffect(() => {
    setAllocationPlanName(props.draftResult.allocation_name);
    props.setAllocationName(props.draftResult.allocation_name);
  }, [props.draftResult.allocation_name]);

  useEffect(() => {
    !props.showInvalidDraftModal &&
      setShowInValidDraftModal(props.showInvalidDraftModal);
  }, [props.showInvalidDraftModal]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setInventorysmartFilterLoader(true);
        const response = await fetchFilterConfig("Allocation");

        // if (isEmpty(props.filterDashboardConfiguration)) {
        //   const filterConfigData = [
        //     {
        //       filterDashboardData: response,
        //       expectedFilterDimensions: ["store", "product"],
        //       isCrossDimensionFilter: true,
        //     },
        //   ];
        //   const filterConfig = formattedFilterConfiguration(
        //     "createAllocationFilterConfiguration",
        //     filterConfigData,
        //     "Create New Allocation"
        //   );
        //   props.setFilterConfiguration(filterConfig);
        // } else {
        //   onFilterDependency.current =
        //     props.filterDashboardConfiguration.appliedFilterData.dependencyData || props.filterDependencyData;
        // }

        setFilters(response);
      } catch (error) {
        props.setInventorysmartFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData &&
      activeStep === 0 &&
      !isEmpty(props.inventorysmartModulesPermission[props.module])
    ) {
      setFilters(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.filterDashboardData
      );
      return;
    }
    activeStep === 0 &&
      !isEmpty(props.inventorysmartModulesPermission[props.module]) &&
      fetchFilters();
  }, [activeStep, props.inventorysmartModulesPermission[props.module]]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  function reducerCleanUp() {
    props.resetCreateAllocationStoreState();
    props.setFilterConfiguration({ createAllocationFilterConfiguration: {} });
    props.setSelectedFiltersCoreReducer({
      ...props.selectedFiltersFromReducer,
      "create-new-allocation-product-0": [],
    });
    props.setCreateAllocationFilterDetails({});
    props.setSelectedFiltersCreateAllocation({});
  }

  useEffect(() => {
    const selectedArticles =
      articles?.length > 0 ? articles : props.createAllocationArticles;
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.inventorysmartCreateAllocationFilterDependency;

    // Read filter details from localStorage (set by alerts/other screens opening new window)
    const storedFilterDetails = localStorage.getItem(
      "createAllocationFilterDetails"
    );
    const storedSelectedFilters = localStorage.getItem(
      "selectedFiltersCreateAllocation"
    );

    if (storedFilterDetails) {
      try {
        const parsedFilterDetails = JSON.parse(storedFilterDetails);
        props.setCreateAllocationFilterDetails(parsedFilterDetails);
        props.setFilterConfiguration({
          createAllocationFilterConfiguration: parsedFilterDetails,
        });
      } catch (e) {
        console.error(
          "Failed to parse createAllocationFilterDetails from localStorage",
          e
        );
      }
    }

    if (storedSelectedFilters) {
      try {
        const parsedSelectedFilters = JSON.parse(storedSelectedFilters);
        props.setSelectedFiltersCoreReducer(parsedSelectedFilters);
        props.setSelectedFiltersCreateAllocation(parsedSelectedFilters);
      } catch (e) {
        console.error(
          "Failed to parse selectedFiltersCreateAllocation from localStorage",
          e
        );
      }
    }

    props.setInventorysmartCreateAllocationFilterDependency(
      selectedFiltersDependency
    );
    props.setCreateAllocationArticles(selectedArticles);
    props.setPOCode(poCode);
    props.setAsnCode(asnID);
    props.setNewStoreAlertStatus(newStoreAlert);
    props.setAllocTypeStatus(alloc_type);
    props.setFilteredSelection(l_filteredSelection);
    props.setPopUpLinkFromDashbaord(l_popUpLinkFromDashboard);
    props.setType(l_type);
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("selectedArticles");
    localStorage.removeItem("po_code");
    localStorage.removeItem("filtered_selection");
    localStorage.removeItem("popupLink");
    localStorage.removeItem("type");
    localStorage.removeItem("newstore_alert");
    localStorage.removeItem("alloc_type");
    localStorage.removeItem("asn_id");
    localStorage.removeItem("createAllocationFilterDetails");
    localStorage.removeItem("selectedFiltersCreateAllocation");

    return () => {
      articleTableGlobalInstance.current = [];
      articleTableColumnRef.current = [];
      setAllocationPlanName("");
      setOptimizationDetails({});
      setDraftAllocationDetails({});
      hasCalledGetFiltersOptions.current = false;
      setDraftSaved(false);
      setActionType("");
      // don't clear state during back navigation to preserve filters
      if (type !== "backButton") {
        reducerCleanUp();
      }
    };
  }, []);

  // Handle loading draft data when editing from View Plans table
  useEffect(() => {
    setDraftSaved(false);

    // Reset draftDataLoaded when URL parameters change
    setDraftDataLoaded(false);

    // Handle loading draft data when editing from View Plans table
    const allocationCode = urlParams.allocation_code;
    const isEditMode = urlParams.type === "draft";
    const currentStep = urlParams.step;

    if (
      allocationCode &&
      isEditMode &&
      (currentStep === "0" || currentStep === 0) &&
      !isEmpty(props.draftResult) &&
      !draftDataLoaded
    ) {
      setDraftDataForAllocation(props.draftResult);
      // Set backButtonClicked so getFiltersOptions triggers onFilterDashboardClick with correct dependency
      props.setBackButtonClicked(true);
      props.setInventorysmartCreateAllocationFilterDependency(
        props.draftResult.filter_dependency || []
      );
    }
    // If we're in edit mode at step 0 and have an allocation_code but no draft data, load it
    if (
      allocationCode &&
      isEditMode &&
      (currentStep === "0" || currentStep === 0) &&
      isEmpty(props.draftResult) &&
      !draftDataLoaded
    ) {
      const loadDraftData = async () => {
        try {
          setDraftDataLoaded(true); // Set flag to prevent multiple executions
          // Fetch the draft data
          const draftResponse = await props.getDrafts(allocationCode);

          if (draftResponse.data.status) {
            const draftData = draftResponse.data.data;
            props.setDraftsResult(draftData);
            setDraftDataForAllocation(draftData);
            setFilters(draftData.filters || []);
            setFilterData(draftData.filters || []);
          } else {
            console.error(
              "Failed to load draft data:",
              draftResponse.data.message
            );
          }
        } catch (error) {
          console.error("Error loading draft data:", error);
        }
      };

      loadDraftData();
    }
  }, [urlParams.step, urlParams.type, urlParams.allocation_code]); // Add location.search as dependency

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  function setDraftDataForAllocation(draftResult) {
    cacheKeyRef.current = generateCacheKey();
    setDraftAllocationDetails(draftResult);

    const mandatoryFromDraft = draftResult?.mandatory;
    if (mandatoryFromDraft != null && mandatoryFromDraft !== "") {
      props.setMandatoryFilter(String(mandatoryFromDraft).replaceAll(" ", ""));
    }

    props.setPOCode(draftResult.poCode || null);
    props.setAllocTypeStatus(draftResult.alloc_type || null);
    props.setAsnCode(draftResult.asnCode || null);
    props.setFilteredSelection(draftResult.filteredSelection || []);
    props.setPopUpLinkFromDashbaord(draftResult.popupLink || null);
    props.setCreateAllocationArticles(
      draftResult.createAllocationArticles || []
    );
    props.setAllocationName(draftResult.allocation_name || "");

    // Set the article grid parameters
    props.setArticleAgGridParams({
      setAll: draftResult.set_all,
      selection: draftResult.selection,
      prevAction: draftResult.prev_action,
      displayedAndHiddenCheckedRows: draftResult.displayedAndHiddenCheckedRows,
    });
  }

  function getOptimizationDetails(allocationDetails) {
    let SelectedDcs = [
      ...new Set(
        allocationDetails.flatMap(
          (item) => item.dcs?.map((dc) => dc.value) || []
        )
      ),
    ];
    let SelectedStores = [
      ...new Set(allocationDetails.flatMap((item) => item.mapped_stores || [])),
    ];
    // Count unique article-size combinations
    let uniqueArticleSizeSet = new Set();
    allocationDetails.forEach((item) => {
      const unique_key = item.unique_key || "article";
      if (item.sizes && Array.isArray(item.sizes)) {
        item.sizes.forEach((size) => {
          uniqueArticleSizeSet.add(
            `${item[unique_key] || item[unique_key]}-${size.value}`
          );
        });
      }
    });
    let uniqueArticleSizeCount = uniqueArticleSizeSet.size;

    // Count unique article-size-mappedstore-dc combinations
    let uniqueArticleSizeStoreDcSet = new Set();
    allocationDetails.forEach((item) => {
      const unique_key = item.unique_key || "article";
      if (
        item.sizes &&
        Array.isArray(item.sizes) &&
        item.mapped_stores &&
        Array.isArray(item.mapped_stores) &&
        item.dcs &&
        Array.isArray(item.dcs)
      ) {
        item.sizes.forEach((size) => {
          item.mapped_stores.forEach((store) => {
            item.dcs.forEach((dc) => {
              uniqueArticleSizeStoreDcSet.add(
                `${item[unique_key] || item[unique_key]}-${
                  size.value
                }-${store}-${dc.value}`
              );
            });
          });
        });
      }
    });
    let uniqueArticleSizeStoreDcCount = uniqueArticleSizeStoreDcSet.size;
    setOptimizationDetails({
      selectedDcs: SelectedDcs,
      selectedStores: SelectedStores,
      uniqueArticleSizeCount: uniqueArticleSizeCount,
      uniqueArticleSizeStoreDcCount: uniqueArticleSizeStoreDcCount,
    });
  }

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file?.[0]?.file);

      const res = await props.uploadBackDoorAllocationFile(formData);
      props.addSnack({
        message:
          res.message || "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      setIsModalOpen(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const uploadModalClick = () => {
    setIsModalOpen(true);
  };
  const addExtraButton = () => {
    let extraButtons = [];
    if (props.inventorysmartScreenConfig?.backDoor_upload && activeStep === 0) {
      extraButtons.push(
        <>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Upload
          </Button>
        </>
      );
    }
    return extraButtons;
  };

  const clearAllCachedData = () => {
    // Clear Redux state
    props.resetCreateAllocationStoreState();

    // Clear localStorage
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("selectedArticles");
    localStorage.removeItem("po_code");
    localStorage.removeItem("filtered_selection");
    localStorage.removeItem("popupLink");
    localStorage.removeItem("type");
    localStorage.removeItem("newstore_alert");
    localStorage.removeItem("alloc_type");
    localStorage.removeItem("asn_id");

    // Clear local state
    setAllocationPlanName("");
    setDraftSaved(false);
    setActionType("draft");
    setFilters([]);
    setFilterData([]);
    setDraftDataLoaded(false);
    cacheKeyRef.current = null;

    // Clear any other local state variables you might have
    // Add any other state variables that need to be reset
  };

  // New flow uses its own layout for step 3 (breadcrumbs, scroll area, InfoPanel).
  // Safe as an early return: !draftSaved is mutually exclusive with post-save screens,
  // and all other step logic runs on activeStep !== 2.
  if (activeStep === 2 && !draftSaved && isAnyNewFlow) {
    return (
      <div
        className={`${globalClasses.paddingAroundNew} ${globalClasses.mainContainerBody}`}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <div
          className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12} ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
        >
          <HeaderBreadCrumbs
            options={[
              {
                label: t("inventorysmart.createAllocationHomeLabel"),
                to: "/home",
              },
              {
                label:
                  props?.redirectedFrom !== "viewPastAllocation"
                    ? t("inventorysmart.createAllocationBreadcrumbLabel")
                    : t("inventorysmart.pastAllocationBreadcrumbLabel"),
                id: 1,
                action: () => {
                  navigate(CREATE_ALLOCATION);
                },
              },
            ]}
          />
          <InfoPanelButton
            onClick={() => setGlossaryOpen(true)}
            ariaLabel={t("inventorysmart.infoPanel.openGlossary")}
          />
        </div>
        <CreateAllocationStepper activeStep={activeStep} />
        <div className={`${globalClasses.tabsContainerBody} ${classes.cnaStep3ScrollArea}`}>
          <FinalizeAllocation
            articleTableGlobalInstance={articleTableGlobalInstance}
            articleTableColumnRef={articleTableColumnRef}
            setAllocationPlanName={setAllocationPlanName}
            setOptimizationDetails={setOptimizationDetails}
            setDraftSaved={setDraftSaved}
            setActionType={setActionType}
          />
        </div>
        <InfoPanel
          isOpen={glossaryOpen}
          onClose={() => setGlossaryOpen(false)}
          title={t("inventorysmart.infoPanel.glossary")}
          subtitle={t("inventorysmart.infoPanel.glossarySubtitle")}
          sections={FINALIZE_ALLOCATION_GLOSSARY}
        />
      </div>
    );
  }

  return (
    <>
      {
        <div className={`${globalClasses.paddingAroundNew}`}>
          <CoreComponentScreen
            headerBreadCrumb={
              <HeaderBreadCrumbs
                options={[
                  {
                    label: t("inventorysmart.createAllocationHomeLabel"),
                    to: "/home",
                  },
                  {
                    label: `${
                      props?.redirectedFrom !== "viewPastAllocation"
                        ? t("inventorysmart.createAllocationBreadcrumbLabel")
                        : t("inventorysmart.pastAllocationBreadcrumbLabel")
                    }`,
                    id: 1,
                    action: () => {
                      navigate(CREATE_ALLOCATION);
                    },
                  },
                ]}
              />
            }
            autoApplyEnabled={
              !isRedirectedFromDifferentPage && !props.backButtonClicked
            }
            showPageRoute={false}
            showPageHeader={true}
            showFilterDashboard={activeStep === 0 && !draftSaved}
            showChipsOnLoad={
              isRedirectedFromDifferentPage || props.backButtonClicked
            }
            disableFilters={
              isRedirectedFromDifferentPage ||
              props.backButtonClicked ||
              type ||
              activeStep > 0 ||
              draftSaved
            }
            hideNoDataFound={activeStep > 0 || draftSaved}
            filterDependency={props.selectedFiltersCreateAllocation}
            // filterDependency={filterDependency}
            filterConfigKey={
              redirectFromDashboard
                ? "decisionDashboardFilterConfiguration"
                : "createAllocationFilterConfiguration"
            }
            onApplyFilter={onFilterDashboardClick}
            contained={true}
            extraButtons={
              props.isFiltersValid && activeStep === 0 ? addExtraButton() : []
            }
            autoHideFilterButton={true}
            skipFirstRenderCheck
            emptyStateProps={{
              onSecondaryButtonClick: () => {
                uploadModalClick();
              },
              secondaryButtonLabel: props.inventorysmartScreenConfig
                ?.backDoor_upload
                ? t("inventorysmart.createAllocationUploadLabel")
                : null,
            }}
          >
            {!draftSaved && <CreateAllocationStepper activeStep={activeStep} />}
            {activeStep === 0 && (
              <>
                <div className={`${globalClasses.marginTop_24}`}>
                  {props.isFiltersValid && (
                    <div
                      className={`${classes.createRulesContainer} ${globalClasses.marginBottom_24}`}
                    >
                      <div
                        className={`${classes.alignFlexStart} ${classes.alignTextField}`}
                      >
                        <Typography className={classes.allocationPlanNameLabel}>
                          {t("inventorysmart.createAllocationNameLabel")}
                        </Typography>
                        <Input
                          value={allocationPlanName}
                          placeholder={t("inventorysmart.createAllocationNamePlaceholder")}
                          onChange={(event) =>
                            setAllocationPlanName(event.target.value)
                          }
                          margin="normal"
                          required
                          disabled={false}
                          label=""
                          onBlur={(event) => handleOnBlur(event)}
                        />
                      </div>
                    </div>
                  )}
                  {showArticleTable && props.isFiltersValid && (
                    <div>
                      <ArticlesTable
                        module={props.module}
                        articleTableGlobalInstance={articleTableGlobalInstance}
                        articleTableColumnRefData={articleTableColumnRef}
                        // type={type}
                        isRedirectedFromDifferentPage={
                          isRedirectedFromDifferentPage ||
                          props.backButtonClicked
                        }
                        pageLimit={pageLimit}
                        onDraftSaved={() => setDraftSaved(true)}
                        setShowArticleTable={setShowArticleTable}
                        filterConfigKey={
                          redirectFromDashboard
                            ? "decisionDashboardFilterConfiguration"
                            : "createAllocationFilterConfiguration"
                        }
                        filters={filters}
                        hasCalledGetFiltersOptions={hasCalledGetFiltersOptions}
                        cacheKeyRef={cacheKeyRef}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            {!draftSaved && activeStep === 1 && (
              <div className={classes.marginTop24}>
                <StoreDcDetails
                  allocationPlanName={allocationPlanName}
                  articleTableGlobalInstance={articleTableGlobalInstance}
                  articleTableColumnRef={articleTableColumnRef}
                  module={props.module}
                  draftAllocationDetails={draftAllocationDetails}
                  setDraftAllocationDetails={setDraftAllocationDetails}
                  // onDraftSaved={() => setDraftSaved(true)}
                  getOptimizationDetails={getOptimizationDetails}
                  setAllocationPlanName={setAllocationPlanName}
                  onDraftSaved={(type = "draft") => {
                    setDraftSaved(true);
                    setActionType(type);
                  }}
                  onPendingAllocationCodeForFinalize={
                    setPendingFinalizeAllocationCode
                  }
                  allocationType={type}
                  cacheKeyRef={cacheKeyRef}
                />
              </div>
            )}
            {!draftSaved && activeStep === 2 && !isAnyNewFlow && (
              <FinalizeAllocation
                articleTableGlobalInstance={articleTableGlobalInstance}
                articleTableColumnRef={articleTableColumnRef}
                setAllocationPlanName={setAllocationPlanName}
                setOptimizationDetails={setOptimizationDetails}
                setDraftSaved={setDraftSaved}
                setActionType={setActionType}
              />
            )}
            {draftSaved && actionType === "draft" && (
              <div
                className={`${globalClasses.marginTop} ${globalClasses.flexRow} ${globalClasses.centerAlign}`}
              >
                <EmptyState
                  heading={t(
                    "inventorysmart.createAllocationEditsSavedHeading"
                  )}
                  secondaryButtonLabel={t(
                    "inventorysmart.createAllocationReturnToDashboardLabel"
                  )}
                  onSecondaryButtonClick={() => {
                    articleTableGlobalInstance.current = [];
                    articleTableColumnRef.current = [];
                    setAllocationPlanName("");
                    setDraftSaved(false);
                    navigate("/inventory-smart/decision-dashboard");
                  }}
                  primaryButtonLabel={t(
                    "inventorysmart.createAllocationCreateNewAllocationLabel"
                  )}
                  onPrimaryButtonClick={() => {
                    articleTableGlobalInstance.current = [];
                    articleTableColumnRef.current = [];
                    setAllocationPlanName("");
                    setOptimizationDetails({});
                    setDraftAllocationDetails({});
                    clearAllCachedData();
                    setDraftSaved(false);
                    props.setBackButtonClicked(false);
                    navigate("/inventory-smart/create-allocation?step=0");
                  }}
                />
              </div>
            )}
            {draftSaved && actionType === "allocation" && (
              <CnaOptimizationScreen
                heading={DEFAULT_CNA_OPTIMIZATION_SCREEN_HEADER}
                description={DEFAULT_CNA_OPTIMIZATION_SCREEN_DESCRIPTION}
                secondaryButtonLabel={t(
                  "inventorysmart.createAllocationReturnToDashboardLabel"
                )}
                onSecondaryButtonClick={() => {
                  leaveCnaOptimizationWaitScreen();
                  navigate("/inventory-smart/decision-dashboard");
                }}
                primaryButtonLabel={t(
                  "inventorysmart.createAllocationCreateNewAllocationLabel"
                )}
                onPrimaryButtonClick={() => {
                  articleTableGlobalInstance.current = [];
                  articleTableColumnRef.current = [];
                  setAllocationPlanName("");
                  setOptimizationDetails({});
                  clearAllCachedData();
                  leaveCnaOptimizationWaitScreen();
                  props.setBackButtonClicked(false);
                  reducerCleanUp();
                  navigate("/inventory-smart/create-allocation?step=0");
                }}
                value={
                  !isEmpty(optimizationDetails)
                    ? [
                        optimizationDetails.uniqueArticleSizeCount,
                        optimizationDetails.selectedStores.length,
                        optimizationDetails.selectedDcs.length,
                        optimizationDetails.uniqueArticleSizeStoreDcCount,
                      ]
                    : [null, null, null, null]
                }
                optimizationDetails={optimizationDetails}
              />
            )}
          </CoreComponentScreen>
          {!showInValidDraftModal && (
            <Dialog
              onClose={() => onCloseModalHandler()}
              className={classes.root}
              maxWidth={"sm"}
              aria-labelledby="customized-dialog-title"
              open={true}
              fullWidth={true}
              disableEscapeKeyDown={true}
            >
              <DialogTitle id="customized-dialog-title">
                <Grid
                  container
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h5" gutterBottom>
                    {ALERT}
                  </Typography>
                  <IconButton
                    aria-label="close"
                    onClick={() => onCloseModalHandler()}
                    size="large"
                  >
                    <CloseIcon />
                  </IconButton>
                </Grid>
              </DialogTitle>
              <DialogContent>
                <div className={classes.contentBody}>{INVALID_DRAFT}</div>
              </DialogContent>
              <DialogActions
                classes={{
                  root: classes.footer,
                }}
              >
                <Button
                  onClick={() => {
                    onCloseModalHandler();
                  }}
                  color="primary"
                >
                  {t("inventorysmart.createAllocationCancelButton")}
                </Button>
              </DialogActions>
            </Dialog>
          )}
          {props.inventorysmartScreenConfig?.backDoor_upload &&
            activeStep === 0 && (
              <div>
                <UploadHandler
                  handleUpload={handleUpload}
                  isModalOpen={isModalOpen}
                  setIsModalOpen={setIsModalOpen}
                  attachCallBacks={attachCallBacks}
                  jsonUpload={false}
                  templateConfig={[
                    ...(props.inventorysmartScreenConfig?.backDoor_upload_config
                      ?.templateConfig ?? BACKDOOR_CSV_CONFIG_CARTERS),
                  ]}
                  uploadInstructions={[
                    ...(props.inventorysmartScreenConfig?.backDoor_upload_config
                      ?.uploadInstructions ??
                      BACKDOOR_FILE_UPLOAD_INSTRUCTIONS_CARTERS),
                  ]}
                  tenantUploadConfig={{}}
                  templateName={"BackDoorAllocationTemplate"}
                />
              </div>
            )}
        </div>
      }
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    notificationFeedFromStore:
      store.notificationReducer?.notificationData ?? [],
    inventorysmartFilterLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .isFiltersValid,
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    showInvalidDraftModal:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .showInvalidDraftModal,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    createAllocationFilterDetails:
      store.inventorysmartReducer?.inventorySmartCreateAllocationService
        ?.createAllocationFilterDetails,
    selectedFiltersCreateAllocation:
      store.inventorysmartReducer?.inventorySmartCreateAllocationService
        ?.selectedFiltersCreateAllocation,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorySmartPermissionLoader:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createAllocationFilterConfiguration"
      ],
    filterDashboardConfigurationFromReducer:
      store.filterReducer.filterDashboardConfiguration,
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.isNameMandatory,
    createAllocationProps:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    redirectedFrom:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .redirectedFrom,
    filterDependencyData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .filterDependencyData,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    filterDecisionDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setAllocationName: (payload) => dispatch(setAllocationName(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setNotifications: (payload) => dispatch(setNotifications(payload)),
  setMandatoryFilter: (payload) => dispatch(setMandatoryFilter(payload)),
  resetCreateAllocationStoreState: (payload) =>
    dispatch(resetCreateAllocationStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  setShowInvalidDraftModal: (payload) =>
    dispatch(setShowInvalidDraftModal(payload)),
  setPOCode: (payload) => dispatch(setPOCode(payload)),
  setAsnCode: (payload) => dispatch(setAsnCode(payload)),
  setNewStoreAlertStatus: (payload) =>
    dispatch(setNewStoreAlertStatus(payload)),
  setAllocTypeStatus: (payload) => dispatch(setAllocTypeStatus(payload)),
  setFilteredSelection: (payload) => dispatch(setFilteredSelection(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
  setType: (payload) => dispatch(setType(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  warmUpAllocation: (payload, isV3) =>
    dispatch(warmUpAllocation(payload, isV3)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  uploadBackDoorAllocationFile: (payload) =>
    dispatch(uploadBackDoorAllocationFile(payload)),
  setDraftsResult: (payload) => dispatch(setDraftsResult(payload)),
  setArticleAgGridParams: (payload) =>
    dispatch(setArticleAgGridParams(payload)),
  getDrafts: (allocationCode) => dispatch(getDrafts(allocationCode)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setIsFilterApplied: (payload) => dispatch(setIsFilterApplied(payload)),
  setCreateAllocationFilterDetails: (payload) =>
    dispatch(setCreateAllocationFilterDetails(payload)),
  setSelectedFiltersCreateAllocation: (payload) =>
    dispatch(setSelectedFiltersCreateAllocation(payload)),
  setSelectedFiltersCoreReducer: (payload) =>
    dispatch(setSelectedFiltersCoreReducer(payload)),
  resetFilterConfiguration: (payload) =>
    dispatch(resetFilterConfiguration(payload)),
  getModuleBasedTenantConfig: (payload) =>
    dispatch(getModuleBasedTenantConfig(payload)),
  setIsProdCloudFunction: (payload) =>
    dispatch(setIsProdCloudFunction(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewAllocation);
