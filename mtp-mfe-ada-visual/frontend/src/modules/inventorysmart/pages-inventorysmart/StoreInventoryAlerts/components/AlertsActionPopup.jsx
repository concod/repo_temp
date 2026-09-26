import React, { useState, useEffect, useRef, forwardRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";

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
  UPDATED_MESSAGE,
  UPDATE_MODEL_STOCK_PAYLOAD_KEY,
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
  updateModelStockSum,
} from "./inventory_alerts_utiltiy";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import ExpeditedAllocation from "./ExpeditedAllocation";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";

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

  // used to store the rows whose updated model stock value is edited via onChange(single row edit) or by onSelection(multiple Row edit)
  const editedRowRef = useRef([]);
  const alertsPopupDataRef = useRef([]);
  const agGridUserInstance = useRef(null);
  const [toggle, setToggle] = useState(true);
  const [loader, setLoader] = useState(false);
  const [hideTable, setHideTable] = useState(false);
  const [showColor, setShowColor] = useState(true);

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
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
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
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
    } else {
      if (props.alertLevel === 1 && props.tableName && props.canReview) {
        reviewPopupAlerts(selectedArticles);
      }
      redirectToADA(
        selectedArticles,
        props.filterDashboardConfiguration.appliedFilterData.dependencyData,
        screenName
      );
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
    if (
      // selectedArticles?.length === 0 &&
      l_selectedRows?.length === 0
    ) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
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
            props.filterDashboardConfiguration.appliedFilterData.dependencyData,
          filteredSelection: l_checkAllConfig,
          popupLink: props?.alertPopupLink?.split("/")?.pop() || null,
          poCode: l_selectedRows[0]?.po_code || null,
        });
        props.setDashboardLoaderFullScreen(true);
      } else {
        redirectToScreen(
          // selectedArticles,
          l_selectedRows,
          storeData,
          props.filterDashboardConfiguration.appliedFilterData.dependencyData,
          screenName,
          screenParams,
          allocationInEaches,
          props.redirection === "Constraints",
          props.redirection === "Create Allocation",
          l_checkAllConfig,
          props.alertPopupLink
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

    if (props.active) {
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
    return filters;
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setShowTableLoader(true);

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
      let response = await props.getServerSideAlertsData(payload);
      response.data.data = response.data.data.map((dataItem, index) => {
        dataItem.index = index;
        return dataItem;
      });

      if (response.data.status) {
        let formattedData;
        if (pageIndex) {
          formattedData = agGridRowFormatter(
            response.data.data,
            params?.api?.checkConfiguration,
            props.uniqueKey
          );
        } else {
          params.api.setCheckConfiguration([]);
          formattedData = response.data.data;
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
        return { data: formattedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setShowTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
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
                {props?.inventorysmartScreenConfig?.dashboard?.drillDown
                  ?.alertsToggleForAllocation && ( // spcific to vb
                  <FormControl component="fieldset">
                    <FormGroup>
                      <FormControlLabel
                        style={{ marginLeft: "2px" }}
                        control={
                          <Switch checked={toggle} onChange={toggledSwitch} />
                        }
                        label={
                          (toggle ? "Exclude" : "Include") + " Colored Records"
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
                selectAllHeaderComponent={
                  ((props.redirection === "Create Allocation" &&
                    props.canCreate) ||
                    props.canEdit) &&
                  ((props.redirection && props?.isSelectionEnabled) ||
                    props.tableConfigName === "model_stock_level_2")
                }
                allowCustomStyling={true}
                uniqueRowId={props.uniqueKey}
                downloadAsExcel={props?.downloadLink ? false : true}
                loadTableInstance={loadUserTableInstance}
                onCellValueChanged={onCellValueChanged}
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
                    return {
                      background: allocationCount > 1 ? "#ffd591" : "#beffb7",
                    };
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
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(AlertsActionPopup);
