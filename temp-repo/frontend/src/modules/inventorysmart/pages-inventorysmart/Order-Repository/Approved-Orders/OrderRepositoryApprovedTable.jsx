import { Button, Tooltip, Typography } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import {
  EMPTY_ORDER_QTY,
  FILE_DOWNLOADING_MESSAGE,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  ERROR_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  defaultTableData,
  tableConfigurationMetaData,
  INVALID_ORDER_QTY,
  UPDATED_MESSAGE,
  DELETED_MESSAGE,
  tableArticleFilter,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  ORDER_TYPE_GROUPING_BGCOLOR_MAPPER,
  OMS_ORDER_GEN_TYPE_CHIP_KEY,
  OMS_ORDER_STATUS_CHIP_KEY,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  deleteOrders,
  getApprovedOrdersSummaryTableConfiguration,
  getApprovedPendingOrdersSummaryTableData,
  setOrderRepositoryApprovedOrdersTableConfigLoader,
  setOrderRepositoryApprovedOrdersTableData,
  setOrderRepositoryApprovedOrdersTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Repository/order-repository-service";
import { connect } from "react-redux";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import {
  editOmsSkuSummaryTableData,
  SetOmsSkuSummaryApprovedRequestData,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import DownloadIcon from "@mui/icons-material/Download";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteIcon from "@mui/icons-material/Delete";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { NO_DATA_FOUND } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import StyledChip from "core/Utils/chip/StyledChip";

const OrderRepositoryApprovedTable = (props) => {
  const classes = useStyles();
  const [approvedTableColumns, setApprovedTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSku, setSelectedSku] = useState([]);
  const skuSummaryTableGridInstance = useRef(null);
  const [paddingBottom, setPaddingBottom] = useState("1rem");

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const [totalCount, setTotalCount] = useState(0);

  const [configuration, setConfiguration] = useState();
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isDelete, setIsDelete] = useState(false);
  const updatedOrderQuantity = useRef([]);

  const APPROVE_PROMPT_TITLE = "Approve Selected Sku";
  const DELETE_PROMPT_TITLE = "Delete Selected Sku";

  const renderOrderTypeCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY].toLowerCase()
        .split(" ")
        .join("_");
      return (
        <StyledChip
          label={params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };
  const renderOrderStatusCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_STATUS_CHIP_KEY].toLowerCase();
      return (
        <StyledChip
          label={params.data[OMS_ORDER_STATUS_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setOrderRepositoryApprovedOrdersTableConfigLoader(true);
      let payload = {
        tableConfigName: props?.data[0]?.table_name,
      };
      let columns = await props.getApprovedOrdersSummaryTableConfiguration(
        payload
      );
      props.setOrderRepositoryApprovedOrdersTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
          case OMS_ORDER_GEN_TYPE_CHIP_KEY:
            col = renderOrderTypeCell(col);
            break;
          case OMS_ORDER_STATUS_CHIP_KEY:
            col = renderOrderStatusCell(col);
            break;
          default:
            return col;
        }
        return col;
      });
      setApprovedTableColumns(cols);
      props.setRenderAgGrid(true);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setSelectedSku([]);
    };
    fetchColumnData();
  }, [props.selectedFilters, props?.data]);

  useEffect(() => {
    setConfiguration(props?.data[0]);
  }, [props?.data]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && props.setRenderAgGrid(false);
  }, [props.selectedFilters, props?.data]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderRepositoryApprovedOrdersTableLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...props?.OrderRepoSelectedSku];
      }
      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        include_custom_order: true,
        current_cycle_order: false,
        order_status: props?.data[0]?.status,
        // ...props.startEndDate,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      setManualBodyData(body.meta);
      let response = await props.getApprovedPendingOrdersSummaryTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "product_code"
        );
        formatedData.forEach((val) => {
          val.checkbox_disabled = false;
        });
        setTotalCount(response.data?.total);
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setOrderRepositoryApprovedOrdersTableLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderRepositoryApprovedOrdersTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderRepositoryApprovedOrdersTableLoader(false);
      return defaultTableData;
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    skuSummaryTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSku(selectedRows);
    props?.deepDive(selectedRows);
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const loadTableInstance = (params) => {
    skuSummaryTableGridInstance.current = params;
  };

  const confirmDelete = async () => {
    try {
      setShowDeleteDialog(false);
      setIsDelete(false);
      let orderIds = [];
      selectedSku.forEach((id) => {
        orderIds.push(id.id);
      });
      let body = {
        delete_type: "hard",
        order_ids: orderIds,
      };
      let response = await props.deleteOrders(body);
      if (response.data.status) {
        if (response.data.data?.failed.length === 0) {
          skuSummaryTableGridInstance.current.api.deselectAll();
          skuSummaryTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
          props.setReloadKpi(true);
          displaySnackMessages(DELETED_MESSAGE, "success");
        } else if (response.data.data?.success.length === 0) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } else {
          if (response.data.data?.failed.length > 0) {
            let orders = [];
            response.data.data?.failed.forEach((order) => {
              orders.push(order.product_code);
            });
            //let errorText = ERROR_MESSAGE + orders.join(" , ");
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        }
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
    //props.confirmDeletePlans();
  };

  const confirmApprove = async (action, actionCode, statusCode) => {
    setShowDeleteDialog(false);
    let orderIds = [];
    selectedSku.forEach((id) => {
      orderIds.push(id.id);
    });
    if (action === "Approve") {
      var body = {
        action: configuration?.isApprovalButton?.actionName,
        comment: "",
        order_ids: orderIds,
        actionCode: configuration?.isApprovalButton?.actionCode,
        status: configuration?.status,
      };
    } else {
      var body = {
        action: action,
        comment: "",
        order_ids: orderIds,
        actionCode: actionCode,
        status: statusCode,
      };
    }
    let response = await props?.SetOmsSkuSummaryApprovedRequestData(body);
    if (response.data.status) {
      if (response.data.data?.failed.length === 0) {
        displaySnackMessages("Successfully Done", "success");
        props.setReloadKpi(true);
        skuSummaryTableGridInstance.current.api.refreshServerSideStore({
          purge: true,
        });
      } else if (response.data.data?.success.length === 0) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } else {
        if (response.data.data?.failed.length > 0) {
          let orders = [];
          response.data.data?.failed.forEach((order) => {
            orders.push(order.product_code);
          });
          //let errorText = ERROR_MESSAGE + orders.join(" , ");
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      }
    }
  };

  const getConfirmMessage = (p_msg = "") => {
    return `Are you sure you want to ${p_msg} the selected SKU(s)?`;
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      let body = {
        filters: [...props.selectedFilters],
        include_custom_order: true,
        current_cycle_order: false,
        order_status: props?.data[0]?.status,
        meta: manualBodyData?.sort
          ? {
              ...manualBodyData,
              limit: { limit: totalCount, page: 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: totalCount, page: 1 },
            },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = await props.getApprovedPendingOrdersSummaryTableData(body);
      if (response.data.status) {
        let downloadData = agGridRowFormatter(response.data.data);
        setCsvData(cloneDeep(downloadData), csvHeaders);
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    setIsSaveDisabled(false);
    let isValueEmpty = false;
    if (params?.data?.order_quantity === "") {
      displaySnackMessages(EMPTY_ORDER_QTY, "info");
    } else {
      if (
        parseInt(params.data?.order_quantity) <
          parseInt(params?.data?.min_order_quantity) ||
        parseInt(params.data?.order_quantity) >
          parseInt(params?.data?.max_order_quantity) ||
        params.data?.order_quantity % params.data?.pack_size !== 0
      ) {
        displaySnackMessages(INVALID_ORDER_QTY, "error");
        skuSummaryTableGridInstance.current.api.forEachNode((node) => {
          if (params.data.id == node.data?.id) {
            params.data.order_quantity = node.data.order_quantity_copy;
          }
        });
        skuSummaryTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["order_quantity"],
        });
      }
    }

    //Calculates the OrderCost when Order Qty is changed
    let calculatedOrderCost = parseInt(
      params?.data?.unit_cost * params?.data?.order_quantity
    );
    node.data.order_cost = calculatedOrderCost;

    if (params.data.order_quantity_copy !== params.data.order_quantity) {
      var column = params.column.colDef.field;
      params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
      params.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [column, "order_cost"],
        rowNodes: [node],
      });
    }
    if (!isValueEmpty) {
      let previousOrders = [];
      if (updatedOrderQuantity.current !== null)
        previousOrders = [...updatedOrderQuantity.current];
      if (previousOrders.length === 0) {
        previousOrders.push({
          new_qty: params?.data?.order_quantity,
          id: params?.data?.id,
        });
      } else {
        let isEdited = false;
        previousOrders.forEach((or) => {
          if (or.id == params?.data?.id) {
            or.new_qty = params?.data?.order_quantity;
            isEdited = true;
          }
        });
        if (!isEdited)
          previousOrders.push({
            new_qty: params?.data?.order_quantity,
            id: params?.data?.id,
          });
      }
      updatedOrderQuantity.current = previousOrders;
    }
    updateParams(params);
  };

  const updateParams = (params) => {
    params.column.colDef.cellStyle = {};
  };

  const updateOrderQuantityButton = async () => {
    if (updatedOrderQuantity.current.length == 0) {
      displaySnackMessages("Null or Empty values cannot be saved.", "error");
    } else {
      let body = {
        user: localStorage.getItem("name"),
        orders: updatedOrderQuantity.current,
      };
      let response = await props.editOmsSkuSummaryTableData(body);
      if (response.data.status) {
        setIsSaveDisabled(true);
        props.setReloadKpi(true);
        updatedOrderQuantity.current = [];
        skuSummaryTableGridInstance.current.api.refreshServerSideStore({
          purge: true,
        });
        displaySnackMessages(UPDATED_MESSAGE, "success");
      }
    }
  };

  const deleteOrders = async () => {
    setIsDelete(true);
    // DIALOG_POPUP_TITLE = "Delete Selected Sku"
    setShowDeleteDialog(true);
  };

  const approveOrders = async () => {
    setIsDelete(false);
    // DIALOG_POPUP_TITLE = "Approve Selected Sku"
    setShowDeleteDialog(true);
  };

  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title={isDelete ? DELETE_PROMPT_TITLE : APPROVE_PROMPT_TITLE}
        subHeading={
          isDelete ? getConfirmMessage("delete") : getConfirmMessage("approve")
        }
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            if (isDelete) {
              confirmDelete();
            } else {
              confirmApprove(configuration?.isApprovalButton?.actionName);
            }
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant={isDelete ? "error" : "default"}
      />
      <Loader
        loader={
          props.orderRepositoryApprovedOrdersTableLoader ||
          props.orderRepositoryApprovedOrdersTableLoader
        }
        minHeight={"260px"}
      >
        {props.renderAgGrid && (
          <>
            <div style={{ textAlign: "left" }}>
              <Typography variant="h6">{configuration?.label}</Typography>
            </div>
            <div
              style={{ textAlign: "right", paddingBottom: `${paddingBottom}` }}
            >
              {configuration?.isPushBackButton?.isVisible && (
                <Button
                  variant="outlined"
                  color="primary"
                  id="productSetAllBtn"
                  className={classes.button}
                  disabled={selectedSku.length == 0}
                  onClick={() =>
                    confirmApprove(
                      configuration?.isPushBackButton?.actionName,
                      configuration?.isPushBackButton?.actionCode,
                      configuration?.status
                    )
                  }
                >
                  {configuration?.isPushBackButton?.name}
                </Button>
              )}
              {configuration?.isApprovalButton?.isVisible && (
                <Button
                  variant="contained"
                  color="primary"
                  id="productSetAllBtn"
                  className={classes.button}
                  disabled={selectedSku.length == 0}
                  onClick={approveOrders}
                >
                  {configuration?.isApprovalButton?.name}
                </Button>
              )}
              {configuration?.isSendForApprovalButton?.isVisible && (
                <Button
                  variant="contained"
                  color="primary"
                  id="productSetAllBtn"
                  className={classes.button}
                  disabled={selectedSku.length == 0}
                  onClick={() =>
                    confirmApprove(
                      configuration?.isSendForApprovalButton?.actionName,
                      configuration?.isSendForApprovalButton?.actionCode,
                      configuration?.status
                    )
                  }
                >
                  {configuration?.isSendForApprovalButton?.name}
                </Button>
              )}
              {configuration?.isDeletedButton && (
                <Tooltip title="Delete">
                  <Button
                    variant="contained"
                    color="primary"
                    id="createProductBtn"
                    className={classes.button}
                    disabled={selectedSku.length == 0}
                    onClick={deleteOrders}
                  >
                    <DeleteIcon fontSize="small"></DeleteIcon>
                  </Button>
                </Tooltip>
              )}
              {configuration?.isEditButton && (
                <Tooltip title="Update">
                  <Button
                    variant="contained"
                    color="primary"
                    id="createProductBtn"
                    className={classes.button}
                    disabled={isSaveDisabled}
                    onClick={updateOrderQuantityButton}
                  >
                    <UpdateIcon fontSize="small"></UpdateIcon>
                  </Button>
                </Tooltip>
              )}
              {configuration?.isDownloadButton && (
                <Tooltip title="Download">
                  <Button
                    variant="contained"
                    onClick={async () => {
                      await downloadCsv();
                      downloadLink.current.link.click();
                    }}
                    startIcon={<DownloadIcon />}
                    disabled={totalCount === 0}
                  >
                    Download
                  </Button>
                </Tooltip>
              )}
              {downloadExcelLink(
                csvData,
                configuration?.label ? configuration?.label : "approved_orders",
                downloadLink,
                csvHeaders,
                "",
                "",
                true
              )}
            </div>
            <AgGridComponent
              columns={approvedTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              selectAllHeaderComponent={configuration?.isMultiSelectRows}
              hideSelectAllRecords={true}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              loadTableInstance={loadTableInstance}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={10}
              uniqueRowId={"product_code"}
              pagination={true}
            />
          </>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .selectedSku,
    orderRepositoryApprovedOrdersTableLoader:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .orderRepositoryApprovedOrdersTableLoader,
    orderRepositoryApprovedOrdersTableConfig:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .orderRepositoryApprovedOrdersTableConfig,
    orderRepositoryApprovedOrdersTableData:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .orderRepositoryApprovedOrdersTableData,
    fetchViewPlansData:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .fetchViewPlansData,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getApprovedOrdersSummaryTableConfiguration: (payload) =>
    dispatch(getApprovedOrdersSummaryTableConfiguration(payload)),
  getApprovedPendingOrdersSummaryTableData: (payload) =>
    dispatch(getApprovedPendingOrdersSummaryTableData(payload)),
  setOrderRepositoryApprovedOrdersTableLoader: (payload) =>
    dispatch(setOrderRepositoryApprovedOrdersTableLoader(payload)),
  setOrderRepositoryApprovedOrdersTableConfigLoader: (payload) =>
    dispatch(setOrderRepositoryApprovedOrdersTableConfigLoader(payload)),
  setOrderRepositoryApprovedOrdersTableData: (payload) =>
    dispatch(setOrderRepositoryApprovedOrdersTableData(payload)),
  editOmsSkuSummaryTableData: (payload) =>
    dispatch(editOmsSkuSummaryTableData(payload)),
  SetOmsSkuSummaryApprovedRequestData: (payload) =>
    dispatch(SetOmsSkuSummaryApprovedRequestData(payload)),
  deleteOrders: (payload) => dispatch(deleteOrders(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderRepositoryApprovedTable);
