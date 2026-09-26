import React, { useState, useEffect, useRef, forwardRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import moment from "moment";

import {
  Button,
  Dialog,
  DialogContent,
  Typography,
  Switch,
  FormControl,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
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
import { setStoreInventoryAlertsTableData } from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";

import {
  ALLOCATION_IN_EACHES_MESSAGE,
  defaultTableData,
  KITS_ALLOCATION_ALERT_CONFIG_NAME,
  MIN_ARTICLE_SELECTION_MESSAGE,
  MIN_ARTICLE_SELECTION_MESSAGE_rl,
  UPDATED_MESSAGE,
  UPDATE_MODEL_STOCK_PAYLOAD_KEY,
  tableArticleFilter,
  TOTAL_INVENTORY_DC_COL_ALERTS_RL
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";

import { useStyles as invStyles } from "core/Utils/styles/inventorySmartUseStyles";
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
  redirectToADA,
  redirectToFinalizeScreen,
  redirectToScreen,
  updateCheckConfiguration,
  updateModelStockSum,
} from "./inventory_alerts_utiltiy";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import ExpeditedAllocation from "./ExpeditedAllocation";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { getAllocate } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  paperFullWidth: {
    overflowY: "visible",
    minWidth: "80%",
  },
  dialogRoot: {
    "& .MuiDialog-paperWidthSm": {
      width: "35rem !important",
      borderRadius: "0.6rem",
    },
  },
}));

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
  const classes = useStyles();
  const globalClasses = globalStyles();
  const invClasses = invStyles();

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

  // used to store the rows whose updated model stock value is edited via onChange(single row edit) or by onSelection(multiple Row edit)
  const editedRowRef = useRef([]);
  const alertsPopupDataRef = useRef([]);
  const agGridUserInstance = useRef(null);
  const [toggle, setToggle] = useState(true);
  const [loader, setLoader] = useState(false);
  const [hideTable, setHideTable] = useState(false);
  const [showColor, setShowColor] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [apiWithZeroRows, setApiWithZeroRows] = useState(false);
  const [articleDetails, setArticleDetails] = useState([]);
  const screenNameForAdditionalRedirection = useRef(null);

  const {
    tpc_store_week,
  } = props.inventorysmartScreenConfig?.inventorysmart_constraints || {};

  const toggleStoreInventoryPopup = (data, columnName, item) => {
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
    setMetric(props.metrics || columnName);
    openStoreArticleInventoryPopUp();
    if (column_names?.includes(columnName)) {
      setStoreDCModal(true);
    }
  };
