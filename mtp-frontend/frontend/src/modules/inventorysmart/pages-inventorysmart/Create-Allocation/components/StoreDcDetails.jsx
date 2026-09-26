import { Paper, Tab, Tabs, Typography } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "../../../../../core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactSelect from "core/Utils/select/index";
import { cloneDeep, isEmpty, orderBy } from "lodash";
import {
  checkValidationForArticles,
  formatColumnsForPO,
  getPollingRequest,
  getRequestForStoreAndDC,
  getUpdatedRows,
  getValuesFromObject,
  mutateRqMapping,
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
import ViewTablePopUp from "../../common/ViewTablePopUp";
import { getStoreDetailsAtSizes } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import { inventoryData } from "../../common/commonFunctions";
import Validation from "./Validation";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { UN_EDITABLE_COLUMNS_FOR_PO_STORE_DC } from "../strategyConstants";

const REVIEWED_ARTICLES_MAPPING_TO_PREP_APPLYALL_REQUEST = {
  store_code: "Store_List",
  ref_store: "Reference_Store_List",
  Store_Index: "Store_Index",
  "APS/ROS": "ROS_List",
  WOS: "WOS_List",
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
  const [
    articlesWithValidationError,
    setArticlesWithValidationError,
  ] = useState({
    articlesWithValidationError: [],
    validationErrorMessage: "",
    articlesListWithAllPossibleValidation: [],
  });
  const [excludedArticles, setExcludedArticles] = useState([]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const pollingToGetAllArticles = async (p_req) => {
    props.expeditedFlow && props.setArticleTableLoader(true);
    let response = await props.getAllocate(p_req);
    let l_updatedRows =
      articleTableGridInstance?.current?.api?.updatedRows || null;
    let l_responseData = response.data?.data?.table_data,
      l_updatedResponse;
    l_responseData = mutateRqMapping(l_responseData);
    l_responseData = mutateStoreGroupCode(
      l_responseData,
      props.defaultStoreGroupCode.current?.[0]?.attribute_value,
      null,
      null,
      props.type
      // ?.[props.channel]
    );
    if (l_updatedRows && l_responseData.length)
      l_updatedResponse = getUpdatedRows(
        l_responseData,
        l_updatedRows,
        props.storeGroupStoreMap,
        props.storesForSelectedStoreFilters
      );
    else l_updatedResponse = cloneDeep(l_responseData);
    let l_updatedSelectedResponse = l_updatedResponse?.filter(
      (row) => row.is_selected
    );
    prepareRequest(l_updatedSelectedResponse);
    setPolledResults((old) => {
      return [...old, ...l_updatedSelectedResponse];
    });
    if (+l_responseData.length === CACHE_BLOCKSIZE_STRATEGY) {
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

    let l_req = {
      meta: {
        ...body,
        limit: { limit: 100, page: 1, offset: 0 },
      },
      selection: articleTableGridInstance.current.api.checkConfiguration,
      channel: props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "channel"
      )[0].values[0],
      set_all: props.checkAllSetAllRequest,
      filters: l_filters,
      po_id: props.poCode ? [props.poCode] : props.poCode,
      filtered_selection: !isEmpty(props.filteredSelection)
        ? props.filteredSelection
        : [],
      popupLink: props.popUpLinkFromDashbaord,
      ...getIsValidDraft(),
    };
    pollingToGetAllArticles(l_req);
  };

  const prepareRequest = (p_dispalyedRows) => {
    const { l_storeRequest, l_dcRequest } = getRequestForStoreAndDC(
      p_dispalyedRows,
      props.storesForSelectedStoreFilters,
      props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "channel"
      )[0].values,
      props.poCode
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
    let { l_dispalyedRows, l_pollingReq } = getPollingRequest(
      articleTableGridInstance,
      props.articleAgGridParams.displayedAndHiddenCheckedRows
    );
    if (props.isPO) {
      l_pollingReq = [];
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
    let l_selectedArticle = l_dispalyedRows?.[0]?.article;
    setPollingReq(l_pollingReq);
    prepareRequest(l_dispalyedRows);
    setSelectedArticle({
      label: l_selectedArticle,
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
        let l_apiResponse = await props.getStores([
          {
            ...storeRequest[p_selectedArticle],
            ...getIsValidDraft(),
          },
        ]);
        if (l_apiResponse.data.status) {
          let l_apiResponseData = l_apiResponse.data.data.data?.map(
            (store, ind) => {
              return {
                ...store,
                is_selected: true,
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
          if (props.isPO) {
            l_storeResponse.columns = formatColumnsForPO(l_storeResponse.columns, `is_editable`, UN_EDITABLE_COLUMNS_FOR_PO_STORE_DC);
          }
          setStoreColumns(
            agGridColumnFormatter(
              l_storeResponse.columns,
              null,
              l_storeColumnsWithAction
            )
          );
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
    return l_storeResponse;
  };

  const getDcDetails = async (p_selectedArticle) => {
    let l_dcResponse;
    if (dcResponse[p_selectedArticle]) {
      l_dcResponse = dcResponse[p_selectedArticle];
    } else {
      try {
        let l_apiResponse = await props.getDCs([
          {
            ...dcRequest[p_selectedArticle],
            ...getIsValidDraft(),
            po_name: props?.poCode ? props?.poName : null,
          },
        ]);
        if (l_apiResponse.data.status) {
          l_dcResponse = l_apiResponse.data.data;
        }
      } catch {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
    return l_dcResponse;
  };

  const totalEstimateDemandSetter = (p_selectedRows) => {
    let l_totalEstimatedDemad = 0;
    p_selectedRows.forEach((val) => {
      l_totalEstimatedDemad += Number(roundZeroDecimal(val.estimated_demand));
    });
    setTotalEstimatedDemad(l_totalEstimatedDemad);
    setEligibleStoresCount(p_selectedRows.length);
  };

  useEffect(async () => {
    // if (openPopup && !isEmpty(storeDetails)) {
    //   if (!modalColumns[selectedArticle.value]) {
    //     let l_selectedArticle = selectedArticle.value;
    //     setModalLoader(true);
    //     let l_sizeColumns = storeDetails.size_desc.map((item, i) => {
    //       return {
    //         ...TABLE_CONFIG,
    //         column_name: item,
    //         label: item,
    //         order_of_display: i + 1,
    //       };
    //     });
    //     let l_modalColumns = agGridColumnFormatter(l_sizeColumns);
    //     setModalColumns((old) => {
    //       return {
    //         ...old,
    //         [l_selectedArticle]: l_modalColumns,
    //       };
    //     });
    //     try {
    //       let l_apiResponse = await props.getOHStoreSize({
    //         article: l_selectedArticle,
    //         channel: dcRequest?.[l_selectedArticle]?.["channel"] || [],
    //       });
    //       if (l_apiResponse.data.status && l_apiResponse?.data?.data?.data) {
    //         setModalData((old) => {
    //           return {
    //             ...old,
    //             [l_selectedArticle]: l_apiResponse.data.data.data,
    //           };
    //         });
    //         setModalLoader(false);
    //       }
    //     } catch {
    //       setModalLoader(false);
    //       setOpenPopup(false);
    //     }
    //   }
    // }
  }, [openPopup, storeDetails]);
  //
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
    setRender(false);
    props.setStoreDcTableLoader(true);
    try {
      if (tabValue === 1) {
        let l_storeResponse = await getStoreDetails(p_selectedArticle.value);
        setStoreData(l_storeResponse.data);
        totalEstimateDemandSetter(l_storeResponse.data);
      }
      if (tabValue === 2) {
        let l_dcResponse = await getDcDetails(p_selectedArticle.value);
        setDCColumns(agGridColumnFormatter(l_dcResponse.columns));
        setDCData(l_dcResponse.data);
      }
      scrollIntoView(storeDetailsRef);
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
        setUpdatedStoresStoreGroup((old) => [
          ...old,
          ...l_request.Store_Group_Code,
        ]);
        setUpdatedStoresDcs((old) => [...old, ...(l_request?.DC_Codes || [])]);
        setUpdatedStoresProductProfile((old) => [
          ...old,
          l_request.Product_Profile_Code,
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
    saveStoreDcResponse();
    setSelectedArticle(p_selectedOption);
    // setRender(false);
  };

  const getReviewedStoreDetails = () => {
    let l_storeArticleData = [],
      l_channel = [],
      l_selectedCahnnel = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "channel"
      )[0].values[0];
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
      let l_storeResponse = await props.getStores([
        {
          ...l_req,
          ...getIsValidDraft(),
        },
      ]);
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
        setStoreData(
          l_storeResponse.data?.data?.data?.map((store) => {
            return {
              ...store,
              is_selected: true,
              // props.storesForSelectedStoreFilters?.includes(
              //   store.store_code
              // ),
            };
          })
        );
        displaySnackMessages(l_storeResponse.data.message, "success");
      }
    } catch {
      setStoreData([]);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setStoreDcTableLoader(false);
    }
  };

  let getEstimatedDemand = (p_rowData, p_columnId) => {
    try {
      return roundZeroDecimal(
        Math.max(
          0,
          Math.min(
            Number(p_rowData.max_stock),
            Math.max(
              Number(p_rowData.min_stock),
              p_rowData["APS/ROS"] * p_rowData["WOS_rounded"]
            ) -
              (Number(p_rowData.onhand) +
                Number(p_rowData.onorder) +
                Number(p_rowData.intransit))
          )
        )
      );
    } catch {
      return 0;
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    if (column.colId === "WOS_rounded") {
      data.isWosEdited = true;
    }
    if (column.colId === "min_stock" || column.colId === "max_stock") {
      data.minMaxEdited = true;
    }
    storeGridInstance.current.api.refreshCells({
      columns: ["WOS_rounded"],
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
        ["APS/ROS", "WOS_rounded", "min_stock", "max_stock"]?.includes(l_colId)
      ) {
        let l_estimatedDemand = getEstimatedDemand(data, l_colId);
        setTotalEstimatedDemad(
          (old) => +old - +l_oldEstimatedDemand + +l_estimatedDemand
        );
        data.estimated_demand = l_estimatedDemand;
        column.gridApi.refreshCells({
          columns: ["estimated_demand"],
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

    if (isEmpty(l_selectedRows)) {
      p_storeDetailsInstance.api.forEachNode((node) => {
        l_allSelectedRows.push(node.data);
      });
    } else {
      l_allSelectedRows = [...l_selectedRows];
    }

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
      let l_changedRowsFromPrevDraftFlow = props.draftResult?.changed_rows;
      props.setArticleTableLoader(true);
      let l_request = {
        mandatory: props.mandatoryFilter,
        req_top_table: {
          filters: props.selectedFilters,
          filter_dependency:
            props.inventorysmartCreateAllocationFilterDependency,
          selection: articleTableGridInstance.current?.api?.checkConfiguration,
          set_all:
            articleTableGridInstance?.current?.api?.checkAllSetAllRequest,
          prev_action: articleTableGridInstance?.current?.api?.prevAction,
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
            ...props.displayedAndHiddenCheckedRows,
          },
          isExpedited: true,
        },
        data: {
          changed_articles: {
            ...getChangedArticlesAndDcFromPrevDraft(
              l_changedRowsFromPrevDraftFlow,
              "changed_articles"
            ),
            ...articleTableGridInstance.current.api.updatedRows,
          },
          changed_articles_store: {},
          changed_articles_dc: {},
        },
      };
      if (props.isPO) {
       l_request.req_top_table.selection = [{
          searchColumns: {},
          checkAll: true
        }];
      }
      let l_draftResponse = await props.saveDraft(l_request);
      if (
        l_draftResponse.data.status &&
        l_draftResponse.data.data.allocation_id
      ) {
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
        const { l_storeRequest } = getRequestForStoreAndDC(
          l_allArticles,
          props.storesForSelectedStoreFilters,
          props.selectedFilters?.filter(
            (filter) => filter.attribute_name === "channel"
          )[0].values,
          props.poCode,
          true,
          l_draftResponse.data.data?.allocation_name
        );
        let l_createAllocationResponse = await props.createAllocationApi(
          {
            input: Object.values(l_storeRequest),
            allocationID: l_draftResponse.data.data?.allocation_id,
          },
          props.isV3?.includes("allocation")
        );
        displaySnackMessages(l_createAllocationResponse.data.message, "info");
        if (l_createAllocationResponse.data.status) {
          props.setIsFiltersValid(false);
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
      true
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
    setRender(false);
  }, [props.articleTableGridInstance, props.showStoreandDc]);

  useEffect(() => {
    !isEmpty(pollingReq) && getAllArticles(pollingReq);
  }, [pollingReq]);

  useEffect(() => {
    if (!isEmpty(storeRequest)) {
      let l_dispalyedRows = Object.keys(storeRequest);
      let l_articles = l_dispalyedRows.map((article) => {
        return {
          label: article,
          value: article,
          id: article,
        };
      });
      setArticles(l_articles);
    }
  }, [storeRequest]);

  useEffect(() => {
    if (!isEmpty(selectedArticle) && !props.expeditedFlow) {
      getStoresAndDc(selectedArticle);
    }
  }, [selectedArticle, props.expeditedFlow]);

  return (
    <>
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
        <div className={clsx(classes.container, globalClasses.marginAround)}>
          <Loader loader={props.storeDcTableLoader}>
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

            <Paper className={globalClasses.paperWrapper}>
              <div className={classes.autoOverflowWrapper}>
                <div className={classes.listWrapper}>
                  <ReactSelect
                    isSearchable={true}
                    isClearable={false}
                    menuShouldBlockScroll={false}
                    isMulti={false}
                    options={articles}
                    value={selectedArticle}
                    data-testid={`select${"name"}`}
                    onChange={(option) => onArticleChange(option)}
                  />
                  {!isEmpty(pollingReq) && (
                    <span className={classes.spinnerContainer}>
                      <CircularProgress
                        variant="determinate"
                        sx={{
                          color: "primary.lighter",
                        }}
                        size={28}
                        thickness={4}
                        {...props}
                        value={100}
                      />
                      <CircularProgress
                        variant="indeterminate"
                        disableShrink
                        sx={{
                          [`& .${circularProgressClasses.circle}`]: {
                            strokeLinecap: "round",
                          },
                        }}
                        className={classes.spinner}
                        color="primary"
                        size={28}
                        thickness={4}
                        {...props}
                      />
                    </span>
                  )}
                  {(totalEstimatedDemad === 0 || totalEstimatedDemad) && (
                    <Typography variant="h6">
                      Total Estimated Demand for All Selected Stores :{" "}
                      {totalEstimatedDemad}
                    </Typography>
                  )}
                  {eligibleStoresCount && (
                    <Typography variant="h6">
                      Number of Stores Eligible For Allocation:{" "}
                      {eligibleStoresCount}
                    </Typography>
                  )}
                </div>
                <Tabs
                  value={tabValue}
                  onChange={onTabChangeHandler}
                  aria-label="disabled tabs example"
                >
                  <Tab label="Store Details" value={1} />
                  <Tab label="Inv. Source" value={2} />
                </Tabs>
                {tabValue === 1 && render && (
                  <div ref={storeDetailsRef}>
                    <StoreDetails
                      prependData={prependData}
                      module={props?.module}
                      storeData={storeData}
                      storeColumnm={storeColumnm}
                      onBlur={onBlur}
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
                      setTotalEstimatedDemad={setTotalEstimatedDemad}
                      articleTableGridInstance={articleTableGridInstance}
                      updatedRows={updatedRows}
                      selectedRows={selectedRows}
                      updatedStoresStoreGroup={updatedStoresStoreGroup}
                      updatedStoresDcs={updatedStoresDcs}
                      updatedStoresProductProfile={updatedStoresProductProfile}
                      displayedAndHiddenCheckedRows={
                        displayedAndHiddenCheckedRows
                      }
                      setSelectedRows={setSelectedRows}
                      polledResults={polledResults}
                      storeGroupStoreMap={props.storeGroupStoreMap}
                      storesForSelectedStoreFilters={
                        props.storesForSelectedStoreFilters
                      }
                      setArticlesWithValidationError={
                        props.setArticlesWithValidationError
                      }
                    />
                  </div>
                )}
                {tabValue === 2 && render && (
                  <DcDetails
                    prependData={prependData}
                    rowdata={dcData}
                    columns={dcColumns}
                    onBlur={onBlur}
                    loadTableInstance={loadDCTableInstance}
                    channel={props.channel}
                    disableButton={dcInvChanges}
                  />
                )}
              </div>
            </Paper>
          </Loader>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
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
    articleAgGridParams:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleAgGridParams,
    poCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poCode,
    poName:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poName,
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
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    type:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.type,
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
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDcDetails);
