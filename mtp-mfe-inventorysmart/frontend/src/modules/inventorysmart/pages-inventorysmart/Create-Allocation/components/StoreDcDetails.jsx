import { Paper, Tab, Tabs, Typography } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "../../../../../core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useCallback, useEffect, useRef, useState } from "react";
import { cloneDeep, isEmpty, isNil, orderBy } from "lodash";
import {
  checkValidationForArticles,
  getEffectiveChannelKey,
  getPollingRequest,
  getRequestForStoreAndDC,
  getUpdatedRows,
  getValuesFromObject,
  mutateStoreGroupCode,
  removeDuplicates,
  roundZeroDecimal,
} from "../helperFunctions";
import { connect } from "react-redux";
import {
  createAllocationApi,
  getAllocate,
  getDCs,
  getOHStoreSize,
  getStores,
  saveDraft,
  setArticleTableLoader,
  setIsFiltersValid,
  setStoreDcTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getModuleBasedTenantConfig } from "../../../services-inventorysmart/common/inventory-smart-common-services";
import { setNotifications } from "core/actions/notificationActions";
import { scrollIntoView } from "../../inventorysmart-utility";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  ERROR_MESSAGE,
  TABLE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import clsx from "clsx";
import StoreDetails from "./StoreDetails";
import DcDetails from "./DcDetails";
import CircularProgress, {
  circularProgressClasses,
} from "@mui/material/CircularProgress";
import StoreSizeOHModal from "./StoreSizeOHModal";
import ViewTablePopUp from "../../Common/components/ViewTablePopUp";
import { getStoreDetailsAtSizes } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import { inventoryData } from "../../Common/components/commonFunctions";
import Validation from "./Validation";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { ButtonGroup } from "impact-ui-v3";
import { Select } from "impact-ui-v3";

const REVIEWED_ARTICLES_MAPPING_TO_PREP_APPLYALL_REQUEST = {
  store_code: "store_list",
  ref_store: "reference_store_list",
  store_index: "store_index",
  "aps/ros": "aps/ros",
  wos_rounded: "wos_rounded",
  delta_store_flag: "delta_store_flag",
};

const StoreDcDetails = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const { articleTableGridInstance } = props;

  const [tabValue, setTabValue] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState({});
  const [articles, setArticles] = useState([]);
  const [storeRequest, setStoreRequest] = useState({});
  const [dcRequest, setDcRequest] = useState({});
  const [pollingReq, setPollingReq] = useState([]);
  const [storeColumnm, setStoreColumns] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [dcColumns, setDCColumns] = useState([]);
  const [dcData, setDCData] = useState([]);
  const [storeResponse, setStoreResponse] = useState({});
  const [dcResponse, setDCResponse] = useState({});
  const [render, setRender] = useState(false);
  const [updatedRows, setUpdatedRows] = useState({});
  const [updatedStores, setUpdatedStores] = useState({});
  const [updatedDcs, setUpdatedDcs] = useState({});
  const [selectedRows, setSelectedRows] = useState({});
  const [updatedStoresStoreGroup, setUpdatedStoresStoreGroup] = useState([]);
  const [updatedStoresDcs, setUpdatedStoresDcs] = useState([]);
  const [
    updatedStoresProductProfile,
    setUpdatedStoresProductProfile,
  ] = useState([]);
  const [
    displayedAndHiddenCheckedRows,
    setDisplayedAndHiddenCheckedRows,
  ] = useState({});
  const [totalEstimatedDemad, setTotalEstimatedDemad] = useState(null);
  const [eligibleStoresCount, setEligibleStoresCount] = useState(null);
  const [dcInvChanges, setDCInvChanges] = useState(false);
  const [polledResults, setPolledResults] = useState([]);
  const [modalColumns, setModalColumns] = useState({});
  const [modalData, setModalData] = useState({});
  const [storeDetails, setStoreDetails] = useState({});
  const [modalLoader, setModalLoader] = useState(false);
  const [openPopup, setOpenPopup] = useState(false);
  const storeGridInstance = useRef(null);
  const dcGridInstance = useRef(null);
  const storeDetailsRef = useRef();
  const [openViewPopup, setOpenViewPopup] = useState(false);
  const [sizeCols, setSizeCols] = useState(null);
  const [sizeRowData, setSizeRowData] = useState(null);
  const [sizeTitle, setSizeTitle] = useState(null);
  const [hiddenTabs, setHiddenTabs] = useState([]);
  const [
    articlesWithValidationError,
    setArticlesWithValidationError,
  ] = useState({
    articlesWithValidationError: [],
    validationErrorMessage: "",
    articlesListWithAllPossibleValidation: [],
  });
  const [excludedArticles, setExcludedArticles] = useState([]);
  const [isStoreBand, setIsStoreBand] = useState(props.isStoreBand);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState(
    props?.selectedArticle
  );
  const [isOpen, setIsOpen] = useState(false);
  const [uniqueKeyArticleTable, setUniqueKeyArticleTable] = useState();
  const [allocationDetails, setAllocationDetails] = useState([]);
  // Use a ref to track the last selected article to prevent duplicate calls
  const lastSelectedArticleRef = useRef(null);
  const lastArticleValueRef = useRef(null);
  // Fallbacks from persisted Redux state when table instance/refs are unavailable
  const persistedDisplayedHidden =
    props.articleAgGridParams?.displayedAndHiddenCheckedRows || {};
  const storesForSelectedStoreFiltersFallback =
    props.storesForSelectedStoreFilters ||
    props.articleAgGridParams?.storesForSelectedStoreFilters;
  const storeGroupStoreMapFallback =
    props.storeGroupStoreMap || props.articleAgGridParams?.storeGroupStoreMap;
  const defaultStoreGroupCodeVal =
    props.defaultStoreGroupCode?.current?.[0]?.attribute_value ||
    props.articleAgGridParams?.defaultStoreGroupCodeValue;

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getChannelValues = () => {
    try {
      const candidateKeys = [
        getEffectiveChannelKey(props.createAllocationProps, props.channelKey),
        props.channelKey,
        "product_channel",
        "l1_name",
        "channel",
      ].filter(Boolean);
      for (const key of candidateKeys) {
        const match = props.selectedFilters?.find(
          (f) => f.attribute_name === key
        );
        if (match && match.values?.length) return match.values;
      }
      if (props.defaultProductChannel) {
        return Array.isArray(props.defaultProductChannel)
          ? props.defaultProductChannel
          : [props.defaultProductChannel];
      }
      return [];
    } catch (_e) {
      return [];
    }
  };

  /**
   * Utility function to add customl0nameFilter to filters if it exists
   * @param {Array} filters - The filters array to add the customl0nameFilter to
   * @return {Array} - The updated filters array with customl0nameFilter added if applicable
   */
  const addCustomL0NameFilter = (filters) => {
    // Create a copy of the filters array to avoid mutating the original
    const filtersArray = [...filters];

    if (props.customl0nameFilter) {
      filtersArray.push({
        filter_type: "cascaded",
        attribute_name: "l0_name",
        operator: "in",
        dimension: "Product",
        values: [props.customl0nameFilter],
      });
    }

    return filtersArray;
  };

  const pollingToGetAllArticles = async (p_req) => {
    props.expeditedFlow && props.setArticleTableLoader(true);
    let response = await props.getAllocate(p_req);
    let l_updatedRows =
      articleTableGridInstance?.current?.api?.updatedRows || null;
    let l_responseData = response.data?.data || [],
      l_updatedResponse;
    l_responseData = mutateStoreGroupCode(
      l_responseData,
      defaultStoreGroupCodeVal,
      null,
      null,
      props.type
      // ?.[props.channel]
    );
    if (l_updatedRows && l_responseData.length)
      l_updatedResponse = getUpdatedRows(
        l_responseData,
        l_updatedRows,
        storeGroupStoreMapFallback,
        storesForSelectedStoreFiltersFallback
      );
    else l_updatedResponse = cloneDeep(l_responseData);
    let l_updatedSelectedResponse = l_updatedResponse?.filter(
      (row) => row.is_selected
    );
    prepareRequest(l_updatedSelectedResponse);
    setPolledResults((old) => {
      return [...old, ...l_updatedSelectedResponse];
    });
    if (+l_responseData.length === p_req.meta.limit.limit) {
      let l_body = { ...p_req, ...getIsValidDraft() };
      l_body.meta.limit.page = +response.data.page + 1;
      l_body.meta.limit.offset = +response.data.offset;
      pollingToGetAllArticles(l_body);
    } else {
      let l_pollingReq = [...pollingReq];
      l_pollingReq.shift();
      setPollingReq(l_pollingReq);
    }
  };

  const getAllArticles = async (p_body) => {
    let l_searchTermForpolling = p_body[0]?.searchColumns;
    let l_hiddenArticles = p_body[0]?.articles || [];
    props.isRedirectedFromDifferentPage &&
      l_hiddenArticles.push(...props.createAllocationArticles);
    let toSearchKeys = [],
      l_filters = cloneDeep(props.selectedFilters),
      toSortKey = [];
    if (!isEmpty(l_searchTermForpolling)) {
      let keyList = Object.keys(l_searchTermForpolling);
      keyList.forEach((filterKey) => {
        toSearchKeys.push({
          column: filterKey,
          pattern: l_searchTermForpolling[filterKey].filter,
        });
      });
    }
    // has to be moved to search key inside meta
    else if (!isEmpty(l_hiddenArticles)) {
      l_filters.push({
        filter_type: "cascaded",
        attribute_name: "article",
        operator: "in",
        dimension: "Product",
        values: l_hiddenArticles,
      });
    }
    let body = {
      search: toSearchKeys,
      range: [],
      sort: toSortKey,
    };
    let channel = getChannelValues();
    let l_req = {
      meta: {
        ...body,
        limit: { limit: 100, page: 1, offset: 0 },
      },
      selection:
        articleTableGridInstance.current?.api?.checkConfiguration ||
        props.articleAgGridParams?.selection,
      channel: channel,
      set_all: props.checkAllSetAllRequest || props.articleAgGridParams?.setAll,
      filters: addCustomL0NameFilter(l_filters),
      po_id: props.poCode ? [props.poCode] : props.poCode,
      filtered_selection: !isEmpty(props.filteredSelection)
        ? props.filteredSelection
        : [],
      popupLink: props.popUpLinkFromDashbaord,
      ...getIsValidDraft(),
      cache_key: props.cacheKeyRef?.current,
    };
    pollingToGetAllArticles(l_req);
  };

  const prepareRequest = (p_dispalyedRows) => {
    let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
    let articleKey = isStoreBand ? "article" : "style";
    articleKey = props.articleKey ? props.articleKey : articleKey;
    setUniqueKeyArticleTable(articleKey);
    let l0name = props.selectedFilters?.filter(
      (filter) => filter.attribute_name === "l0_name"
    )[0]?.values;
    let customl0name = props.customl0nameFilter
      ? [props.customl0nameFilter]
      : l0name;
    // l1_name is config driven and only for tapestry; omit from payload when unset
    let l1NameForRequest = null;
    if (props.isL1ValueInAllocation) {
    l1NameForRequest = props.selectedFilters?.filter(
      (filter) => filter.attribute_name === "l1_name"
    )[0]?.values;
  }
    const { l_storeRequest, l_dcRequest } = getRequestForStoreAndDC(
      p_dispalyedRows,
      storesForSelectedStoreFiltersFallback,
      getChannelValues(),
      props.poCode,
      null,
      Boolean(props.createAllocationProps?.isDOSAvailable),
      props.selectedFilters?.find(
        (filter) => filter.attribute_name === "s1_name"
      ),
      null,
      customl0name,
      props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "psa_name"
      )[0]?.values,
      articleKey,
      isStoreBand,
      l1NameForRequest
    );

    setStoreRequest((old) => {
      return { ...old, ...l_storeRequest };
    });
    setDcRequest((old) => {
      return { ...old, ...l_dcRequest };
    });
  };

  const resetState = () => {
    setStoreRequest({});
    setDcRequest({});
    setStoreResponse({});
    setDCResponse({});
    setPollingReq([]);
    setUpdatedRows({});
    setUpdatedStores({});
    setUpdatedDcs({});
    setSelectedRows({});
    setUpdatedStoresStoreGroup([]);
    setUpdatedStoresDcs([]);
    setTotalEstimatedDemad(null);
    setEligibleStoresCount(null);
    setPolledResults([]);
    setModalColumns({});
    setModalData({});
    setStoreDetails({});
    setModalLoader(false);
    setOpenPopup(false);
  };

  const reviewStoreAndDc = () => {
    resetState();
    let l_dispalyedRows = [];
    let l_pollingReq = [];
    if (articleTableGridInstance && articleTableGridInstance.current) {
      let req = getPollingRequest(
        articleTableGridInstance,
        props.articleAgGridParams.displayedAndHiddenCheckedRows
      );
      l_dispalyedRows = req.l_dispalyedRows;
      l_pollingReq = req.l_pollingReq;
    } else {
      const displayedRows = persistedDisplayedHidden.displayedRows || [];
      const hiddenRows = persistedDisplayedHidden.hiddenRows || [];
      l_dispalyedRows = cloneDeep(displayedRows);
      if (!isEmpty(hiddenRows)) {
        l_pollingReq.push({
          hiddenCheckedRows: true,
          articles: hiddenRows.map((val) => val.article),
          hiddenRows: hiddenRows,
        });
      }
    }
    if (isEmpty(l_pollingReq) && props.expeditedFlow) {
      createAllocation();
    }
    let l_hiddenRows = l_pollingReq?.find((row) => row?.hiddenCheckedRows)
      ?.hiddenRows;
    setDisplayedAndHiddenCheckedRows({
      hiddenRows: l_hiddenRows,
      displayedRows: l_dispalyedRows,
    });
    if (isEmpty(l_dispalyedRows)) {
      l_dispalyedRows = cloneDeep([l_hiddenRows[0]]);
    }
    let articleKey = isStoreBand ? "article" : "style";
    articleKey = props.articleKey ? props.articleKey : articleKey;
    let l_selectedArticle =
      l_dispalyedRows?.[0]?.[articleKey] || l_dispalyedRows?.[0]?.["article"];
    setPollingReq(l_pollingReq);
    const selectedRows = [
      ...(props?.draftResult?.displayedAndHiddenCheckedRows?.displayedRows ||
        []),
      ...(props?.draftResult?.displayedAndHiddenCheckedRows?.hiddenRows || []),
    ];
    // when article table data is modified, then we need to pass the changed values
    prepareRequest(l_dispalyedRows);
    setSelectedArticle({
      label: replaceSpecialCharacter(l_selectedArticle),
      value: l_selectedArticle,
      id: l_selectedArticle,
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

  const getStoreDetails = async (p_selectedArticle) => {
    let l_storeResponse = {};
    if (storeResponse[p_selectedArticle]) {
      l_storeResponse = storeResponse[p_selectedArticle];
    } else {
      try {
        let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
        let channel = props.selectedFilters?.filter(
          (filter) => filter.attribute_name === channelKey && filter.dimension.toLowerCase() === 'product'
        )?.[0]?.values;

        // Create a copy of the store request object
        let storeRequestPayload = { ...storeRequest[p_selectedArticle] };

        // If allocation type is "asn", remove dc_codes from the payload
        if (
          storeRequestPayload.alloc_type === "asn" &&
          storeRequestPayload.dc_codes
        ) {
          const { dc_codes, ...restOfStoreRequest } = storeRequestPayload;
          storeRequestPayload = restOfStoreRequest;
        }
        let channelData =
          channel?.length > 0
            ? channel
            : props.defaultProductChannel
            ? props.defaultProductChannel
            : ["NC"];

        // skip API call if we don't have valid store request payload
        if (isEmpty(storeRequestPayload)) {
          return {};
        }
        
        props.setStoreDcTableLoader(true);
        let l_apiResponse = await props.getStores([
          {
            ...storeRequestPayload,
            ...getIsValidDraft(),
            product_channel: channelData,
            //temp change: use Redux cacheKey for when the redirection from step 3 to step 2 Review store and DC
            cache_key: props.backButtonClicked ? (props.cacheKey || props.cacheKeyRef?.current) : props.cacheKeyRef?.current,
          },
        ]);

        if (l_apiResponse.data.status) {
          let l_apiResponseData = l_apiResponse.data.data.data?.map(
            (store, ind) => {
              const is_selected = props.backButtonClicked
                ? props?.draftResult?.changed_rows?.changed_articles_store?.[
                    p_selectedArticle
                  ]
                  ? props.draftResult.changed_rows.changed_articles_store[
                      p_selectedArticle
                    ].hasOwnProperty(store.store_code)
                  : true
                : true;
              return {
                ...store,
                is_selected,
                store_code: store.store_code
                  ? store.store_code
                  : store.psa_name,
                wos_rounded: Boolean(props?.createAllocationProps?.isDOSAvailable) ? (store.wos_rounded ? store.wos_rounded * 7 : null) : store.wos_rounded,
                // props.storesForSelectedStoreFilters?.includes(
                //   store.store_code
                // ),
              };
            }
          );
          l_storeResponse["data"] = orderBy(
            l_apiResponseData,
            "is_selected",
            "desc"
          );
          l_storeResponse["columns"] = l_apiResponse.data.data.columns;
          let l_storeColumnsWithAction = getActionColumns(
            cloneDeep(l_storeResponse.columns)
          );
          let isStoreBandLevel = l_storeResponse.columns.filter(
            (item) => item.column_name === "psa_name"
          );
          isStoreBandLevel = isStoreBandLevel.length > 0 ? true : false;
          l_storeResponse.columns = l_storeResponse.columns.map((item) => {
            if (
              item.column_name === "min_stock" ||
              item.column_name === "max_stock"
            ) {
              item.sub_headers = item.sub_headers.map((sub) => {
                sub.type = "int";
                return sub;
              });
            }
            if (item.column_name === "constraint") {
              item.sub_headers = item.sub_headers.map((sub) => {
                if (sub.column_name === "wos_rounded") {
                  sub.type = "int";
                  sub.extra = { ...sub.extra, min: 1 };
                }
                return sub;
              });
              item.type = "int";
            }
            return item;
          });
          setIsStoreBand(isStoreBandLevel);
          setStoreColumns(
            agGridColumnFormatter(
              l_storeResponse.columns,
              null,
              l_storeColumnsWithAction
            )
          );
        } else if (l_apiResponse?.data?.show_message) {
          displaySnackMessages(l_apiResponse?.data?.message, "error");
        }
      } catch (err) {
        handleErrorMessage(err);
      } finally {
        props.setStoreDcTableLoader(false);
      }
    }
    return l_storeResponse;
  };
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };
  // api call for dc details
  const getDcDetails = async (p_selectedArticle) => {
    let l_dcResponse;
    if (dcResponse[p_selectedArticle]) {
      l_dcResponse = dcResponse[p_selectedArticle];
    } else {
      try {
        // Create a copy of the dc request object
        let dcRequestPayload = { ...dcRequest[p_selectedArticle] };
        const allocType = storeRequest[p_selectedArticle]?.alloc_type;

        // Conditionally remove keys based on allocation type
        if (allocType === "asn" && dcRequestPayload.dc_codes) {
          const { dc_codes, ...restOfDcRequest } = dcRequestPayload;
          dcRequestPayload = restOfDcRequest;
        } else if (allocType !== "asn" && dcRequestPayload.asn_ids) {
          const { asn_ids, ...restOfDcRequest } = dcRequestPayload;
          dcRequestPayload = restOfDcRequest;
        }

        let l_apiResponse = await props.getDCs([
          {
            ...dcRequestPayload,
            ...getIsValidDraft(),
            alloc_type: allocType,
          },
        ]);

        if (l_apiResponse.data.status) {
          l_dcResponse = l_apiResponse.data.data;
        }
      } catch (err) {
        handleErrorMessage(err);
      }
    }
    return l_dcResponse;
  };

  const totalEstimateDemandSetter = (p_selectedRows) => {
    let l_totalEstimatedDemad = 0;
    let totalStore = 0;
    (p_selectedRows || []).forEach((val) => {
      l_totalEstimatedDemad += Number(roundZeroDecimal(val.estimated_demand));
      totalStore = totalStore + (val.store_count || 1);
    });
    setTotalEstimatedDemad(l_totalEstimatedDemad);
    setEligibleStoresCount(totalStore);
  };

  const getSelectedStoreCodesForTotals = () => {
    const selectedStoreCodes = new Set();
    const api = storeGridInstance.current?.api;

    if (api) {
      api.forEachNode((node) => {
        if (node.selected && node.data?.store_code != null) {
          selectedStoreCodes.add(String(node.data.store_code));
        }
      });
      return selectedStoreCodes;
    }

    if (!isEmpty(selectedRows)) {
      Object.keys(selectedRows).forEach((storeCode) => {
        selectedStoreCodes.add(String(storeCode));
      });
    }
    return selectedStoreCodes;
  };

  const onClickHandlerForLink = async (p_data, p_column, item) => {
    let response = {};
    setOpenViewPopup(true);
    setModalLoader(true);
    setSizeTitle(item.label);
    const mapped_col = item?.extra?.mapped_column;
    const obj = {
      metric: mapped_col ? mapped_col : p_column,
      endPoint: props.getStoreDetailsAtSizes,
      body: {
        filters: props.selectedFilters,
        article: selectedArticle.value,
      },
    };
    response = await inventoryData(obj, {}, props.type);
    if (response.error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      setModalLoader(false);
      return;
    }
    setSizeCols(response.columns);
    let row_data = response.data?.filter((item) => {
      if (item.store_code === p_data.store_code) return item;
    });
    setSizeRowData(row_data);
    setModalLoader(false);
    //   setStoreDetails({ ...p_data, metric: p_column });
    //   setOpenPopup(true);
  };

  const getActionColumns = (p_columns) => {
    let linkTypeCols = [];
    p_columns.forEach((item) => {
      if (item.type === "link") linkTypeCols.push(item);
    });
    let linkTypeColNames = linkTypeCols.map((obj) => obj.column_name);
    let actionObject = linkTypeColNames.map((colNames) => {
      return {
        [colNames]: onClickHandlerForLink,
      };
    });
    return Object.assign({}, ...actionObject);
  };

  const getStoresAndDc = async (p_selectedArticle) => {
    // skip if no valid selectedArticle or value
    if (!p_selectedArticle || !p_selectedArticle.value) {
      return;
    }
    setRender(false);
    props.setStoreDcTableLoader(true);
    try {
      if (tabValue === 1) {
        let l_storeResponse = await getStoreDetails(p_selectedArticle.value);
        if (isEmpty(l_storeResponse)) {
          setRender(true);
          props.setStoreDcTableLoader(false);
          return;
        }
        setStoreData(l_storeResponse.data);
        let l_storeColumnsWithAction = getActionColumns(
          cloneDeep(l_storeResponse.columns)
        );
        setStoreColumns(
          agGridColumnFormatter(
            l_storeResponse.columns,
            null,
            l_storeColumnsWithAction
          )
        );
        totalEstimateDemandSetter(
          l_storeResponse.data.filter((row) => row.is_selected)
        );
        let initialSelectedRows = {};
        l_storeResponse.data.forEach(row => {
          if (row.is_selected) {
            initialSelectedRows[row.store_code] = {...row, is_selected: true};
          }
        });
        setSelectedRows(initialSelectedRows);
      }
      if (tabValue === 2) {
        let l_dcResponse = await getDcDetails(p_selectedArticle.value);
        setDCColumns(agGridColumnFormatter(l_dcResponse.columns));
        setDCData(l_dcResponse.data);
      }
      !props.isRedirectedFromDifferentPage && scrollIntoView(storeDetailsRef);
    } catch (e) {
      if (tabValue === 1) {
        setStoreColumns([]);
        setStoreData([]);
      }
      if (tabValue === 2) {
        setDCColumns([]);
        setDCData([]);
      }
    } finally {
      setRender(true);
      props.setStoreDcTableLoader(false);
      props.setButtonEnabled && props.setButtonEnabled(true);
    }
  };

  const loadTableInstance = (params) => {
    storeGridInstance.current = params;
  };

  const loadDCTableInstance = (params) => {
    dcGridInstance.current = params;
  };

  const saveStoreDcResponse = () => {
    let l_data = [],
      l_dcData = [],
      l_request = storeRequest[selectedArticle.value];
    if (tabValue == 1) {
      storeGridInstance?.current?.api?.forEachNode((node) => {
        l_data.push({ ...node.data, is_selected: node.selected });
      });
      setStoreResponse((old) => {
        return {
          ...old,
          [selectedArticle.value]: { data: l_data, columns: storeColumnm },
        };
      });
      if (!isEmpty(updatedRows) || !isEmpty(selectedRows)) {
        setUpdatedStores((old) => {
          return {
            ...old,
            [selectedArticle.value]: {
              ...updatedRows,
              ...selectedRows,
            },
          };
        });
        setUpdatedStoresStoreGroup((old) => {
          return l_request?.store_group_code
            ? [...old, ...l_request.store_group_code]
            : [];
        });

        setUpdatedStoresDcs((old) => [...old, ...(l_request?.DC_Codes || [])]);
        setUpdatedStoresProductProfile((old) => [
          ...old,
          l_request.product_profile_code,
        ]);
      }
    }
    if (tabValue == 2) {
      dcGridInstance?.current?.api?.forEachNode((node) => {
        l_dcData.push(node.data);
      });
      setDCResponse((old) => {
        return {
          ...old,
          [selectedArticle.value]: { data: l_dcData, columns: dcColumns },
        };
      });
      if (!isEmpty(updatedRows)) {
        setUpdatedDcs((old) => {
          return {
            ...old,
            [selectedArticle.value]: {
              ...old[selectedArticle.value],
              ...updatedRows,
            },
          };
        });
      }
    }
    setUpdatedRows({});
    setSelectedRows({});
  };

  const onTabChangeHandler = async (_event, p_tabValue) => {
    saveStoreDcResponse();
    props.setStoreDcTableLoader(true);
    try {
      if (p_tabValue === 1) {
        let l_storeResponse = await getStoreDetails(selectedArticle.value);
        // Note: getStoreDetails already applies the recalculation, so we don't need to apply it again here
        setStoreData(l_storeResponse.data);
      }
      if (p_tabValue === 2) {
        let l_dcResponse = await getDcDetails(selectedArticle.value);
        setDCColumns(agGridColumnFormatter(l_dcResponse.columns));
        setDCData(l_dcResponse.data);
      }
    } catch {
    } finally {
      props.setStoreDcTableLoader(false);
    }
    setTabValue(p_tabValue);
  };

  const onArticleChange = (p_selectedOption) => {
    // Ignore deselect (null) or re-click of the already selected option
    if (
      isNil(p_selectedOption) ||
      !p_selectedOption.value ||
      p_selectedOption.value === selectedArticle?.value
    ) {
      return;
    }
    saveStoreDcResponse();
    setSelectedArticle(p_selectedOption);
  };

  const getReviewedStoreDetails = () => {
    let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);

    let l_storeArticleData = [],
      l_channel = [],
      l_selectedCahnnel = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === channelKey
      )[0]?.values;
    let l_selected_l0_name = props.selectedFilters?.filter(
      (filter) => filter.attribute_name === "l0_name"
    )[0]?.values;
    storeGridInstance.current.api.forEachNode((node) => {
      l_storeArticleData.push(node.data);
      l_channel.push(l_selectedCahnnel);
    });
    return {
      ...getValuesFromObject(
        l_storeArticleData,
        REVIEWED_ARTICLES_MAPPING_TO_PREP_APPLYALL_REQUEST
      ),
      channel: l_channel,
      l0_name:
        l_selected_l0_name?.length > 0
          ? l_selected_l0_name[0]
          : props.customl0nameFilter,
    };
  };

  const applyChanges = async () => {
    setRender(false);
    props.setStoreDcTableLoader(true);
    try {
      let l_req = {
        ...storeRequest[selectedArticle.value],
        ...getReviewedStoreDetails(),
      };
      delete l_req.channel;
      let channelData =
        l_req?.product_channel?.length > 0
          ? l_req?.product_channel
          : props.defaultProductChannel
          ? props.defaultProductChannel
          : ["NC"];
      let l_storeResponse = await props.getStores([
        {
          ...l_req,
          ...getIsValidDraft(),
          product_channel: channelData,
          cache_key: props.cacheKeyRef?.current,
        },
      ]);
      processStoreResponse(l_storeResponse);
    } catch (err) {
      console.log("🚀 ~ applyChanges ~ err:", err);
      setStoreData([]);
      handleErrorMessage(err);
    } finally {
      setRender(true);
      props.setStoreDcTableLoader(false);
    }
  };

  const processStoreResponse = (l_storeResponse, successMessage) => {
    if (l_storeResponse.data.status) {
      let l_storeColumnsWithAction = getActionColumns(
        cloneDeep(l_storeResponse.data.data.columns)
      );
      setStoreColumns(
        agGridColumnFormatter(
          l_storeResponse.data.data.columns,
          null,
          l_storeColumnsWithAction
        )
      );
      const gridApi = storeGridInstance.current?.api;
      const selectedStoreCodes = getSelectedStoreCodesForTotals();
      const useGridSelection = Boolean(gridApi);

      const storeData = l_storeResponse.data?.data?.data?.map((store) => {
        const storeCode = store.store_code ? store.store_code : store.psa_name;
        const is_selected = useGridSelection
          ? selectedStoreCodes.has(String(storeCode))
          : store.is_selected !== false;

        return {
          ...store,
          store_code: storeCode,
          is_selected,
        };
      });

      const selectedRowsForTotals = storeData.filter((row) => row.is_selected);

      setStoreData(storeData);
      totalEstimateDemandSetter(selectedRowsForTotals);

      const selectedRowsStoreCodeMapping = {};
      selectedRowsForTotals.forEach((row) => {
        selectedRowsStoreCodeMapping[row.store_code] = {
          ...row,
          is_selected: true,
        };
      });
      setSelectedRows(selectedRowsStoreCodeMapping);

      displaySnackMessages(
        successMessage || l_storeResponse.data.message,
        "success"
      );

      if (useGridSelection && gridApi) {
        requestAnimationFrame(() => {
          let selectionSyncTriggered = false;
          gridApi.forEachNode((node) => {
            if (!node.data?.store_code) return;
            const shouldSelect = selectedStoreCodes.has(
              String(node.data.store_code)
            );
            if (shouldSelect && !selectionSyncTriggered) {
              selectionSyncTriggered = true;
              node.setSelected(true);
            } else {
              node.setSelected(shouldSelect, false, true);
            }
          });
        });
      }
    }
  };

  useEffect(() => {
    if(props.allocationType === "draft" && !isEmpty(props?.draftAllocationDetails)) {
      // Handle changed_articles as an object of key-value pairs
      const tempChangedArticles = Object.entries(props?.draftAllocationDetails?.changed_rows?.changed_articles || {}).map(([key, item]) => {
        return {
          [uniqueKeyArticleTable]: item[uniqueKeyArticleTable] || key,
          dcs_options: item?.dcs_options,
          dcs: item?.dcs,
          mapped_stores: item?.mapped_stores,
          is_selected: true
        };
      });
      const tempSelectedStores = Object.entries(props?.draftAllocationDetails?.changed_rows?.changed_articles_store || {}).map(([key, item]) => {
        return {
          [uniqueKeyArticleTable]: key,
          stores: Object.keys(item),
        };
      });
      const changedArticles = tempChangedArticles.map(item => {
        const selectedStore = tempSelectedStores.find(store => store[uniqueKeyArticleTable] === item[uniqueKeyArticleTable]);
        if(selectedStore){
          return {
            ...item,
            mapped_stores: selectedStore?.stores,
          };  
        } 
        return item;
      });
      setAllocationDetails(changedArticles);
    }
    if (props?.articleTableGlobalInstance?.current?.length > 0 && props?.allocationType !== "draft") {
      const selectedRows = props?.articleTableGlobalInstance?.current?.filter((item) => item.is_selected);
      const uniqueSelectedRowsData = selectedRows.map((row) => {
        //unique key based on available fields
        const uniqueKey = uniqueKeyArticleTable;
        return {
          [uniqueKey]: row[uniqueKey],
          dcs_options: row.dcs_options,
          dcs: row.dcs,
          mapped_stores: row.mapped_stores,
          is_selected: row.is_selected,
          sizes: row.sizes,
          unique_key: uniqueKey
        };
      });
      setAllocationDetails(uniqueSelectedRowsData);
    }
  }, [props.articleTableGlobalInstance, uniqueKeyArticleTable]);

  // New demand calculation utilities
  const clip = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

  // effective bound: current row values (already include edits)
  const effMin = (row, size) => {
    return row[`${size}_min_stock`];
  };
  
  const effMax = (row, size) => {
    return row[`${size}_max_stock`];
  };

  // sizes for a row = keys carrying per-size inventory (avoids the estimated_demand vs *_demand collision)
  const sizesOf = (row) => {
    const suf = '_updated_oh_oo_it';
    return Object.keys(row).filter(k => k.endsWith(suf)).map(k => k.slice(0, -suf.length));
  };

  // Recompute the 3 cells for ONE store row.
  const recomputeStore = (row, mirrorBySize) => {
    let ed = 0, minSum = 0, maxSum = 0;
    for (const size of sizesOf(row)) {
      const eMin = effMin(row, size);
      const eMax = effMax(row, size);
      const uoh  = row[`${size}_updated_oh_oo_it`];
      const md = mirrorBySize[size];
      const demand = (md && md.has(row.store_code)) ? md.get(row.store_code) : row[`${size}_demand`];
      ed     += clip(Math.max(eMin, demand) - uoh, 0, eMax);
      minSum += eMin;
      maxSum += eMax;
    }
    return { estimated_demand: ed, min_stock_sum: minSum, max_stock_sum: maxSum };
  };

  let getEstimatedDemand = (p_rowData, p_columnId) => {
    try {
      // Check if we have the required data for new calculation
      const sizes = sizesOf(p_rowData);
      
      if (sizes.length > 0) {
        // Use new calculation logic for multi-size rows
        // Create a minimal response object for fallback demand
        const mirrorBySize = {};
        sizes.forEach(size => {
          mirrorBySize[size] = null; // No mirror data, will use fallback
        });
        
        const result = recomputeStore(p_rowData, mirrorBySize);
        return roundZeroDecimal(result.estimated_demand);
      } else {
        // Fallback to legacy calculation for single-size or incompatible rows
        return roundZeroDecimal(
          Math.max(
            0,
            Math.min(
              Number(p_rowData.max_stock) -
                (Number(p_rowData.on_hand) +
                  Number(p_rowData.on_order) +
                  Number(p_rowData.in_transit)),
              Math.max(
                Number(p_rowData.min_stock),
                p_rowData["aps/ros_rounded"] * p_rowData["wos_rounded"]
              ) -
                (Number(p_rowData.on_hand) +
                  Number(p_rowData.on_order) +
                  Number(p_rowData.in_transit))
            )
          )
        );
      }
    } catch {
      return 0;
    }
  };

  let getEstimatedDemandForSize = (p_rowData, p_columnId) => {
    // Use new calculation logic that handles multi-size rows properly
    const sizes = sizesOf(p_rowData);
    
    if (sizes.length > 0) {
      // Use new calculation logic for multi-size rows
      const mirrorBySize = {};
      sizes.forEach(size => {
        mirrorBySize[size] = null; // No mirror data, will use fallback
      });
      
      const result = recomputeStore(p_rowData, mirrorBySize);
      return roundZeroDecimal(result.estimated_demand);
    } else {
      // Fallback to legacy calculation for single-size rows
      let new_demand = 0;
      Object.keys(p_rowData).forEach((key) => {
        if (key.includes("_min_stock") && !key.includes("original")) {
          let max_stock_key = key.replace("_min_stock", "_max_stock");
          let newObj = {
            max_stock: p_rowData[max_stock_key],
            min_stock: p_rowData[key],
            "aps/ros_rounded": p_rowData["aps/ros_rounded"],
            wos_rounded: p_rowData["wos_rounded"],
            on_hand: p_rowData.on_hand,
            on_order: p_rowData.on_order,
            in_transit: p_rowData.in_transit,
          };
          new_demand = new_demand + Number(getEstimatedDemand(newObj));
        }
      });
      return new_demand;
    }
  };

  const getNewAggMin = (p_rowData) => {
    // Use new calculation logic that handles multi-size rows properly
    const sizes = sizesOf(p_rowData);
    
    if (sizes.length > 0) {
      // Use new calculation logic for multi-size rows
      const mirrorBySize = {};
      sizes.forEach(size => {
        mirrorBySize[size] = null; // No mirror data, will use fallback
      });
      
      const result = recomputeStore(p_rowData, mirrorBySize);
      return result.min_stock_sum;
    } else {
      // Fallback to legacy calculation for single-size rows
      let sum = 0;
      Object.keys(p_rowData).forEach((key) => {
        if (key.includes("_min_stock") && !key.includes("original")) {
          sum = sum + p_rowData[key];
        }
      });
      return sum;
    }
  };
  
  const getNewAggMax = (p_rowData) => {
    // Use new calculation logic that handles multi-size rows properly
    const sizes = sizesOf(p_rowData);
    
    if (sizes.length > 0) {
      // Use new calculation logic for multi-size rows
      const mirrorBySize = {};
      sizes.forEach(size => {
        mirrorBySize[size] = null; // No mirror data, will use fallback
      });
      
      const result = recomputeStore(p_rowData, mirrorBySize);
      return result.max_stock_sum;
    } else {
      // Fallback to legacy calculation for single-size rows
      let sum = 0;
      Object.keys(p_rowData).forEach((key) => {
        if (key.includes("_max_stock") && !key.includes("original")) {
          sum = sum + p_rowData[key];
        }
      });
      return sum;
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    if (column.colId === "wos_rounded") {
      if (data.wos_rounded === "") {
        data.wos_rounded = 1;
        column.gridApi.refreshCells({
          columns: ["wos_rounded"],
        });
      }
      if (data.wos_rounded > 52) {
        data.wos_rounded = 52;
        column.gridApi.refreshCells({
          columns: ["wos_rounded"],
        });
      }
      data.isWosEdited = true;
    }
    if (column.colId === "min_stock" || column.colId === "max_stock") {
      if (data.min_stock === 0 || data.min_stock === "") {
        data.min_stock = 0;
        column.gridApi.refreshCells({
          columns: ["min_stock"],
        });
      }
      if (data.max_stock === 0 || data.max_stock === "") {
        data.max_stock = data.min_stock;
        column.gridApi.refreshCells({
          columns: ["max_stock"],
        });
      }
      if (data.max_stock === data.min_stock) {
        data.max_stock = data.max_stock + 1;
        column.gridApi.refreshCells({
          columns: ["max_stock"],
        });
      }
      data.minMaxEdited = true;
    }
    storeGridInstance.current.api.refreshCells({
      columns: ["wos_rounded"],
    });
    let l_colId = column.colId;
    // Dc Inv source changes
    if (l_colId.includes("qty_reserved")) {
      if (isChanged) {
        let selectedSizeCol = l_colId.split("_")[0];
        if (
          data[`${selectedSizeCol}_qty_reserved`] >
          data[`${selectedSizeCol}_dc_available_inv`] -
            data[`${selectedSizeCol}_allocated_reserved_qty`]
        ) {
          data[`${selectedSizeCol}_qty_reserved`] =
            data[`${selectedSizeCol}_dc_available_inv`] -
            data[`${selectedSizeCol}_allocated_reserved_qty`];
        } else if (data[`${selectedSizeCol}_qty_reserved`] < 0) {
          data[`${selectedSizeCol}_qty_reserved`] = 0;
        }
        let qtyReservedKeys = Object.keys(data).filter((key) =>
          key.includes("qty_reserved")
        );
        data.Reserve_Quantity = qtyReservedKeys.map((item) => {
          return data[item];
        });
        column.gridApi.refreshCells({
          columns: [`${selectedSizeCol}_qty_reserved`],
        });
        setDCInvChanges(true);
      }
    } else {
      let l_oldEstimatedDemand = roundZeroDecimal(data.estimated_demand);
      if (
        ["aps/ros", "wos_rounded", "min_stock", "max_stock"]?.includes(
          l_colId
        ) ||
        l_colId.includes("_min_stock") ||
        l_colId.includes("_max_stock")
      ) {
        let l_estimatedDemand;
        if (data?.size_desc?.length > 0) {
          let minVal =
            ["min_stock", "max_stock"]?.indexOf(l_colId) === -1
              ? getNewAggMin(data)
              : data.min_stock * data?.size_desc?.length;
          let maxVal =
            ["min_stock", "max_stock"]?.indexOf(l_colId) === -1
              ? getNewAggMax(data)
              : data.max_stock * data?.size_desc?.length;
          let newObj = {
            max_stock: maxVal,
            min_stock: minVal,
            "aps/ros_rounded": data["aps/ros"],
            wos_rounded: data["wos_rounded"],
            on_hand: data.on_hand,
            on_order: data.on_order,
            in_transit: data.in_transit,
          };
          l_estimatedDemand = getEstimatedDemand(newObj, l_colId);
        } else {
          l_estimatedDemand = getEstimatedDemand(data, l_colId);
        }
        setTotalEstimatedDemad(
          (old) => +old - +l_oldEstimatedDemand + +l_estimatedDemand
        );
        data.estimated_demand = l_estimatedDemand;
        column.gridApi.refreshCells({
          columns: ["estimated_demand"],
        });
      }
      if (l_colId.includes("_min_stock")) {
        data.min_stock_sum = getNewAggMin(data);
        column.gridApi.refreshCells({
          columns: ["min_stock_sum"],
        });
      }
      if (l_colId.includes("_max_stock")) {
        data.max_stock_sum = getNewAggMax(data);
        column.gridApi.refreshCells({
          columns: ["max_stock_sum"],
        });
      }
    }
    setUpdatedRows((old) => {
      return { ...old, [data.store_code]: { ...data, is_selected: false } };
    });
    let l_selectedRows = [];
    storeGridInstance.current?.api?.forEachNode((node) => {
      node.selected && l_selectedRows.push({ ...node.data, is_selected: true });
    });
    if (
      l_selectedRows?.map((val) => val.store_code)?.includes(data.store_code)
    ) {
      let l_selectedRowsStoreCodeMapping = {};
      l_selectedRows.forEach((rows) => {
        l_selectedRowsStoreCodeMapping[rows.store_code] = rows;
      });
      setSelectedRows(l_selectedRowsStoreCodeMapping);
    }
  };

  const onSelectionChanged = (p_storeDetailsInstance) => {
    const storeDetails = p_storeDetailsInstance.api.getSelectedRows().map((item) => item.store_code);
    setAllocationDetails((old) => {
      return old.map((item) => {
        if (item[uniqueKeyArticleTable] === selectedArticle.id) {
          return {
            ...item,
            mapped_stores: storeDetails
          };
        }
        return item;
      });
    }); 
    let l_selectedRows = [],
      l_allSelectedRows = [];
    p_storeDetailsInstance.api.forEachNode((node) => {
      node.selected && l_selectedRows.push({ ...node.data, is_selected: true });
    });
    let l_selectedRowsStoreCodeMapping = {};
    l_selectedRows.forEach((rows) => {
      l_selectedRowsStoreCodeMapping[rows.store_code] = rows;
    });
    setSelectedRows(l_selectedRowsStoreCodeMapping);
    //commented as i felt it is not required
    // if (isEmpty(l_selectedRows)) {
    //   p_storeDetailsInstance.api.forEachNode((node) => {
    //     l_allSelectedRows.push(node.data);
    //   });
    // } else {
    //   l_allSelectedRows = [...l_selectedRows];
    // }
    l_allSelectedRows = [...l_selectedRows];
    totalEstimateDemandSetter(l_allSelectedRows);
  };

  const getChangedArticlesAndDcFromPrevDraft = (
    p_changedRowsFromPrevDraftFlow,
    p_accessor
  ) => {
    return (
      p_changedRowsFromPrevDraftFlow &&
      p_changedRowsFromPrevDraftFlow[p_accessor]
    );
  };

  const createAllocation = async () => {
    try {
      if (
        props.isNameMandatory &&
        (!props.allocationName || props.allocationName.trim() === "")
      ) {
        displaySnackMessages("Please Enter Allocation Plan Name", "error");
        return;
      }
      let l_changedRowsFromPrevDraftFlow = props.draftResult?.changed_rows;
      props.setArticleTableLoader(true);
      let l_request = {
        mandatory: props.mandatoryFilter,
        req_top_table: {
          filters: props.selectedFilters,
          filter_dependency:
            props.inventorysmartCreateAllocationFilterDependency,
          selection:
            articleTableGridInstance.current?.api?.checkConfiguration ||
            props.articleAgGridParams?.selection,
          set_all:
            articleTableGridInstance?.current?.api?.checkAllSetAllRequest ||
            props.articleAgGridParams?.setAll,
          prev_action:
            articleTableGridInstance?.current?.api?.prevAction ||
            props.articleAgGridParams?.prevAction,
          allocation_name: props.allocationName,
          store_group_codes: [...updatedStoresStoreGroup],
          dc_codes: [...updatedStoresDcs],
          poCode: props.poCode,
          filteredSelection: !isEmpty(props.filteredSelection)
            ? props.filteredSelection
            : [],
          popupLink: props.popUpLinkFromDashbaord,
          product_profile_codes: [...updatedStoresProductProfile],
          displayedAndHiddenCheckedRows: {
            ...displayedAndHiddenCheckedRows,
          },
          isExpedited: true,
          //temp change: use Redux cacheKey when redirected from finalise (step 3) back to step 1
          cache_key: props.backButtonClicked
            ? props.cacheKey || props.cacheKeyRef?.current
            : props.cacheKeyRef?.current,
        },
        data: {
          changed_articles: {
            ...getChangedArticlesAndDcFromPrevDraft(
              l_changedRowsFromPrevDraftFlow,
              "changed_articles"
            ),
            ...(articleTableGridInstance?.current?.api?.updatedRows || {}),
          },
          changed_articles_store: {},
          changed_articles_dc: {},
        },
      };
      let l_draftResponse = await props.saveDraft(l_request);

      if (
        l_draftResponse.data.status &&
        l_draftResponse.data.data.allocation_id
      ) {
        props.onDraftSaved && props.onDraftSaved('draft');
        let l_polledResults = removeDuplicates(
          polledResults,
          "article"
        )?.filter(
          (result) =>
            ![
              ...excludedArticles,
              ...(articlesWithValidationError?.articlesWithValidationError ||
                []),
            ]?.includes(result.article)
        );
        let l_dispalyedRows = getSelectedRowsForInfiniteRowModel(
          props.articleTableGridInstance?.current,
          true
        )
          ?.filter((val) => val.displayed)
          ?.map((val) => val.data);
        let l_allArticles = [...l_dispalyedRows, ...l_polledResults];
        let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
        let articleKey = isStoreBand ? "article" : "style";
        articleKey = props.articleKey ? props.articleKey : articleKey;
        const { l_storeRequest } = getRequestForStoreAndDC(
          l_allArticles,
          props.storesForSelectedStoreFilters,
          props.selectedFilters?.filter(
            (filter) => filter.attribute_name === channelKey
          )[0].values,
          props.poCode,
          true,
          Boolean(props.createAllocationProps?.isDOSAvailable),
          l_draftResponse.data.data?.allocation_name,
          null,
          null,
          articleKey
        );
        let l_createAllocationResponse = await props.createAllocationApi(
          {
            input: Object.values(l_storeRequest).map((item) => ({
              ...item,
              //temp change: use Redux cacheKey when redirected from finalise (step 3) back to step 1
              cache_key: props.backButtonClicked
                ? props.cacheKey || props.cacheKeyRef?.current
                : props.cacheKeyRef?.current,
            })),
            allocationID: l_draftResponse?.data?.data?.allocation_id,
          },
          props.isV3?.includes("allocation")
        );
        displaySnackMessages(l_createAllocationResponse.data.message, "info");
        if (l_createAllocationResponse.data.status) {
          props.setIsFiltersValid(false);
          props.onPendingAllocationCodeForFinalize?.(
            l_draftResponse?.data?.data?.allocation_id
          );
          props.onDraftSaved && props.onDraftSaved('allocation');
        }
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setArticleTableLoader(false);
    }
  };

  const excludeAllHandler = ({ manual = false }) => {
    if (manual) {
      setExcludedArticles((old) => [
        ...old,
        ...articlesWithValidationError?.articlesWithValidationError,
      ]);
    }
    let l_articlesWithValidationError = checkValidationForArticles(
      removeDuplicates(polledResults, "article")?.filter((result) => {
        return ![
          ...excludedArticles,
          ...(articlesWithValidationError?.articlesWithValidationError || []),
        ]?.includes(result.article);
      }),
      "article",
      props.storeGroupStoreMap,
      props.storesForSelectedStoreFilters,
      false,
      true,
      false,
      props.createAllocationProps?.allowZeroUserDefinedInventory
    );
    if (l_articlesWithValidationError?.articlesWithValidationError?.length) {
      setArticlesWithValidationError((old) => {
        return {
          ...l_articlesWithValidationError,
          articlesListWithAllPossibleValidation: [
            ...old.articlesListWithAllPossibleValidation,
            ...l_articlesWithValidationError?.articlesWithValidationError,
          ],
        };
      });
    } else {
      createAllocation();
    }
  };

  const prependData = useCallback(() => {
    return [
      [],
      [
        {
          data: {
            value: `${dynamicLabelsBasedOnTenant("article")} Selected:`,
            type: "String",
          },
        },
        {
          data: {
            value: selectedArticle.value,
            type: "String",
          },
        },
        {
          data: {
            value: "Total Estimated Demand:",
            type: "String",
          },
        },
        {
          data: {
            value: totalEstimatedDemad,
            type: "Number",
          },
        },
        {
          data: {
            value: "Number of Stores Eligible For Allocation:",
            type: "String",
          },
        },
        {
          data: {
            value: eligibleStoresCount,
            type: "Number",
          },
        },
      ],
      [],
    ];
  }, [selectedArticle.value, eligibleStoresCount, totalEstimatedDemad]);

  useEffect(() => {
    if (isEmpty(pollingReq) && !isEmpty(polledResults) && props.expeditedFlow) {
      props.setArticleTableLoader(false);
      excludeAllHandler({ manual: false });
    }
  }, [polledResults, pollingReq, props.expeditedFlow]);

  const onCloseModalHandlerCallback = (p_excludeCallback) => {
    if (!p_excludeCallback) {
      setArticlesWithValidationError((old) => {
        return {
          ...old,
          articlesWithValidationError: [],
          validationErrorMessage: "",
        };
      });
    }
  };

  useEffect(() => {
    !isEmpty(props.articleTableGridInstance) && reviewStoreAndDc();
  }, [props.articleTableGridInstance, props.showStoreandDc]);

  useEffect(() => {
    if (
      (isEmpty(props.articleTableGridInstance) ||
        !props.articleTableGridInstance?.current) &&
      !isEmpty(props.articleAgGridParams?.displayedAndHiddenCheckedRows)
    ) {
      reviewStoreAndDc();
    }
  }, [props.articleAgGridParams]);

  useEffect(() => {
    if (!isEmpty(storeRequest)) {
      let l_dispalyedRows = Object.keys(storeRequest);
      let l_articles = l_dispalyedRows.map((article) => {
        return {
          label: replaceSpecialCharacter(article),
          value: article,
          id: article,
        };
      });
      setArticles(l_articles);
      setCurrentOptions(l_articles);
    }
  }, [storeRequest]);
  
  useEffect(() => {
    if (!isEmpty(selectedArticle) && !props.expeditedFlow) {
      if (lastArticleValueRef.current !== selectedArticle.value) {
        //get store data when selectedArticle changes
        lastSelectedArticleRef.current = selectedArticle;
        lastArticleValueRef.current = selectedArticle.value;
        getStoresAndDc(selectedArticle);
      }
    }
  }, [selectedArticle, props.expeditedFlow]);

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        //props.setNewProductProfileLoader(true);
        let response = await props.getModuleBasedTenantConfig({
          module_name: "Create Allocation Inventory Table",
          screen_name: "Allocation",
        });
        if (response?.hiddenTabs) {
          setHiddenTabs(response.hiddenTabs);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        //props.setNewProductProfileLoader(false);
      }
    };
    fetchModuleConfigs();
  }, []);

  const tabs = [
    {
      label: isStoreBand ? "Store Band" : "Store Details",
      value: 1,
      id: "Inv. Band",
    },
    {
      label: "Inv. Source",
      value: 2,
      id: "Inv. Store",
    },
  ];
  const getTopRightOptions = () => {
    return [
      <Select
        isSearchable={true}
        isClearable={false}
        menuShouldBlockScroll={false}
        isMulti={false}
        options={currentOptions}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setCurrentOptions={setCurrentOptions}
        currentOptions={currentOptions}
        selectedOptions={selectedOptions ? selectedOptions : selectedArticle}
        initialOptions={currentOptions}
        data-testid={`select${"name"}`}
        handleChange={(option) => onArticleChange(option)}
        setSelectedOptions={setSelectedOptions}
      />,
    ];
  };
  const getCenterOptions = () => {
    return [
      <ButtonGroup
        onChange={onTabChangeHandler}
        options={
          isStoreBand
            ? [
                {
                  label: isStoreBand ? "Store Band" : "Store Details",
                  value: 1,
                  id: "Inv. Band",
                },
              ]
            : [...tabs]
        }
        selectedOption={tabValue}
      />
    ];
  };

  return (
    <Loader loader={props.storeDcTableLoader}>
      {props.expeditedFlow && (
        <Validation
          articles={articlesWithValidationError}
          excludeAllHandler={() => excludeAllHandler({ manual: true })}
          label="Exclude All and Continue"
          onCloseModalHandlerCallback={(params) =>
            onCloseModalHandlerCallback(params)
          }
        />
      )}
      {!props.expeditedFlow && (
        <>
          <div className={clsx(classes.paddingBottom24, classes.tabHeaderDesign)}>
            <div className={clsx(classes.leftSideContainer)}>
              <Typography className={classes.allocationPlanNameLabel}>
                Allocation Plan Name:
              </Typography>
              <Typography className={classes.font800}>
                {props.allocationPlanName || "N/A"}
              </Typography>
            </div>
            <div>{getCenterOptions()}</div>
            <div className={classes.rightSideDetails}></div>
          </div>
            <div style={{ minHeight: "300px" }}>
              {openPopup && (
                <StoreSizeOHModal
                  columns={modalColumns[selectedArticle.value]}
                  storeSizeData={modalData[selectedArticle.value]}
                  storeDetails={storeDetails}
                  loader={modalLoader}
                  setOpenPopup={setOpenPopup}
                />
              )}
              {openViewPopup && (
                <ViewTablePopUp
                  closePopUp={() => setOpenViewPopup(false)}
                  columns={sizeCols}
                  rowData={sizeRowData}
                  loader={modalLoader}
                  title={sizeTitle}
                />
              )}

              <div className={classes.autoOverflowWrapper}>
                {tabValue === 1 && render && (
                  <div ref={storeDetailsRef}>
                    <StoreDetails
                      prependData={prependData}
                      getTopRightOptions={getTopRightOptions}
                      module={props?.module}
                      eligibleStoresCount={eligibleStoresCount}
                      storeData={storeData}
                      storeColumnm={storeColumnm}
                      loadTableInstance={loadTableInstance}
                      pollingReq={pollingReq}
                      updatedStores={updatedStores}
                      updatedDcs={updatedDcs}
                      applyChanges={applyChanges}
                      storeRequest={storeRequest}
                      storeResponse={storeResponse}
                      onSelectionChanged={onSelectionChanged}
                      selectedArticle={selectedArticle}
                      agGridInstance={storeGridInstance}
                      totalEstimatedDemad={totalEstimatedDemad}
                      setTotalEstimatedDemad={setTotalEstimatedDemad}
                      articleTableGridInstance={articleTableGridInstance}
                      updatedRows={updatedRows}
                      setUpdatedRows={setUpdatedRows}
                      selectedRows={selectedRows}
                      updatedStoresStoreGroup={updatedStoresStoreGroup}
                      updatedStoresDcs={updatedStoresDcs}
                      updatedStoresProductProfile={updatedStoresProductProfile}
                      displayedAndHiddenCheckedRows={
                        displayedAndHiddenCheckedRows
                      }
                      setSelectedRows={setSelectedRows}
                      isStoreBand={isStoreBand}
                      polledResults={polledResults}
                      storeGroupStoreMap={props.storeGroupStoreMap}
                      storesForSelectedStoreFilters={
                        props.storesForSelectedStoreFilters
                      }
                      setArticlesWithValidationError={
                        setArticlesWithValidationError
                      }
                      onDraftSaved={props.onDraftSaved}
                      onPendingAllocationCodeForFinalize={
                        props.onPendingAllocationCodeForFinalize
                      }
                      getOptimizationDetails={props.getOptimizationDetails}
                      articleTableGlobalInstance={props.articleTableGlobalInstance}
                      articleTableColumnRef={props.articleTableColumnRef}
                      setAllocationPlanName={props.setAllocationPlanName}
                      allocationDetails={allocationDetails}
                      setAllocationDetails={setAllocationDetails}
                      setDraftAllocationDetails={props?.setDraftAllocationDetails}
                      cacheKeyRef={props.cacheKeyRef}
                      getNewAggMin={getNewAggMin}
                      getNewAggMax={getNewAggMax}
                      getStores={props.getStores}
                      processStoreResponse={processStoreResponse}
                      selectedFilters={props.selectedFilters}
                      channelKey={props.channelKey}
                      defaultProductChannel={props.defaultProductChannel}
                      setStoreDcTableLoader={props.setStoreDcTableLoader}
                    />
                  </div>
                )}
                {tabValue === 2 && render && (
                  <DcDetails
                    prependData={prependData}
                    rowdata={dcData}
                    getTopRightOptions={getTopRightOptions}
                    columns={dcColumns}
                    onBlur={onBlur}
                    loadTableInstance={loadDCTableInstance}
                    channel={props.channel}
                    disableButton={dcInvChanges}
                  />
                )}
              </div>
            </div>
        </>
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,

    newStoreAlert:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .newStoreAlert,
    storeDcTableLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .storeDcTableLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .selectedFilters,
    isValidDraft:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .isValidDraft,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    customl0nameFilter:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.customl0nameFilter,
    isL1ValueInAllocation:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.isL1ValueInAllocation,
    articleKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.articleKey,
    articleAgGridParams:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleAgGridParams,
    poCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poCode,
    filteredSelection:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .filteredSelection,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .popUpLinkFromDashbaord,
    mandatoryFilter:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .mandatoryFilter,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    allocationName:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .allocationName,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.isNameMandatory,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    channelKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.channel_key,
    defaultProductChannel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.defaultProductChannel,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    type:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.type,
    createAllocationProps:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig,
    //temp change: cacheKey for when the redirection to step 2 Review store and DC
    cacheKey:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .cacheKey,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreDetailsAtSizes: (payload) =>
    dispatch(getStoreDetailsAtSizes(payload)),
  getAllocate: (payload) => dispatch(getAllocate(payload)),
  saveDraft: (payload) => dispatch(saveDraft(payload)),
  getStores: (payload) => dispatch(getStores(payload)),
  getDCs: (payload) => dispatch(getDCs(payload)),
  setStoreDcTableLoader: (payload) => dispatch(setStoreDcTableLoader(payload)),
  setNotifications: (payload) => dispatch(setNotifications(payload)),
  createAllocationApi: (payload, isV3) =>
    dispatch(createAllocationApi(payload, isV3)),
  getOHStoreSize: (payload) => dispatch(getOHStoreSize(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setArticleTableLoader: (payload) => dispatch(setArticleTableLoader(payload)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDcDetails);
