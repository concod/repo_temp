import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  defaultTableData,
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorysmartConstraintsFilterDependency,
  getConstraintsSafetyStockTableConfig,
  setConstraintsSafetyStockTableConfigLoader,
  setConstraintsSafetyStockTableDataLoader,
  getConstraintsSafetyStockTableData,
  getConstraintsSafetyStockData,
  setConstraintsSetAllSuccess,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { Button, Grid, Tooltip } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import UpdateIcon from "@mui/icons-material/Update";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { scrollIntoView } from "../../inventorysmart-utility";
import { cloneDeep, isEmpty } from "lodash";
import SafetyStockSetAllPopUp from "./safetyStockSetAllPopUp";
import SafetyStockGraphView from "../../Order-Management/components/SafetyStockGraphView"

const COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD = [
  "stock_units",
  "service_level_pct",
];

const SafetyStockTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [safetyStockTableColumns, setSafetyStockTableColumns] = useState([]);
  const [safetyStockTableRowCount, setSafetyStockTableRowCount] = useState(0);
  const [render, setRender] = useState(false);
  const [safetyStockPayload, setSafetyStockPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [ishide, setIsHide] = useState(true);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const allocationRef = useRef();
  const safetyStockTableGridInstance = useRef(null);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload,setsafetyStockGraphPayload] = useState()
  var safetyStockEditPayload = useRef([]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsSafetyStockTableConfigLoader(true);
      let columns = await props.getConstraintsSafetyStockTableConfig({});
      columns?.data?.data?.map((col) => {
        if (col.label === "Safety Stock vs Service Level") {
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
      props.setConstraintsSafetyStockTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      let l_columnsWithDisablekey = formattedColumns.map((obj) => {
        if (
          COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD.includes(
            obj.column_name
          )
        ) {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      setSafetyStockTableColumns(l_columnsWithDisablekey);
      safetyStockEditPayload.current = [];
      setRender(true);
      scrollIntoView(allocationRef);
    };
    fetchColumnConfig();
  }, [props.selectedOmsFilters]);

  const onClickColumn = async (data) =>{
    setsafetyStockGraphPayload(data)
    setShowSafetyStockGraph(true);
  }


  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsSafetyStockTableDataLoader(true);
      var selection = {
        data: safetyStockTableGridInstance?.current?.api?.checkConfiguration,
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

      let response = await props.getConstraintsSafetyStockTableData(body);

      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setSafetyStockTableRowCount(formatedData.length);
        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
        });
        props.setConstraintsSafetyStockTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsSafetyStockTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsSafetyStockTableDataLoader(false);
      return defaultTableData;
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    setIsHide(false);
    safetyStockTableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: ["stock_units", "service_level_pct"],
    });
    if (safetyStockEditPayload.current.length !== 0) {
      if (column.colId == "safety_stock_method") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.safety_stock_method = data.safety_stock_method;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            safety_stock_method: data.safety_stock_method,
          });
        }
      } else if (column.colId == "service_level_pct") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            if (data.service_level_pct < 50) {
              safetyStockTableGridInstance.current.api.forEachNode((node) => {
                if (node.data.product_code === data?.product_code) {
                  node.data.service_level_pct = 50;
                }
                safetyStockTableGridInstance.current.api.refreshCells({
                  force: true,
                  suppressFlash: false,
                  rowNodes: [node],
                  columns: ["service_level_pct"],
                });
              });
            }
            if (data.service_level_pct > 99) {
              safetyStockTableGridInstance.current.api.forEachNode((node) => {
                if (node.data.product_code === data?.product_code) {
                  node.data.service_level_pct = 99;
                }
                safetyStockTableGridInstance.current.api.refreshCells({
                  force: true,
                  suppressFlash: false,
                  rowNodes: [node],
                  columns: ["service_level_pct"],
                });
              });
            }
            code.service_level_pct = data.service_level_pct;
            flag = true;
          }
        });
        if (flag == false) {
          if (data.service_level_pct < 50) {
            safetyStockTableGridInstance.current.api.forEachNode((node) => {
              if (node.data.product_code === data?.product_code) {
                node.data.service_level_pct = 50;
              }
              safetyStockTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: ["service_level_pct"],
              });
            });

            return;
          }
          if (data.service_level_pct > 99) {
            safetyStockTableGridInstance.current.api.forEachNode((node) => {
              if (node.data.product_code === data?.product_code) {
                node.data.service_level_pct = 99;
              }
              safetyStockTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: ["service_level_pct"],
              });
            });

            return;
          }
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            service_level_pct: data.service_level_pct,
          });
        }
      } else if (column.colId == "stock_units") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.stock_units = data.stock_units;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            stock_units: data.stock_units,
          });
        }
      } else if (column.colId == "inventory_hold") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.inventory_hold = data.inventory_hold;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            inventory_hold: data.inventory_hold,
          });
        }
      }
    } else {
      if (column.colId == "safety_stock_method") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.safety_stock_method = data.safety_stock_method;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            safety_stock_method: data.safety_stock_method,
          });
        }
      } else if (column.colId == "service_level_pct") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.service_level_pct = data.service_level_pct;
            flag = true;
          }
        });
        if (flag == false) {
          if (data.service_level_pct < 50) {
            safetyStockTableGridInstance.current.api.forEachNode((node) => {
              if (node.data.product_code === data?.product_code) {
                node.data.service_level_pct = 50;
              }
              safetyStockTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: ["service_level_pct"],
              });
            });
          }
          if (data.service_level_pct > 99) {
            safetyStockTableGridInstance.current.api.forEachNode((node) => {
              if (node.data.product_code === data?.product_code) {
                node.data.service_level_pct = 99;
              }
              safetyStockTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: ["service_level_pct"],
              });
            });
          }
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            service_level_pct: data.service_level_pct,
          });
        }
      } else if (column.colId == "stock_units") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.stock_units = data.stock_units;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            stock_units: data.stock_units,
          });
        }
      } else if (column.colId == "inventory_hold") {
        let flag = false;
        safetyStockEditPayload.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.inventory_hold = data.inventory_hold;
            flag = true;
          }
        });
        if (flag == false) {
          safetyStockEditPayload.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            inventory_hold: data.inventory_hold,
          });
        }
      }
    }
    setSafetyStockPayload(safetyStockEditPayload.current);
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

  const setCellsToBeDisabled = (row, item) => {
    let l_safetyStockType = Array.isArray(row.safety_stock_method)
      ? row.safety_stock_method[0].value
      : row.safety_stock_method;
    if (["stock_units", "service_level_pct"].includes(item.accessor)) {
      if (item.accessor == "stock_units")
        return l_safetyStockType !== "User Input" ? true : false;
      if (item.accessor == "service_level_pct")
        return l_safetyStockType !== "Service Level" ? true : false;
    }
  };

  const loadTableInstance = (params) => {
    safetyStockTableGridInstance.current = params;
  };

  const editSaveData = async () => {
    try {
      if (safetyStockPayload.length !== 0) {
        let body = {
          orders: safetyStockPayload,
        };
        let response = await props.getConstraintsSafetyStockData(body);
        if (response.data.status) {
          setSafetyStockPayload([]);
          safetyStockEditPayload.current = [];
          displaySnackMessages(UPDATED_MESSAGE, "success");
          props.setConstraintsSetAllSuccess(true);
          setIsHide(true);
        }
      } else {
        displaySnackMessages("No edit value", "error");
      }
    } catch {
      displaySnackMessages("No edit value", "error");
      safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setIsHide(true);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    safetyStockTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      safetyStockTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
  };

  const updateSetAllData = async (payload, setAllData) => {
    var selection = {
      data: safetyStockTableGridInstance?.current?.api?.checkConfiguration,
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
        safetyStockTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    try {
      let response = await props.getConstraintsSafetyStockData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: false,
        });
        //setSelectedSetAllRows([]);
        return true;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return true;
    }
  };

  useEffect(() => {
    if (safetyStockTableGridInstance?.current) {
      //checkconfig
      safetyStockTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      safetyStockTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  return (
    <div className={globalClasses.marginVertical2rem}>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
      >
        {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
          <Grid item xs={12} container justifyContent={"flex-end"}>
            <Button
              variant="outlined"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={openSetAllPopUp}
              //disabled={selectedSetAllRows.length === 0}
              disabled={!buttonEnabled}
            >
              Set All
            </Button>
            <Tooltip title="Update">
              <Button
                variant="contained"
                color="primary"
                id="createProductBtn"
                className={classes.button}
                onClick={editSaveData}
                disabled={ishide}
              >
                <UpdateIcon fontSize="small"></UpdateIcon>
              </Button>
            </Tooltip>
          </Grid>
        )}
      </Grid>
      <Loader
        loader={
          props.constraintsSafetyStockTableDataLoader ||
          props.constraintsSafetyStockTableConfigLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <div ref={allocationRef}>
            <AgGridComponent
              columns={safetyStockTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              // callBackToSetCheckConfig={callBackToSetCheckConfig}
              //onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              loadTableInstance={loadTableInstance}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              totalCount={safetyStockTableRowCount} // to set the total count once received from BE
              cacheBlockSize={10}
              uniqueRowId={"id"}
              pagination={true}
              onSelectionChanged={onSelectionChanged}
            />
          </div>
        )}
      </Loader>
      {openPopUp && (
        <SafetyStockSetAllPopUp
          setShowSetAllModal={setOpenPopUp}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={safetyStockTableGridInstance?.current}
          displaySnackMessages={displaySnackMessages}
        />
      )}
      {showSafetyStockGraph && 
        <SafetyStockGraphView
        setShowSetAllModal={setShowSafetyStockGraph}
        safetyStockGraphPayload={safetyStockGraphPayload}
        />
      }
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
    articleAgGridParams:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleAgGridParams,
    inventorysmartConstraintsFilterDependency:
      store.inventorysmartReducer.inventorySmartConstraints
        .inventorysmartConstraintsFilterDependency,
    constraintsSafetyStockTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsSafetyStockTableDataLoader,
    constraintsSafetyStockTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsSafetyStockTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsSafetyStockTableConfig: (payload) =>
    dispatch(getConstraintsSafetyStockTableConfig(payload)),
  getConstraintsSafetyStockTableData: (payload) =>
    dispatch(getConstraintsSafetyStockTableData(payload)),
  setConstraintsSafetyStockTableConfigLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableConfigLoader(payload)),
  setConstraintsSafetyStockTableDataLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getConstraintsSafetyStockData: (payload) =>
    dispatch(getConstraintsSafetyStockData(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SafetyStockTable);
