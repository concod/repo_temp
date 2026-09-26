import React, { useState, useEffect, useRef, forwardRef } from "react";
import { connect } from "react-redux";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Divider,
} from "@mui/material";
import {
  Button,
  BottomSheet,
  Badge,
  Switch,
  Prompt,
  useTranslation,
} from "impact-ui-v3";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import DownloadButton from "./Download";

import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getAlertsActionTableConfiguration,
  getServerSideAlertsData,
  reviewAlerts,
  setAlertsActionPopupConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";
import { setStoreInventoryAlertsTableData,setRefetchAlerts} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import { getForecastMissingChannels } from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-forecast-alerts-service";

import {
  ALLOCATION_IN_EACHES_MESSAGE,
  defaultTableData,
  KITS_ALLOCATION_ALERT_CONFIG_NAME,
  MIN_ARTICLE_SELECTION_MESSAGE,
  UPDATED_MESSAGE,
  UPDATE_MODEL_STOCK_PAYLOAD_KEY,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";

import { useStyles as invStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

import {
  deleteAutoAllocationArticles,
  fetchStoreCodesForAlert,
  setStoreInventoryDeleteLoader,
  updateStoreInventoryModelStockValues,
} from "../../../services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import {
  fetchProductCode,
  fetchProductCodes,
  getFilterDependencyProductAndStoreAttributes,
  getServerSidePaginationAPIPayload,
  modifyInvetoryAlertsCount,
} from "../../inventorysmart-utility";
import StoreArticleInventoryPopup from "../../Decision-Dashboard/components/StoreArticleInventoryPopup";
import { setInventoryDashboardAlertCount } from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import AlertsSetAll from "./AlertsSetAll";
import AlertsRedirectionHandler from "./AlertsRedirectionHandler";

import {
  checkIfAllocationInEaches,
  analyzeForecastChannelSelection,
  buildMissingRowsFromChannelMap,
  indexMissingRows,
  redirectToADA,
  redirectToFinalizeScreen,
  redirectToScreen,
  updateCheckConfiguration,
  updateModelStockSum,
} from "./inventory_alerts_utiltiy";
import MissingChannelsPanel from "./MissingChannelsPanel";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import ExpeditedAllocation from "./ExpeditedAllocation";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { getAllocate } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { setReviewedAlerts, checkIngestionStatus } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { setCreateAllocationFilterDetails, setSelectedFiltersCreateAllocation } from "../../../services-inventorysmart/Create-Allocation/create-allocation-services";
import { setCreateStoreTransferFilterDetails, setSelectedFiltersCreateStoreTransfer, setCreateStoreTransferFilterDependency } from "../../../services-inventorysmart/Create-Store-Transfer/create-store-transfer-service";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_CONFIG_BY_ALERT } from "./AlertsActionTable";


const getReconciledRows = (p_rows) => {
  let l_unCheckedRows = [...p_rows[1]?.unCheckedRows];
  for (let i = 2; i < p_rows.length; i++) {
    if (p_rows[i]?.unCheckedRows) {
      l_unCheckedRows.push(...p_rows[i]?.unCheckedRows);
    } else {
      l_unCheckedRows = l_unCheckedRows.filter(
        (element) => !p_rows[i]?.checkedRows.includes(element)
      );
    }
  }
  return [p_rows[0], { unCheckedRows: l_unCheckedRows }];
};

export const getObjectsAfterCheckAll = (p_checkConfiguration) => {
  try {
    let l_checkAllIndex = p_checkConfiguration
      ?.slice()
      ?.reverse()
      ?.findIndex((obj) => obj.hasOwnProperty("checkAll"));
    l_checkAllIndex = p_checkConfiguration?.length - 1 - l_checkAllIndex;
    let l_reconciledRows = [];
    if (l_checkAllIndex !== -1) {
      let l_config = p_checkConfiguration.slice(l_checkAllIndex);
      l_config?.splice(1, 1);
      if (l_config?.length > 1) {
        return getReconciledRows(l_config);
      }
      return l_config;
    }
    return l_reconciledRows;
  } catch {
    return [];
  }
};

