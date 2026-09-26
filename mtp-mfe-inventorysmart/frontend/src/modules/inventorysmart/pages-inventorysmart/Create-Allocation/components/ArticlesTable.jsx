import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Prompt, Tooltip } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { cloneDeep, isEmpty, isEqual } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import { setInventoryAdaPayload } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  MFP_ADA_SCREENNAME,
  common,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  CHECKALL_VALIDATION,
  ERROR_MESSAGE,
  tableArticleFilter,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getAllocate,
  getApsWos,
  getColumn,
  getSetAllDcs,
  getStoreGroupOptions,
  getStoreGroupStoreMap,
  getStoreGroupStoreMappingData,
  setArticleTableLoader,
  setBackButtonClicked,
  setIsValidDraft,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getViewPlanTableConfiguration, checkIngestionStatus } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { connect } from "react-redux";
import globalStyles from "../../../../../core/Styles/globalStyles";
import {
  ADA_VISUAL,
  ADA_VISUAL_MFP_DASHBOARD,
  ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
  ADA_VISUAL_STANDALONE,
  CREATE_ALLOCATION,
} from "../../../constants-inventorysmart/routesConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import {
  COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE,
  addMinMaxforUserDefinedInv,
  checkValidationForArticles,
  getAvailableInventory,
  getInvComponent,
  getPollingRequest,
  getUpdatedColumnConfig,
  getUpdatedRows,
  includesCommonStores,
  isNonPrimitiveArray,
  mutateInventoryCalculations,
  mutateStoreGroupCode,
  onlySpaces,
} from "../helperFunctions";
import SetAllModal from "./SetAllModal";
import Validation from "./Validation";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { inventoryData } from "../../Common/components/commonFunctions";
import { getStoreDetailsAtSizes } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import ViewTablePopUp from "../../Common/components/ViewTablePopUp";
import { uploadBackDoorAllocationFile } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import ImageCellRenderer from "../../../../../core/Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import { getScenarioInputs } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import StoreDetailsTableComponent from "../../CreateScenario/StoreDetailsTableComponent";
import { Grid } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { redirectToADA } from "../../StoreInventoryAlerts/components/inventory_alerts_utiltiy";
import { setArticleAgGridParams, setCreateAllocationFilterDetails, setSelectedFiltersCreateAllocation } from "../../../services-inventorysmart/Create-Allocation/create-allocation-services";
import { TENANT } from "config/api";
import { updateVIRAndIOB } from "../helperFunctions";
import ReviewForecastPanel from "./ReviewForecastPanel";
import { EXCLUDED_SPECIAL_CHARACTERS } from "config/constants";
import { hasExcludedSpecialCharacters } from "core/Utils/functions/utils";
import { setIsFiltersValid } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";