const snackMessage = () => {
  if (props.inventorysmartScreenConfig?.client === "_NA" ||props.inventorysmartScreenConfig?.client === "_EU") {
    return MIN_ARTICLE_SELECTION_MESSAGE_rl;
  } else {
    return MIN_ARTICLE_SELECTION_MESSAGE;
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
    available_qty: toggleStoreInventoryPopup,
    store_count: toggleStoreInventoryPopup,
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
  };

  const onSelectionChanged = (event) => {
    let selections = [];
    if (
      props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
        "dashboard"
      ) &&
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
      let cloneAlerts = cloneDeep(props.storeInventoryAlertsTableData);
      let updateIsResolvedIndex = cloneAlerts?.map((item) => {
        if (item?.prefix === props.reviewPrefix) {
          return {
            ...item,
            is_resolved: Number(item.is_resolved) + productCodes?.length,
          };
        } else return item;
      });
      props.setStoreInventoryAlertsTableData(updateIsResolvedIndex);
    }
  };

  const handleAutoAllocationFinalize = (screenName) => {
    if (selectedArticles?.length === 0 && props?.isSelectionEnabled) {
      displaySnackMessages(snackMessage(), "error");
    } else if (
      selectedArticles?.length !== alertsPopupTableDataCount &&
      props?.isSelectionEnabled &&
      !props?.minimumOneArticle
    ) {
      displaySnackMessages("Select all articles", "warning");
    } else {
      redirectToFinalizeScreen(
        selectedArticles,
        screenName,
        props?.data?.extra?.plan_code,
        alertsPopupTableDataCount
      );
    }
  };

  const handleRedirectionToADA = (screenName) => {
    if (selectedArticles?.length === 0) {
      displaySnackMessages(snackMessage(), "error");
    } else {
      if (props.alertLevel === 1 && props.tableName && props.canReview) {
        reviewPopupAlerts(selectedArticles);
      }
      redirectToADA(
        selectedArticles,
        props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData,
        screenName
      );
    }
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
            props.filterDashboardConfiguration.appliedFilterData
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
        props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
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
          props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData,
        meta: {
          range: [],
          search: [],
          sort: [],
          limit: { limit: 100, page: pageIndex + 1, offset: offset },
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
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      resetState();
    }
  };

  const handleRedirectionToADAMFP = (screenName) => {
    if (selectedArticles?.length === 0) {
      displaySnackMessages(snackMessage(), "error");
    } else {
      screenNameForAdditionalRedirection.current = screenName;
      props.setDashboardLoaderFullScreen(true);
      fetchArticleDetailsForAllocation();
    }
  };

  const handleInventoryRedirection = (
    screenName,
    screenParams,
    expeditedAllocation
  ) => {
    let l_selectedRows = getSelectedRowsForInfiniteRowModel(
      agGridUserInstance.current
    );
    let l_checkAllConfig = getObjectsAfterCheckAll(
      agGridUserInstance?.current?.api?.checkConfiguration
    );

    let l_filters =
      props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
      props.filterDependencyData;
    let l_articlesFilteredFromFilterSection = l_filters
      ?.filter((val) => val?.filter_id === "article")?.[0]
      ?.values?.join();

    let l_updatedCheckConfiguration = updateCheckConfiguration(
      l_checkAllConfig,
      l_articlesFilteredFromFilterSection
    );

    if (isPoAlert()) {
      l_selectedRows = props.data.data
    }
    if (
      // selectedArticles?.length === 0 &&
      l_selectedRows?.length === 0
    ) {
      displaySnackMessages(snackMessage(), "error");
    } else {
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

      if (expeditedAllocation) {
        setExpeditedAllocation(true);
        setRedirectionConfigurations({
          selectedArticles: l_selectedRows,
          storeData,
          filters:
            props.filterDashboardConfiguration.appliedFilterData
              .dependencyData || props.filterDependencyData,
          filteredSelection: l_updatedCheckConfiguration,
          popupLink: props?.alertPopupLink?.split("/")?.pop() || null,
          poCode: l_selectedRows[0]?.po_code || null,
          po_name: props.name,
        });
        props.setDashboardLoaderFullScreen(true);
      } else {
        // In TPC, we need only the selected article-store combination to be displayed in the redirected screen
        const selectedStores = tpc_store_week ? l_selectedRows.map(obj => obj.store_code) : storeData;

        redirectToScreen(
          // selectedArticles,
          l_selectedRows,
          selectedStores,
          props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
            props.filterDependencyData,
          screenName,
          screenParams,
          allocationInEaches,
          props.redirection === "Constraints",
          props.redirection === "Create Allocation",
          l_updatedCheckConfiguration,
          props.alertPopupLink,
          props.name
        );
      }
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setAlertsActionPopupConfigLoader(true);

      let columns;

      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };

        columns = await props.getAlertsActionTableConfiguration(payload);
      } else if (props.tableConfig) {
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
      setAlertsPopupTableColumns(formattedColumns);
      props.setAlertsActionPopupConfigLoader(false);
    };

    if (props.active && (!props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall || props.alertLevel !== 1)) {
      fetchColumnConfig();
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
      if (
        props.tableConfigName === "auto_allocation_level_2" &&
        props?.isSelectionEnabled
      ) {
        let selectedData = tableData.map((item) => {
          return {
            ...item,
            is_selected: true,
          };
        });
        setAlertsPopupTableData(selectedData);
      } else {
        setAlertsPopupTableData(tableData);
      }

      setAlertsPopupTableDataCount(tableData?.length);
    }
  }, [props.data, alertsPopupDataRef.current]);

  const handleChange = (formdata) => {
    setModelStockData(formdata);
  };

  const loadUserTableInstance = (params) => {
    agGridUserInstance.current = params;
  };

  const onApply = () => {
    if (isEmpty(modelStockData.model_stock)) {
      displaySnackMessages("Enter a value", "warning");
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

  const saveUpdatedModelStockValue = async () => {
    // to remove repetitive records
    let uniqueArr = [
      ...new Set(editedRowRef.current.map((o) => JSON.stringify(o))),
    ].map((s) => JSON.parse(s));
    if (!uniqueArr.length) {
      displaySnackMessages("No Changes to save", "warning");
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
        displaySnackMessages("Updated successfully", "success");
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
        displaySnackMessages(ERROR_MESSAGE, "error");
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
      displaySnackMessages("Changes made are not saved", "warning");
    props.closeModal();
  };

  const getDownloadRequestBody = () => {
    let excludedFilterValues = props.excludedFilterValues
      ? props.excludedFilterValues
      : [];

    const filters = getFilterDependencyProductAndStoreAttributes([
      ...props.selectedFilters,
      ...excludedFilterValues,
    ]);
    filters.table_config = [...alertsPopupTableColumns];

    filters.meta = { ...tableMetaData };

    return filters;
  };

  const getNewSubHeaders = (p_subCols, p_label) => {
    let newSubHead = []
    p_subCols.forEach((subCol) => {
   
      if (subCol.extra.displayClusteredCol) {
        newSubHead.push({
          ...subCol,
          extra: {"hide_from_panel": true,},
          columnGroupShow: 'closed',
          
        })
      }
      newSubHead.push({
        ...subCol,
        columnGroupShow: 'open'
      })
    })
    if (p_label == "DC Inventory") {
      newSubHead.push(TOTAL_INVENTORY_DC_COL_ALERTS_RL);
    }
    return newSubHead
  };

  const isOpenOnSearch = (p_instance, p_colName) => {

    // to get the state of the columngroup i.e open/closed
    const columnGroupState = p_instance.columnApi?.getColumnGroupState();

    // Get all displayed column groups
    const displayedGroups = p_instance.columnApi?.getAllDisplayedColumnGroups();

    const groupStatesWithNames = displayedGroups?.map(group => {
      const groupId = group?.getGroupId();
      const headerName = group?.getOriginalColumnGroup()?.getColGroupDef()?.headerName;


      // Find the state of this group from the columnGroupState array
      const groupState = columnGroupState?.find(state => state?.groupId === groupId);

      return {
        headerName: headerName || groupId,
        groupId: groupId,
        open: groupState ? groupState?.open : false
      };
    });
  if (displayedGroups?.length) {

    for (let colGrp of groupStatesWithNames) {
      if (colGrp?.headerName == p_colName && colGrp?.open == true) {
        return true
      }
    }
    return false

  }
  else {
    if (p_colName == "DC Inventory" || p_colName == "Store Inventory") {
      return true
    }
    return false
  }

}

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setTableMetaData(manualbody);
    // populating clustered columns for RL for individual alert
    try {   
      if(props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall && props.alertLevel === 1){
        pageIndex == 0 && props.setAlertsActionPopupConfigLoader(true);
      }else{
        props.setShowTableLoader(true);
      }
      let excludedFilterValues = props.excludedFilterValues
        ? props.excludedFilterValues
        : [];

      const filters = getFilterDependencyProductAndStoreAttributes([
        ...props.selectedFilters,
        ...excludedFilterValues,
      ]);

      let payload = getServerSidePaginationAPIPayload(
        props.alertPopupLink,
        filters,
        manualbody,
        pageIndex,
        props.includeExclusionFilter,
        props.excludeURLObject,
        params
      );
      if (
        props?.inventorysmartScreenConfig?.dashboard?.drillDown
          ?.alertsToggleForAllocation
      ) {
        // specfic to vb
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
      let response = await props.getServerSideAlertsData(payload); // calling  paginated_pop_up link api for table_data
      let total ;
      let status;
      if(props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall && props.alertLevel === 1){
       
        let columns =  cloneDeep(
          response.data?.data?.columns
        );
        const modifiedColumns = columns?.map((column) => {
          // Handle `sub_headers` exist
          if (column.sub_headers.length){
            
            column = {
              ...column,
              ...(isOpenOnSearch(agGridUserInstance?.current, column.label) && { openByDefault: true }),
              sub_headers: getNewSubHeaders(column.sub_headers, column.label,'sub_headers'),              
            };
          }
         
         // Handle editability logic based on `props.canEdit`
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
        setAlertsPopupTableColumns(formattedColumns);
        props.setAlertsActionPopupConfigLoader(false);

        props.setShowTableLoader(true);
        response.data.data.table_data = response.data.data.table_data.map((dataItem, index)=>{
          dataItem.index = index;
          return dataItem;
        });
        
        total = response.data.data.total;
        status = response.status;
      

       

      } else {
        response.data.data = response.data.data.map((dataItem, index) => {
          dataItem.index = index;
          return dataItem;
        });
        total = response.data.total;
        status = response.data.status;
       }
        if (status) {
          let formattedData;
          if (pageIndex) {
            formattedData = agGridRowFormatter(
              (props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall && props.alertLevel === 1 ) ? response.data.data.table_data : response.data.data,
              params?.api?.checkConfiguration,
              props.uniqueKey
            );
          } else {
            params.api.setCheckConfiguration([]);
            formattedData = (props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall   && props.alertLevel === 1) ? response.data.data.table_data : response.data.data;
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
          setAlertsPopupTableDataCount(total);
          return { data: formattedData, totalCount: total };
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setShowTableLoader(false);
          return defaultTableData;
        }    
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setShowTableLoader(false);
      props.setAlertsActionPopupConfigLoader(false);
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
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
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

  const isPoAlert = () => {
    return props.name === "Bulk and Release PO" || props.name === "PFS Jewellery & Fragrance PO"
  }

  return props.active ? (
    <>
      {expeditedAllocation && (
        <ExpeditedAllocation
          setExpeditedAllocation={setExpeditedAllocation}
          redirectionConfigurations={redirectionConfigurations}
        />
      )}
      <Dialog
        id="alertsActionDialog"
        aria-labelledby="alerts-action-dialog"
        open={props.active}
        maxWidth="lg"
        fullWidth={true}
        disableEscapeKeyDown={true}
        onClose={(_event, reason) => {
          setExpeditedAllocation(false);
          if (reason === "backdropClick") {
            return;
          }
          props.closeModal();
        }}
        classes={{
          paperFullWidth: classes.paperFullWidth,
        }}
      >
        <DialogContent
          dividers
          classes={{
            root: classnames(
              globalClasses.flexRow,
              globalClasses.layoutAlignBetweenCenter
            ),
          }}
        >
          <Typography classes={{ root: classes.moduleTitle }}>
            Review Recommendation
          </Typography>
          <IconButton color="primary" onClick={closeReviewAlerts} size="large">
            <CloseIcon fontSize="medium" />
          </IconButton>
        </DialogContent>
        <DialogContent
          dividers
          classes={{
            root: classes.dialogContentBody,
          }}
        >
          <Loader
            loader={
              props.alertsActionPopupConfigLoader ||
              props.dashboardFilterFullScreen ||
              loader
            }
            minHeight={"260px"}
          >
            <div
              className="d-md-flex"
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <div>
              {/* Hide the switch in case of PO Alert */}
              {!isPoAlert() &&
                props?.inventorysmartScreenConfig?.dashboard?.drillDown
                  ?.alertsToggleForAllocation &&
                !["Auto Allocation"].includes(props.name) && ( // spcific to vb
                    <FormControl component="fieldset">
                      <FormGroup>
                        <FormControlLabel
                          style={{ marginLeft: "2px" }}
                          control={
                            <Switch checked={toggle} onChange={toggledSwitch} />
                          }
                          label={
                            (toggle ? "Exclude" : "Include") +
                            " Colored Records"
                          }
                        />
                      </FormGroup>
                    </FormControl>
                )}
              </div>
              {props.downloadLink && (
                <DownloadButton
                  url={props.downloadLink}
                  requestBody={getDownloadRequestBody()}
                  disable={!alertsPopupTableDataCount}
                  includeExclusionFilter={props.includeExclusionFilter}
                  excludeURLObject={props.excludeURLObject}
                  columns={alertsPopupTableColumns}
                />
              )}
            </div>
            {!hideTable && (
              <AgGridComponent
                columns={alertsPopupTableColumns}
                rowdata={
                  !props.isPaginatedPopupApi ? alertsPopupTableData : null
                }
                {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                  "dashboard"
                )
                  ? {
                      pagination: false,
                      rowModelType: props.isPaginatedPopupApi && "infinite",
                      cacheOverflowSize: 2,
                      hideSelectCurrentPageRecords: true,
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
                selectAllHeaderComponent={ isPoAlert() ? false :
                  ((props.redirection === "Create Allocation" &&
                    props.canCreate) ||
                    props.canEdit) &&
                  ((props.redirection && props?.isSelectionEnabled) ||
                    props.tableConfigName === "model_stock_level_2")
                }
                uniqueRowId={props.uniqueKey}
                downloadAsExcel={props?.downloadLink ? false : true}
                toPrependContent={true}
                prependedContentDetails={props.prependData()}
                loadTableInstance={loadUserTableInstance}
                onCellValueChanged={onCellValueChanged}
                allowCustomStyling={true}
                getRowStyle={(params) => {
                  if (
                    props?.inventorysmartScreenConfig?.dashboard?.drillDown
                      ?.alertsToggleForAllocation &&
                    showColor &&
                    params?.data?.["number_of_allocations"] > 0
                  ) {
                    // specific to vb
                    let allocationCount =
                      params?.data?.["number_of_allocations"];
                      if (props.inventorysmartScreenConfig?.client === "_VB") {
                        return {
                          background: allocationCount > 1 ? "#ffd591" : "#beffb7",
                        };
                      } else {
                        return {
                          background: "#beffb7",
                        };
                      }
                  }
                  if (params?.data?.[`${props.reviewPrefix}_is_resolved`]) {
                    return { background: "rgb(57 255 20 / 20%)" };
                  }
                }}
                totalCount={alertsPopupTableDataCount} // to set the total count once received from BE
                cacheBlockSize={10}
              />
            )}
            {props.tableConfigName === "model_stock_level_2" &&
              props.canUpdate && (
                <div
                  className={classnames(
                    invClasses.buttonGroupWrapper,
                    globalClasses.marginAround
                  )}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={selectedArticles.length < 2}
                    className={invClasses.button}
                    onClick={() => setShowSetAllModal(true)}
                  >
                    Set All
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    className={invClasses.button}
                    onClick={saveUpdatedModelStockValue}
                  >
                    Save
                  </Button>
                </div>
              )}
            {showSetAllModal && (
              <AlertsSetAll
                closeSetAllModal={closeSetAllModal}
                handleChange={handleChange}
                modelStockData={modelStockData}
                onApply={onApply}
              />
            )}
            {alertsPopupTableDataCount > 0 && (
              <AlertsRedirectionHandler
                agGridUserInstance={agGridUserInstance}
                tableConfig={props.tableConfigName}
                redirection={props.redirection}
                additionalRedirection={props.additionalRedirection}
                canEdit={props.canEdit}
                canCreate={props.canCreate}
                canDeleteAutoAllocations={
                  props?.inventorysmartScreenConfig?.dashboard?.drillDown
                    ?.canDeleteAutoAllocations
                }
                selectedArticles={selectedArticles}
                onDelete={onDelete}
                handleInventoryRedirection={handleInventoryRedirection}
                handleAutoAllocationFinalize={handleAutoAllocationFinalize}
                handleRedirectionToADA={handleRedirectionToADA}
                handleRedirectionToADAMFP={handleRedirectionToADAMFP}
              />
            )}
          </Loader>
        </DialogContent>
      </Dialog>
      <StoreArticleInventoryPopup
        active={openStoreArticleInventoryDialog}
        openModal={openStoreArticleInventoryPopUp}
        closeModal={closeStoreArticleInventoryPopUp}
        filters={props.selectedFilters}
        article={article}
        metric={metric}
        storeDcModal={storeDcModal}
        title={title}
        isPO={isPoAlert()}
        inventorysmartScreenConfig={props.inventorysmartScreenConfig}
        poCode={alertsPopupTableData?.[0]?.po_code}
      />
    </>
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
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
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
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(AlertsActionPopup);