const AlertsActionPopup = forwardRef((props, ref) => {
  // This comonent shows Generic Alerts Tables and Second level tables for Custom Alerts
  const { t } = useTranslation();
  const { showInModal } = props;
  const globalClasses = globalStyles();
  const invClasses = invStyles();
  const aiChips = useAiSmartFilterChips();

  const [alertsPopupTableColumns, setAlertsPopupTableColumns] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [modelStockData, setModelStockData] = useState("");
  const [alertsPopupTableData, setAlertsPopupTableData] = useState([]);
  const [alertsPopupTableDataCount, setAlertsPopupTableDataCount] = useState(0);
  const [storeData, setStoreData] = useState([]);
  const [article, setArticle] = useState(null);
  const [metric, setMetric] = useState(null);
  const [storeDcModal, setStoreDCModal] = useState(false);
  const [
    openStoreArticleInventoryDialog,
    setOpenStoreArticleInventoryDialog,
  ] = useState(false);
  const [title, setTitle] = useState(null);
  const [expeditedAllocation, setExpeditedAllocation] = useState(false);
  const [redirectionConfigurations, setRedirectionConfigurations] = useState(
    {}
  );
  const [tableMetaData, setTableMetaData] = useState({});
  const [downloadRequestBody, setDownloadRequestBody] = useState({});

  // used to store the rows whose updated model stock value is edited via onChange(single row edit) or by onSelection(multiple Row edit)
  const editedRowRef = useRef([]);
  const alertsPopupDataRef = useRef([]);
  const agGridUserInstance = useRef(null);
  const hasFetchedServerSideColumnsRef = useRef(false);
  const [toggle, setToggle] = useState(true);
  const [loader, setLoader] = useState(false);
  const [hideTable, setHideTable] = useState(false);
  const [showColor, setShowColor] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [apiWithZeroRows, setApiWithZeroRows] = useState(false);
  const [articleDetails, setArticleDetails] = useState([]);
  const [reviewLevel, setReviewLevel] = useState(props.reviewLevel || null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [storeAlertData, setStoreAlertData] = useState(null);
  const screenNameForAdditionalRedirection = useRef(null);
  const checkedRef = useRef(false)
  const [isChecked, setIsChecked] = useState(false)
  const [isInfiniteScrolling, setIsInfiniteScrolling] = useState(false)
  const [showIngestionWarning, setShowIngestionWarning] = useState(false)
  const [ingestionWarningMessage, setIngestionWarningMessage] = useState("")
  const pendingRedirectionRef = useRef(null)
  const [showMissingChannelDialog, setShowMissingChannelDialog] = useState(false)
  const [showMissingChannelDrawer, setShowMissingChannelDrawer] = useState(false)
  const [missingChannelRows, setMissingChannelRows] = useState([])
  useEffect(()=>{
    if(props.inventorysmartScreenConfigForInfiniteScrolling){
      let isInfiniteScrolling = props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
        "dashboard"
      )
      setIsInfiniteScrolling(isInfiniteScrolling)
    }
  },[props.inventorysmartScreenConfigForInfiniteScrolling])

  useEffect(() => {
    setReviewLevel(props.reviewLevel || null);
  }, [props.reviewLevel]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const toggleStoreInventoryPopup = (data, columnName, item) => {
    if (data[`${columnName}_data`]) {
      setStoreAlertData(data[`${columnName}_data`]);
    }
    const selectedArticle = data?.article || data.sku || data.product_code;
    const column_names = [
      "bulk_remaining",
      "intransit_to_store",
      "store_on_hand",
      "store_on_order",
      "lw_sales_units",
      "lw_sales_revenue",
      "lw_margin",
      "week_to_date_sales",
      "yesterday_sales",
      "sales_1_ago",
      "sales_2_ago",
      "sales_3_ago",
      "sales_4_ago",
      "available_to_allocate",
      "dc_oh_qcloc",
      "dc_oh_1_wms_location",
      "oo_dc",
      "it_dc",
      "dc_oh_cwc",
    ];
    setArticle(selectedArticle);
    setTitle(item?.label);
    setMetric(columnName);
    openStoreArticleInventoryPopUp();
    if (column_names?.includes(columnName)) {
      setStoreDCModal(true);
    }
  };

  const storeCountActionMap = {
    stock_out: toggleStoreInventoryPopup,
    stockout: toggleStoreInventoryPopup,
    shortfall: toggleStoreInventoryPopup,
    normal: toggleStoreInventoryPopup,
    excess: toggleStoreInventoryPopup,
    bulk_remaining: toggleStoreInventoryPopup,
    intransit_to_store: toggleStoreInventoryPopup,
    store_on_hand: toggleStoreInventoryPopup,
    store_on_order: toggleStoreInventoryPopup,
    dc_oh_1_wms_location: toggleStoreInventoryPopup,
    lw_sales_units: toggleStoreInventoryPopup,
    lw_sales_revenue: toggleStoreInventoryPopup,
    yesterday_sales: toggleStoreInventoryPopup,
    lw_margin: toggleStoreInventoryPopup,
    week_to_date_sales: toggleStoreInventoryPopup,
    sales_1_ago: toggleStoreInventoryPopup,
    sales_2_ago: toggleStoreInventoryPopup,
    sales_3_ago: toggleStoreInventoryPopup,
    sales_4_ago: toggleStoreInventoryPopup,
    available_to_allocate: toggleStoreInventoryPopup,
    dc_oh_qcloc: toggleStoreInventoryPopup,
    dc_oh_cwc: toggleStoreInventoryPopup,
    oo_dc: toggleStoreInventoryPopup,
    it_dc: toggleStoreInventoryPopup,
    below_mins_flag: toggleStoreInventoryPopup,
    below_mins_ind: toggleStoreInventoryPopup,
    overstock: toggleStoreInventoryPopup,
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const openStoreArticleInventoryPopUp = () => {
    setOpenStoreArticleInventoryDialog(true);
  };

  const closeStoreArticleInventoryPopUp = () => {
    setOpenStoreArticleInventoryDialog(false);
    setStoreDCModal(false);
    setStoreAlertData(null);
  };

  const onSelectionChanged = (event) => {
    let selections = [];
    if (
      isInfiniteScrolling &&
      props.isPaginatedPopupApi
    ) {
      selections = agGridUserInstance?.current?.api?.reConciledSelectedRowIds;
      selections = Array.from(selections.values());
    } else selections = event.api.getSelectedRows();
    setSelectedArticles([...selections]);
    if (!editedRowRef.current.length) {
      editedRowRef.current = selections;
    } else {
      let updatedRows = [...editedRowRef.current, ...selections];
      editedRowRef.current = updatedRows;
    }
  };

  const reviewPopupAlerts = (articles) => {
    const filteredArticles = articles
      ?.filter((article) => !article?.[`${props.reviewPrefix}_is_resolved`])
      .map((article) => {
        article[`${props.reviewPrefix}_is_resolved`] = 1;

        return article;
      });

    if (filteredArticles?.length) {
      const productCodes = fetchProductCodes(filteredArticles);
      const alertsCount = modifyInvetoryAlertsCount(ref.current, productCodes);
      let alertsCountPayload = {
        key: props.screen,
        data: alertsCount,
      };

      const payload = {
        table_name: props.tableName,
        product_codes: productCodes,
        prefix: props.reviewPrefix,
      };

      agGridUserInstance.current?.api?.redrawRows();

      props.setInventoryDashboardAlertCount(alertsCountPayload);
      props.reviewAlerts(payload);
      // to update is resolved count in parent table - based on number of SKU
      let cloneAlerts = cloneDeep(
        props.storeInventoryAlertsTableData[props.tabValue]
      );
      let updateIsResolvedIndex = cloneAlerts?.map((item) => {
        if (item?.prefix === props.reviewPrefix) {
          return {
            ...item,
            is_resolved: Number(item.is_resolved) + productCodes?.length,
          };
        } else return item;
      });
      props.setStoreInventoryAlertsTableData({
        tab: props.tabValue,
        data: updateIsResolvedIndex,
      });
    }
  };

  const handleAutoAllocationFinalize = (screenName) => {
    if (selectedArticles?.length === 0 && props?.isSelectionEnabled) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
    } else if (
      selectedArticles?.length !== alertsPopupTableDataCount &&
      props?.isSelectionEnabled &&
      !props?.minimumOneArticle
    ) {
      displaySnackMessages(t("inventorysmart.selectAllArticles"), "warning");
    } else {
      setReviewed(selectedArticles, props?.alert_key)
      redirectToFinalizeScreen(
        selectedArticles,
        screenName,
        props?.data?.extra?.plan_code,
        alertsPopupTableDataCount
      );
    }
  };

  const proceedRedirectToADA = (screenName, liveSelectedArticles) => {
    if (props.alertLevel === 1 && props.tableName && props.canReview) {
      reviewPopupAlerts(liveSelectedArticles);
    }
    setReviewed(liveSelectedArticles, props?.alert_key);
    redirectToADA(
      liveSelectedArticles,
      props.filterDecisionDashboardConfiguration.appliedFilterData.dependencyData ||
      props.filterDependencyData,
      screenName,
      props.uniqueKey,
      props.alertsUniqueIdNavigationKey,
      false
    );
  };

  const showMissingChannelWarning = (missingRows) => {
    setMissingChannelRows(indexMissingRows(missingRows));
    setShowMissingChannelDialog(true);
  };

  const handleRedirectionToADA = async (screenName) => {
    // Read the live grid selection so validation always reflects the current
    // checkbox state (state can lag behind rapid select/deselect actions).
    const liveSelectedArticles = getSelectedRowsForInfiniteRowModel(
      agGridUserInstance.current
    );
    if (liveSelectedArticles?.length === 0) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
      return;
    }

    // Step 1: local analysis. Confirms missing channels already present in the
    // loaded rows and collects the uncertain candidates needing a BE check.
    const analysis = analyzeForecastChannelSelection(
      liveSelectedArticles,
      alertsPopupTableData,
     props.uniqueKey
    );

    // Fewer than two distinct channels selected -> nothing can be missing.
    if (!analysis.needsValidation) {
      proceedRedirectToADA(screenName, liveSelectedArticles);
      return;
    }

    let missingRows = [...analysis.confirmedMissingRows];

    // Step 2: only hit the backend when there are unresolved candidates whose
    // existence could not be confirmed from the loaded rows.
    if (analysis.uncertainArticles.length > 0) {
      try {
        props.setDashboardLoaderFullScreen(true);
        const response = await props.getForecastMissingChannels({
          alert_name: props.alert_key,
          articles: analysis.uncertainArticles,
          channels: analysis.uncertainChannels,
          filters: props.selectedFilters,
        });
        const channelMap = response?.data?.data || {};
        missingRows = missingRows.concat(
          buildMissingRowsFromChannelMap(
            channelMap,
            analysis.uncertainByArticle,
            analysis.articleMeta
          )
        );
      } catch (e) {
        // Fail-open: a channel-map lookup failure must never block navigation.
        console.error("Forecast missing-channel validation failed", e);
      } finally {
        props.setDashboardLoaderFullScreen(false);
      }
    }

    if (missingRows.length > 0) {
      showMissingChannelWarning(missingRows);
      return;
    }

    proceedRedirectToADA(screenName, liveSelectedArticles);
  };
  useEffect(() => {
    if (!isEmpty(articleDetails)) {
      if (!(articleDetails.length % 10) && !apiWithZeroRows) {
        fetchArticleDetailsForAllocation();
      } else {
        let l_payloadWithStoreAndProducts = {
          isRedirectedFromInventory: true,
          payload: {
            product_code: [],
            store_code: [],
          },
        };

        articleDetails.forEach((val) => {
          let l_sizeUPCValues = [];
          // fetch the size upc mapping values based on the various size profiles mapped for an article
          let l_sizeUPCKeys = Object.keys(val?.size_upc_map)?.filter((item) =>
            val.sizes.some((obj) => obj.value === item)
          );
          l_sizeUPCKeys.forEach((key) => {
            l_sizeUPCValues.push(val?.size_upc_map[key]);
          });
          l_payloadWithStoreAndProducts["payload"]["product_code"].push(
            ...l_sizeUPCValues
          );
        });
        const adaPayload = {
          filters: props.selectedFilters,
          selectedDependency:
            props.filterDecisionDashboardConfiguration.appliedFilterData
              .dependencyData || props.filterDependencyData,
          channel: props.selectedFilters?.filter(
            (filter) => filter.attribute_name === "channel"
          )[0].values[0],
          selection: agGridUserInstance?.current?.api?.checkConfiguration,
          ...l_payloadWithStoreAndProducts,
          timeline: {
            startDate: moment().format("YYYY/MM/DD"),
            endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
          },
          prev_action: agGridUserInstance?.current?.api?.prevAction,
        };
        localStorage.setItem(
          "adaPayloadFromInventory",
          JSON.stringify(adaPayload)
        );
        props.setDashboardLoaderFullScreen(false);
        resetState();
        window.open(
          screenNameForAdditionalRedirection.current,
          "_blank",
          "noopener,noreferrer"
        );
      }
    }
  }, [articleDetails]);

  const resetState = () => {
    setPageIndex(0);
    setOffset(0);
    setArticleDetails([]);
    setApiWithZeroRows(false);
  };

  const fetchArticleDetailsForAllocation = async () => {
    try {
      let selectedFilters =
        props.filterDecisionDashboardConfiguration.appliedFilterData.dependencyData ||
        props.filterDependencyData;
      const selectedArticleIds = fetchProductCodes(selectedArticles);

      let articleFilter = tableArticleFilter;
      articleFilter.values = [...selectedArticleIds];
      selectedFilters.push(articleFilter);

      let l_checkAllConfig = getObjectsAfterCheckAll(
        agGridUserInstance?.current?.api?.checkConfiguration
      );

      let l_articlesFilteredFromFilterSection = selectedFilters
        ?.filter((val) => val?.filter_id === "article")?.[0]
        ?.values?.join();

      let l_updatedCheckConfiguration = updateCheckConfiguration(
        l_checkAllConfig,
        l_articlesFilteredFromFilterSection
      );

      let body = {
        filters:
          props.filterDecisionDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData,
        meta: {
          range: [],
          search: [],
          sort: [],
          limit: {
            limit: 10,
            page: pageIndex + 1,
            offset: offset,
          },
        },
        channel: selectedFilters?.filter(
          (filter) => filter.attribute_name === "channel"
        )[0].values[0],
        selection: [],
        filtered_selection: !isEmpty(l_updatedCheckConfiguration)
          ? l_updatedCheckConfiguration
          : [],
        popupLink: props?.alertPopupLink?.split("/")?.pop() || null,
      };

      let response = await props.getAllocate(body);
      if (response.data.status) {
        if (!response.data?.data?.table_data?.length) {
          setApiWithZeroRows(true);
          props.setDashboardLoaderFullScreen(false);
        }
        let l_responseData = response.data?.data?.table_data;
        setPageIndex(response.data.page);
        setOffset(response.data.offset);
        setArticleDetails((old) => [...old, ...l_responseData]);
      }
    } catch (e) {
      handleErrorMessage(e);
      resetState();
    }
  };

  const handleRedirectionToADAMFP = (screenName) => {
    if (selectedArticles?.length === 0) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
    } else {
      screenNameForAdditionalRedirection.current = screenName;
      props.setDashboardLoaderFullScreen(true);
      fetchArticleDetailsForAllocation();
      setReviewed(selectedArticles, props?.alert_key)
    }
  };

  const handleRedirectionToNewStoreSetUp = (screenName, screenParams) => {
    window.open(
      `${screenName}?${screenParams}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const filterStyles = () => {
    setIsChecked(!isChecked)
    setLoader(true);
    setHideTable(true);
  }
  useEffect(() => {
    checkedRef.current = isChecked
    !isInfiniteScrolling &&  agGridUserInstance.current?.api?.refreshServerSideStore({ purge: true });
    isInfiniteScrolling && agGridUserInstance.current?.api?.refreshInfiniteCache()
  }, [isChecked, isInfiniteScrolling])

  const generateAlertReviewPayload = (selectedArticles, alert_key) => {
    let payload = { article: [], alert_key  }

    if(reviewLevel){
      payload[reviewLevel] = []
    }

    selectedArticles.forEach((thisArticle) => {
      if(thisArticle?.is_reviewed) return

      const article = thisArticle?.column_sel || thisArticle?.article
      const reviewValue = reviewLevel && thisArticle?.[reviewLevel]

      // Pair-grain alerts must send article and review-level values in the
      // same order. Do not submit a partial pair, which would review the
      // article at the fallback (NONE) level on the backend.
      if (!article || (reviewLevel && !reviewValue)) return

      payload.article.push(article)
      if(reviewLevel) payload[reviewLevel].push(reviewValue)
    })
    return payload
  }

  const setReviewed = async (selectedArticles, alert_key) => {
    const payload = {...generateAlertReviewPayload(selectedArticles, alert_key), proceed_with_warning: true}
    try {
      if(payload?.article?.length > 0){
        await props?.setReviewedAlerts(payload)
        props?.setRefetchAlerts(true)
        return true
      }
    } catch (e) {
        handleErrorMessage(e);
    }
    return false
  }

  const handleReviewOnly = async () => {
    if (!selectedArticles.length) {
      displaySnackMessages(t("inventorysmart.selectAtLeastOneRow"), "warning");
      return;
    }

    setIsReviewing(true);
    const reviewed = await setReviewed(selectedArticles, props?.alert_key);
    if (reviewed) {
      agGridUserInstance.current?.api?.deselectAll();
      setSelectedArticles([]);
    }
    setIsReviewing(false);
  }

  const handleInventoryRedirection = async (
    screenName,
    screenParams,
    expeditedAllocation,
    selectionRequired = true
  ) => {
    let l_selectedRows = getSelectedRowsForInfiniteRowModel(
      agGridUserInstance.current
    );
    let l_checkAllConfig = getObjectsAfterCheckAll(
      agGridUserInstance?.current?.api?.checkConfiguration
    );

    let l_filters =
      props.filterDecisionDashboardConfiguration.appliedFilterData.dependencyData ||
      props.filterDependencyData;
    let l_articlesFilteredFromFilterSection = l_filters
      ?.filter((val) => val?.filter_id === "article")?.[0]
      ?.values?.join();

    let l_updatedCheckConfiguration = updateCheckConfiguration(
      l_checkAllConfig,
      l_articlesFilteredFromFilterSection
    );

    if (
      // selectedArticles?.length === 0 &&
      selectionRequired &&
      l_selectedRows?.length === 0
    ) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
    } else {
      // Call ALERT_REVIEW API to check data ingestion status
      checkDataIngestionStatus(l_selectedRows, screenName, screenParams, expeditedAllocation, l_updatedCheckConfiguration);
    }
  };

  const checkDataIngestionStatus = async (l_selectedRows, screenName, screenParams, expeditedAllocation, l_updatedCheckConfiguration) => {
    // Store all arguments in ref at the beginning
    pendingRedirectionRef.current = {
      l_selectedRows,
      screenName,
      screenParams,
      expeditedAllocation,
      l_updatedCheckConfiguration
    };

    try {
      setLoader(true);
      const payload = {...generateAlertReviewPayload(selectedArticles, props?.alert_key), filters: props.selectedFilters}
      const response = await props?.checkIngestionStatus(payload);
      setLoader(false);
      if (response?.data?.show_warning) {
        // Show warning popup with message
        setIngestionWarningMessage(response?.data?.message);
        setShowIngestionWarning(true);
      } else {
        // Proceed with current flow
        proceedWithRedirection(false);
      }
    } catch (error) {
      console.error("Error checking data ingestion status:", error);
      setLoader(false);
      // On error, proceed with current flow
      proceedWithRedirection(false);
    }
  };

  const proceedWithRedirection = (isReview = true) => {
    setShowIngestionWarning(false);
    if (!pendingRedirectionRef.current) return;

    const { l_selectedRows, screenName, screenParams, expeditedAllocation, l_updatedCheckConfiguration } = pendingRedirectionRef.current;
    
    if(isReview) {
      setReviewed(selectedArticles, props?.alert_key)
    } else {
      props?.setRefetchAlerts(true)
    }
    let allocationInEaches = false;

    if (props.reviewPrefix === KITS_ALLOCATION_ALERT_CONFIG_NAME) {
      allocationInEaches = checkIfAllocationInEaches(
        alertsPopupTableData,
        // selectedArticles
        l_selectedRows
      );
    }

    if (allocationInEaches) {
      displaySnackMessages(ALLOCATION_IN_EACHES_MESSAGE, "info");
    }

    if (props.alertLevel === 1 && props.tableName && props.canReview) {
      reviewPopupAlerts(
        // selectedArticles
        l_selectedRows
      );
    }
    let l_selectedRowsOrNodes = [];
    agGridUserInstance?.current?.api?.forEachNode((node) => {
      l_selectedRowsOrNodes.push(node);
    });

    // Check if this is a store transfer redirection
    const isStoreTransfer = props.redirection === "Create New Store Transfer" || 
                            screenName?.includes("create-store-transfer");

    // Set localStorage and Redux for Create Allocation
    localStorage.setItem(
      'createAllocationFilterDetails',
      JSON.stringify(props?.filterDecisionDashboardConfiguration || {})
    );
    localStorage.setItem(
      'selectedFiltersCreateAllocation',
      JSON.stringify(props?.selectedFiltersFromReducer || {})
    );

    props.setCreateAllocationFilterDetails({ ...props?.filterDecisionDashboardConfiguration })
    props.setSelectedFiltersCreateAllocation({ ...props?.selectedFiltersFromReducer })

    // Set localStorage and Redux for Create Store Transfer
    if (isStoreTransfer) {
      localStorage.setItem(
        'createStoreTransferFilterDetails',
        JSON.stringify(props?.filterDecisionDashboardConfiguration || {})
      );
      localStorage.setItem(
        'selectedFiltersCreateStoreTransfer',
        JSON.stringify(props?.selectedFiltersFromReducer || {})
      );
      
      props.setCreateStoreTransferFilterDetails(cloneDeep(props?.filterDecisionDashboardConfiguration));
      props.setSelectedFiltersCreateStoreTransfer(cloneDeep(props?.selectedFiltersFromReducer));
      props.setCreateStoreTransferFilterDependency(
        props.filterDecisionDashboardConfiguration?.appliedFilterData?.dependencyData || 
        props.filterDependencyData || []
      );
    }
    if (expeditedAllocation) {
      setExpeditedAllocation(true);
      setRedirectionConfigurations({
        selectedArticles: l_selectedRows,
        storeData,
        filters:
          props.filterDecisionDashboardConfiguration.appliedFilterData
            .dependencyData || props.filterDependencyData,
        filteredSelection: l_updatedCheckConfiguration,
        popupLink: props?.alertPopupLink?.split("/")?.pop() || null,
        poCode: l_selectedRows[0]?.po_code || null,
      });
      props.setDashboardLoaderFullScreen(true);
    } else {
      redirectToScreen(
        // selectedArticles,
        l_selectedRows,
        storeData,
        props.filterDecisionDashboardConfiguration.appliedFilterData.dependencyData ||
        props.filterDependencyData,
        screenName,
        screenParams,
        allocationInEaches,
        props.redirection === "Constraints",
        props.redirection === "Create Allocation",
        l_updatedCheckConfiguration,
        props.alertPopupLink,
        props.alloc_type,
        props.alertsUniqueIdNavigationKey,
        isStoreTransfer  // Pass isStoreTransfer flag to set storeTransferSelectedArticles in localStorage
      );
    }
    
    // Clear the ref after successful redirection
    pendingRedirectionRef.current = null;
  };

  const fetchColumnConfig = async (dynamicColumns = []) => {
    let columns = {data: {data: dynamicColumns}};

    if (props.tableConfigName && !dynamicColumns.length) {
      const payload = {
        tableConfigName: props.tableConfigName,
      };

      columns = await props.getAlertsActionTableConfiguration(payload);
    } else if (props.tableConfig && !dynamicColumns.length) {
      columns = {
        data: {
          data: cloneDeep(props.tableConfig),
        },
      };
    }

    if (props.reviewPrefix === "ci") {
      const channelFilter = props.selectedFilters.filter(
        (filter) => filter.attribute_name === "product_channel_name"
      );

      const payload = {
        article: props?.data?.extra?.article,
        channel: channelFilter[0].values[0],
      };

      let storeDataResponse = await props.fetchStoreCodesForAlert(payload);
      setStoreData([...storeDataResponse.data.data]);
    }

    const modifiedColumns = columns?.data?.data?.map((column) => {
      if (!props.canEdit) {
        if (column?.sub_headers?.length > 0) {
          column.sub_headers = column.sub_headers.map((subHeader) => {
            if (subHeader.is_editable && subHeader.type !== "link") {
              subHeader.is_editable = false;
            }
            return subHeader;
          });
        } else {
          if (column.is_editable && column.type !== "link") {
            column.is_editable = false;
          }
        }
      }

      return column;
    });

    let formattedColumns = agGridColumnFormatter(
      modifiedColumns,
      null,
      storeCountActionMap
    );
    const isStatusColumnPresent = formattedColumns.some(
      (col) => col.column_name === "is_auto_allocated"
    );

    const renderStatusBadges = (cellProps, { showValue = false } = {}) => {
      const is_reviewed = cellProps?.data?.is_reviewed;
      const is_auto_allocated = cellProps?.data?.is_auto_allocated;
      const value = cellProps?.value;

      if (!showValue && !is_reviewed && !is_auto_allocated) {
        return "-";
      }

      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          {showValue ? value : null}
          <div style={{ display: "inline-block" }}>
            {is_reviewed && (
              <span style={{ marginRight: 8 }}>
                <Badge
                  color="success"
                  label={t("inventorysmart.reviewed")}
                  onClick={() => {}}
                  size="default"
                  variant="stroke"
                />
              </span>
            )}
            {is_auto_allocated && (
              <Badge
                color="info"
                label={"Auto"}
                onClick={() => {}}
                size="default"
                variant="stroke"
              />
            )}
          </div>
        </div>
      );
    };

    const firstVisibleColumnName = formattedColumns.find(
      (col) => !col.is_hidden
    )?.column_name;

    formattedColumns = formattedColumns.map((item) => {
      if (!isStatusColumnPresent && item.column_name === firstVisibleColumnName) {
        item.minWidth = 200;
        item.width = 200;
        item.suppressSizeToFit = true;
        item.cellRenderer = (cellProps) =>
          renderStatusBadges(cellProps, { showValue: true });
      }
      if (isStatusColumnPresent && item.column_name === "is_auto_allocated") {
        item.minWidth = 200;
        item.width = 200;
        item.suppressSizeToFit = true;
        item.cellRenderer = (cellProps) => renderStatusBadges(cellProps);
      }
      if (item.column_name === "exclusion_reason") {
        item.cellRenderer = (cellProps) => {
          const reason = cellProps?.data?.exclusion_reason;
          if (!reason) {
            return null;
          }
          const normalizedReason = reason.toUpperCase();
          if (normalizedReason === "MULTI_SOURCE") {
            return (
              <Badge
                color="info"
                label="Multi-Source (DC+PO)"
                size="default"
                variant="stroke"
              />
            );
          }
          if (normalizedReason === "MULTIPLE_PO_IDS") {
            return (
              <Badge
                color="default"
                label="Multiple PO IDs"
                size="default"
                variant="stroke"
              />
            );
          }
          return (
            <Badge
              color="default"
              label={reason}
              size="default"
              variant="stroke"
            />
          );
        };
      }
      if (item.column_name === "dc_allocation_status") {
        item.cellRenderer = (cellProps) => {
          const status = cellProps?.data?.dc_allocation_status;
          return status ? (
            <Badge
              color={
                status.toLowerCase() === "completed" ? "success" : "error"
              }
              label={status}
              size="default"
              variant="stroke"
            />
          ) : null;
        };
      }
      return item;
    });
    setAlertsPopupTableColumns(formattedColumns);
    props.setAlertsActionPopupConfigLoader(false);
  };

  useEffect(() => {
    if (props.active) {
      props.setAlertsActionPopupConfigLoader(true);
      !props.isPaginatedPopupApi && fetchColumnConfig();
    }
  }, [props.active]);



  useEffect(() => {
    return () => {
      setAlertsPopupTableColumns([]);
      setAlertsPopupTableData([]);
      setSelectedArticles([]);
      alertsPopupDataRef.current = [];
    };
  }, []);

  useEffect(() => {
    const data = props?.data?.data?.length
      ? props.data.data
      : alertsPopupDataRef?.current?.length
        ? alertsPopupDataRef?.current
        : [];
    if (data) {
      let tableData = data.map((item, index) => {
        item.index = index;

        // Composite row identity so that multiple channel rows of the same
        // style-color (same uniqueKey) can be selected independently in the grid.
        // Falls back to the uniqueKey value when there is no channel.
        const styleColorId =
          item?.[props.uniqueKey] ?? item?.column_sel ?? item?.article;
        item.channel_row_uid = item?.channel
          ? `${styleColorId}__${item.channel}`
          : styleColorId;

        if (item?.available_stores_perc > -1) {
          item.available_stores_perc = `${item.available_stores_perc}%`;
        }
        return item;
      });

      /**
       * Sorting for packs allocation
       */
      if (props.reviewPrefix === KITS_ALLOCATION_ALERT_CONFIG_NAME) {
        tableData.sort((a, b) => a.pack_id.localeCompare(b.pack_id || "-"));
      }

      // clone deep the data and store once the api changes are made so that on closing the values reset to prev values
      setAlertsPopupTableData(tableData);

      setAlertsPopupTableDataCount(tableData?.length);
    }
  }, [props.data, alertsPopupDataRef.current]);

  const handleChange = (formdata) => {
    setModelStockData(formdata);
  };

  const loadUserTableInstance = (params) => {
    agGridUserInstance.current = params;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = agGridUserInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  const getAiSmartFilterButton = () => {
    const aiSmartFilterConfig =
      AI_SMART_FILTER_CONFIG_BY_ALERT[props?.name?.trim()?.toLowerCase()];
    if (
      !aiSmartFilterConfig ||
      !props?.ddScreenConfigs?.dashboard?.drillDown?.enableSmartFilter
    ) {
      return null;
    }
    return (
      <AiSmartFilterButton
        key="ai-smart-filter-btn"
        columns={alertsPopupTableColumns}
        filters={props?.selectedFilters}
        onFilterApplied={applyAiSmartFilterToColumn}
        onAppliedFilterChange={aiChips.onAppliedFilterChange}
        onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
        screenName={aiSmartFilterConfig.screenName}
        tableId={aiSmartFilterConfig.tableId}
        hideSuggestions
      />
    );
  };

  const getAiSmartFilterChips = () => (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  );

  const onApply = () => {
    if (isEmpty(modelStockData.model_stock)) {
      displaySnackMessages(t("inventorysmart.enterAValue"), "warning");
    } else {
      let updatedRows = alertsPopupTableData.map((item) => {
        if (
          selectedArticles.some((obj) => obj.store_code === item.store_code)
        ) {
          item[`${props.reviewPrefix}_model_stock`] =
            modelStockData.model_stock;
          return item;
        } else return item;
      });
      setAlertsPopupTableData(updatedRows);
      agGridUserInstance.current?.api?.redrawRows();
      setShowSetAllModal(false);
      setModelStockData("");
    }
  };

  const getFirstGridTopRightOptions = () => {
    return [
      <Switch
        key="review-non-reviewed-switch"
        id="review-non-reviewed"
        checked={isChecked}
        onChange={(event) => filterStyles()}
        rightLabel=""
        leftLabel={t("inventorysmart.seeNonReviewed")}
      />,
       getAiSmartFilterButton(),
    ];
  };

  const getSecondGridTopRightOptions = () => {
    const components = {
      switch: (
        <Switch
          key="review-non-reviewed-switch"
          id="review-non-reviewed"
          checked={isChecked}
          onChange={(event) => filterStyles()}
          rightLabel=""
          leftLabel={t("inventorysmart.seeNonReviewed")}
        />
      ),
      dialogActions: (
        <DialogActions key="dialog-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              verticalAlign: "center",
            }}
          >
            {props?.tableConfigName === "model_stock_level_2" &&
              props?.canUpdate && (
                <span>
                  <Button
                    variant="secondary"
                    disabled={selectedArticles.length < 2}
                    sx={{ marginLeft: "5px" }}
                    onClick={() => setShowSetAllModal(true)}
                  >
                    {t("inventorysmart.setAll")}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ marginLeft: "5px" }}
                    onClick={saveUpdatedModelStockValue}
                  >
                    {t("inventorysmart.save")}
                  </Button>
                </span>
              )}
            {alertsPopupTableDataCount > 0 && (
              <AlertsRedirectionHandler
                agGridUserInstance={agGridUserInstance}
                tableConfig={props.tableConfigName}
                redirection={props.redirection}
                additionalRedirection={props.additionalRedirection}
                reviewOnly={props.reviewOnly}
                isReviewing={isReviewing}
                canEdit={props.canEdit}
                canCreate={props.canCreate}
                canDeleteAutoAllocations={props?.ddScreenConfigs?.dashboard?.drillDown?.canDeleteAutoAllocations}
                selectedArticles={selectedArticles}
                onReview={handleReviewOnly}
                onDelete={onDelete}
                handleInventoryRedirection={handleInventoryRedirection}
                handleAutoAllocationFinalize={handleAutoAllocationFinalize}
                handleRedirectionToADA={handleRedirectionToADA}
                handleRedirectionToADAMFP={handleRedirectionToADAMFP}
                handleRedirectionToNewStoreSetUp={handleRedirectionToNewStoreSetUp}
              />
            )}
          </div>
        </DialogActions>
      )
    };

    // If selection is disabled, show both components
    if (props?.isSelectionEnabled === false) {
      return [components.switch, components.dialogActions, getAiSmartFilterButton()];
    }

    // Otherwise, show switch when no selection, dialogActions when there are selections
    return selectedArticles.length === 0
      ? [components.switch, getAiSmartFilterButton()]
      : [components.dialogActions, getAiSmartFilterButton()];
  };

  const saveUpdatedModelStockValue = async () => {
    // to remove repetitive records
    let uniqueArr = [
      ...new Set(editedRowRef.current.map((o) => JSON.stringify(o))),
    ].map((s) => JSON.parse(s));
    if (!uniqueArr.length) {
      displaySnackMessages(t("inventorysmart.noChangesToSave"), "warning");
    } else {
      props.setAlertsActionPopupConfigLoader(true);
      try {
        let body = {
          data: {
            values: uniqueArr.map((row) => {
              const value = {};

              props?.updateKeys?.forEach((key) => {
                value[UPDATE_MODEL_STOCK_PAYLOAD_KEY[key]] = row[key];
              });

              return value;
            }),
          },
          url: props?.updateURL,
        };
        await props.updateStoreInventoryModelStockValues(body);
        props.setAlertsActionPopupConfigLoader(false);
        displaySnackMessages(
          t("inventorysmart.updatedSuccessfully"),
          "success"
        );
        setAlertsPopupTableData([]);
        editedRowRef.current = [];
        let updatedDataSum = updateModelStockSum(
          alertsPopupTableData,
          props?.reviewPrefix,
          props?.data?.extra?.index
        );
        props.updateAggModelStock(updatedDataSum);
        props.closeModal();
      } catch (e) {
        handleErrorMessage(e);
        props.setAlertsActionPopupConfigLoader(false);
      }
    }
  };

  const closeSetAllModal = () => {
    setShowSetAllModal(false);
    setModelStockData("");
  };

  const onCellValueChanged = (params) => {
    if (!editedRowRef.current.length) {
      editedRowRef.current = [params.data];
    } else {
      let data = [...editedRowRef.current, params.data];
      editedRowRef.current = data;
    }
  };

  const closeReviewAlerts = () => {
    setExpeditedAllocation(false);
    // warning to be removed later
    if (
      editedRowRef.current.length > 0 &&
      props.tableConfigName === "model_stock_level_2"
    )
      displaySnackMessages(
        t("inventorysmart.changesMadeAreNotSaved"),
        "warning"
      );
    props.closeModal();
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setTableMetaData(manualbody);

    try {
      props.setShowTableLoader(true);

      let excludedFilterValues = props.excludedFilterValues
        ? props.excludedFilterValues
        : [];
      let filters = [...props.selectedFilters];
      if (
        props.storeInventoryAlertsModuleConfig[props.tabValue] ||
        !props.storeInventoryAlertsModuleConfig
      ) {
        filters = [...filters, ...excludedFilterValues];
      }
      let payload = getServerSidePaginationAPIPayload(
        props.alertPopupLink,
        filters,
        manualbody,
        pageIndex,
        props.includeExclusionFilter,
        props.excludeURLObject,
        params,
        props.pageSize
      );
      if(checkedRef.current){
         // True -> Show Only Non reviewed
        payload["data"]["show_non_reviewed"] = true
      }
      if (
        props?.ddScreenConfigs?.dashboard?.drillDown?.alertsToggleForAllocation
      ) {
        // specific to vb
        if (toggle) {
          payload?.data?.meta?.["sort"].push({
            column: "number_of_allocations",
            order: "desc",
          });
        } else {
          payload?.data?.["product_attributes"].push({
            filter_type: "cascaded",
            attribute_name: "number_of_allocations",
            operator: "in",
            dimension: "Product",
            values: [0],
          });
        }
      }
      setDownloadRequestBody(payload?.data);
      let response = await props.getServerSideAlertsData(payload);
      // Fetch and format columns only on the very first server response
      if (!hasFetchedServerSideColumnsRef.current) {
        fetchColumnConfig(response?.data?.data?.columns);
        hasFetchedServerSideColumnsRef.current = true;
      }
      response.data.data.data = response.data.data.data.map((dataItem, index) => {
        dataItem.index = index;
        return dataItem;
      });

      if (response.data.status) {
        if (response.data?.data?.data?.length) {
          let formattedData;
          if (pageIndex) {
            formattedData = agGridRowFormatter(
              response.data.data.data,
              params?.api?.checkConfiguration,
              props.uniqueKey
            );
          } else {
            params.api.setCheckConfiguration([]);
            formattedData = response.data.data.data;
          }

          props.setShowTableLoader(false);
          // alertsPopupTableData is a state which will always be initial value i.e,([]) inside manualCallback, hence using grid instance to fetch previously rendered data
          alertsPopupDataRef.current = [
            // ...alertsPopupTableData,
            ...(agGridUserInstance?.current?.api
              ?.getRenderedNodes()
              ?.map((node) => node?.data)
              ?.filter((rowData) => rowData) || []),
            ...formattedData,
          ];
          setAlertsPopupTableDataCount(response.data.total);
          setReviewLevel(response.data.data.review_level || props.reviewLevel || null);
          return { data: formattedData, totalCount: null };
        } else {
          if (response.data?.show_message)
            displaySnackMessages(response.data?.message, "success");
          props.setShowTableLoader(false);
          return defaultTableData;
        }
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setShowTableLoader(false);
      return defaultTableData;
    }
  };

  const onDelete = () => {
    try {
      props.setStoreInventoryDeleteLoader(true);

      const selectedArticleIds = fetchProductCodes(selectedArticles);

      props.deleteAutoAllocationArticles({
        allocation_code: props?.data?.extra?.plan_code,
        articles: selectedArticleIds,
      });

      let alertsData = alertsPopupTableData.filter((allocationArticles) => {
        const article = fetchProductCode(allocationArticles);
        return selectedArticleIds.indexOf(article) === -1;
      });

      const remainingArticleIds = fetchProductCodes(alertsData);

      setSelectedArticles([]);
      setAlertsPopupTableData([...alertsData]);
      props.updateAlertsTableOnDelete(
        props?.data?.extra?.plan_code,
        remainingArticleIds
      );

      displaySnackMessages(UPDATED_MESSAGE, "success");
      props.closeModal();
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setStoreInventoryDeleteLoader(false);
    }
  };
  useEffect(() => {
    if (hideTable) {
      setLoader(false);
      setHideTable(false);
    }
  }, [hideTable]);

  const toggledSwitch = (_e, val) => {
    if (!props.isPaginatedTableApi) {
      setShowColor(val);
    }
    setToggle(val);
    setLoader(true);
    setHideTable(true);
  };
  const customAlertsData = isChecked ?  alertsPopupTableData.filter((thisAlert) => {
    return !thisAlert?.is_reviewed
  }) : alertsPopupTableData
  return props.active ? (
    <div>
      {showInModal && (
        <div>
          {expeditedAllocation && (
            <ExpeditedAllocation
              setExpeditedAllocation={setExpeditedAllocation}
              redirectionConfigurations={redirectionConfigurations}
            />
          )}
          <BottomSheet
            isBottomSheet
            withExpandIcon={false}
            title={t("inventorysmart.reviewRecommendation")}
            open={props.active}
            size={"medium"}
            onClose={(_event, reason) => {
              setExpeditedAllocation(false);
              if (reason === "backdropClick") {
                return;
              }
              props.closeModal();
              closeReviewAlerts();
            }}
            footerOptions={
              <DialogActions>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    verticalAlign: "center",
                  }}
                >
                  {props?.tableConfigName === "model_stock_level_2" &&
                    props?.canUpdate && (
                      <span>
                        <Button
                          variant="secondary"
                          disabled={selectedArticles.length < 2}
                          sx={{ marginLeft: "5px" }}
                          onClick={() => setShowSetAllModal(true)}
                        >
                          {t("inventorysmart.setAll")}
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          sx={{ marginLeft: "5px" }}
                          onClick={saveUpdatedModelStockValue}
                        >
                          {t("inventorysmart.save")}
                        </Button>
                      </span>
                    )}

            {alertsPopupTableDataCount > 0 && (
              <AlertsRedirectionHandler
                agGridUserInstance={agGridUserInstance}
                tableConfig={props.tableConfigName}
                redirection={props.redirection}
                additionalRedirection={props.additionalRedirection}
                reviewOnly={props.reviewOnly}
                isReviewing={isReviewing}
                canEdit={props.canEdit}
                canCreate={props.canCreate}
                canDeleteAutoAllocations={
                  props?.ddScreenConfigs?.dashboard?.drillDown
                    ?.canDeleteAutoAllocations
                }
                selectedArticles={selectedArticles}
                onReview={handleReviewOnly}
                onDelete={onDelete}
                handleInventoryRedirection={handleInventoryRedirection}
                handleAutoAllocationFinalize={handleAutoAllocationFinalize}
                handleRedirectionToADA={handleRedirectionToADA}
                handleRedirectionToADAMFP={handleRedirectionToADAMFP}
                handleRedirectionToNewStoreSetUp={
                  handleRedirectionToNewStoreSetUp
                }
              />
            )}
          </div>
        </DialogActions>
        }
      >
        <DialogContent>
          <Loader
            loader={
              props.alertsActionPopupConfigLoader ||
              loader
            }
            minHeight={"280px"}
            size = "medium"
          >
        { props?.ddScreenConfigs?.dashboard?.drillDown
                  ?.alertsToggleForAllocation &&
                  !["Auto Allocation"].includes(props.name) && (
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
                    >
                      <div>
                        {
                          // spcific to vb
                          <FormControl component="fieldset">
                            <FormGroup>
                              <FormControlLabel
                                style={{ marginLeft: "2px" }}
                                control={
                                  <Switch
                                    checked={toggle}
                                    onChange={toggledSwitch}
                                  />
                                }
                                label={
                                  (toggle
                                    ? t("inventorysmart.exclude")
                                    : t("inventorysmart.include")) +
                                  " " +
                                  t("inventorysmart.coloredRecords")
                                }
                              />
                            </FormGroup>
                          </FormControl>
                        }
                      </div>
                    </div>
                  )}
                {!hideTable && (
                  <AgGridComponent
                    cardContainer={false}
                    isInsideBottomSheet
                    isBottomSheetExpanded={true}
                    customSystemButton={
                      props.downloadLink && (
                        <DownloadButton
                          url={props.downloadLink}
                          requestBody={downloadRequestBody}
                          disable={!alertsPopupTableDataCount}
                          includeExclusionFilter={props.includeExclusionFilter}
                          excludeURLObject={props.excludeURLObject}
                          columns={alertsPopupTableColumns}
                        />
                      )
                    }
                    topLeftOptions={getAiSmartFilterChips()}
                    topRightOptions={getFirstGridTopRightOptions()}
                    columns={alertsPopupTableColumns}
                    rowdata={
                      !props.isPaginatedPopupApi ? customAlertsData : null
                    }
                    {...(isInfiniteScrolling && props?.tabValue !== "forecast" // adding this condition as for forecast alerts select all is not supported
                      ? {
                          pagination: false,
                          rowModelType: props.isPaginatedPopupApi && "infinite",
                          cacheOverflowSize: 2,
                          // commenting out as select current page records is not shown (to revist later once the changes required are confirmed)
                          // hideSelectCurrentPageRecords: true,
                          // props.isPaginatedPopupApi,
                        }
                      : {
                          rowModelType:
                            props.isPaginatedPopupApi && "serverSide",
                          serverSideStoreType:
                            props.isPaginatedPopupApi && "partial",
                        })}
                    onRowSelected={props.isPaginatedPopupApi}
                    onSelectionChanged={onSelectionChanged}
                    manualCallBack={
                      props.isPaginatedPopupApi &&
                      ((body, pageIndex, params) =>
                        manualCallBack(body, pageIndex, params))
                    }
                    selectAllHeaderComponent={
                      ((props.redirection === "Create Allocation" &&
                        props.canCreate) ||
                        props.canEdit) &&
                      ((props.redirection && props?.isSelectionEnabled) ||
                        props.tableConfigName === "model_stock_level_2")
                    }
                    uniqueRowId={"channel_row_uid"}
                    downloadAsExcel={props?.downloadLink ? false : true}
                    processCellCallbackForExcel={
                      props?.downloadLink ? false : true
                    }
                    loadTableInstance={loadUserTableInstance}
                    onCellValueChanged={onCellValueChanged}
                    allowCustomStyling={true}
                    hideSelectAllRecords={
                      props?.tabValue === "forecast" ||
                      (!isInfiniteScrolling && props.isPaginatedPopupApi)
                    }
                    hideSelectCurrentPageRecords={
                      props?.tabValue !== "forecast" && isInfiniteScrolling
                    }
                    getRowStyle={(params) => {
                      if (
                        props?.ddScreenConfigs?.dashboard?.drillDown
                          ?.alertsToggleForAllocation &&
                        showColor &&
                        params?.data?.["number_of_allocations"] > 0
                      ) {
                        // specific to vb
                        let allocationCount =
                          params?.data?.["number_of_allocations"];
                        return {
                          background:
                            allocationCount > 1 ? "#ffd591" : "#beffb7",
                        };
                      }
                      if (params?.data?.[`${props.reviewPrefix}_is_resolved`]) {
                        return { background: "rgb(57 255 20 / 20%)" };
                      }
                    }}
                    totalCount={alertsPopupTableDataCount} // to set the total count once received from BE
                    cacheBlockSize={props.pageSize}
                    paginationPageSize={props.pageSize}
                  />
                )}
              </Loader>
              {showSetAllModal && (
                <AlertsSetAll
                  closeSetAllModal={closeSetAllModal}
                  handleChange={handleChange}
                  modelStockData={modelStockData}
                  onApply={onApply}
                  showSetAllModal={showSetAllModal}
                />
              )}
            </DialogContent>
          </BottomSheet>
          <StoreArticleInventoryPopup
            active={openStoreArticleInventoryDialog}
            openModal={openStoreArticleInventoryPopUp}
            closeModal={closeStoreArticleInventoryPopUp}
            filters={props.selectedFilters}
            storeAlertData={storeAlertData}
            article={article}
            metric={metric}
            storeDcModal={storeDcModal}
            title={title}
            alertsAllocationActionItem={props?.name}
            customKpiColumn={alertsPopupTableColumns.find(
              (column) => column.column_name === "custom_kpis"
            )}
          />
        </div>
      )}
      {!showInModal && (
        <div>
          {expeditedAllocation && (
            <ExpeditedAllocation
              setExpeditedAllocation={setExpeditedAllocation}
              redirectionConfigurations={redirectionConfigurations}
            />
          )}
          <div>
            <Loader
              loader={
                props.alertsActionPopupConfigLoader ||
                props.dashboardFilterFullScreen ||
                loader
              }
              minHeight={"280px"}
              size="medium"
            >
              {props?.ddScreenConfigs?.dashboard?.drillDown
                ?.alertsToggleForAllocation &&
                !["Auto Allocation"].includes(props.name) && (
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
                  >
                    <div>
                      {
                        // spcific to vb
                        <FormControl component="fieldset">
                          <FormGroup>
                            <FormControlLabel
                              style={{ marginLeft: "2px" }}
                              control={
                                <Switch
                                  checked={toggle}
                                  onChange={toggledSwitch}
                                />
                              }
                              label={
                                (toggle ? "Exclude" : "Include") +
                                " Colored Records"
                              }
                            />
                          </FormGroup>
                        </FormControl>
                      }
                    </div>
                  </div>
                )}
              {!hideTable && (
                <AgGridComponent
                  tableHeader="Review Recommendation"
                  closeButton
                  handleCloseButtonClick={() => {
                    setExpeditedAllocation(false);
                    closeReviewAlerts();
                    props?.setSelectedAlertIndex(-1);
                  }}
                  rowSelection={
                    props.disableMultiSelect ? "single" : "multiple"
                  }
                  height={"300px"}
                  customSystemButton={
                    props.downloadLink && (
                      <DownloadButton
                        url={props.downloadLink}
                        requestBody={downloadRequestBody}
                        disable={!alertsPopupTableDataCount}
                        includeExclusionFilter={props.includeExclusionFilter}
                        excludeURLObject={props.excludeURLObject}
                        columns={alertsPopupTableColumns}
                      />
                    )
                  }
                  topLeftOptions={getAiSmartFilterChips()}
                  topRightOptions={getSecondGridTopRightOptions()}
                  columns={alertsPopupTableColumns}
                  rowdata={
                    !props.isPaginatedPopupApi ? alertsPopupTableData : null
                  }
                  {...(isInfiniteScrolling && props?.tabValue !== "forecast" // adding this condition as for forecast alerts select all is not supported
                    ? {
                        pagination: false,
                        rowModelType: props.isPaginatedPopupApi && "infinite",
                        cacheOverflowSize: 2,
                        // commenting out as select current page records is not shown (to revist later once the changes required are confirmed)
                        // hideSelectCurrentPageRecords: true,
                        // props.isPaginatedPopupApi,
                      }
                    : {
                        rowModelType: props.isPaginatedPopupApi && "serverSide",
                        serverSideStoreType:
                          props.isPaginatedPopupApi && "partial",
                      })}
                  onRowSelected={props.isPaginatedPopupApi}
                  onSelectionChanged={onSelectionChanged}
                  manualCallBack={
                    props.isPaginatedPopupApi &&
                    ((body, pageIndex, params) =>
                      manualCallBack(body, pageIndex, params))
                  }
                  selectAllHeaderComponent={
                    ((props.redirection === "Create Allocation" &&
                      props.canCreate) ||
                      props.canEdit) &&
                    ((props.redirection && props?.isSelectionEnabled) ||
                      props.tableConfigName === "model_stock_level_2")
                  }
                  uniqueRowId={"channel_row_uid"}
                  downloadAsExcel={props?.downloadLink ? false : true}
                  processCellCallbackForExcel={
                    props?.downloadLink ? false : true
                  }
                  loadTableInstance={loadUserTableInstance}
                  onCellValueChanged={onCellValueChanged}
                  allowCustomStyling={true}
                  hideSelectAllRecords={
                    props?.tabValue === "forecast" ||
                    (!isInfiniteScrolling && props.isPaginatedPopupApi)
                  }
                  hideSelectCurrentPageRecords={
                    (props?.tabValue !== "forecast" && isInfiniteScrolling) ||
                    props?.disableMultiSelect
                  }
                  getRowStyle={(params) => {
                    if (
                      props?.ddScreenConfigs?.dashboard?.drillDown
                        ?.alertsToggleForAllocation &&
                      showColor &&
                      params?.data?.["number_of_allocations"] > 0
                    ) {
                      // specific to vb
                      let allocationCount =
                        params?.data?.["number_of_allocations"];
                      return {
                        background: allocationCount > 1 ? "#ffd591" : "#beffb7",
                      };
                    }
                    if (params?.data?.[`${props.reviewPrefix}_is_resolved`]) {
                      return { background: "rgb(57 255 20 / 20%)" };
                    }
                  }}
                  totalCount={alertsPopupTableDataCount} // to set the total count once received from BE
                  cacheBlockSize={props.pageSize}
                  paginationPageSize={props.pageSize}
                />
              )}
            </Loader>
            {showSetAllModal && (
              <AlertsSetAll
                closeSetAllModal={closeSetAllModal}
                handleChange={handleChange}
                modelStockData={modelStockData}
                onApply={onApply}
                showSetAllModal={showSetAllModal}
              />
            )}
          </div>

        <StoreArticleInventoryPopup
          active={openStoreArticleInventoryDialog}
          openModal={openStoreArticleInventoryPopUp}
          closeModal={closeStoreArticleInventoryPopUp}
          filters={props.selectedFilters}
          storeAlertData={storeAlertData}
          article={article}
          metric={metric}
          storeDcModal={storeDcModal}
          title={title}
          alertsAllocationActionItem={props?.name}
          customKpiColumn={alertsPopupTableColumns.find(
          (column) => column.column_name === "custom_kpis"
        )}
        />

        {/* Data Ingestion Warning Dialog */}
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

        {/* Missing Channels blocking dialog - gates ADA navigation */}
        <Prompt
          isOpen={showMissingChannelDialog}
          title={t("inventorysmart.missingChannelsDialogTitle")}
          variant="warning"
          children={<div>{t("inventorysmart.missingChannelsDialogMessage")}</div>}
          secondaryButtonLabel={`${t("inventorysmart.viewMissing")} (${missingChannelRows.length})`}
          // secondaryButtonProps={{ variant: "secondary" }}
          onSecondaryButtonClick={() => {
            setShowMissingChannelDialog(false);
            setShowMissingChannelDrawer(true);
          }}
          handleClose={() => setShowMissingChannelDialog(false)}
        />

        <MissingChannelsPanel
          open={showMissingChannelDrawer}
          onClose={() => setShowMissingChannelDrawer(false)}
          missingRows={missingChannelRows}
        />
      </div>)}
    </div>
  ) : null;
});

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    alertsActionPopupConfigLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionPopupConfigLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDecisionDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
      "decisionDashboardFilterConfiguration"
      ],
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    storeInventoryAlertsTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableData,
    dashboardFilterFullScreen:
      store.inventorysmartReducer.inventorySmartDashboardService
        .dashboardFilterFullScreen,
    excludedFilterValues:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filter_attribute_exclusion_values,
    filterDependencyData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .filterDependencyData,
    storeInventoryAlertsModuleConfig:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        ?.dashboard?.drillDown?.exclusionFilters,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    articleKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.articleKey,
    alertsUniqueIdNavigationKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.alertsUniqueIdNavigationKey    
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAlertsActionTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionPopupConfigLoader: (payload) =>
    dispatch(setAlertsActionPopupConfigLoader(payload)),
  setStoreInventoryDeleteLoader: (payload) =>
    dispatch(setStoreInventoryDeleteLoader(payload)),
  setInventoryDashboardAlertCount: (payload) =>
    dispatch(setInventoryDashboardAlertCount(payload)),
  reviewAlerts: (payload) => dispatch(reviewAlerts(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  updateStoreInventoryModelStockValues: (payload) =>
    dispatch(updateStoreInventoryModelStockValues(payload)),
  fetchStoreCodesForAlert: (payload) =>
    dispatch(fetchStoreCodesForAlert(payload)),
  deleteAutoAllocationArticles: (payload) =>
    dispatch(deleteAutoAllocationArticles(payload)),
  getServerSideAlertsData: (payload) =>
    dispatch(getServerSideAlertsData(payload)),
  setStoreInventoryAlertsTableData: (payload) =>
    dispatch(setStoreInventoryAlertsTableData(payload)),
  setDashboardLoaderFullScreen: (payload) =>
    dispatch(setDashboardLoaderFullScreen(payload)),
  getAllocate: (payload) => dispatch(getAllocate(payload)),
  setReviewedAlerts: (payload) => dispatch(setReviewedAlerts(payload)),
  setRefetchAlerts: (payload) => dispatch(setRefetchAlerts(payload)),
  setCreateAllocationFilterDetails: (payload) =>
    dispatch(setCreateAllocationFilterDetails(payload)),
  setSelectedFiltersCreateAllocation: (payload) =>
    dispatch(setSelectedFiltersCreateAllocation(payload)),
  checkIngestionStatus: (payload) => dispatch(checkIngestionStatus(payload)),
  getForecastMissingChannels: (payload) =>
    dispatch(getForecastMissingChannels(payload)),
  setCreateStoreTransferFilterDetails: (payload) =>
    dispatch(setCreateStoreTransferFilterDetails(payload)),
  setSelectedFiltersCreateStoreTransfer: (payload) =>
    dispatch(setSelectedFiltersCreateStoreTransfer(payload)),
  setCreateStoreTransferFilterDependency: (payload) =>
    dispatch(setCreateStoreTransferFilterDependency(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(AlertsActionPopup);
