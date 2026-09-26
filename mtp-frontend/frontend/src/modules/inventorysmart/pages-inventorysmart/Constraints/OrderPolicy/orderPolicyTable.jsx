import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
  UPDATED_MESSAGE,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorysmartConstraintsFilterDependency,
  getConstraintsOrderPolicyTableConfig,
  setConstraintsOrderPolicyTableConfigLoader,
  setConstraintsOrderPolicyTableDataLoader,
  getConstraintsOrderPolicyTableData,
  setConstraintsOrderPolicyData,
  getConstraintsOrderPolicyTableDownloadData
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { scrollIntoView } from "../../inventorysmart-utility";
import { Button, Grid, Tooltip } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import UpdateIcon from "@mui/icons-material/Update";
import OrderPolicySetAllPopUp from "./orderPolicySetAllPopUp";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import DownloadIcon from "@mui/icons-material/Download";
import { cloneDeep } from "lodash";

const COLUMNS_TO_BE_DISABLED_BASED_ON_LOT_SIZING_STRATEGY = ["wos"];

const OrderPolicyTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [orderPolicyTableColumns, setOrderPolicyTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [render, setRender] = useState(false);
  const [orderPolicyPayload, setOrderPolicyPayload] = useState([]);
  const [ishide, setIsHide] = useState(true);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData,setManualBodyData] = useState({})
  const downloadLink = useRef(null);

  const allocationRef = useRef();
  const orderPolicyTableGridInstance = useRef(null);
  var orderPolicyEditPayload = useRef([]);

  const checkForEditability = (columns) => {
    if (!props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.type === "list") col.type = "str";
      });
    }
    return columns;
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsOrderPolicyTableConfigLoader(true);
      let columns = await props.getConstraintsOrderPolicyTableConfig({});
      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedColumns = agGridColumnFormatter(updatedCols, null);
      let l_columnsWithDisablekey = formattedColumns.map((obj) => {
        if (
          COLUMNS_TO_BE_DISABLED_BASED_ON_LOT_SIZING_STRATEGY.includes(
            obj.column_name
          )
        ) {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      props.setConstraintsOrderPolicyTableConfigLoader(false);
      setOrderPolicyTableColumns(l_columnsWithDisablekey);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
      scrollIntoView(allocationRef);
      orderPolicyEditPayload.current = [];
    };
    fetchColumnConfig();
  }, [props.selectedOmsFilters]);

  const setCellsToBeDisabled = (row, item) => {
    let l_safetyStockType = Array.isArray(row.lot_sizing_strategy)
      ? row.lot_sizing_strategy[0].value
      : row.lot_sizing_strategy;
    if (["wos"].includes(item.accessor)) {
      if (item.accessor == "wos")
        return l_safetyStockType !== "Week of Supply" ? true : false;
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsOrderPolicyTableDataLoader(true);
      var selection = {
        data: orderPolicyTableGridInstance?.current?.api?.checkConfiguration,
        unique_columns: ["id"],
      };
      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : { column: "product_code", order: "asc" },
              ],
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [],
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta)
      let response = await props.getConstraintsOrderPolicyTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTotalCount(response.data.total);
        props.setConstraintsOrderPolicyTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsOrderPolicyTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsOrderPolicyTableDataLoader(false);
      return defaultTableData;
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

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
    orderPolicyTableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    orderPolicyTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      orderPolicyTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    setIsHide(false);
    orderPolicyTableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: ["wos"],
    });
    if (orderPolicyEditPayload.length !== 0) {
      if (column.colId == "week") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.order_cycle.week = data.week;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            order_cycle: {
              week: data.week,
              day: data.day,
            },
          });
        }
      } else if (column.colId == "lot_sizing_strategy") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.lot_sizing_strategy = data.lot_sizing_strategy;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            lot_sizing_strategy: data.lot_sizing_strategy,
          });
        }
      } else if (column.colId == "wos") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.wos = data.wos;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            wos: data.wos,
          });
        }
      }
    } else {
      if (column.colId == "week") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.order_cycle.week = data.week;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            order_cycle: {
              week: data.week,
              day: data.day,
            },
          });
        }
      } else if (column.colId == "lot_sizing_strategy") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.lot_sizing_strategy = data.lot_sizing_strategy;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            lot_sizing_strategy: data.lot_sizing_strategy,
          });
        }
      } else if (column.colId == "wos") {
        let flag = false;
        orderPolicyEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.wos = data.wos;
            flag = true;
          }
        });
        if (flag == false) {
          orderPolicyEditPayload.current.push({
            product_code: data.product_code,
            wos: data.wos,
          });
        }
      }
    }
    setOrderPolicyPayload(orderPolicyEditPayload.current);
  };

  const editSaveData = async () => {
    try {
      if (orderPolicyPayload.length !== 0) {
        let body = {
          orders: orderPolicyPayload,
        };
        let response = await props.setConstraintsOrderPolicyData(body);
        if (response.data.status) {
          setOrderPolicyPayload([]);
          orderPolicyEditPayload.current = [];
          displaySnackMessages(UPDATED_MESSAGE, "success");
          setIsHide(true);
        }
      } else {
        displaySnackMessages("No edit value", "error");
      }
    } catch {
      displaySnackMessages("Edit Failed", "error");
      orderPolicyTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: false,
      });
      setIsHide(true);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const updateSetAllData = async (payload, setAllData) => {
    var selection = {
      data: orderPolicyTableGridInstance?.current?.api?.checkConfiguration,
      unique_columns: ["id"],
    };
    let body = {
      orders: payload,
      filters: [...props.selectedOmsFilters],
      meta: {
        sort: [],
        range: [],
      },
      selection,
      set_all: setAllData,
      isSelectAllRecords:
        orderPolicyTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    try {
      let response = await props.setConstraintsOrderPolicyData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        orderPolicyTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: false,
        });
        return true;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return true;
    }
  };

  useEffect(() => {
    if (orderPolicyTableGridInstance?.current) {
      orderPolicyTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      orderPolicyTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const downloadCsv = async () => {
    try{
    if (totalCount > 0) {
      let filterArray = [];
      if (props.selectedOmsFilters.length > 0) {
        props.selectedOmsFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }
      let body = {
        filters: filterArray,
        meta: {
          ...manualBodyData,
          limit: { limit: totalCount, page: 1 },
        },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS, "info");
      let response = await props.getConstraintsOrderPolicyTableDownloadData(body);
      if (response.data.status) {
        // let downloadData;
        // downloadData = agGridRowFormatter(response.data.data);
        // setCsvData(cloneDeep(downloadData), csvHeaders);
        // displaySnackMessages("Successfully Download", "success");
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  } catch{
    displaySnackMessages(ERROR_MESSAGE, "error");
  }
  };

  return (
    <div className={globalClasses.marginVertical2rem}>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
        display={"flex"}
      >
        <Grid item xs={12} container justifyContent={"flex-end"}>
          {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
            <>
              <Button
                variant="outlined"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={openSetAllPopUp}
                disabled={!buttonEnabled}
              >
                Set All
              </Button>
              <Tooltip title="Update">
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  startIcon={<UpdateIcon />}
                  onClick={editSaveData}
                  disabled={ishide}
                >
                  Update
                </Button>
              </Tooltip>
            </>
          )}
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
          {/* {downloadExcelLink(
            csvData,
            "Order Policy Constraints",
            downloadLink,
            csvHeaders,
            "",
            "",
            false,
            true
          )} */}
        </Grid>
      </Grid>
      <Loader
        loader={
          props.constraintsOrderPolicyTableDataLoader ||
          props.constraintsOrderPolicyTableConfigLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <div ref={allocationRef}>
            <AgGridComponent
              columns={orderPolicyTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onBlur={onBlur}
              pagination={true}
              totalCount={totalCount}
              cacheBlockSize={10}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              uniqueRowId={"id"}
              rowSelection="multiple"
              onRowSelected
              selectAllHeaderComponent={
                props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible
              }
              hideSelectAllRecords={false}
            />
          </div>
        )}
      </Loader>
      {openPopUp && (
        <OrderPolicySetAllPopUp
          setShowSetAllModal={setOpenPopUp}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={orderPolicyTableGridInstance?.current}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
    inventorysmartConstraintsFilterDependency:
      store.inventorysmartReducer.inventorySmartConstraints
        .inventorysmartConstraintsFilterDependency,
    constraintsOrderPolicyTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsOrderPolicyTableDataLoader,
    constraintsOrderPolicyTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsOrderPolicyTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsOrderPolicyTableConfig: (payload) =>
    dispatch(getConstraintsOrderPolicyTableConfig(payload)),
  getConstraintsOrderPolicyTableData: (payload) =>
    dispatch(getConstraintsOrderPolicyTableData(payload)),
  getConstraintsOrderPolicyTableDownloadData: (payload) =>
    dispatch(getConstraintsOrderPolicyTableDownloadData(payload)),
  setConstraintsOrderPolicyTableConfigLoader: (payload) =>
    dispatch(setConstraintsOrderPolicyTableConfigLoader(payload)),
  setConstraintsOrderPolicyTableDataLoader: (payload) =>
    dispatch(setConstraintsOrderPolicyTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsOrderPolicyData: (payload) =>
    dispatch(setConstraintsOrderPolicyData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderPolicyTable);
