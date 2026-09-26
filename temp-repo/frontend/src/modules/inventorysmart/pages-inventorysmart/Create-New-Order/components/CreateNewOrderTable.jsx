import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { Button, Grid, Tooltip } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import {
  ADA_VISUAL,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_MANAGEMENT_DEEP_DRIVE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  EMPTY_ORDER_QTY,
  ERROR_MESSAGE,
  INVALID_DATE,
  INVALID_DATE_ERROR_MESSAGE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  ORDER_PLACEMENT_DATE_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  defaultTableData,
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  editOmsCreateNewOrderTableData,
  getOmsCreateNewOrderTableConfiguration,
  getOmsCreateNewOrderTableData,
  setCreateNewOrderTableConfigLoader,
  setCreateNewOrderTableData,
  setCreateNewOrderTableDataEditFailed,
  setCreateNewOrderTableDataEditSuccess,
  setCreateNewOrderTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Create-New-Order/create-new-order-service";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import CreateNewOrderSetAllPopUp from "./CreateNewOrderSetAllPopUp";
import SendApprovalButton from "./SendApprovalButton";
import SafetyStockGraphView from "../../Order-Management/components/SafetyStockGraphView";

const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";
const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";

const CreateNewOrderTable = function (props) {
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [createNewTableColumns, setCreateNewTableColumns] = useState([]);
  const [isSaveHidden, setIsSaveHidden] = useState(true);
  const [selectedSku, setSelectedSku] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload, setsafetyStockGraphPayload] = useState();

  const updatedNewOrderTableData = useRef(null);
  const createNewOrderTableGridInstance = useRef(null);
  const focusedTableCellValue = useRef(null);

  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setCreateNewOrderTableConfigLoader(true);
      let columns = await props.getOmsCreateNewOrderTableConfiguration();
      columns?.data?.data?.map((col) => {
        if (col.label === "Lead Time Safety Stock") {
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
      props.setCreateNewOrderTableConfigLoader(false);
      let columnsData = columns?.data?.data;
      let updatedColumns = columnsData.map((col) => {
        if (col.type === "DateTimeField")
          col.formatter = props.tenantDateFormat;
        return col;
      });
      let formattedColumns = agGridColumnFormatter(updatedColumns);
      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
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
      setSelectedOrders([]);
      setCreateNewTableColumns(cols);
      setSelectedSku(props.selectedCreateNewOrderSku);
      setRenderAgGrid(true);
    };
    if (props?.fiscalCalendarData?.length > 0) {
      fetchColumnData();
    } else {
      props.setCreateNewOrderTableConfigLoader(true);
    }
  }, [props.selectedFilters, props.fiscalCalendarData]);

  const onClickColumn = async (data) => {
    setsafetyStockGraphPayload(data);
    setShowSafetyStockGraph(true);
  };

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRenderAgGrid(false);
  }, [props.selectedFilters]);

  //For Sending to Approval
  const onSelectionChanged = (event) => {
    let selectedRows = [];
    let selectedSkuIds = [];
    createNewOrderTableGridInstance.current.api.forEachNode((node) => {
      if (node.selected) {
        selectedRows.push({ ...node.data });
        selectedSkuIds.push(node.data.product_code);
      }
    });
    setSelectedOrders(selectedRows);
    setSelectedOrderIds(selectedSkuIds);
  };

  const refreshTableData = () => {
    createNewOrderTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    createNewOrderTableGridInstance.current.api.deselectAll();
    setSelectedOrderIds([]);
    setSelectedOrders([]);
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

  const loadTableInstance = (params) => {
    createNewOrderTableGridInstance.current = params;
  };

  const navigateToDeepDrive = (data) => {
    localStorage.setItem("selectedSku", JSON.stringify(selectedOrderIds));
    history.push({
      pathname: ORDER_MANAGEMENT_DEEP_DRIVE,
      data: selectedOrders,
      isRecommended: false,
    });
  };

  const navigateToCreateScenario = () => {
    history.push({
      pathname: ORDER_MANAGEMENT_CREATE_SCENARIO,
    });
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;
    createNewOrderTableGridInstance.current.api.forEachNode((node, index) => {
      if (index === selectedRowIndex) {
        selectedVal = node.data[selectedCol];
        focusedTableCellValue.current = selectedVal;
      }
    });
  };

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    if (isChanged) {
      let isOrderQtyValid = true;
      let isChangedCellSelected = false;
      let previousEditedRows = [];

      if (column.colId === "order_quantity") {
        if (parseInt(value) === 0 || value === "") {
          let validatedInputValue = parseInt(data?.min_order_quantity);
          displaySnackMessages(EMPTY_ORDER_QTY, "info");
          createNewOrderTableGridInstance.current.api.forEachNode((node) => {
            if (data.product_code === node.data?.product_code) {
              column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
              node.data.order_quantity = validatedInputValue;
              node.data.order_cost =
                data.product_cost_price_per_unit *
                parseInt(validatedInputValue);
            }
            createNewOrderTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_quantity", "order_cost"],
            });
          });
        } else {
          if (data?.order_quantity) {
            if (isOrderQtyValid) {
              if (
                parseInt(data?.order_quantity) %
                  parseInt(data?.supplier_pack_size) !==
                0
              ) {
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
            let validatedInputValue = parseInt(
              Math.round(data?.order_quantity / data?.supplier_pack_size) *
                data?.supplier_pack_size
            );
            if (isOrderQtyValid) {
              validatedInputValue = parseInt(value);
            }
            createNewOrderTableGridInstance.current.api.forEachNode((node) => {
              if (data.product_code === node.data?.product_code) {
                column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
                node.data.order_quantity = validatedInputValue;
                node.data.order_cost =
                  parseInt(data.product_cost_price_per_unit) *
                  parseInt(validatedInputValue);
              } else {
                column.colDef.cellStyle = null;
              }
              if (node.selected) isChangedCellSelected = true;
              createNewOrderTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: ["order_quantity", "order_cost"],
              });
            });
            let currentEditedRow = {
              product_code: data.product_code,
              vendor_code: data.vendor_code,
              order_quantity: validatedInputValue,
            };
            let isCurrentRowExistBefore = false;
            previousEditedRows.filter((row) => {
              if (
                row.product_code == currentEditedRow.product_code &&
                row.vendor_code == currentEditedRow.vendor_code
              ) {
                row["order_quantity"] = validatedInputValue;
                isCurrentRowExistBefore = true;
              }
            });
            if (isCurrentRowExistBefore === false) {
              previousEditedRows.push(currentEditedRow);
            }
            updatedNewOrderTableData.current = [...previousEditedRows];
          }
        }
      }
    }
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    setIsSaveHidden(false);
    let previousEditedRows = [];
    let isChangedCellSelected = false;
    if (updatedNewOrderTableData.current)
      previousEditedRows = [...updatedNewOrderTableData.current];

    if (colDef.column_name === ORDER_PLACEMENT_DATE_COLUMN) {
      const orderPlacementDate = moment(newValue).format(TENANT_DATE_FORMAT);
      if (orderPlacementDate === INVALID_DATE) {
        displaySnackMessages(INVALID_DATE_ERROR_MESSAGE, "error");
      } else {
        createNewOrderTableGridInstance.current.api.forEachNode((node) => {
          if (data.product_code === node.data?.product_code) {
            if (
              moment(node.data?.not_before_date).isAfter(orderPlacementDate) &&
              moment(orderPlacementDate).isSameOrAfter(
                moment().format(TENANT_DATE_FORMAT)
              )
            )
              node.data.order_placement_date = orderPlacementDate;
            else {
              displaySnackMessages(ORDER_PLACEMENT_DATE_ERROR_MESSAGE, "error");
              node.data.order_placement_date = moment().format(
                TENANT_DATE_FORMAT
              );
            }
          }

          if (node.selected) isChangedCellSelected = true;

          createNewOrderTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: ["order_placement_date"],
          });
        });
      }
    }

    if (colDef.column_name === NOT_BEFORE_AFTER_DATE_COLUMN) {
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
        if (params.value !== params.data.newValue) {
          params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
        }
        if (
          moment(notBeforeDate).isAfter(orderPlacementDate) &&
          moment(notAfterDate).isAfter(orderPlacementDate)
        ) {
          isValueError = false;
        } else {
          isValueError = true;
        }
      }

      if (isValueError)
        displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");

      params.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [NOT_BEFORE_AFTER_DATE_COLUMN],
        rowNodes: [node],
      });
    }

    if (isChangedCellSelected) onSelectionChanged();
    params.column.colDef.cellStyle = {};
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setCreateNewOrderTableDataLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...selectedSku];
      }

      let createNewOrderFilterArray = [];
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          createNewOrderFilterArray.push(filter);
        }
      });

      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...createNewOrderFilterArray, skuFilter]
          : [...createNewOrderFilterArray],
        ...props.startEndDate,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      let response = await props.getOmsCreateNewOrderTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "product_code"
        );
        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
          val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
            fiscalInfoStartDate: val.editable_not_before_date,
            fiscalInfoEndDate: val.editable_not_after_date,
          };
        });

        props.setCreateNewOrderTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setCreateNewOrderTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setCreateNewOrderTableDataLoader(false);
      return defaultTableData;
    }
  };

  const redirectToADAVisual = () => {
    var selectedSkuId = [];
    selectedOrders.filter((val) => {
      selectedSkuId.push(val.product_code);
    });
    const adaPayload = {
      isRedirectedFromInventory: true,
      payload: {
        product_code: selectedSkuId,
        // store_code: storeCodes,
      },
      selectedDependency: cloneDeep(
        props.filterDashboardConfiguration.appliedFilterData.dependencyData
      ),
      selectedHistoricValue: 1,
      timeline: {
        startDate: moment().format("YYYY/MM/DD"),
        endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
      },
    };
    localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    window.open(`${ADA_VISUAL}?type=alerts`, "_blank", "noopener,noreferrer");
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  return (
    <div>
      <>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        >
          <Grid item xs={12} container justifyContent={"flex-end"}>
            <Button
              variant="outlined"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={openSetAllPopUp}
              disabled={selectedOrders.length === 0}
            >
              Set All
            </Button>

            {/* <Button
              className={classes.button}
              variant="outlined"
              onClick={() => console.log("Button Clicked")}
              startIcon={<DownloadIcon />}
            >
              Download
            </Button> */}
            <Tooltip title="Review Forecast">
              <Button
                variant="contained"
                color="primary"
                id="createProductBtn"
                onClick={redirectToADAVisual}
                disabled={selectedOrders.length === 0}
              >
                <QueryStatsIcon fontSize="small"></QueryStatsIcon>
              </Button>
            </Tooltip>
            {showButtons && (
              <Button
                variant="outlined"
                color="primary"
                id="navigateToDeepDrive"
                className={classes.button}
                onClick={navigateToDeepDrive}
                disabled={selectedOrders.length === 0}
              >
                Deep Dive
              </Button>
            )}

            {showButtons && (
              <Button
                variant="outlined"
                color="primary"
                id="navigateToCreateScenario"
                onClick={navigateToCreateScenario}
                disabled={true}
              >
                Create Scenario
              </Button>
            )}
          </Grid>
        </Grid>
        <Loader
          loader={
            props.ceateNewOrderTableDataLoader ||
            props.createNewOrderTableConfigLoader
          }
          minHeight={"260px"}
        >
          {renderAgGrid && (
            <AgGridComponent
              columns={createNewTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              selectAllHeaderComponent={true}
              hideSelectAllRecords={true}
              onCellFocused={onCellFocused}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              loadTableInstance={loadTableInstance}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              totalCount={props.createNewOrderTableData.total}
              cacheBlockSize={10}
              uniqueRowId={"product_code"}
              pagination={true}
              suppressClickEdit={true}
            />
          )}
        </Loader>

        {openPopUp && (
          <CreateNewOrderSetAllPopUp
            setShowSetAllModal={setOpenPopUp}
            rowsData={selectedOrders}
            agGridInstance={createNewOrderTableGridInstance.current}
          />
        )}
        {showSafetyStockGraph && (
          <SafetyStockGraphView
            setShowSetAllModal={setShowSafetyStockGraph}
            safetyStockGraphPayload={safetyStockGraphPayload}
          />
        )}
      </>

      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"center"}
      >
        <SendApprovalButton
          refreshTableData={refreshTableData}
          selectedSkuCount={selectedOrders.length}
          agGridInstance={createNewOrderTableGridInstance.current}
          renderAgGrid={renderAgGrid}
        />
      </Grid>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedCreateNewOrderSku:
      store.inventorysmartReducer.inventoryCreateNewOrderService.selectedSku,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    selectedFilters:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .selectedFilters,
    createNewOrderTableConfigLoader:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableConfigLoader,
    createNewOrderTableConfig:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableConfig,
    createNewOrderTableDataLoader:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableDataLoader,
    createNewOrderTableData:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableData,
    fetchViewPlansData:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .fetchViewPlansData,
    createNewOrderTableDataEditSuccess:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableDataEditSuccess,
    createNewOrderTableDataEditFailed:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderTableDataEditFailed,
    createNewOrderApproveRequestSuccess:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderApproveRequestSuccess,
    createNewOrderApproveRequestFailed:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderApproveRequestFailed,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createNewOrderFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setCreateNewOrderTableDataEditSuccess: (payload) =>
    dispatch(setCreateNewOrderTableDataEditSuccess(payload)),
  setCreateNewOrderTableDataEditFailed: (payload) =>
    dispatch(setCreateNewOrderTableDataEditFailed(payload)),
  getOmsCreateNewOrderTableConfiguration: (payload) =>
    dispatch(getOmsCreateNewOrderTableConfiguration(payload)),
  getOmsCreateNewOrderTableData: (payload) =>
    dispatch(getOmsCreateNewOrderTableData(payload)),
  editOmsCreateNewOrderTableData: (payload) =>
    dispatch(editOmsCreateNewOrderTableData(payload)),
  setCreateNewOrderTableConfigLoader: (payload) =>
    dispatch(setCreateNewOrderTableConfigLoader(payload)),
  setCreateNewOrderTableDataLoader: (payload) =>
    dispatch(setCreateNewOrderTableDataLoader(payload)),
  setCreateNewOrderTableData: (payload) =>
    dispatch(setCreateNewOrderTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderTable);