const ArticlesTable = (props) => {
  // Common variable for customChannelKey
  const customChannelKey = props?.customChannelKey || "channel";
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const debounceTimerRef = useRef(null);
  const storeGroupStoreMap = useRef(null);
  const defaultStoreGroupCode = useRef(null);
  const articleTableGridInstance = useRef(null);
  const storesForSelectedStoreFilters = useRef(null);
  const validationHandler = useRef();
  const isInitialMount = useRef(true);
  const hasCalledStoreGroupOptions = useRef(false);
  const hasCalledReviewStoreAndDC = useRef(false);
  const hasCompletedInitialFetch = useRef(false);
  const columnsInitializedRef = useRef(false);
  const [setAllDcs, setSetAllDcs] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [articleTableColumn, setArticleTableColumn] = useState([]);
  const [updatedRows, setUpdatedRows] = useState({});
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [showStoreandDc, setShowStoreandDc] = useState(false);
  const [render, setRender] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [articleDataMounted, setArticleDataMounted] = useState(false);
  const [ignoreAlert, setIgnoreAlert] = useState(false);
  const [expeditedFlow, setExpeditedFlow] = useState(false);

  const [
    articlesWithValidationError,
    setArticlesWithValidationError,
  ] = useState({
    articlesWithValidationError: [],
    validationErrorMessage: "",
  });
  const [uncheckableArticle, setUncheckableArticles] = useState({});
  const [channel, setChannel] = useState("");
  const [reviewForecast, setReviewForecast] = useState(false);
  const articleTableRef = useRef();
  const offset = useRef(0);
  const manualBodyRef = useRef();
  const skipList = useRef([]);
  const filterDependency = useRef([]);
  const articleTableColumns = useRef();
  const selectedScenarioProductData = useRef();
  const [loader, setLoader] = useState(null);
  const [storeGroupOptionsLoader, setStoreGroupOptionsLoader] = useState(false);
  const [showPopUp, setShowPopUp] = useState(null);
  const [columns, setColumns] = useState(null);
  const [rows, setRows] = useState(null);
  const [title, setTitle] = useState(null);
  const [minMaxValidator, setMinMaxValidator] = useState(false);
  const [strategyColsInSetAll, showStrategyColsInSetAll] = useState(false);
  const [sceanrioTableData, setSceanrioTableData] = useState([]);
  const [VIRConstraintOptions, setVIRConstraintOptions] = useState([]);
  const editedStyleDataList = useRef([]);
  const [showReviewForecast, setShowReviewForecast] = useState(false);
  const [showIngestionWarning, setShowIngestionWarning] = useState(false);
  const [ingestionWarningMessage, setIngestionWarningMessage] = useState("");
  const pendingRedirectionRef = useRef(null);

  const debounceRedraw = (node) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (articleTableGridInstance.current && articleTableGridInstance.current.api) {
        articleTableGridInstance.current.api.redrawRows({
          rowNodes: [node]
        });
      }
    }, 1000);
  };

    const goToStoreDcStep = () => {
    let l_articlesWithValidationError = checkValidationForArticles(
      articleTableGridInstance,
      props.articleKey || "article",
      storeGroupStoreMap?.current,
      storesForSelectedStoreFilters?.current,
      ignoreAlert,
      false,
      props.removeNetDctoAvailableValidation && props.poCode,
      props.allowZeroUserDefinedInventory,
      props.dynamicIaProfile
    );
    if (
      l_articlesWithValidationError?.validationErrorMessage.includes(
        "user reserve"
      )
    ) {
      setIgnoreAlert(true);
    }
    setArticlesWithValidationError(l_articlesWithValidationError);
    if (
      props.allocationName?.trim().length > 0 &&
      hasExcludedSpecialCharacters(props.allocationName)
    ) {
      displaySnackMessages(
        `Allocation plan name cannot have these characters " ${EXCLUDED_SPECIAL_CHARACTERS?.join(
          ` ", " `
        )} " Please change the name and try again.`,
        "error"
      );
      return;
    }
    if (!l_articlesWithValidationError?.articlesWithValidationError?.length) {
      checkDataIngestionStatus();
    }
  };

  const checkDataIngestionStatus = async () => {
    // Get selected articles
    const displayedRows = getSelectedRowsForInfiniteRowModel(
      articleTableGridInstance.current,
      true
    )
      ?.filter((val) => val.displayed)
      ?.map((val) => val.data);
    const hiddenRows = Array.from(
      articleTableGridInstance?.current?.api?.reConciledSelectedRowIds?.values() ||
        []
    );

    // Store all necessary data in ref at the beginning
    pendingRedirectionRef.current = {
      displayedRows,
      hiddenRows
    };

    try {
      props.setArticleTableLoader(true);
      const payload = {
        filters: filterDependency?.current
          ? filterDependency?.current
          : [...props.selectedFilters],
        meta: {
          ...tableConfigurationMetaData.meta,
        },
      };
      const response = await props.checkIngestionStatus(payload);
      props.setArticleTableLoader(false);
      
      if (response?.data?.show_warning) {
        // Show warning popup with message
        setIngestionWarningMessage(response?.data?.message);
        setShowIngestionWarning(true);
      } else {
        // Proceed with current flow
        proceedWithRedirection();
      }
    } catch (error) {
      console.error("Error checking data ingestion status:", error);
      props.setArticleTableLoader(false);
      // On error, proceed with current flow
      proceedWithRedirection();
    }
  };

  const proceedWithRedirection = () => {
    setShowIngestionWarning(false);
    if (!pendingRedirectionRef.current) return;

    const { displayedRows, hiddenRows } = pendingRedirectionRef.current;
    
    let articleTableData = [];
    props.articleTableGlobalInstance &&
      articleTableGridInstance?.current?.api?.forEachNode((node) => {
        articleTableData.push({ ...node.data, is_selected: node.selected });
      });
    articleTableData.length &&
      (props.articleTableGlobalInstance.current = articleTableData);
    
    props.setArticleAgGridParams({
      selection: articleTableGridInstance?.current?.api?.checkConfiguration,
      setAll: articleTableGridInstance?.current?.api?.checkAllSetAllRequest,
      prevAction: articleTableGridInstance?.current?.api?.prevAction,
      displayedAndHiddenCheckedRows: {
        displayedRows,
        hiddenRows,
      },
      storesForSelectedStoreFilters: storesForSelectedStoreFilters?.current,
      storeGroupStoreMap: storeGroupStoreMap.current,
      defaultStoreGroupCodeValue:
        defaultStoreGroupCode?.current?.[0]?.attribute_value || {},
    });
    const searchParams = new URLSearchParams(window.location.search);
    props.setCreateAllocationFilterDetails({...props?.filterDashboardConfiguration?.createAllocationFilterConfiguration})
    props.setSelectedFiltersCreateAllocation({...props?.selectedFiltersFromReducer})
    searchParams.set("step", 1);
    // Remove type=backButton parameter if it exists
    if (searchParams.has("type") && searchParams.get("type") === "backButton") {
      searchParams.delete("type");
    }
    // Reset backButtonClicked state when navigating forward from article table
    props.setBackButtonClicked(false);
    props.setShowArticleTable(false)
    props.setIsFiltersValid(false);  
    props.hasCalledGetFiltersOptions.current = false;
    navigate(`${CREATE_ALLOCATION}?${searchParams.toString()}`);
    
    // Clear the ref after successful redirection
    pendingRedirectionRef.current = null;
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filterDependency.current = props.selectedFilters;
      const fetchStoreGroupStoreMap = async () => {
        if (!props.isStoreBand) {
          let body = {
            channel: filterDependency.current
              .filter(
                (val) =>
                  val.attribute_name === "l1_name" ||
                  val.attribute_name === "channel"
              )
              .map((opt) => opt.values)?.[0],
            country: filterDependency.current
              .filter((val) => val.attribute_name === "l0_name")
              .map((opt) => opt.values)?.[0],
          };

          body.channel = body?.channel?.[0];
          body.country = body?.country?.[0];
          
          // Set loader for getStoreGroupOptions call
          setStoreGroupOptionsLoader(true);
          try {
            let { data: storeOptions } = await props.getStoreGroupOptions(body);
            storeGroupStoreMap.current = storeOptions.data;
            let cols = articleTableColumn.map((item) => {
              if (item.column_name === "store_groups") {
                item.extra = { ...item.extra, is_multi: true, dropdownSearchable: true, sortSelectedToTop: true };
                item.type = "list";
                item.isMulti = true;
                item.options = storeOptions.data;
              }
              return item;
            });
            setArticleTableColumn(cols);
            // articleTableColumnRef.current = cols;
          } catch (error) {
            console.error("Error fetching store group options:", error);
          } finally {
            setStoreGroupOptionsLoader(false);
          }
        }
      };
      // Skip on initial mount (fetchColumnData handles it) or if not yet completed initial fetch
      if (!isInitialMount.current && hasCompletedInitialFetch.current) {
        fetchStoreGroupStoreMap();
      }
      articleTableGridInstance?.current?.api?.setFilterModel(null);
      articleTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      articleTableGridInstance?.current?.api?.deselectAll(true);

      resetComponentState();
    }
    setColumns(null);
    setRows(null);
  }, [props.selectedFilters]);

  const resetComponentState = () => {
    offset.current = 0;
    setShowStoreandDc(false);
    setUpdatedRows({});
    setCheckAllSetAllRequest([]);
    setButtonEnabled(false);
    setIgnoreAlert(false);
    setExpeditedFlow(false);
    setArticlesWithValidationError({
      articlesWithValidationError: [],
      validationErrorMessage: "",
    });
  };

  const togglePopUp = async (data, column_name, item) => {
    setLoader(true);
    setShowPopUp(true);
    setTitle(item.label);
    let response = {};

    const mapped_col = item?.extra?.mapped_column;
    const dc_mapped_key = item?.extra?.dc_mapped_key;
    const obj = {
      metric: mapped_col ? mapped_col : column_name,
      endPoint: props.getStoreDetailsAtSizes,
      body: {
        filters: props.selectedFilters,
        article: data?.article,
      },
      dcCodeMapping: dc_mapped_key ? dc_mapped_key : "store_code",
    };
    let l_req = {};
    if (["net_available_inventory", "oh"]?.includes(column_name)) {
      l_req = {
        size: data.sizes?.map((val) => val.value),
        dc_code: data.dcs?.map((val) => val.value),
        data: data,
      };
    }
    response = await inventoryData(obj, l_req, props.type);

    setLoader(false);
    if (response.error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return;
    }
    setColumns(response.columns);
    setLoader(false);
    setRows(response.data);
  };

  const actionMap = {
    oh: togglePopUp,
    lw_qty: togglePopUp,
    lw_revenue: togglePopUp,
    lw_margin: togglePopUp,
    week_to_date_sales: togglePopUp,
    last_day_sales: togglePopUp,
    sales_1_ago: togglePopUp,
    sales_2_ago: togglePopUp,
    sales_3_ago: togglePopUp,
    sales_4_ago: togglePopUp,
    net_available_inventory: togglePopUp,
    last_day_sales_revenue: togglePopUp,
    week_to_date_sales_revenue: togglePopUp,
    sales_revenue_1_ago: togglePopUp,
    sales_revenue_2_ago: togglePopUp,
    sales_revenue_3_ago: togglePopUp,
    sales_revenue_4_ago: togglePopUp,
  };

  const getUpdatedApsWos = async (req) => {
    return props.getApsWos(req);
  };

  const closeShowPopup = () => {
    setShowPopUp(false);
    setColumns(null);
    setRows(null);
  };
  const updateNetInventory = (
    p_rowData,
    p_apiData,
    p_articleTableGridInstance,
    netInventory
  ) => {
    let totalInventory = netInventory
      ? netInventory
      : p_apiData?.net_available_inventory;

    // may require in future
    // if (!netInventory) {
    //   totalInventory = getAvailableInventory(p_rowData);
    // }
    totalInventory = getAvailableInventory(p_rowData);

    if (p_rowData?.["user_def_inv_perc"]) {
      p_rowData.final_tot_inventory = Math.round(
        +((totalInventory || p_apiData?.rq_map) * p_rowData.user_def_inv_perc) /
          100
      );
      p_articleTableGridInstance.current.api.refreshCells({
        columns: ["final_tot_inventory"],
      });
    }
    if (p_rowData?.["user_def_inv"]) {
      if (+p_rowData.user_def_inv > +(totalInventory || p_apiData?.rq_map)) {
        p_rowData.final_tot_inventory = "";
        p_rowData.user_def_inv = "";
        p_articleTableGridInstance.current.api.refreshCells({
          columns: ["user_def_inv"],
        });
      } else {
        p_rowData.final_tot_inventory = p_rowData.final_tot_inventory;
      }
      p_articleTableGridInstance.current.api.refreshCells({
        columns: ["final_tot_inventory"],
      });
    }
  };

  const onStoreGroupBlurHandler = async (data, column) => {
    props.setArticleTableLoader(true);
    try {
      let l_storeGroupCodes = data.store_groups
        ?.map((val) => val.valueArray || val.value)
        ?.flat();
      let l_storeGroupLabel = data.store_groups
        ?.map((val) => val.label)
        ?.flat();
      let l_sizes = data.sizes?.map((val) => val.value);
      let l_upc = l_sizes?.map((val) => data?.size_upc_map[val]);
      let dcCodes = data.dcs?.map((val) => val.valueArray || val.value)?.flat();
      // let l_noOfStores = await getNoofStores(
      //   l_storeGroupCodes,
      //   data.mapped_stores,
      //   storeGroupStoreMap.current
      // );
      // let l_noOfStores = await includesCommonStores(
      //   storeGroupStoreMap.current,
      //   data.store_groups,
      //   data.mapped_stores,
      //   storesForSelectedStoreFilters?.current
      // );
      // let  = data.store_groups
      let { data: l_noOfStores } = await props.getStoreGroupStoreMappingData({
        dc_codes: dcCodes,
        product_codes: [data.article],
        store_groups: l_storeGroupLabel,
        cache_key: props.cacheKeyRef?.current,
      });

      let res = await getUpdatedApsWos({
        store_group_upc_list: [
          {
            store_group_code: l_storeGroupCodes,
            upc: l_upc,
          },
        ],
        cache_key: props.cacheKeyRef?.current,
      });
      data.mapped_stores_count = l_noOfStores?.data[0]?.store_code?.length;
      data.mapped_stores = l_noOfStores?.data[0]?.store_code;
      data.intersected_stores = data.mapped_stores;
      data.aps = res.data?.data?.[0]?.aps
      // Retain a user-edited WOS across store group changes (same as Avg Max).
      if (!data.isWosEdited) {
        data.wos = res.data?.data?.[0]?.wos
          ? res.data?.data?.[0]?.wos
          : props.isStoreBand
          ? data.wos
          : 0;
      }
    } catch (err) {
      // let l_storeGroupCodes = data.store_groups?.map((val) => val.value);
      // let l_noOfStores = await getNoofStores(
      //   l_storeGroupCodes,
      //   data.mapped_stores
      // );
      let l_noOfStores = await includesCommonStores(
        storeGroupStoreMap.current,
        data.store_groups,
        data.mapped_stores,
        storesForSelectedStoreFilters?.current
      );
      data.mapped_stores_count = l_noOfStores.length;
      data.intersected_stores = l_noOfStores;
      data.aps = "";
      if (!data.isWosEdited) {
        data.wos = "0";
      }
    } finally {
      await column.gridApi.refreshCells({
        columns: ["aps", "wos", "mapped_stores_count", "intersected_stores"],
      });
      setUpdatedRows((old) => {
        return { ...old, [data.article]: data };
      });
      props.setArticleTableLoader(false);
    }
  };

  const userReserveAsInvSourceHandler = (p_data, p_req) => {
    let columns = [];
    const dcResponse = getInvComponent(p_req);
    p_data.allocated_units = 0;
    p_data.oh = +dcResponse?.rq_map || 0;
    p_data.net_available_inventory = +dcResponse?.rq_map || 0;
    p_data.reserve_quantity = 0;
    // (p_data.demand_type = [
    //   {
    //     label: "Fixed",
    //     value: "Fixed",
    //   },
    // ]),
    //   (columns = articleTableColumn.map((obj) => {
    //     if (
    //       COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE.includes(obj.column_name)
    //     ) {
    //       obj.disabled = setCellsToBeDisabled;
    //     }
    //     return obj;
    //   }));
    // setArticleTableColumn(columns);
  };

  const onSizesBlurHnadler = (data, column) => {
    props.setArticleTableLoader(true);
    let sizes = data.sizes?.map((val) => val.value);
    let l_storeGroupCodes = data.store_groups
      ?.map((val) => val.valueArray || val.value)
      ?.flat();
    let l_upc = sizes?.map((val) => data?.size_upc_map[val]);
    const callApi = async (req, apsReq) => {
      try {
        const [dcResponse, apsResponse] = await Promise.all([
          mutateInventoryCalculations(req),
          props.getApsWos(apsReq),
        ]);
        let apsData = apsResponse?.data?.data[0]?.aps
        let wosData = apsResponse?.data?.data[0]?.wos || 0;
        if (data.inventory_source?.[0]?.value === "reserved") {
          userReserveAsInvSourceHandler(data, req);
        } else {
          data.allocated_units = dcResponse?.allocated_units || 0;
          data.oh = dcResponse?.oh || 0;
          data.oh_oo = dcResponse?.oh_oo || 0;
          data.it = dcResponse?.it || 0;
          data.oh_it = dcResponse?.oh_it || 0;
          data.reserve_quantity = dcResponse?.reserve_quantity || 0;
          data.net_available_inventory =
            dcResponse?.net_available_inventory ?? null;
          data.net_available_inventory_oh =
            dcResponse?.net_available_inventory_oh ?? null;
          data.net_available_inventory_oh_oo =
            dcResponse?.net_available_inventory_oh_oo ?? null;
          data.net_available_inventory_it =
            dcResponse?.net_available_inventory_it ?? null;
          data.net_available_inventory_oh_it =
            dcResponse?.net_available_inventory_oh_it ?? null;
          data.beginning_available_to_allocate_packs_oh_oo =
            dcResponse?.beginning_available_to_allocate_packs_oh_oo || 0;
          data.beginning_available_to_allocate_packs_oh =
            dcResponse?.beginning_available_to_allocate_packs_oh || 0;
          data.beginning_available_to_allocate_eaches_oh =
            dcResponse?.beginning_available_to_allocate_eaches_oh || 0;
          data.beginning_available_to_allocate_eaches_oh_oo =
            dcResponse?.beginning_available_to_allocate_eaches_oh_oo || 0;
        }
        data.aps = apsData;
        // Retain a user-edited WOS across size profile changes (same as Avg Max).
        if (!data.isWosEdited) {
          data.wos = wosData;
        }
        updateNetInventory(data, dcResponse, articleTableGridInstance);
      } catch (e) {
        data.allocated_units = 0;
        data.oh = 0;
        data.oh_oo = 0;
        data.it = 0;
        data.oh_it = 0;
        data.reserve_quantity = 0;
        data.net_available_inventory = 0;
        data.net_available_inventory_oh = 0;
        data.net_available_inventory_oh_oo = 0;
        data.net_available_inventory_it = 0;
        data.net_available_inventory_oh_it = 0;
        data.beginning_available_to_allocate_packs_oh_oo = 0;
        data.beginning_available_to_allocate_packs_oh = 0;
        data.beginning_available_to_allocate_eaches_oh = 0;
        data.beginning_available_to_allocate_eaches_oh_oo = 0;
        data.aps = "";
        if (!data.isWosEdited) {
          data.wos = 0;
        }
        data.user_def_inv_perc = "";
        data.user_def_inv = "";
        data.final_tot_inventory = "";
      } finally {
        //   data.user_def_inv = "";
        //   data.final_tot_inventory = "";
        //   data.user_def_inv_perc = "";
        await column.gridApi.refreshCells({
          columns: [
            "aps",
            "wos",
            "allocated_units",
            "oh",
            "oh_oo",
            "it",
            "oh_it",
            "reserve_quantity",
            "net_available_inventory",
            "net_available_inventory_oh",
            "net_available_inventory_oh_oo",
            "net_available_inventory_it",
            "net_available_inventory_oh_it",
            "beginning_available_to_allocate_packs_oh_oo",
            "beginning_available_to_allocate_packs_oh",
            "beginning_available_to_allocate_eaches_oh",
            "beginning_available_to_allocate_eaches_oh_oo",
            "user_def_inv",
            "final_tot_inventory",
            "user_def_inv_perc",
          ],
        });
        setUpdatedRows((old) => {
          return { ...old, [data.article]: data };
        });
        props.setArticleTableLoader(false);
      }
    };
    let req = {
      size: sizes,
      dc_code: data.dcs?.map((val) => val.value),
      data: data,
      type: props.type,
    };
    let plannedApsReq = {
      store_group_upc_list: [
        {
          store_group_code: l_storeGroupCodes,
          upc: l_upc,
        },
      ],
      cache_key: props.cacheKeyRef?.current,
    };
    callApi(req, plannedApsReq);
  };

  const onDcsBlurHandler = (data, column) => {
    let sizes = data.sizes?.map((val) => val.value);
    const callApi = async (req) => {
      try {
        const dcResponse = mutateInventoryCalculations(req);
        let virtualDcsInv = 0;
        let finalTotalInv = null;
        if (props.isStoreBand) {
          let virtual_Inv = "";
          let selectedDcs = data.dcs?.map((val) => val.value);
          let allDCs = data?.oh_display_map?.NS;
          let oh_virtual_dcs = Object.keys(allDCs).filter(
            (key) => allDCs[key].is_virtual
          );
          oh_virtual_dcs = oh_virtual_dcs.map((item) => Number(item));

          selectedDcs.forEach((dcCode) => {
            if (oh_virtual_dcs.indexOf(dcCode) > -1) {
              let linked_code = allDCs[dcCode].linked_store_code;
              Object.keys(allDCs).forEach((key) => {
                if (
                  allDCs[key].linked_store_code === linked_code &&
                  !allDCs[key].is_virtual &&
                  selectedDcs.indexOf(Number(key)) === -1
                ) {
                  virtualDcsInv = virtualDcsInv + allDCs[dcCode].oh;
                }
              });
            }
          });
        }
        if (data.inventory_source?.[0]?.value === "reserved") {
          userReserveAsInvSourceHandler(data, req);
        } else {
          data.allocated_units = dcResponse?.allocated_units;
          data.oh = dcResponse?.oh + virtualDcsInv;
          data.oh_oo = dcResponse?.oh_oo + virtualDcsInv;
          data.it = dcResponse?.it + virtualDcsInv;
          data.oh_it = dcResponse?.oh_it + virtualDcsInv;
          data.net_available_inventory =
            dcResponse?.net_available_inventory + virtualDcsInv;
          data.net_available_inventory_oh =
            dcResponse?.net_available_inventory_oh + virtualDcsInv;
          data.net_available_inventory_oh_oo =
            dcResponse?.net_available_inventory_oh_oo + virtualDcsInv;
          data.net_available_inventory_it =
            dcResponse?.net_available_inventory_it + virtualDcsInv;
          data.net_available_inventory_oh_it =
            dcResponse?.net_available_inventory_oh_it + virtualDcsInv;
          data.reserve_quantity = dcResponse?.reserve_quantity;
          data.beginning_available_to_allocate_packs_oh_oo =
            dcResponse?.beginning_available_to_allocate_packs_oh_oo +
            virtualDcsInv;
          data.beginning_available_to_allocate_packs_oh =
            dcResponse?.beginning_available_to_allocate_packs_oh +
            virtualDcsInv;
          data.beginning_available_to_allocate_eaches_oh =
            dcResponse?.beginning_available_to_allocate_eaches_oh +
            virtualDcsInv;
          data.beginning_available_to_allocate_eaches_oh_oo =
            dcResponse?.beginning_available_to_allocate_eaches_oh_oo +
            virtualDcsInv;
          await column.gridApi.refreshCells({
            columns: [
              "allocated_units",
              "oh",
              "oh_oo",
              "it",
              "oh_it",
              "net_available_inventory",
              "net_available_inventory_oh",
              "net_available_inventory_oh_oo",
              "net_available_inventory_it",
              "net_available_inventory_oh_it",
              "reserve_quantity",
              "beginning_available_to_allocate_packs_oh_oo",
              "beginning_available_to_allocate_packs_oh",
              "beginning_available_to_allocate_eaches_oh",
              "beginning_available_to_allocate_eaches_oh_oo",
            ],
          });
        }
        updateNetInventory(
          data,
          dcResponse,
          articleTableGridInstance,
          finalTotalInv
        );
      } catch (e) {
        data.allocated_units = 0;
        data.oh = 0;
        data.oh_oo = 0;
        data.it = 0;
        data.oh_it = 0;
        data.net_available_inventory = 0;
        data.net_available_inventory_oh = 0;
        data.net_available_inventory_oh_oo = 0;
        data.net_available_inventory_it = 0;
        data.net_available_inventory_oh_it = 0;
        data.reserve_quantity = 0;
      } finally {
        // data.user_def_inv = "";
        // data.final_tot_inventory = "";
        // data.user_def_inv_perc = "";
        if (data.oh_oo !== undefined) {
          //commented unwanted assignment for CB usecase fix
          // req.data.oh_map = req.data.oh_oo_map;
          const dcResponse2 = mutateInventoryCalculations(req);
          // data.oh_oo = dcResponse2?.oh;
          if (dcResponse2.oh_oo) {
            data.oh_oo = dcResponse2?.oh_oo;
          }
        }
        await column.gridApi.refreshCells({
          columns: [
            "allocated_units",
            "oh",
            "oh_oo",
            "it",
            "oh_it",
            "net_available_inventory",
            "net_available_inventory_oh",
            "net_available_inventory_oh_oo",
            "net_available_inventory_it",
            "net_available_inventory_oh_it",
            // "user_def_inv",
            "final_tot_inventory",
            "user_def_inv_perc",
            "reserve_quantity",
          ],
        });
        setUpdatedRows((old) => {
          return { ...old, [data.article]: data };
        });
      }
    };
    if (sizes.length) {
      let req = {
        size: sizes,
        dc_code: data.dcs?.map((val) => val.value),
        data: data,
        type: props.type,
      };
      callApi(req);
    }
  };

  const onReserveBlurHandler = (data, column) => {
    let sizes = data.sizes?.map((val) => val.value);
    let columns = [];
    const callApi = async (req) => {
      try {
        const dcResponse = getInvComponent(req);
        data.allocated_units = 0;
        data.oh = +dcResponse?.rq_map || 0;
        data.net_available_inventory = +dcResponse?.rq_map || 0;
        data.reserve_quantity = 0;
        data.demand_type = [
          {
            label: "Fixed",
            value: "Fixed",
          },
        ];
        columns = articleTableColumn.map((obj) => {
          if (
            COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE.includes(obj.column_name)
          ) {
            obj.disabled = setCellsToBeDisabled;
          }
          return obj;
        });
        setArticleTableColumn(columns);
        if (props.articleTableColumnRefData) {
          props.articleTableColumnRefData.current = columns;
        }
        updateNetInventory(data, dcResponse, articleTableGridInstance);
      } catch (e) {
        data.allocated_units = 0;
        data.oh = 0;
        data.it = 0;
        data.oh_it = 0;
        data.net_available_inventory = 0;
        data.net_available_inventory_oh = 0;
        data.net_available_inventory_oh_oo = 0;
        data.net_available_inventory_it = 0;
        data.net_available_inventory_oh_it = 0;
        data.reserve_quantity = 0;
      } finally {
        await column.gridApi.refreshCells({
          columns: [
            "allocated_units",
            "oh",
            "it",
            "oh_it",
            "net_available_inventory",
            "net_available_inventory_oh",
            "net_available_inventory_oh_oo",
            "net_available_inventory_it",
            "net_available_inventory_oh_it",
            "reserve_quantity",
            "demand_type",
            "user_def_inv",
            "user_def_inv_perc",
          ],
        });
        setUpdatedRows((old) => {
          return { ...old, [data.article]: data };
        });
      }
    };
    if (sizes.length) {
      let req = {
        size: sizes,
        dc_code: data.dcs?.map((val) => val.value),
        data: data,
      };
      callApi(req);
    }
  };
  const arraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.slice().sort().toString() === arr2.slice().sort().toString();
  };

  const onBlur = async (
    _e,
    data,
    column,
    isChanged,
    val,
    initialVal,
    cellData,
    initVal,
    previousValue
  ) => {
    data.rowEdited = true;
    articleTableGridInstance.current.api.refreshCells({
      columns: ["wos"],
    });
    if (column.colId === "allocation_strategy") {
      articleTableGridInstance.current.api.refreshCells({
        columns: ["allocation_strategy"],
      });
    }
    if (column.colId === "prioritization_strategy") {
      articleTableGridInstance.current.api.refreshCells({
        columns: ["prioritization_strategy"],
      });
    }
    if (column.colId === "min_stock") {
      if (data.min_stock > data.min_stock_validator) {
        data.min_stock = data.min_stock_validator;
        displaySnackMessages(
          "Min/Max values are adjusted to ensure Min is not greater than Max",
          "error"
        );
      }
      data.max_stock_validator = data.min_stock;
      articleTableGridInstance.current.api.refreshCells({
        rowNodes: [cellData.node],
        force: true,
        columns: ["min_stock"],
      });
      data.isMinEdited = true;
    }
    if (column.colId === "max_stock") {
      if (data.max_stock < data.max_stock_validator) {
        data.max_stock = data.max_stock_validator;
        displaySnackMessages(
          "Min/Max values are adjusted to ensure Min is not greater than Max",
          "error"
        );
      }
      data.min_stock_validator = data.max_stock;
      articleTableGridInstance.current.api.refreshCells({
        rowNodes: [cellData.node],
        force: true,
        columns: ["max_stock"],
      });
      data.isMaxEdited = true;
    }
    props.setIsValidDraft(false);
    setUpdatedRows((old) => {
      return { ...old, [data.article]: data };
    });
    if (column.colId === "inventory_source") {
      if (data.inventory_source?.[0]?.value === "reserved")
        onReserveBlurHandler(data, column);
      else onDcsBlurHandler(data, column);
    }
    if (column.colId === "child_skus") {
      onDcsBlurHandler(data, column);
    }
    if (column.colId === "store_groups") {
      let allNewSg = val.map((item) => item.value);
      let allOldSg = previousValue.map((item) => item.value);

      if (!arraysEqual(allOldSg, allNewSg)) {
        onStoreGroupBlurHandler(data, column);
      }
      articleTableGridInstance?.current?.api.redrawRows();
    }
    if (isChanged) {
      if (column.colId === "sizes") {
        // onSizesBlurHnadler already refreshes user_def_inv fields with updated inventory data
        // No need to clear them here as it would cause fields to render with stale max constraints
        await onSizesBlurHnadler(data, column);
      }
      if (column.colId === "dcs") {
        onDcsBlurHandler(data, column);
        data.user_def_inv = "";
        data.user_def_inv_perc = "";
        data.final_tot_inventory = null;
        if (props?.createAllocationProps?.isDynamicDCoptions) {
          // for levis case
          data = updateVIRAndIOB(data, val);
          articleTableGridInstance.current.api.refreshCells({
            columns: ["vir_pdu_remaining", "iob"],
          });
        }
      }
      if (props.createSceanrio) {
        if (column.colId === "demand_type" && data.demand_type !== "Fixed") {
          data.user_def_inv_perc = "";
          data.final_tot_inventory = "";
          const l_node =
            cellData?.node ||
            articleTableGridInstance.current.api.getRowNode(data.style);
          if (l_node) {
            articleTableGridInstance.current.api.redrawRows({
              rowNodes: [l_node],
            });
          }
        }
        const currentEditedDataList = editedStyleDataList.current;
        const existingItemIndex = currentEditedDataList.findIndex(
          (item) => item.style === data.product_code
        );

        // to create apply payload based on BE request
        let changedField = {};
        if (column.colId === "product_profiles") {
          changedField["product_profile_selected"] =
            data.product_profiles?.length > 0
              ? data.product_profiles[0].value
              : "";
        } else if (column.colId === "user_def_inv_perc") {
          changedField["fixed_inventory"] = data.final_tot_inventory;
          if (!changedField?.demand_type) {
            changedField["demand_type"] = "Fixed";
          }
        } else if (column.colId === "final_tot_inventory" || column.colId === "user_def_inv") {
          changedField["fixed_inventory"] = data.final_tot_inventory || data.user_def_inv;
          if (!changedField?.demand_type) {
            changedField["demand_type"] = "Fixed";
          }
        } else {
          changedField[column.colId] = data[column.colId];
        }

        if (existingItemIndex !== -1) {
          const updatedList = [...currentEditedDataList];
          updatedList[existingItemIndex] = {
            ...updatedList[existingItemIndex],
            ...changedField,
          };

          // Handle fixed_inventory deletion for IA demand type
          if (
            column.colId === "demand_type" &&
            data.demand_type === "IA" &&
            updatedList[existingItemIndex].hasOwnProperty("fixed_inventory")
          ) {
            delete updatedList[existingItemIndex].fixed_inventory;
          }

          editedStyleDataList.current = updatedList;
        } else {
          editedStyleDataList.current = [
            ...currentEditedDataList,
            {
              style: data.product_code,
              ...changedField,
            },
          ];
        }
      }
    }
  };

  const setCellsToBeDisabled = (row, item) => {
    let l_demandType = Array.isArray(row?.demand_type)
      ? row?.demand_type?.[0]?.value
      : row?.demand_type;
    if (item.accessor === "aps") {
      return l_demandType !== "APS" ? true : false;
    } else if (
      COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE?.includes(item.accessor)
    ) {
      return l_demandType !== "Fixed" ? true : false;
    } else if (props.createSceanrio && item.accessor === "final_tot_inventory") {
      return l_demandType !== "Fixed" ? true : false;
    }
  };
  useEffect(() => {
    selectedScenarioProductData.current = props.selectedPrductData;
    articleTableGridInstance?.current?.api.refreshCells({ force: true });
    articleTableGridInstance?.current?.api.redrawRows();
  }, [props.selectedPrductData]);

  const getCellStyle = (params) => {
    if (selectedScenarioProductData?.current) {
      return {
        pointerEvents: "none",
        opacity: 0.5,
      };
    }
    return {};
  };

  const checkSceanrioRequest = async (param) => {
    // let cols = articleTableColumn.map((item) => {
    //   item.is_editable = false;
    //   return item;
    // });
    // let l_articlecolumns = agGridColumnFormatter(cols, null, actionMap);
    // setArticleTableColumn(l_articlecolumns);
    props.updateStyle(param);
  };
  useEffect(() => {
    const fetchColumnData = async () => {
      if (!props.createSceanrio) {
        props.setArticleTableLoader(true);
        const placeholderColumns = [
          {
            column_name: "article",
            label: "Article",
          },
        ];
        if (!props.isStoreBand) {
          let filters = filterDependency?.current || props.selectedFilters || [];
          let body = {
            channel: filters
              .filter(
                (val) =>
                  val.attribute_name === "l1_name" ||
                  val.attribute_name === "channel"
              )
              .map((opt) => opt.values)?.[0],
            country: filters
              .filter((val) => val.attribute_name === "l0_name")
              .map((opt) => opt.values)?.[0],
          };
          body.channel = body?.channel?.[0];
          body.country = body?.country?.[0];
          try {
            let { data: storeOptions } = await props.getStoreGroupOptions(body);
            storeGroupStoreMap.current = storeOptions.data;
          } catch (err) {
            console.error("Error fetching store group options:", err);
          }
        }
        setArticleTableColumn(placeholderColumns);
        if (props.articleTableColumnRefData) {
          props.articleTableColumnRefData.current = placeholderColumns;
        }
        articleTableColumns.current = placeholderColumns;
        offset.current = 0;
        setRender(true);
        hasCompletedInitialFetch.current = true;
        isInitialMount.current = false;
        return;
      }

      props.setArticleTableLoader(true);
      let tableName = "cnx_scenario_style_table";
      let l_response = await props.getColumn(tableName);
      let updateStrategyColsInSetAll = false;
      const columnConfigTypeForGetColumn =
        props.newStoreAlert === "pdq" ||
        props.popUpLinkFromDashbaord === "pdq_alert"
          ? "pdq"
          : props.type;
      let l_updatedTableConfig = getUpdatedColumnConfig(
        l_response.data.data,
        props.poCode,
        columnConfigTypeForGetColumn,
        props.asnCode
      );
      let validatorMinMax = false;
      if (!props.isStoreBand) {
        let body = {
          channel: filterDependency.current
            .filter(
              (val) =>
                val.attribute_name === "l1_name" ||
                val.attribute_name === "channel"
            )
            .map((opt) => opt.values)?.[0],
          country: filterDependency.current
            .filter((val) => val.attribute_name === "l0_name")
            .map((opt) => opt.values)?.[0],
        };

        body.channel = body?.channel?.[0];
        body.country = body?.country?.[0];
        
        // Set loader for getStoreGroupOptions call
        setStoreGroupOptionsLoader(true);
        try {
          let { data: storeOptions } = await props.getStoreGroupOptions(body);
          storeGroupStoreMap.current = storeOptions.data;
          l_updatedTableConfig = l_updatedTableConfig.map((item) => {
            if (item.column_name === "store_groups") {
              item.extra = { ...item.extra, is_multi: true, dropdownSearchable: true, sortSelectedToTop: true };
              item.type = "list";
              item.isMulti = true;
              item.options = storeOptions.data;
            }
            if (props.createSceanrio && item.column_name === "style") {
              item.type = "link";
              item.is_editable = true;
              item.onClick = checkSceanrioRequest;
            }
          if (item.column_name === "min_stock") {
            validatorMinMax = true;
          }
          if (
            item.column_name === "allocation_strategy" ||
            item.column_name === "prioritization_strategy"
          ) {
            updateStrategyColsInSetAll = true;
          }
          if (item.column_name === "vir_constraint") {
            setVIRConstraintOptions(item.extra?.options || []);
          }
          return item;
        });
        } catch (error) {
          console.error("Error fetching store group options:", error);
        } finally {
          setStoreGroupOptionsLoader(false);
        }
      }

      let l_articlecolumns = agGridColumnFormatter(
        l_updatedTableConfig,
        null,
        actionMap
      );
      let l_columnsWithDisablekey = l_articlecolumns.map((obj) => {
        if (obj.column_name === "aps") {
          obj.disabled = setCellsToBeDisabled;
        }
        if (
          COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE.includes(obj.column_name)
        ) {
          obj.disabled = setCellsToBeDisabled;
        }
        if (props.createSceanrio && obj.column_name === "final_tot_inventory") {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      const updatedColumnsDef = l_columnsWithDisablekey.map((item, index) => {
        if (item?.column_name === "product_image_link") {
          item.cellRenderer = (cellProps) => {
            return ImageCellRenderer(cellProps, false, false);
          };
        }
        if (item.column_name !== "style" && props.createSceanrio) {
          item.cellStyle = getCellStyle;
        }
        if (item.column_name === "allocation_strategy") {
          // Generic Implementation to remove "mins_only" as Allocation Strategy option.
          // when demand_type is "Fixed" or "Aps"
          delete item["options"];
          item.cellRenderer = (cellProps, extraProps) => {
            let filteredOptions = cellProps?.data?.allocation_strategy_options.filter(
              (thisOpt) => {
                return thisOpt.value !== "mins_only";
              }
            );
            // On initial load demand_type is object but once value is changed it becomes string
            let demandType =
              cellProps?.data?.demand_type[0]?.label ||
              cellProps?.data?.demand_type;
            let options = ["APS", "Fixed"].includes(demandType)
              ? filteredOptions
              : cellProps?.data?.allocation_strategy_options;
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
                options={options}
              ></CellRenderers>
            );
          };
        }
        return item;
      });
      setMinMaxValidator(validatorMinMax);
      setArticleTableColumn(updatedColumnsDef);
      if (props.articleTableColumnRefData) {
        props.articleTableColumnRefData.current = updatedColumnsDef;
      }
      showStrategyColsInSetAll(updateStrategyColsInSetAll);
      articleTableColumns.current = l_columnsWithDisablekey;
      offset.current = 0;
      scrollIntoView(articleTableRef);
      setRender(true);
      hasCompletedInitialFetch.current = true;
      isInitialMount.current = false;
    };
    const fetchStoreGroupStoreMap = async () => {
      if (!isEmpty(props.selectedFilters)) {
        const filters = props.selectedFilters;
        // let l_storeGroupStoreMap = await props.getStoreGroupStoreMap({
        //   channel: filters.filter((val) => val.attribute_name === "channel"),
        //   filters: filters,
        //   application_code: 1,
        // });
        // storeGroupStoreMap.current = l_storeGroupStoreMap?.data?.data;
        setRender(true);
      }
    };

    const fetchSetAllDcs = async () => {
      let l_setAllDcsResponse = await props.getSetAllDcs();

      let l_setAllDcsOptions = l_setAllDcsResponse?.data?.data?.map((dcs) => {
        return {
          label: dcs.name,
          value: dcs.dc_code,
          id: dcs.dc_code,
        };
      });
      setSetAllDcs(l_setAllDcsOptions);
    };

    (async () => {
      let l_defaultStoreGroupCode = await props.getTenantConfigApplicationLevel(
        1,
        {
          attribute_name: "default_store_groups",
        }
      );
      defaultStoreGroupCode.current = l_defaultStoreGroupCode?.data?.data;
    })();
    setChannel(
      props.selectedFilters?.filter(
        (filter) => filter.attribute_name === customChannelKey
      )?.[0]?.values?.[0]
    );
    fetchSetAllDcs();
    // fetchStoreGroupStoreMap is called inside fetchColumnData, no need to call twice
    // fetchStoreGroupStoreMap();
    fetchColumnData();
    setShowStoreandDc(false);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      hasCalledStoreGroupOptions.current = false;
      hasCalledReviewStoreAndDC.current = false;
      hasCompletedInitialFetch.current = false;
      isInitialMount.current = true;
      columnsInitializedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (props.backButtonClicked && articleDataMounted && !hasCalledReviewStoreAndDC.current) {
      hasCalledReviewStoreAndDC.current = true;
      setTimeout(() => {
        reviewStoreAndDC({ manual: false });
      }, 3000);
    }
  }, [props.backButtonClicked, articleDataMounted]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const getIsValidDraft = () => {
    if (props.backButtonClicked) {
      return {
        is_draft: props.isValidDraft,
        allocation_id: new URLSearchParams(window.location.search).get(
          "allocation_code"
        ),
      };
    }
  };
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setArticleTableLoader(true);

    try {
      //Using the redux store data if user has been redirected to Create Allocation from different page
      let selectedFilters = filterDependency?.current
        ? filterDependency?.current
        : [...props.selectedFilters];
      if (props.isRedirectedFromDifferentPage && props.createAllocationArticles?.length > 0) {
        let articleFilter = tableArticleFilter;
        if (props.alertsUniqueIdNavigationKey) {
          articleFilter.attribute_name = props.alertsUniqueIdNavigationKey;
        } else if (props.isStoreBand) {
          articleFilter.attribute_name = "primary_sku";
        } else {
          articleFilter.attribute_name = "style";
        }
        articleFilter.values = props.createAllocationArticles;
        selectedFilters = selectedFilters.filter(
          (item) => item.attribute_name !== "style"
        );
        selectedFilters = [...selectedFilters, articleFilter];
      }
      if (props.customl0nameFilter) {
        let lonameFilter = {
          filter_type: "cascaded",
          attribute_name: "l0_name",
          operator: "in",
          dimension: "Product",
          values: [props.customl0nameFilter],
        };
        selectedFilters = [...selectedFilters, lonameFilter];
      }
      if (!isEqual(manualBodyRef.current, manualbody)) {
        offset.current = 0;
        // skipList.current = [];
      }
      // let session_id = sessionStorage.getItem("session_id");
      let alloc_type = null;

      // Modify selectedFilters to change attribute_name to "channel" if it equals props?.customChannelKey (if it exists)
      if (props?.customChannelKey) {
        const index = selectedFilters.findIndex(
          (filter) => filter.attribute_name === props.customChannelKey
        );
        if (index !== -1) {
          selectedFilters = [...selectedFilters];
          selectedFilters[index] = {
            ...selectedFilters[index],
            attribute_name: "channel",
          };
        }
      }

      let body = {
        filters: selectedFilters,
        // session_id: session_id,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1, offset: offset?.current },
        },
        channel:
          selectedFilters?.filter(
            (filter) => filter.attribute_name === "channel"
          )[0]?.values[0] || "",
        selection: articleTableGridInstance?.current?.api?.checkConfiguration,
        po_id: props.poCode ? [props.poCode] : props.poCode,
        filtered_selection: !isEmpty(props.filteredSelection)
          ? props.filteredSelection
          : [],
        popupLink: props.popUpLinkFromDashbaord,
        redirectionFrom: props.type,
        // skip_list: skipList?.current,
        ...getIsValidDraft(),
        cache_key: props.cacheKeyRef?.current,
      };
      if (props.poCode) {
        body.alloc_type = "po";
      }
      if (props.asnCode) {
        body.alloc_type = "asn";
        body.asn_id = [props.asnCode];
      }
      if (props.alloc_type) {
        body.alloc_type = props.alloc_type;
      }
      if (props.newStoreAlert) {
        body.alloc_type = props.newStoreAlert;
      }
      if (props.popUpLinkFromDashbaord === "pdq_alert") {
        body.alloc_type = "pdq";
      }
      alloc_type = body.alloc_type;
      if (!isEmpty(body?.meta?.range)) {
        body?.meta?.range?.forEach((thisRange) => {
          if (thisRange?.column === "clearance_date") {
            thisRange.column = "planned_clearance_date";
          }
        });
      }
      let response = await props.getAllocate(body);
      // may required in future for optimization
      // if (props.articleTableGlobalInstance?.current?.length && pageIndex === 0) {
      //   // Use cached data only for the first page (pageIndex === 0)
      //   response = props.articleTableGlobalInstance.current;
      //   return {
      //     data: response,
      //   };
      // } else {
      //   // Make API call for pagination (pageIndex > 0) or when no cached data
      //   response = await props.getAllocate(body);
      // }
      // response = await props.getAllocate(body);
      // if (props.articleTableGlobalInstance?.current?.length) {
      //   return {
      //     data: response,
      //   };
      // }

      if (response?.data?.status) {
        if (
          !props.createSceanrio &&
          response?.data?.data?.columns?.length &&
          !columnsInitializedRef.current
        ) {
          columnsInitializedRef.current = true;
          let updateStrategyColsInSetAll = false;
          let validatorMinMax = false;
          const columnConfigType =
            body.alloc_type === "pdq"
              ? "pdq"
              : props.type;
          let l_updatedTableConfig = getUpdatedColumnConfig(
            response?.data?.data?.columns,
            props.poCode,
            columnConfigType,
            props.asnCode
          );
          if (!props.isStoreBand) {
            // Use store options already fetched in initial load
            const storeOptionsData = storeGroupStoreMap.current;
            l_updatedTableConfig = l_updatedTableConfig.map((item) => {
              if (item.column_name === "store_groups") {
                item.extra = { ...item.extra, is_multi: true, dropdownSearchable: true, sortSelectedToTop: true };
                item.type = "list";
                item.isMulti = true;
                item.options = storeOptionsData ?? [];
              }
              if (item.column_name === "min_stock") validatorMinMax = true;
              if (
                item.column_name === "allocation_strategy" ||
                item.column_name === "prioritization_strategy"
              ) {
                updateStrategyColsInSetAll = true;
              }
              if (item.column_name === "vir_constraint") {
                setVIRConstraintOptions(item.extra?.options || []);
              }
              return item;
            });
          }
          let l_articlecolumns = agGridColumnFormatter(
            l_updatedTableConfig,
            null,
            actionMap
          );
          let l_columnsWithDisablekey = l_articlecolumns.map((obj) => {
            if (obj.column_name === "aps") obj.disabled = setCellsToBeDisabled;
            if (
              COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE.includes(obj.column_name)
            ) {
              obj.disabled = setCellsToBeDisabled;
            }
            return obj;
          });
          const updatedColumnsDef = l_columnsWithDisablekey.map((item) => {
            if (item?.column_name === "product_image_link") {
              item.cellRenderer = (cellProps) => {
                return ImageCellRenderer(cellProps, false, false);
              };
            }
            if (item.column_name === "allocation_strategy") {
              delete item["options"];
              item.cellRenderer = (cellProps, extraProps) => {
                let filteredOptions = cellProps?.data?.allocation_strategy_options?.filter(
                  (thisOpt) => thisOpt.value !== "mins_only"
                );
                let demandType =
                  cellProps?.data?.demand_type?.[0]?.label ||
                  cellProps?.data?.demand_type;
                let options = ["APS", "Fixed"].includes(demandType)
                  ? filteredOptions
                  : cellProps?.data?.allocation_strategy_options;
                return (
                  <CellRenderers
                    cellData={cellProps}
                    column={item}
                    extraProps={extraProps}
                    options={options}
                  />
                );
              };
            }
            return item;
          });
          setMinMaxValidator(validatorMinMax);
          setArticleTableColumn(updatedColumnsDef);
          if (props.articleTableColumnRefData) {
            props.articleTableColumnRefData.current = updatedColumnsDef;
          }
          showStrategyColsInSetAll(updateStrategyColsInSetAll);
          articleTableColumns.current = l_columnsWithDisablekey;
        }
        response.data.data.data = response?.data?.data?.data?.map((articleData) => {
          articleData.store_groups_options = articleData.store_groups;
          if (articleData?.available_stores_perc > -1) {
            articleData.available_stores_perc = `${articleData.available_stores_perc}%`;
          }

          return articleData;
        });
        let l_userSelectedStores = response.data?.data?.data?.user_selected_stores;
        let l_updatedRows =
          articleTableGridInstance?.current?.api?.updatedRows || null;
        let l_responseData = response?.data?.data?.data?.map((item) => {
          if (props.isStoreBand && item.oh_display_map) {
            let nsValue = JSON.parse(JSON.stringify(item.oh_display_map?.NS));

            Object.keys(item.oh_display_map?.NS).forEach((key) => {
              if (!item.oh_display_map.NS[key].is_virtual) {
                nsValue[key] = item.oh_display_map.NS[key].oh;
              }
            });
            item.oh_map.NS = nsValue;
          }
          return item;
        });
        l_responseData = agGridRowFormatter(
          response?.data?.data?.data || [],
          props.articleAgGridParams?.selection,
          `article`
        );
        if (props.isStoreBand) {
          storeGroupStoreMap.current = l_responseData[0]?.store_groups_options;
        }
        let l_updatedResponse;
        l_responseData = mutateStoreGroupCode(
          l_responseData,
          defaultStoreGroupCode.current?.[0]?.attribute_value,
          props.poCode,
          articleTableColumns,
          props.type
        );
        if (l_updatedRows && l_responseData.length)
          l_updatedResponse = getUpdatedRows(
            l_responseData,
            l_updatedRows,
            storeGroupStoreMap.current,
            l_userSelectedStores
          );
        else
          l_updatedResponse = addMinMaxforUserDefinedInv(
            l_responseData,
            storeGroupStoreMap.current,
            l_userSelectedStores
          );

        l_updatedResponse = l_updatedResponse.map((item) => {
          item.intersected_stores = item.mapped_stores;
          item.alloc_type = alloc_type ? alloc_type : "default";
          if (props.asnCode) {
            item.asn_id = props.asnCode ? [props.asnCode] : "default";
          }

          if (item.user_def_inv_perc) {
            item.final_tot_inventory = onlySpaces(item.user_def_inv_perc)
              ? null
              : Math.round(
                  +(item.net_available_inventory * item.user_def_inv_perc) / 100
                );
          }
          return item;
        });
        if (response?.data?.show_message) {
          displaySnackMessages(response.data?.message, "success");
        }
        !articleDataMounted && setArticleDataMounted(true);
        storesForSelectedStoreFilters.current = l_userSelectedStores;
        manualBodyRef.current = manualbody;
        // skipList.current = l_responseData?.map((val) => val.ph_code);
        offset.current = response?.data?.offset;
        if (
          props.articleTableGlobalInstance?.current?.length > 0 &&
          l_updatedResponse.length > 0 &&
          props.articleTableColumnRefData?.current?.length > 0
        ) {
          // article key is unique column as per the api, present for all clients (discussed with BE)
          let uniqueColumn = "article";
          l_updatedResponse = l_updatedResponse.map((freshItem) => {
            // find matching item in cached data
            const cachedItem = props.articleTableGlobalInstance.current.find(
              (cached) => cached[uniqueColumn] === freshItem[uniqueColumn]
            );
            if (cachedItem) {
              // replace fresh item with cached item
              return { ...freshItem, ...cachedItem };
            }
            return freshItem;
          });
        }
        return {
          data: cloneDeep(l_updatedResponse),
          // totalCount: response.data.total,
        };
      } else {
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
        return {
          data: [],
        };
      }
    } catch (err) {
      handleErrorMessage(err);
      return {
        data: [],
      };
    } finally {
      props.setArticleTableLoader(false);
    }
  };

  const onSelectionChanged = (event) => {
    let l_selections = getSelectedRowsForInfiniteRowModel(event)?.length;

    let l_buttonEnabled = articleTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
  };

  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
    props.backButtonClicked &&
      setCheckAllSetAllRequest(props.articleAgGridParams.setAll);
  };

  const getPreviousSelectedNode = (params) => {
    const articleKey = props.articleKey ? props.articleKey : "article";

    // on click of back button retaining previous selection, going from step 1 to step 0
    if (props.articleTableGlobalInstance?.current?.length > 0) {
      params?.api?.forEachNode((node) => {
        const cachedItem = props.articleTableGlobalInstance.current.find(
          (item) => item.article === node?.data?.[articleKey]
        );
        if (cachedItem && cachedItem.is_selected !== undefined) {
          node.setSelected(cachedItem.is_selected);
        }
      });
      // Reset the back button flag after rehydration
      // props.setBackButtonClicked(false);
      return;
    }

    // Fallback to draft data if no cached selection data
    const selectedRows = [
      ...(props?.draftResult?.displayedAndHiddenCheckedRows?.displayedRows ||
        []),
      ...(props?.draftResult?.displayedAndHiddenCheckedRows?.hiddenRows || []),
    ];
    const draftSelectedArticles =
      selectedRows?.map((item) => item?.[articleKey]) || [];
    params?.api?.forEachNode((node) => {
      // Select if node matches lastSelectedArticle OR matches the current selection
      if (draftSelectedArticles?.includes(node?.data?.[articleKey])) {
        node.setSelected(true);
      } else {
        node.setSelected(false);
      }
    });
  };

  const onCellValueChanged = (params) => {
    const { column, colDef, node, data, newValue } = params;
    if (column.colId === "wos") {
      data.isWosEdited = true;
    }
    if (colDef.column_name === "demand_type") {
      if (props.createSceanrio) {
        data.user_def_inv = "";
        data.user_def_inv_perc = "";
        data.final_tot_inventory = "";
      }
      if (newValue !== "Fixed") {
        data.user_def_inv = "";
        data.user_def_inv_perc = "";
        data.final_tot_inventory = props.createSceanrio ? "" : null;
      }
      if (newValue !== "APS") {
        data.aps = "";
      }
      if (["APS", "Fixed"].includes(newValue)) {
        if (data?.allocation_strategy === "mins_only") {
          // Reset Allocation Strategy to "min_forecast"
          node.setData({ ...node.data, allocation_strategy: "min_forecast" });
        }
      }
      articleTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: [
          "aps",
          "user_def_inv_perc",
          "user_def_inv",
          "final_tot_inventory",
        ],
      });
      // redrawRows recreates the cell editors so a value the user typed into
      // "Fixed Qty To Push" (final_tot_inventory) is cleared on the first
      // demand-type change
      if (props.createSceanrio) {
        articleTableGridInstance.current.api.redrawRows({ rowNodes: [node] });
      }
    }
    if (colDef.column_name === "user_def_inv_perc") {
      debounceRedraw(node);
      data.user_def_inv = "";
      if (data.user_def_inv_perc > 100) {
        data.user_def_inv_perc = 100;
        displaySnackMessages("Please enter values less than 100.", "error");
      } else {
        let finalTotalInv = props.createSceanrio
          ? data.net_available_inventory
          : getAvailableInventory(data);
        // const fixedInv = articleTableColumns.current.find(
        //   (col) => col.column_name === "user_def_inv"
        // );

        data.final_tot_inventory = onlySpaces(data.user_def_inv_perc)
          ? null
          : Math.round(+(finalTotalInv * data.user_def_inv_perc) / 100);
      }
      articleTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: ["user_def_inv", "final_tot_inventory", "user_def_inv_perc"],
      });
    }
    if (colDef.column_name === "inventory_source") {
      debounceRedraw(node);
      data.user_def_inv = "";
      data.user_def_inv_perc = "";
      data.final_tot_inventory = null;
      articleTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: ["user_def_inv_perc", "user_def_inv", "final_tot_inventory"],
      });
    }
    if (colDef.column_name === "user_def_inv" || (props.createSceanrio && colDef.column_name === "final_tot_inventory")) {
      debounceRedraw(node);
      data.user_def_inv_perc = "";
      // may require in future
      // const inventorySourceValue =
      //   Array.isArray(data.inventory_source) && data.inventory_source.length > 0
      //     ? data.inventory_source[0].value
      //     : data.inventory_source;
      // const isOhOoOrPoSource =
      //   inventorySourceValue === "oh_oo" || inventorySourceValue === "po";
      // const availableInventory = isOhOoOrPoSource
      //   ? data.net_available_inventory_oh_oo
      //   : data.net_available_inventory_oh;
      let availableInventory = props.createSceanrio
        ? data.net_available_inventory
        : getAvailableInventory(data);

      if (newValue > availableInventory) {
        data.user_def_inv = availableInventory;
        data.final_tot_inventory = availableInventory;
        displaySnackMessages(
          "Entered value is greater than available quantity so it's set to available quantity",
          "error"
        );
      }
      else {
        data.final_tot_inventory = newValue;
      }
      articleTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: ["user_def_inv", "final_tot_inventory", "user_def_inv_perc"],
      });
    }
  };

  const callBackToSetCheckConfig = (p_checkConfigSetter) => {
    if (!isEmpty(props.articleAgGridParams.prevAction)) {
      p_checkConfigSetter(props.articleAgGridParams.selection);
    }
  };

  useEffect(() => {
    if (articleTableGridInstance?.current) {
      //checkconfig
      articleTableGridInstance.current.api.updatedRows = updatedRows;
      articleTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      articleTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [updatedRows, checkAllSetAllRequest, buttonEnabled]);

  const excludeAllHandler = () => {
    setUncheckableArticles({
      uncheckableRows: articlesWithValidationError?.articlesWithValidationError,
      callBackFunction: setUncheckableArticles,
    });
  };

  const reviewStoreAndDC = async ({ manual, expedited = false }) => {
    setExpeditedFlow(expedited);
    let l_articlesWithValidationError = checkValidationForArticles(
      articleTableGridInstance,
      props.articleKey || "article",
      storeGroupStoreMap?.current,
      storesForSelectedStoreFilters?.current,
      ignoreAlert,
      false,
      props.removeNetDctoAvailableValidation && props.poCode,
      props.allowZeroUserDefinedInventory,
      props.dynamicIaProfile
    );
    if (
      l_articlesWithValidationError?.validationErrorMessage.includes(
        "user reserve"
      )
    ) {
      setIgnoreAlert(true);
    }
    setArticlesWithValidationError(l_articlesWithValidationError);
    if (!l_articlesWithValidationError?.articlesWithValidationError?.length) {
      manual && props.backButtonClicked && props.setBackButtonClicked(false);
      articleTableGridInstance.current.api.buttonClicked = true;
      setShowStoreandDc(Math.random());
    }
    !props.isRedirectedFromDifferentPage &&
      window.scrollTo({
        left: 0,
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
  };
  const getADALink = () => {
    return {
      ADA_VISUAL: ADA_VISUAL_STANDALONE,
      ADA_VISUAL_MFP_DASHBOARD: ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
    };
  };

  const viewIAForecast = () => {
    try {
      // Use the standard AG Grid API method getSelectedRows() to get selected rows
      let l_selectedRows =
        articleTableGridInstance?.current?.api?.getSelectedRows() || [];
      const uniqueAdaRedirectionKey = props?.uniqueAdaRedirectionKey
        ? props?.uniqueAdaRedirectionKey
        : "article";
      if (l_selectedRows.length === 0) {
        displaySnackMessages("Please select at least one article", "error");
      } else {
        try {
          const targetScreen = props?.inventorysmartHiddenModules?.includes(
            MFP_ADA_SCREENNAME
          )
            ? getADALink().ADA_VISUAL
            : getADALink().ADA_VISUAL_MFP_DASHBOARD;

          const dependencyData =
            props.filterDashboardConfiguration[props.filterConfigKey]?.appliedFilterData?.dependencyData || props.filterDependencyData;
          redirectToADA(
            l_selectedRows,
            dependencyData,
            targetScreen,
            uniqueAdaRedirectionKey,
            props.alertsUniqueIdNavigationKey,
            true
          );
        } catch (error) {
          console.error("Error redirecting to ADA:", error);
        }
      }
    } catch (err) {
      displaySnackMessages("Error processing selected rows", "error");
    }
  };

  const reviewForcastHandler = () => {
    let l_checkAllConfig = getPollingRequest(articleTableGridInstance);
    if (l_checkAllConfig?.l_pollingReq?.some((val) => val.checkAll)) {
      displaySnackMessages(CHECKALL_VALIDATION, "error");
    } else {
      setReviewForecast(true);
    }
  };

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (Array.isArray(l_cellValue)) {
      return isNonPrimitiveArray(l_cellValue)
        ? l_cellValue.map((val) => val.label)?.join(" | ")
        : l_cellValue;
    }
    return l_cellValue;
  }, []);

  const processHeaderForClipboard = useCallback((params) => {
    const l_colDef = params.column.getColDef();
    return l_colDef.headerName;
  }, []);

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    if (
      !isEmpty(props.inventorysmartModulesPermission) &&
      !isEmpty(props.module)
    ) {
      return isActionAllowedOnSubModule(
        props.inventorysmartModulesPermission,
        props.module,
        subModuleName,
        action
      );
    }
    return true; //can take action by default
  };
  const checkSetAllBtn = () => {
    if (selectedScenarioProductData?.current) {
      return true;
    } else {
      console.log(
        articleTableGridInstance?.current?.api.getSelectedRows().length,
        buttonEnabled
      );
      return !buttonEnabled;
    }
  };
  const generateDCOptions = () => {
    let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
      articleTableGridInstance.current,
      true
    );
    // Create array of unique DCs from all selected nodes
    const uniqueDCs = l_selectedNodes
      .map((node) => node.data?.dcs_options)
      .flat()
      .filter(
        (dc, index, self) =>
          index === self.findIndex((d) => d.value === dc.value)
      );

    uniqueDCs?.length && setSetAllDcs(uniqueDCs);
    setShowSetAllModal(true);
  };
  const getTopRightOptions = () => {
    let options = [];
    
    if (articleTableGridInstance.current?.api?.getSelectedRows()?.length > 0) {
      options = [
        <Button
          variant="secondary"
          size="large"
          className={classes.setAllButton}
          disabled={
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_ALLOCATION_STORE_TABLE,
              "edit"
            ) || !buttonEnabled
          }
          onClick={() =>
            props?.createAllocationProps?.isDynamicDCoptions
              ? generateDCOptions()
              : setShowSetAllModal(true)
          }
        >
          Set all
        </Button>,
        <Button
          variant="primary"
          size="large"
          className={classes.reviewForecastButton}
          disabled={!buttonEnabled}
          onClick={() => props.createAllocationProps?.hideReviewForecastPanel ? reviewForcastHandler() : setShowReviewForecast(true)}
        >
          Review forecast
        </Button>,
      ];
    }
    
    options = props.createSceanrio
      ? [
          <Button
            variant="secondary"
            size="large"
            className={classes.setAllButton}
            disabled={
              props.selectedPrductData
                ? true
                : articleTableGridInstance?.current?.api?.getSelectedRows()
                    ?.length > 0
                ? false
                : true
            }
            onClick={() => setShowSetAllModal(true)}
          >
            Set all
          </Button>,
          <Button
            variant="primary"
            size="large"
            // disabled={!buttonEnabled}
            onClick={() => {
              handleApplyInCreateScenario();
            }}
          >
            Apply
          </Button>,
        ]
      : options;

    return options;
  };

  function handleApplyInCreateScenario() {
    if (!editedStyleDataList.current.length) {
      displaySnackMessages(
        "Please edit any style details then click on Apply button",
        "error"
      );
      return;
    }

    let hasValidationError = false;

    const processedPayload = editedStyleDataList.current.map((item) => {
      const newItem = { ...item };
      if (item.demand_type === "IA") {
        if (newItem.hasOwnProperty("fixed_inventory")) {
          delete newItem.fixed_inventory;
        }
      } else if (item.demand_type === "Fixed") {
        // If fixed_inventory is missing in the payload, resolve it from row data
        if (
          !item.fixed_inventory ||
          item.fixed_inventory === 0 ||
          item.fixed_inventory === "0"
        ) {
          const rowData = sceanrioTableData.find(
            (row) => row.product_code === item.style
          );
          const resolvedValue =
            rowData?.final_tot_inventory || rowData?.user_def_inv;
          if (resolvedValue && resolvedValue !== 0 && resolvedValue !== "0") {
            newItem.fixed_inventory = resolvedValue;
          } else {
            hasValidationError = true;
          }
        }
      }

      return newItem;
    });

    if (hasValidationError) {
      const errorMessage = "Please enter a valid fixed inventory";

      displaySnackMessages(errorMessage, "error");
      return;
    }

    props.onApply(processedPayload, "style");
  }

  const promptPrimaryBtn = () => {
    viewIAForecast();
    setReviewForecast(false);
  };
  const promptSecondaryBtn = () => {
    setReviewForecast(false);
  };
  useEffect(() => {
    if (props.createSceanrio) {
      manualCallBackForScenario();
    }
  }, [props.createSceanrio]);
  const manualCallBackForScenario = async (body, pageIndex) => {
    try {
      let reqBody = {
        scenario_id: props.scenarioId,
        level: "style",
        styles: props.articleIds,
      };
      props.setSaveDisabled(true);

      let { data } = await props.getScenarioInputs(reqBody);
      props.setArticleTableLoader(false);
      const processedInputs = (data.data.inputs || []).map((row) => {
        if (row.demand_type !== "Fixed") {
          return { ...row, user_def_inv_perc: "", final_tot_inventory: "" };
        }
        return row;
      });
      setSceanrioTableData(processedInputs);
      if (data.data.inputs && data.data.inputs.length > 0) {
        const styleList = data.data.inputs.map((item) => item.product_code);
        props.setStyleList(styleList);
      }

      props.setSaveDisabled(false);
      // return { data: data.data.inputs };
    } catch (err) {
      props.setSaveDisabled(false);
      props.setArticleTableLoader(false);

      console.log("🚀 ~ manualCallBackForScenario ~ err:", err);
      return { data: [] };
    }
  };
  const setTableType = () => {
    if (props.createSceanrio) {
      return {
        pagination: false,
        // rowModelType: "clientSide",
        // hideSelectCurrentPageRecords: true,
      };
    } else {
      if (
        props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
          "strategy__article__details"
        )
      ) {
        return {
          pagination: false,
          rowModelType: "infinite",
          cacheOverflowSize: 2,
          hideSelectCurrentPageRecords: true,
        };
      }
    }
    return {
      rowModelType: "serverSide",
      serverSideStoreType: "partial",
    };
  };
  
  const getTopLeftOptions = () => {
    return (
      <Tooltip
        title="Updating constraints here will override all store-size constraints for this style-color. Click any style-color id to view/edit store-specific constraints.."
        orientation="bottom-end"
        variant="tertiary"
      >
        <InfoOutlinedIcon
          color="primary"
          className="new-primary-color-svg"
          fontSize="small"
        />
      </Tooltip>
    );
  };  

  return (
    <>
      <>
        <Loader loader={props.articleTableLoader || storeGroupOptionsLoader} minHeight={350}>
          <div className={classes.paddingBottom2rem}>
            {render && articleTableColumn?.length > 0 && (
              <div
                ref={articleTableRef}
                className={classes.articlesTableContainer}
              >
                <AgGridComponent
                  tableHeader={
                    props.createSceanrio ? "Selected Style" : "Details Table"
                  }
                  topRightOptions={getTopRightOptions()}
                  topLeftOptions={
                    props.createSceanrio ? getTopLeftOptions() : null
                  }
                  processCellForClipboard={processCellForClipboard}
                  processHeaderForClipboard={processHeaderForClipboard}
                  columns={articleTableColumn}
                  selectAllHeaderComponent={true}
                  rowdata={sceanrioTableData}
                  customSelectCellStyle={getCellStyle}
                  hideSelectAllRecords={true}
                  uncheckRows={uncheckableArticle}
                  onSelectionChanged={onSelectionChanged}
                  nestedTable={props.createSceanrio && props.selectedPrductData}
                  nestedTableComponent={
                    <StoreDetailsTableComponent {...props} />
                  }
                  manualCallBack={(body, pageIndex) => {
                    return props.createSceanrio
                      ? manualCallBackForScenario(body, pageIndex)
                      : manualCallBack(body, pageIndex);
                  }}
                  callBackToSetCheckConfig={callBackToSetCheckConfig}
                  onCellValueChanged={onCellValueChanged}
                  onBlur={onBlur}
                  {...setTableType()}
                  paginationPageSize={
                    props.pageLimit ? Number(props.pageLimit) : 10
                  }
                  cacheBlockSize={
                    props.pageLimit
                      ? Number(props.pageLimit)
                      : CACHE_BLOCKSIZE_STRATEGY
                  }
                  loadTableInstance={loadTableInstance}
                  uniqueRowId={props.createSceanrio ? "style" : props.articleKey || "article"}
                  showSaveTableConfig={true}
                  callOnModelUpdated={(params) =>
                    props.backButtonClicked && getPreviousSelectedNode(params)
                  }
                  // height = "35%"
                />
                {
                  <Validation
                    articles={articlesWithValidationError}
                    excludeAllHandler={excludeAllHandler}
                  />
                }
              </div>
            )}
          </div>
        </Loader>
        <div className={classes.bottomButtonsWrapper}>
          <div className={classes.bottomButtonsGreyBar}></div>
          <Grid
            gap={2}
            className={`${classes.bottomButtonsContainer24px} ${globalClasses.flexAlignBetweenCenter}`}
          >
            <Button
              variant="primary"
              className={classes.footerReviewButton}
              disabled={
                !buttonEnabled ||
                articleTableGridInstance.current?.api?.getSelectedRows()
                  ?.length === 0
              }
              onClick={goToStoreDcStep}
              endIcon={
                <span 
                  style={{ 
                    color: (!buttonEnabled || articleTableGridInstance.current?.api?.getSelectedRows()?.length === 0) ? '#b4bac7' : 'white',
                    fontSize: '18px', 
                    lineHeight: 1,
                    height: '18px'
                  }}
                >
                  ›
                </span>
              }
              iconPlacement="right"
            >
              Go to review store and DC
            </Button>
          </Grid>
        </div>
        {showSetAllModal && (
          <SetAllModal
            dynamicDCoptions={props?.createAllocationProps?.isDynamicDCoptions}
            showAllStoreGroups={props.showAllStoreGroups}
            isPO={props.poCode}
            createSceanrio={props.createSceanrio}
            onCreateSceanrioApply={props.onApply}
            hideInSetAll={props.hideInSetAll}
            showInArticleTableSetAll={props.showInArticleTableSetAll}
            columns={articleTableColumn}
            setAllDcs={setAllDcs}
            getStoreGroupStoreMappingData={props.getStoreGroupStoreMappingData}
            setShowSetAllModal={setShowSetAllModal}
            showSetAllModal={showSetAllModal}
            agGridInstance={articleTableGridInstance.current}
            setUpdatedRows={setUpdatedRows}
            getUpdatedApsWos={getUpdatedApsWos}
            isStoreBand={props.isStoreBand}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            storeGroupStoreMap={storeGroupStoreMap.current}
            displaySnackMessages={displaySnackMessages}
            storesForSelectedStoreFilters={
              storesForSelectedStoreFilters?.current
            }
            defaultStoreGroupCode={
              defaultStoreGroupCode?.current?.[0]?.attribute_value || {}
            }
            minMaxValidator={minMaxValidator}
            strategyColsInSetAll={strategyColsInSetAll}
            VIRConstraintOptions={VIRConstraintOptions}
            cacheKeyRef={props.cacheKeyRef}
          />
        )}
      </>
      {/* {showStoreandDc && (
        <StoreDcDetails
          expeditedFlow={expeditedFlow}
          excludeAllHandler={excludeAllHandler}
          module={props?.module}
          showStoreandDc={showStoreandDc}
          checkAllSetAllRequest={checkAllSetAllRequest}
          articleTableGridInstance={articleTableGridInstance}
          storesForSelectedStoreFilters={storesForSelectedStoreFilters?.current}
          defaultStoreGroupCode={defaultStoreGroupCode}
          channel={channel}
          isStoreBand={props.isStoreBand}
          isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
          storeGroupStoreMap={storeGroupStoreMap.current}
          defaultProductChannel={props.defaultProductChannel}
          setButtonEnabled={setButtonEnabled}
        />
      )} */}
      {showPopUp && (
        <ViewTablePopUp
          closePopUp={closeShowPopup}
          columns={columns}
          loader={loader}
          rowData={rows}
          title={title}
          pagination={true}
        />
      )}
      {showReviewForecast && (
        <ReviewForecastPanel
          reviewForcastHandler={reviewForcastHandler}
          selectedRows={articleTableGridInstance?.current?.api?.getSelectedRows()}
          closePanel={() => setShowReviewForecast(false)}
          articleKey={props.articleKey ?? "article"}
          showReviewForecast={showReviewForecast}
          selectedFilters={props.selectedFilters}
          epLabel={props.createAllocationProps?.reviewForecastEPLabel}
          parentFilterDependency={
            props.filterDashboardConfiguration[props.filterConfigKey]
              ?.appliedFilterData?.dependencyData
          }
          filters={props.filters}
          exlcudeStoreFilter={props.createAllocationProps?.excludeStoreFiltersInForecast}
        />
      )}
      <Prompt
        isOpen={reviewForecast}
        title="Review forecast"
        children={
          <div>
            Changes made will be discarded on redirecting to review the
            forecast, are you sure you want to redirect?
          </div>
        }
        infoList={[]}
        primaryButtonLabel={common.__ConfirmBtnText}
        onPrimaryButtonClick={promptPrimaryBtn}
        secondaryButtonLabel={common.__RejectBtnText}
        onSecondaryButtonClick={promptSecondaryBtn}
      />
      {showIngestionWarning && (
        <Prompt
          isOpen={showIngestionWarning}
          title="Warning"
          children={<div>{ingestionWarningMessage}</div>}
          infoList={[]}
          primaryButtonLabel="Yes"
          onPrimaryButtonClick={proceedWithRedirection}
          secondaryButtonLabel="No"
          onSecondaryButtonClick={() => {
            setShowIngestionWarning(false);
          }}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    showAllStoreGroups:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.showAllStoreGroups,
    defaultProductChannel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.defaultProductChannel,
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfigForInfiniteScrolling,
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .selectedFilters,
    allocationName:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .allocationName,
    customl0nameFilter:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.customl0nameFilter,
    articleAgGridParams:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleAgGridParams,
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    isValidDraft:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .isValidDraft,
    articleTableLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleTableLoader,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    poCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poCode,
    asnCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.asnCode,
    newStoreAlert:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .newStoreAlert,
    alloc_type:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .alloc_type,
    filteredSelection:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .filteredSelection,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .popUpLinkFromDashbaord,
    type:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.type,
    hideInSetAll:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.hideInSetAll,
    showInArticleTableSetAll:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.showInArticleTableSetAll,
    isStoreBand:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isStoreBand,
    expeditedFlow:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        ?.expeditedFlow,
    inventorysmartScreenConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    //Cannot be put in ddScreenConfig as used in routes
    inventorysmartHiddenModules:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.hiddenModules,
    dynamicIaProfile:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.dynamic_ia_profile,
    alertsUniqueIdNavigationKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.alertsUniqueIdNavigationKey,
    removeNetDctoAvailableValidation:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.removeNetDctoAvailableValidation,
    allowZeroUserDefinedInventory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.allowZeroUserDefinedInventory,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    customChannelKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.customChannelKey,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    articleKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.articleKey,
    uniqueAdaRedirectionKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.uniqueAdaRedirectionKey,
    createAllocationProps:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreDetailsAtSizes: (payload) =>
    dispatch(getStoreDetailsAtSizes(payload)),
  getStoreGroupOptions: (payload) => dispatch(getStoreGroupOptions(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  getViewPlanTableConfiguration: (payload) =>
    dispatch(getViewPlanTableConfiguration(payload)),
  getStoreGroupStoreMappingData: (payload) =>
    dispatch(getStoreGroupStoreMappingData(payload)),
  getAllocate: (payload) => dispatch(getAllocate(payload)),
  getScenarioInputs: (payload) => dispatch(getScenarioInputs(payload)),
  getColumn: (payload) => dispatch(getColumn(payload)),
  getApsWos: (payload) => dispatch(getApsWos(payload)),
  getStoreGroupStoreMap: (payload) => dispatch(getStoreGroupStoreMap(payload)),
  getSetAllDcs: (payload) => dispatch(getSetAllDcs(payload)),
  setArticleTableLoader: (payload) => dispatch(setArticleTableLoader(payload)),
  setIsValidDraft: (payload) => dispatch(setIsValidDraft(payload)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
    dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  setInventoryAdaPayload: (payload) =>
    dispatch(setInventoryAdaPayload(payload)),
  uploadBackDoorAllocationFile: (payload) =>
    dispatch(uploadBackDoorAllocationFile(payload)),
  setArticleAgGridParams: (payload) =>
    dispatch(setArticleAgGridParams(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setCreateAllocationFilterDetails: (payload) =>
    dispatch(setCreateAllocationFilterDetails(payload)),  
  setSelectedFiltersCreateAllocation: (payload) =>
    dispatch(setSelectedFiltersCreateAllocation(payload)),
  checkIngestionStatus: (payload) => dispatch(checkIngestionStatus(payload, true)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ArticlesTable);
