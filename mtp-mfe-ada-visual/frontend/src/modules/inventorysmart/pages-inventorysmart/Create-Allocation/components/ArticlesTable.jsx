import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Paper } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty, isEqual } from "lodash";
import { setInventoryAdaPayload } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  ARTICLE_TABLE_SIZE_PROFILE_VALIDATION_MESSAGE,
  CACHE_BLOCKSIZE_STRATEGY,
  CHECKALL_VALIDATION,
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getAllocate,
  getApsWos,
  getColumn,
  getSetAllDcs,
  getStoreGroupStoreMap,
  setArticleTableLoader,
  setBackButtonClicked,
  setIsValidDraft,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getViewPlanTableConfiguration } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import moment from "moment";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import globalStyles from "../../../../../core/Styles/globalStyles";
import { ADA_VISUAL } from "../../../constants-inventorysmart/routesConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import {
  COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE,
  addMinMaxforUserDefinedInv,
  checkValidationForArticles,
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
import StoreDcDetails from "./StoreDcDetails";
import Validation from "./Validation";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { inventoryData } from "../../common/commonFunctions";
import { getStoreDetailsAtSizes } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import ViewTablePopUp from "../../common/ViewTablePopUp";

const ArticlesTable = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();

  const storeGroupStoreMap = useRef(null);
  const defaultStoreGroupCode = useRef(null);
  const articleTableGridInstance = useRef(null);
  const storesForSelectedStoreFilters = useRef(null);
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
  const [loader, setLoader] = useState(null);
  const [showPopUp, setShowPopUp] = useState(null);
  const [columns, setColumns] = useState(null);
  const [rows, setRows] = useState(null);
  const [title, setTitle] = useState(null);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      resetComponentState();
    }
    setColumns(null);
    setRows(null);
  }, [props.selectedFilters]);

  const resetComponentState = () => {
    setRender(false);
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
    const obj = {
      metric: mapped_col ? mapped_col : column_name,
      endPoint: props.getStoreDetailsAtSizes,
      body: {
        filters: props.selectedFilters,
        article: data?.article,
      },
    };
    let l_req = {};
    if (["net_available_inventory", "oh"]?.includes(column_name)) {
      l_req = {
        size: data.sizes?.map((val) => val.value),
        dc_code: data.dcs?.map((val) => val.value),
        data: data,
      };
    }
    response = await inventoryData(obj, l_req);

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
    p_articleTableGridInstance
  ) => {
    if (p_rowData?.["user_def_inv_perc"]) {
      p_rowData.final_tot_inventory = Math.round(
        +(p_apiData?.net_available_inventory * p_rowData.user_def_inv_perc) /
          100
      );
      p_articleTableGridInstance.current.api.refreshCells({
        columns: ["final_tot_inventory"],
      });
    }
    if (p_rowData?.["user_def_inv"]) {
      if (+p_rowData.user_def_inv > +p_apiData?.net_available_inventory) {
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
      let l_sizes = data.sizes?.map((val) => val.value);
      let l_upc = l_sizes?.map((val) => data?.size_upc_map[val]);
      // let l_noOfStores = await getNoofStores(
      //   l_storeGroupCodes,
      //   data.mapped_stores,
      //   storeGroupStoreMap.current
      // );
      let l_noOfStores = await includesCommonStores(
        storeGroupStoreMap.current,
        data.store_groups,
        data.mapped_stores,
        storesForSelectedStoreFilters?.current
      );
      let res = await getUpdatedApsWos({
        store_group_upc_list: [
          {
            store_group_code: l_storeGroupCodes,
            upc: l_upc,
          },
        ],
      });
      data.mapped_stores_count = l_noOfStores.length;
      data.intersected_stores = l_noOfStores;
      data.aps = res.data.data[0].aps || 0;
      data.wos = res.data.data[0].wos || 0;
    } catch {
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
      data.aps = "0";
      data.wos = "0";
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
        let apsData = apsResponse?.data?.data[0]?.aps || 0;
        let wosData = apsResponse?.data?.data[0]?.wos || 0;
        data.allocated_units = dcResponse?.allocated_units;
        data.oh = dcResponse?.oh;
        data.net_available_inventory = dcResponse?.net_available_inventory;
        data.reserve_quantity = dcResponse?.reserve_quantity;
        data.aps = apsData;
        data.wos = wosData;
        updateNetInventory(data, dcResponse, articleTableGridInstance);
      } catch (e) {
        data.allocated_units = 0;
        data.oh = 0;
        data.net_available_inventory = 0;
        data.reserve_quantity = 0;
        data.aps = 0;
        data.wos = 0;
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
            "net_available_inventory",
            // "user_def_inv",
            // "final_tot_inventory",
            // "user_def_inv_perc",
            "reserve_quantity",
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
    };
    let plannedApsReq = {
      store_group_upc_list: [
        {
          store_group_code: l_storeGroupCodes,
          upc: l_upc,
        },
      ],
    };
    callApi(req, plannedApsReq);
  };

  const onDcsBlurHandler = (data, column) => {
    let sizes = data.sizes?.map((val) => val.value);
    const callApi = async (req) => {
      try {
        const dcResponse = mutateInventoryCalculations(req);
        data.allocated_units = dcResponse?.allocated_units;
        data.oh = dcResponse?.oh;
        data.net_available_inventory = dcResponse?.net_available_inventory;
        data.reserve_quantity = dcResponse?.reserve_quantity;
        updateNetInventory(data, dcResponse, articleTableGridInstance);
      } catch (e) {
        data.allocated_units = 0;
        data.oh = 0;
        data.net_available_inventory = 0;
        data.reserve_quantity = 0;
      } finally {
        // data.user_def_inv = "";
        // data.final_tot_inventory = "";
        // data.user_def_inv_perc = "";
        await column.gridApi.refreshCells({
          columns: [
            "allocated_units",
            "oh",
            "net_available_inventory",
            // "user_def_inv",
            // "final_tot_inventory",
            // "user_def_inv_perc",
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
      };
      callApi(req);
    }
  };

  const onBlur = async (_e, data, column, isChanged) => {
    if (column.colId === "wos") {
      data.isWosEdited = true;
    }
    articleTableGridInstance.current.api.refreshCells({
      columns: ["wos"],
    });
    props.setIsValidDraft(false);
    setUpdatedRows((old) => {
      return { ...old, [data.article]: data };
    });
    if (column.colId === "child_skus") {
      onDcsBlurHandler(data, column);
    }
    if (isChanged) {
      if (column.colId === "store_groups") {
        onStoreGroupBlurHandler(data, column);
      }
      if (column.colId === "sizes") {
        onSizesBlurHnadler(data, column);
      }
      if (column.colId === "dcs") {
        onDcsBlurHandler(data, column);
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
    }
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setArticleTableLoader(true);
      let l_response = await props.getColumn();
      let l_updatedTableConfig = getUpdatedColumnConfig(
        l_response.data.data,
        props.poCode
      );
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
        return obj;
      });
      setArticleTableColumn(l_columnsWithDisablekey);
      offset.current = 0;
      setRender(true);
      scrollIntoView(articleTableRef);
    };
    const fetchStoreGroupStoreMap = async () => {
      if (!isEmpty(props.selectedFilters)) {
        const filters = props.selectedFilters;
        let l_storeGroupStoreMap = await props.getStoreGroupStoreMap({
          channel: filters.filter((val) => val.attribute_name === "channel"),
          application_code: 1,
        });
        storeGroupStoreMap.current = l_storeGroupStoreMap?.data?.data;
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

    if (!isEmpty(props.selectedFilters)) {
      setChannel(
        props.selectedFilters?.filter(
          (filter) => filter.attribute_name === "channel"
        )?.[0]?.values?.[0]
      );
      fetchSetAllDcs();
      fetchStoreGroupStoreMap();
      fetchColumnData();
      setShowStoreandDc(false);
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (props.backButtonClicked && articleDataMounted) {
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

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setArticleTableLoader(true);

    try {
      //Using the redux store data if user has been redirected to Create Allocation from different page
      let selectedFilters = [...props.selectedFilters];
      if (props.isRedirectedFromDifferentPage) {
        let articleFilter = tableArticleFilter;
        articleFilter.values = [...props.createAllocationArticles];
        selectedFilters.push(articleFilter);
      }
      if (!isEqual(manualBodyRef.current, manualbody)) {
        offset.current = 0;
        // skipList.current = [];
      }
      let body = {
        filters: selectedFilters,
        meta: {
          ...manualbody,
          limit: { limit: 100, page: pageIndex + 1, offset: offset?.current },
        },
        channel: selectedFilters?.filter(
          (filter) => filter.attribute_name === "channel"
        )[0].values[0],
        selection: articleTableGridInstance?.current?.api?.checkConfiguration,
        set_all: articleTableGridInstance?.current?.api?.checkAllSetAllRequest,
        po_id: props.poCode ? [props.poCode] : props.poCode,
        filtered_selection: !isEmpty(props.filteredSelection)
          ? props.filteredSelection
          : [],
        popupLink: props.popUpLinkFromDashbaord,
        // skip_list: skipList?.current,
        ...getIsValidDraft(),
      };

      let response = await props.getAllocate(body);
      response.data.data.table_data = response.data?.data?.table_data.map(
        (articleData) => {
          if (articleData?.available_stores_perc > -1) {
            articleData.available_stores_perc = `${articleData.available_stores_perc}%`;
          }
          return articleData;
        }
      );
      if (response.data.status) {
        let l_userSelectedStores = response.data?.data?.user_selected_stores;
        let l_updatedRows =
          articleTableGridInstance?.current?.api?.updatedRows || null;
        let l_responseData = response.data?.data?.table_data,
          l_updatedResponse;
        l_responseData = mutateStoreGroupCode(
          l_responseData,
          defaultStoreGroupCode.current?.[0]?.attribute_value
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
        displaySnackMessages(response.data.message, "success");
        !articleDataMounted && setArticleDataMounted(true);
        storesForSelectedStoreFilters.current = l_userSelectedStores;
        manualBodyRef.current = manualbody;
        // skipList.current = l_responseData?.map((val) => val.ph_code);
        offset.current = response.data.offset;

        return {
          data: l_updatedResponse,
          // totalCount: response.data.total,
        };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setArticleTableLoader(false);
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
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

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (colDef.column_name === "demand_type") {
      if (newValue !== "Fixed") {
        data.user_def_inv = "";
        data.user_def_inv_perc = "";
        data.final_tot_inventory = null;
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
    }
    if (colDef.column_name === "user_def_inv_perc") {
      data.user_def_inv = "";
      data.final_tot_inventory = onlySpaces(data.user_def_inv_perc)
        ? null
        : Math.round(
            +(data.net_available_inventory * data.user_def_inv_perc) / 100
          );
      articleTableGridInstance.current.api.refreshCells({
        columns: ["user_def_inv", "final_tot_inventory"],
      });
    }
    if (colDef.column_name === "user_def_inv") {
      data.user_def_inv_perc = "";
      data.final_tot_inventory = newValue;
      articleTableGridInstance.current.api.refreshCells({
        columns: ["user_def_inv_perc", "final_tot_inventory"],
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

  const reviewStoreAndDC = ({ manual, expedited = false }) => {
    setExpeditedFlow(expedited);
    let l_articlesWithValidationError = checkValidationForArticles(
      articleTableGridInstance,
      "article",
      storeGroupStoreMap?.current,
      storesForSelectedStoreFilters?.current,
      ignoreAlert,
      false,
      props.reserve_quantity_flag
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
  };

  const viewIAForecast = () => {
    let l_payloadWithStoreAndProducts = {
      isRedirectedFromInventory: true,
      payload: {
        product_code: [],
        store_code: [],
      },
    };
    let l_selectedRows =
      articleTableGridInstance?.current?.api?.reConciledSelectedRowIds;
    l_selectedRows = Array.from(l_selectedRows.values());
    let l_selectedRowSizeData = l_selectedRows.some(
      (item) => item.sizes?.length === 0
    );
    if (l_selectedRowSizeData) {
      displaySnackMessages(
        ARTICLE_TABLE_SIZE_PROFILE_VALIDATION_MESSAGE,
        "error"
      );
    } else {
      l_selectedRows.forEach((val) => {
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
        l_payloadWithStoreAndProducts["payload"]["store_code"].push(
          ...val.intersected_stores
        );
      });
      l_payloadWithStoreAndProducts["payload"]["store_code"] = [
        ...new Set(l_payloadWithStoreAndProducts["payload"]["store_code"]),
      ];
      const adaPayload = {
        filters: props.selectedFilters,
        selectedDependency:
          props.inventorysmartCreateAllocationFilterDependency,
        channel: props.selectedFilters?.filter(
          (filter) => filter.attribute_name === "channel"
        )[0].values[0],
        selection: articleTableGridInstance?.current?.api?.checkConfiguration,
        ...l_payloadWithStoreAndProducts,
        timeline: {
          startDate: moment().format("YYYY/MM/DD"),
          endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
        },
        prev_action: articleTableGridInstance?.current?.api?.prevAction,
      };
      localStorage.setItem(
        "adaPayloadFromInventory",
        JSON.stringify(adaPayload)
      );
      window.open(ADA_VISUAL, "_blank", "noopener,noreferrer");
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

  return (
    <>
      <Paper className={globalClasses.paperWrapper}>
        <div className={classes.autoOverflowWrapper}>
          {render && (
            <div ref={articleTableRef}>
              <Loader loader={props.articleTableLoader} minHeight={160}>
                <AgGridComponent
                  processCellForClipboard={processCellForClipboard}
                  processHeaderForClipboard={processHeaderForClipboard}
                  columns={articleTableColumn}
                  selectAllHeaderComponent={true}
                  onRowSelected
                  uncheckRows={uncheckableArticle}
                  onSelectionChanged={onSelectionChanged}
                  manualCallBack={(body, pageIndex) =>
                    manualCallBack(body, pageIndex)
                  }
                  callBackToSetCheckConfig={callBackToSetCheckConfig}
                  onCellValueChanged={onCellValueChanged}
                  onBlur={onBlur}
                  {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "strategy__article__details"
                  )
                    ? {
                        pagination: false,
                        rowModelType: "infinite",
                        cacheOverflowSize: 2,
                        hideSelectCurrentPageRecords: true,
                      }
                    : {
                        rowModelType: "serverSide",
                        serverSideStoreType: "partial",
                      })}
                  cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
                  loadTableInstance={loadTableInstance}
                  uniqueRowId={"article"}
                  showSaveTableConfig={true}
                />
                <div className={classes.buttonGroupWrapper}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!buttonEnabled}
                    className={classes.button}
                    onClick={() => setShowSetAllModal(true)}
                  >
                    Set All
                  </Button>
                  {props.expeditedFlow && (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!buttonEnabled}
                      className={classes.button}
                      onClick={() =>
                        reviewStoreAndDC({ manual: true, expedited: true })
                      }
                    >
                      Expedited Allocation
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!buttonEnabled}
                    className={classes.button}
                    onClick={() => reviewStoreAndDC({ manual: true })}
                  >
                    Review Store and DC
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!buttonEnabled}
                    className={classes.button}
                    onClick={() => reviewForcastHandler()}
                  >
                    Review Forecast
                  </Button>
                </div>
                {
                  <Validation
                    articles={articlesWithValidationError}
                    excludeAllHandler={excludeAllHandler}
                  />
                }
              </Loader>
            </div>
          )}
          {showSetAllModal && (
            <SetAllModal
              isPO={props.poCode}
              hideInSetAll={props.hideInSetAll}
              columns={articleTableColumn}
              setAllDcs={setAllDcs}
              setShowSetAllModal={setShowSetAllModal}
              agGridInstance={articleTableGridInstance.current}
              setUpdatedRows={setUpdatedRows}
              getUpdatedApsWos={getUpdatedApsWos}
              setCheckAllSetAllRequest={setCheckAllSetAllRequest}
              storeGroupStoreMap={storeGroupStoreMap.current}
              storesForSelectedStoreFilters={
                storesForSelectedStoreFilters?.current
              }
              defaultStoreGroupCode={
                defaultStoreGroupCode?.current?.[0]?.attribute_value || {}
              }
            />
          )}
        </div>
      </Paper>
      {showStoreandDc && (
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
          isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
          storeGroupStoreMap={storeGroupStoreMap.current}
        />
      )}
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
      <Prompt
        isOpen={reviewForecast}
        title="Review forecast"
        subHeading="Changes made will be discarded on redirecting to review the forecast, are you sure you want to redirect?"
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            viewIAForecast();
            setReviewForecast(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setReviewForecast(false),
        }}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .selectedFilters,
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
    filteredSelection:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .filteredSelection,
    reserve_quantity_flag:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.["validationMessage"]?.[
        "reserve_quantity"
      ],
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .popUpLinkFromDashbaord,
    hideInSetAll:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.hideInSetAll,
    expeditedFlow:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dashboard?.expeditedFlow,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreDetailsAtSizes: (payload) =>
    dispatch(getStoreDetailsAtSizes(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  getViewPlanTableConfiguration: (payload) =>
    dispatch(getViewPlanTableConfiguration(payload)),
  getAllocate: (payload) => dispatch(getAllocate(payload)),
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
});

export default connect(mapStateToProps, mapDispatchToProps)(ArticlesTable);
