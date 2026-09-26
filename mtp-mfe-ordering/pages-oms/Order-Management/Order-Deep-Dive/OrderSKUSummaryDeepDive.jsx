import { addSnack, closeSnack } from "core/actions/snackbarActions";
import {
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableConfigLoader,
  setOrderManagementSkuSummaryTableLoader,
  setOrderManagementSkuSummaryTableData,
  getOmsSkuSummaryTableDeepDiveConfiguration,
  setEditSkuSummaryTableDataSuccess,
  updateSkuSummaryNotBeforeAfterDates,
  editOmsSkuSummaryTableData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import { Grid } from "@mui/material";
import { Tooltip, Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import UpdateIcon from "@mui/icons-material/Update";
import {
  OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
  EMPTY_ORDER_QTY,
  INVALID_DATE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  TENANT_DATE_FORMAT,
  UPDATED_MESSAGE,
  ERROR_MESSAGE_DATES_UPDATE,
  ERROR_MESSAGE_QUANTITY_UPDATE,
  ORDER_TYPE_GROUPING_BGCOLOR_MAPPER,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  OMS_ORDER_GEN_TYPE_CHIP_KEY,
  OMS_RECEIPT_DATE_MULTI_WEEK,
  OMS_ORDER_TYPE_CHIP_KEY,
  ERROR_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import moment from "moment";
import StyledChip from "core/Utils/chip/StyledChip";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";
const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";

const OrderSKUSummaryDeepDive = (props) => {
  const globalClasses = globalStyles();
  const [plansTableColumns, setPlansTableColumns] = useState([]);
  const [skuTableData, setSkuTableData] = useState([]);
  const [selectedSku, setSelectedSku] = useState([]);
  const skuSummaryTableGridInstance = useRef(null);
  const classes = useStyles();
  const updatedOrders = useRef(null);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [updatedColumnProp, setUpdatedColumnProp] = useState(null);
  const [isQtySaveSuccess, setIsQtySaveSuccess] = useState(false);
  const [isDatesSaveSuccess, setIsDatesSaveSuccess] = useState(false);
  const updatedNotBeforeAfterDates = useRef(null);
  const [orderQuantity, setOrderQuantity] = useState([]);
  const [notBeforeAfterDates, setNotBeforeAfterDates] = useState([]);

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

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

  const checkForEditability = (columns) => {
    if (!props?.orderingAccessControl?.isEditButton?.isVisible) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.accessor === NOT_BEFORE_AFTER_DATE_COLUMN) {
          col.withPortal = false;
          col.isDisabled = true;
        }
      });
    }
    return columns;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setOrderManagementSkuSummaryTableConfigLoader(true);
      let columns = await props.getOmsSkuSummaryTableDeepDiveConfiguration();
      props.setOrderManagementSkuSummaryTableConfigLoader(false);
      let columnsData = columns?.data?.data;
      let updatedColumns = columnsData.map((col) => {
        if (col.type === "DateTimeField")
          col.formatter = props.tenantDateFormat;
        return col;
      });
      let formattedColumns = agGridColumnFormatter(
        updatedColumns,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
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
              JSON.stringify(OMS_RECEIPT_DATE_MULTI_WEEK)
            );
            col.options = ropCalendarConfig;
            col.fiscalCalendarData = props.fiscalCalendarData;
          default:
            return col;
        }
        return col;
      });
      let updateCols = checkForEditability(cols);
      setPlansTableColumns(updateCols);

      // props.setRenderAgGrid(true);
    };
    if (props?.fiscalCalendarData?.length > 0) {
      fetchColumnData();
    } else {
      props.setOrderManagementSkuSummaryTableConfigLoader(true);
    }
  }, [props.fiscalCalendarData]);

  const loadTableInstance = (params) => {
    skuSummaryTableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    skuSummaryTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSku(selectedRows);
  };

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    if (isChanged) {
      var columnHeader = column?.colDef?.field;
      let isOrderQtyValid = true;
      setIsSaveDisabled(false);
      let isValueEmpty = false;
      if (value === "" || value === 0) {
        displaySnackMessages(EMPTY_ORDER_QTY, "info");
      } else {
        if (data?.order_quantity % data?.pack_size !== 0) {
          isOrderQtyValid = false;
          displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "info");
        }
        if (
          parseInt(data?.order_quantity) < parseInt(data?.min_order_quantity) ||
          parseInt(data?.order_quantity) > parseInt(data?.max_order_quantity)
        ) {
          isOrderQtyValid = false;
          displaySnackMessages(INVALID_ORDER_QTY, "info");
        }
      }

      let validatedInputValue = parseInt(
        Math.round(data?.order_quantity / data?.pack_size) * data?.pack_size
      );
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

      setOrderQuantity(updatedOrders.current);
      column.colDef.cellStyle = {};
    }
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    var column = params.column.colDef.field;

    if (column === NOT_BEFORE_AFTER_DATE_COLUMN) {
      setIsSaveDisabled(false);
      let isValueError = false;
      let columnValue = node?.data?.[NOT_BEFORE_AFTER_DATE_COLUMN];
      let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
        DATE_FORMAT
      );
      let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(
        DATE_FORMAT
      );
      let orderPlacementDate = moment(
        node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
      ).format(DATE_FORMAT);

      //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
      //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

      if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
        if (
          moment(notBeforeDate).isAfter(orderPlacementDate) &&
          moment(notAfterDate).isAfter(orderPlacementDate)
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

      setNotBeforeAfterDates(updatedNotBeforeAfterDates.current);
      params.column.colDef.cellStyle = {};
    }
  };

  useEffect(() => {
    if (updatedColumnProp === "order_date") {
      if (isQtySaveSuccess && isDatesSaveSuccess) {
        setIsQtySaveSuccess(false);
        setIsDatesSaveSuccess(false);
      }
    } else {
      if (
        (updatedColumnProp === "order" && isQtySaveSuccess) ||
        (updatedColumnProp === "date" && isDatesSaveSuccess)
      ) {
        setIsQtySaveSuccess(false);
        setIsDatesSaveSuccess(false);
      }
    }
  }, [isQtySaveSuccess, isDatesSaveSuccess]);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const updateEditedValues = () => {
    if (orderQuantity.length > 0 && notBeforeAfterDates.length > 0) {
      updateNotBeforeAfterDates();
      updateOrderQuantity();
      setUpdatedColumnProp("order_date");
    } else {
      if (orderQuantity.length > 0) {
        setUpdatedColumnProp("order");
        updateOrderQuantity();
      } else {
        updateNotBeforeAfterDates();
        setUpdatedColumnProp("date");
      }
    }
  };

  const updateNotBeforeAfterDates = async () => {
    let invalidData = false;
    let payload = [];
    if (notBeforeAfterDates && notBeforeAfterDates.length !== 0) {
      notBeforeAfterDates.forEach((row) => {
        if (
          moment(row.data.not_after_date).format(DATE_FORMAT) ===
            INVALID_DATE ||
          moment(row.data.not_before_date).format(DATE_FORMAT) === INVALID_DATE
        ) {
          invalidData = true;
        } else if (row.isValueError) {
          invalidData = true;
        } else {
          payload.push(row.data);
        }
      });
    }
    if (!invalidData) {
      let body = {
        user: localStorage.getItem("name"),
        orders: payload,
      };
      let response = await props.updateSkuSummaryNotBeforeAfterDates(body);
      if (response.data.status) {
        setIsDatesSaveSuccess(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setIsSaveDisabled(true);
        setNotBeforeAfterDates([]);
        skuSummaryTableGridInstance?.current?.api?.redrawRows({
          purge: true,
        });
        props?.setReloadComponents(true);
      } else {
        setIsDatesSaveSuccess(true);
        setNotBeforeAfterDates([]);
        displaySnackMessages(ERROR_MESSAGE_DATES_UPDATE, "error");
      }
    } else {
      displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");
    }
  };

  const updateOrderQuantity = async () => {
    let invalidData = false;
    let updatedOrderQuantityList = [];
    if (orderQuantity && orderQuantity.length !== 0) {
      orderQuantity.every((order) => {
        if (!order.new_qty > 0) {
          invalidData = true;
          displaySnackMessages(EMPTY_ORDER_QTY, "error");
          return false;
        } else {
          if (
            parseInt(order.new_qty) < parseInt(order.min_order_quantity) ||
            parseInt(order.new_qty) > parseInt(order.max_order_quantity)
          ) {
            invalidData = true;
            displaySnackMessages(INVALID_ORDER_QTY, "error");
            return false;
          } else if (
            parseInt(order.new_qty) % parseInt(order.pack_size) !==
            0
          ) {
            invalidData = true;
            displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "error");
            return false;
          } else {
            updatedOrderQuantityList.push({
              new_qty: order.new_qty,
              id: order.id,
            });
            return true;
          }
        }
      });
    }
    if (!invalidData) {
      let body = {
        user: localStorage.getItem("name"),
        orders: updatedOrderQuantityList,
      };
      let response = await props.editOmsSkuSummaryTableData(body);
      if (response.data.status) {
        setOrderQuantity([]);
        // skuSummaryTableGridInstance?.current?.api?.redrawRows({
        //   purge: true,
        //   suppressFlash: false,
        // });
        skuSummaryTableGridInstance.current.api?.refreshServerSideStore({
          purge: true,
        });
        updatedOrders.current = [];
        props?.setReloadComponents(true);
        setIsQtySaveSuccess(true);
        setIsSaveDisabled(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
      } else displaySnackMessages(ERROR_MESSAGE_QUANTITY_UPDATE, "error");
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderManagementSkuSummaryTableLoader(true);
      var values = [];
      props?.skuData?.forEach((e) => {
        values.push(e.product_code);
      });
      let body = {
        is_recommended: props.isRecommended,
        include_custom_order: false,
        current_cycle_order: true,
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: "product_code",
            operator: "in",
            dimension: "Product",
            values: values,
          },
        ],
        order_status: OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
        meta: {
          range: [],
          search: [],
          sort: [],
          limit: { limit: 20, page: 1 },
        },
      };
      setSkuTableData([]);
      let response = await props.getOmsSkuSummaryTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(response.data.data);
        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
          val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
            fiscalInfoStartDate: val.editable_not_before_date,
            fiscalInfoEndDate: val.editable_not_after_date,
          };
        });
        setSkuTableData(formatedData);
        props.setOrderManagementSkuSummaryTableLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementSkuSummaryTableLoader(false);
    }
  };

  return (
    <>
      <CustomAccordion label="SKU Summary">
        {props?.orderingAccessControl?.isEditButton?.isVisible && (
          <Grid container justifyContent={"flex-end"}>
            <div style={{ margin: "0.5rem 0 1rem 0" }}>
              <Button
                variant="secondary"
                color="primary"
                className={classes.button}
                onClick={updateEditedValues}
                disabled={isSaveDisabled}
              >
                Update
              </Button>
            </div>
          </Grid>
        )}

        <Loader
          loader={
            props.orderManagementSkuSummaryTableLoader ||
            props.orderManagementSkuSummaryTableConfig
          }
          minHeight={"260px"}
        >
          <AgGridComponent
            suppressClickEdit={true}
            sideBar={false}
            columns={plansTableColumns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            pagination={true}
            rowSelection="multiple"
            rowModelType="serverSide"
            serverSideStoreType="partial"
            onRowSelected
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            loadTableInstance={loadTableInstance}
            onBlur={onBlur}
            uniqueRowId={"id"}
            getRowStyle={(params) => {
              if (params?.data?.checkbox_disabled) {
                return { pointerEvents: "none", background: "#EBEBEB" };
              }
            }}
          />
        </Loader>
      </CustomAccordion>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    tenantDateFormat:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
    orderManagementSkuSummaryTableConfig:
      store.omsReducer.orderManagementService
        .orderManagementSkuSummaryTableConfig,
    fetchViewPlansData:
      store.omsReducer.orderManagementService.fetchViewPlansData,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    orderManagementTableData:
      store.omsReducer.orderManagementService.orderManagementTableData,
    orderManagementSkuSummaryTableLoader:
      store.omsReducer.orderManagementService
        .orderManagementSkuSummaryTableLoader,
    editOmsSkuSummaryTableDataSuccess:
      store.omsReducer.orderManagementService.editOmsSkuSummaryTableDataSuccess,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  getOmsSkuSummaryTableDeepDiveConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableDeepDiveConfiguration(payload)),
  setOrderManagementSkuSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableLoader(payload)),
  setOrderManagementSkuSummaryTableConfigLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableConfigLoader(payload)),
  setOrderManagementSkuSummaryTableData: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setEditSkuSummaryTableDataSuccess: (payload) =>
    dispatch(setEditSkuSummaryTableDataSuccess(payload)),
  updateSkuSummaryNotBeforeAfterDates: (payload) =>
    dispatch(updateSkuSummaryNotBeforeAfterDates(payload)),
  editOmsSkuSummaryTableData: (payload) =>
    dispatch(editOmsSkuSummaryTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderSKUSummaryDeepDive);
