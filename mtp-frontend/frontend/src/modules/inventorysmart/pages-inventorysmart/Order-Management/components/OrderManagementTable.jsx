import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import StyledChip from "core/Utils/chip/StyledChip";
import {
  EMPTY_ORDER_QTY,
  ERROR_MESSAGE,
  INVALID_DATE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  OMS_ORDER_GEN_TYPE_CHIP_KEY,
  OMS_ORDER_TYPE_CHIP_KEY,
  OMS_SKU_SUMMARY_ALL_ORDERS_SORT_BY,
  OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  ORDER_TYPE_GROUPING_BGCOLOR_MAPPER,
  TENANT_DATE_FORMAT,
  defaultTableData,
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryTableData,
  setEditSkuSummaryTableDataSuccess,
  setOmsSkuSummaryApproveRequestSuccess,
  setOrderManagementSkuSummaryTableConfigLoader,
  setOrderManagementSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import SafetyStockGraphView from "./SafetyStockGraphView";
import { useCallback } from "react";

const ORDER_COST_COLUMN = "order_cost";
const ORDER_QUANTITY_COLUMN = "order_quantity";
const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";
const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";
const SAFETY_STOCK_GRAPH_COLUMN = "elt_projected_safety_stock";

const OrderManagementTable = (props) => {
  const [skuTableColumns, setSkuTableColumns] = useState([]);
  const [selectedSku, setSelectedSku] = useState([]);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const skuSummaryTableGridInstance = useRef(null);
  const updatedOrders = useRef(null);
  const updatedNotBeforeAfterDates = useRef(null);
  var isRecommended = useRef(true);
  var tableRef = useRef(null);
  const focusedTableCellValue = useRef(null);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload, setsafetyStockGraphPayload] = useState();

  const renderOrderTypeCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_TYPE_CHIP_KEY].toLowerCase()
        .split(" ")
        .join("_");
      return (
        <StyledChip
          label={params.data[OMS_ORDER_TYPE_CHIP_KEY]}
          color={ORDER_TYPE_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  const renderOrderStatusCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY].toLowerCase();
      return (
        <StyledChip
          label={params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  const onClickColumn = async (data) => {
    setsafetyStockGraphPayload(data);
    setShowSafetyStockGraph(true);
  };

  const checkForEditability = (columns) => {
    if (!props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible) {
      columns.map((col) => {
        if (col.column_name !== SAFETY_STOCK_GRAPH_COLUMN) {
          col.is_editable = false;
          if (col.accessor === NOT_BEFORE_AFTER_DATE_COLUMN) {
            col.withPortal = false;
            col.isDisabled = true;
          }
        }
      });
    }
    return columns;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setOrderManagementSkuSummaryTableConfigLoader(true);
      let columns = await props.getOmsSkuSummaryTableConfiguration();
      columns?.data?.data?.map((col) => {
        if (col.column_name === SAFETY_STOCK_GRAPH_COLUMN) {
          col.type = "link";
          col.is_editable = true;
        }
      });
      let col = columns?.data?.data?.map((item) => {
        item.onClick = (tableInfo) => {
          onClickColumn(tableInfo?.cellData?.data || {});
        };
        return item;
      });
      props.setOrderManagementSkuSummaryTableConfigLoader(false);
      let columnsData = columns?.data?.data;
      let updatedColumns = columnsData.map((col) => {
        if (col.type === "DateTimeField")
          col.formatter = props.tenantDateFormat;
        return col;
      });
      let formattedColumns = agGridColumnFormatter(updatedColumns);
      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
          case OMS_ORDER_TYPE_CHIP_KEY:
            col = renderOrderTypeCell(col);
            break;
          case OMS_ORDER_GEN_TYPE_CHIP_KEY:
            col = renderOrderStatusCell(col);
            break;
          case NOT_BEFORE_AFTER_DATE_COLUMN:
            col.withPortal = true;
            col.showClearDates = false;
            col.anyDayOfWeekAllowed = true;
            col.maxOneWeekSelection = false;
            col.keepOpenOnDateSelect = false;
            col.removeWeekNumber = true;
            const ropCalendarConfig = JSON.parse(
              JSON.stringify(
                INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK
              )
            );
            col.options = ropCalendarConfig;
            col.fiscalCalendarData = props.fiscalCalendarData;
          default:
            return col;
        }
        return col;
      });
      let updateCols = checkForEditability(cols);
      setSkuTableColumns(updateCols);
      setSelectedSku(props.selectedOmsSku);
      props.setRenderAgGrid(true);
    };
    if (
      props?.fiscalCalendarData?.length > 0 &&
      props?.selectedFilters?.length > 0
    ) {
      fetchColumnData();
    } else {
      props.setOrderManagementSkuSummaryTableConfigLoader(true);
    }
  }, [props.selectedFilters, props.fiscalCalendarData]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && props.setRenderAgGrid(false);
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!skuTableColumns?.length) props.setSkuSummaryColumns([]);
    else props.setSkuSummaryColumns([...skuTableColumns]);
  }, [skuTableColumns]);

  useEffect(() => {
    if (!isEmpty(selectedPlans)) {
      let selectedPlanIds = selectedPlans.map((plan) => {
        return plan.id;
      });
      props.setSelectedPlanIds(selectedPlanIds);
    }
  }, [selectedPlans]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderManagementSkuSummaryTableLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...selectedSku];
      }
      var selection = {
        data: skuSummaryTableGridInstance?.current?.api?.checkConfiguration,
        unique_columns: ["id"],
      };
      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        date_filter: [props.ropDate, props.recommRecieptDate],
        is_recommended: isRecommended.current,
        include_custom_order: false,
        current_cycle_order: true,
        order_status: OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : {
                      column: "order_status_id",
                      order: "asc",
                    },
                {
                  column: "product_code",
                  order: "asc",
                },
                {
                  column: "order_type",
                  order: "asc",
                },
              ],
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      props.setManualBodyData(body.meta);

      let response = await props.getOmsSkuSummaryTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
          val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
            fiscalInfoStartDate: val.editable_not_before_date,
            fiscalInfoEndDate: val.editable_not_after_date,
          };
        });
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setTotalCount(response.data?.total);
        props.setOrderManagementSkuSummaryTableLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderManagementSkuSummaryTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementSkuSummaryTableLoader(false);
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
    setSelectedPlans(selectedRows);
    props?.deepDive(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let HideButtonsOnSelectAllRecords =
      skuSummaryTableGridInstance.current.api.isSelectAllRecords;
    if (HideButtonsOnSelectAllRecords) {
      props.setDisableButtonForSetAll(true);
    } else {
      props.setDisableButtonForSetAll(false);
    }
    var selection = {
      data: skuSummaryTableGridInstance?.current?.api?.checkConfiguration,
      unique_columns: ["id"],
    };
    props?.setSelectionDataFromSetAll(selection);
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const loadTableInstance = (params) => {
    skuSummaryTableGridInstance.current = params;
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;
    skuSummaryTableGridInstance.current.api.forEachNode((node, index) => {
      if (index === selectedRowIndex) {
        selectedVal = node.data[selectedCol];
        focusedTableCellValue.current = selectedVal;
      }
    });
  };

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    if (isChanged) {
      var columnHeader = column.colDef.field;
      let isOrderQtyValid = true;
      let validatedInputValue;
      props.setIsSaveDisabled(false);
      if (columnHeader === ORDER_QUANTITY_COLUMN) {
        let isValueEmpty = false;
        if (value === 0) {
          isOrderQtyValid = true;
        } else {
          if (value === "") {
            displaySnackMessages(EMPTY_ORDER_QTY, "info");
          } else {
            if (data?.order_quantity % data?.pack_size !== 0) {
              isOrderQtyValid = false;
              displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "info");
            }
            if (
              parseInt(data?.order_quantity) <
                parseInt(data?.min_order_quantity) ||
              parseInt(data?.order_quantity) >
                parseInt(data?.max_order_quantity)
            ) {
              isOrderQtyValid = false;
              displaySnackMessages(INVALID_ORDER_QTY, "info");
            }
          }
        }
        var reminder =
          parseInt(data?.order_quantity) % parseInt(data?.pack_size);
        if (reminder >= data?.pack_size / 2) {
          validatedInputValue = parseInt(
            Math.ceil(data?.order_quantity / data?.pack_size) * data?.pack_size
          );
        } else {
          validatedInputValue = parseInt(
            Math.floor(data?.order_quantity / data?.pack_size) * data?.pack_size
          );
          if (validatedInputValue < data?.min_order_quantity) {
            validatedInputValue = parseInt(
              Math.ceil(data?.order_quantity / data?.pack_size) *
                data?.pack_size
            );
          }
        }
        // let validatedInputValue = parseInt(
        //   Math.ceil(data?.order_quantity / data?.pack_size) * data?.pack_size
        // );
        if (isOrderQtyValid) {
          validatedInputValue = parseInt(value);
        }
        if (data?.order_quantity_copy != data?.order_quantity) {
          column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
        }
        skuSummaryTableGridInstance.current.api.forEachNode((node) => {
          if (data.id === node.data?.id) {
            node.data.order_quantity = validatedInputValue;
            node.data.order_cost = data?.unit_cost * validatedInputValue;
            skuSummaryTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
            });
          }
        });

        if (!isValueEmpty) {
          let previousOrders = [];
          if (updatedOrders.current !== null)
            previousOrders = [...updatedOrders.current];
          if (previousOrders.length === 0) {
            previousOrders.push({
              new_qty: validatedInputValue,
              min_order_quantity: data?.min_order_quantity,
              max_order_quantity: data?.max_order_quantity,
              pack_size: data?.pack_size,
              id: data?.id,
            });
          } else {
            let isEdited = false;
            previousOrders.forEach((or) => {
              if (or.id == data?.id) {
                or.new_qty = validatedInputValue;
                isEdited = true;
              }
            });
            if (!isEdited)
              previousOrders.push({
                new_qty: validatedInputValue,
                min_order_quantity: data?.min_order_quantity,
                max_order_quantity: data?.max_order_quantity,
                pack_size: data?.pack_size,
                id: data?.id,
              });
          }
          updatedOrders.current = previousOrders;
        }

        props?.saveOrderQuantity(updatedOrders.current, column);
      }
    }
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    var column = params.column.colDef.field;

    if (column === NOT_BEFORE_AFTER_DATE_COLUMN) {
      props.setIsSaveDisabled(false);
      let isValueError = false;
      let columnValue = node?.data?.[NOT_BEFORE_AFTER_DATE_COLUMN];
      let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
        TENANT_DATE_FORMAT
      );
      let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(
        TENANT_DATE_FORMAT
      );
      let orderPlacementDate = moment(
        node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
      ).format(TENANT_DATE_FORMAT);

      //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
      //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

      if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
        if (
          moment(notBeforeDate).isAfter(orderPlacementDate) &&
          moment(notAfterDate).isAfter(notBeforeDate)
        ) {
          isValueError = false;
          params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
        } else {
          isValueError = true;
          params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
        }
      }

      if (isValueError)
        displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");

      let previousDates = [];
      if (updatedNotBeforeAfterDates.current !== null)
        previousDates = [...updatedNotBeforeAfterDates.current];

      let payloadObject = {
        id: params?.data?.id,
        not_before_date: notBeforeDate,
        not_after_date: notAfterDate,
      };
      let newDate = {
        data: payloadObject,
        isValueError: isValueError,
      };

      if (previousDates.length === 0) {
        previousDates.push(newDate);
      } else {
        let isEdited = false;
        previousDates.forEach((row) => {
          if (row.data.id == params?.data?.id) {
            row.data.not_before_date = notBeforeDate;
            row.data.not_after_date = notAfterDate;
            row.isValueError = isValueError;
            isEdited = true;
          }
        });
        if (!isEdited) previousDates.push(newDate);
      }
      updatedNotBeforeAfterDates.current = previousDates;

      params.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [column],
        rowNodes: [node],
      });

      props?.saveUpdatedDates(updatedNotBeforeAfterDates.current, params);
    }
  };

  useEffect(() => {
    isRecommended.current = props.isRecommended;
    skuSummaryTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    skuSummaryTableGridInstance?.current?.api.deselectAll();
    props.setOrderManagementSkuSummaryTableConfigLoader(false);
    props.setOrderManagementSkuSummaryTableLoader(false);
  }, [props.isRecommended]);

  useEffect(() => {
    if (props.editOmsSkuSummaryTableDataSuccess) {
      props.setOrderManagementSkuSummaryTableLoader(false);
      skuSummaryTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      skuSummaryTableGridInstance?.current?.api.deselectAll();
      updatedOrders.current = [];
      updatedNotBeforeAfterDates.current = [];
      props?.deepDive([]);
      props.setEditSkuSummaryTableDataSuccess(false);
      props.setOmsSkuSummaryApproveRequestSuccess(false);
    }
    if (props.omsSkuSummaryApproveRequestSuccess) {
      props.setOrderManagementSkuSummaryTableLoader(false);
      skuSummaryTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      skuSummaryTableGridInstance?.current?.api.deselectAll();
      updatedOrders.current = [];
      updatedNotBeforeAfterDates.current = [];
      props?.deepDive([]);
      //props.setEditSkuSummaryTableDataSuccess(false);
      props.setOmsSkuSummaryApproveRequestSuccess(false);
    }
  }, [
    props.editOmsSkuSummaryTableDataSuccess,
    props.omsSkuSummaryApproveRequestSuccess,
  ]);

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (
      typeof l_cellValue === "object" &&
      !Array.isArray(l_cellValue) &&
      l_cellValue !== null
    ) {
      return `${l_cellValue.fiscalInfoStartDate} - ${l_cellValue.fiscalInfoEndDate}`;
    }
    return l_cellValue;
  }, []);

  return (
    <>
      <Loader
        loader={
          props.orderManagementSkuSummaryTableLoader ||
          props.orderManagementSkuSummaryTableConfig
        }
        minHeight={"260px"}
      >
        {props.renderAgGrid && (
          <>
            <AgGridComponent
              tableRef={tableRef}
              columns={skuTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              suppressClickEdit={true}
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onCellFocused={onCellFocused}
              loadTableInstance={loadTableInstance}
              onBlur={onBlur}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              totalCount={props.orderManagementTableData.total} // to set the total count once received from BE
              cacheBlockSize={10}
              uniqueRowId={"id"}
              pagination={true}
              processCellForClipboard={processCellForClipboard}
              getRowStyle={(params) => {
                if (params?.data?.checkbox_disabled) {
                  return { pointerEvents: "none", background: "#EBEBEB" };
                }
              }}
            />
          </>
        )}
      </Loader>

      {showSafetyStockGraph && (
        <SafetyStockGraphView
          setShowSetAllModal={setShowSafetyStockGraph}
          safetyStockGraphPayload={safetyStockGraphPayload}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    tenantDateFormat:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
    selectedOmsSku:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedSku,
    orderManagementSkuSummaryTableConfig:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSkuSummaryTableConfig,
    orderManagementSkuSummaryTableConfig:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSkuSummaryTableConfig,
    fetchViewPlansData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .fetchViewPlansData,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedFilters,
    orderManagementTableData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementTableData,
    editOmsSkuSummaryTableDataSuccess:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .editOmsSkuSummaryTableDataSuccess,
    omsSkuSummaryApproveRequestSuccess:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .omsSkuSummaryApproveRequestSuccess,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  setOrderManagementSkuSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableLoader(payload)),
  setOrderManagementSkuSummaryTableConfigLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableConfigLoader(payload)),
  setOrderManagementSkuSummaryTableData: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableData(payload)),
  setOmsSkuSummaryApproveRequestSuccess: (payload) =>
    dispatch(setOmsSkuSummaryApproveRequestSuccess(payload)),
  setEditSkuSummaryTableDataSuccess: (payload) =>
    dispatch(setEditSkuSummaryTableDataSuccess(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderManagementTable);
