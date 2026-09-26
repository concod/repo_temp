import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { useHistory } from "react-router-dom";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  defaultTableData,
  ERROR_MESSAGE,
  CONSTRAINTS_OMS_SETALL_ORDERING_TIME_FIELDS_TYPE,
  UPDATED_MESSAGE,
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setConstraintsOrderingData,
  getConstraintsOrderingTableConfig,
  setConstraintsOrderingTableConfigLoader,
  setConstraintsOrderingTableDataLoader,
  getConstraintsOrderingTableData,
  getConstraintsOrderingTableDownloadData
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { Button, Grid, Tooltip } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import UpdateIcon from "@mui/icons-material/Update";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import SetAllPopUp from "../setAllPopUp";
import { isEmpty } from "lodash";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import DownloadIcon from "@mui/icons-material/Download";

const MAX_QUANTITY_PRODUCT = 99999;
const MIN_QUANTITY_PRODUCT = 1;

const OrderingTable = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [orderingTableColumns, setOrderingTableColumns] = useState([]);
  const [orderingTableRowCount, setorderingTableRowCount] = useState(0);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [isRowEdited, setIsRowEdited] = useState(false);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [render, setRender] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const focusedTableCellValue = useRef(null);
  const updatedOrderingTableData = useRef(null);
  const orderingTableGridInstance = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData,setManualBodyData] = useState({})
  const downloadLink = useRef(null);

  const checkForEditability = (columns) => {
    if (!props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible) {
      columns.map((col) => {
        col.is_editable = false;
      });
    }
    return columns;
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setConstraintsOrderingTableConfigLoader(true);
      let columns = await props.getConstraintsOrderingTableConfig({});
      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedColumns = agGridColumnFormatter(updatedCols, null);
      props.setConstraintsOrderingTableConfigLoader(false);
      setOrderingTableColumns(formattedColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
    };
    fetchColumnConfig();
  }, [props.selectedOmsFilters]);

  useEffect(() => {
    !isEmpty(props.selectedOmsFilters) && setRender(false);
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
    orderingTableGridInstance.current = params;
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsOrderingTableDataLoader(true);
      // let tableColumnsToBeSentInDataRequest = orderingTableColumns
      //   ?.filter((columnConfig) => !columnConfig?.extra?.ignore_in_api)
      //   ?.map((column) => {
      //     return {
      //       attribute_name: column.column_name,
      //       dimension: "Product",
      //       filter_type: "cascaded",
      //       operator: "in",
      //       values: [],
      //     };
      //   });

      // let SORT_TYPE = [
      //   {
      //     column: "product_code",
      //     order: "asc",
      //   },
      // ];
      // let manualBodyObject = JSON.parse(JSON.stringify(manualbody));
      // if (manualBodyObject.sort.length === 0) {
      //   manualBodyObject.sort = SORT_TYPE;
      // }

      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [],
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      setManualBodyData(body?.meta)
      let response = await props.getConstraintsOrderingTableData(body);

      if (response.data.status) {
        setTotalCount(response.data.total);
        if (response.data?.data?.length > 0)
          response.data.data.forEach((element) => {
            element.product_cost_price_per_unit = element.product_cost_price_per_unit.toFixed(
              2
            );
          });

        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "plan_code"
        );
        setorderingTableRowCount(formatedData.length);

        props.setConstraintsOrderingTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsOrderingTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsOrderingTableDataLoader(false);
      return defaultTableData;
    }
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;
    orderingTableGridInstance.current.api.forEachNode((node, index) => {
      if (index === selectedRowIndex) {
        selectedVal = node.data[selectedCol];
        focusedTableCellValue.current = selectedVal;
      }
    });
  };

  //Validates the User given Max Quantity
  const validateMaxQty = (userMaxQty, userMinQty) => {
    let newMaxValue = parseInt(userMinQty) + 1;
    if (newMaxValue >= MAX_QUANTITY_PRODUCT) {
      newMaxValue = parseInt(userMinQty);
    }
    if (userMaxQty === 0) {
      // displaySnackMessages(
      //   "Max Order Quantity should not be less than 1",
      //   "error"
      // );
    } else if (userMaxQty < userMinQty) {
      // displaySnackMessages(
      //   "Max Order Quantity should not be less than Min Order Quantity",
      //   "error"
      // );
    } else if (userMaxQty > MAX_QUANTITY_PRODUCT) {
      // displaySnackMessages(
      //   "Max Order Quantity should not be greater than 999",
      //   "error"
      // );
      newMaxValue = MAX_QUANTITY_PRODUCT;
    } else {
      newMaxValue = userMaxQty;
    }
    return newMaxValue;
  };

  //Validates the User given Min Quantity
  const validateMinQty = (userMaxQty, userMinQty) => {
    let maxQty = parseInt(userMaxQty);
    let newMinValue = MIN_QUANTITY_PRODUCT;
    if (userMinQty == 0) {
      // displaySnackMessages(
      //   "Min Order Quantity should not be less than 1",
      //   "error"
      // );
    } else if (userMinQty < MIN_QUANTITY_PRODUCT) {
      // displaySnackMessages(
      //   "Min Order Quantity should not be greater than Max Order Quantity",
      //   "error"
      // );
    } else if (userMinQty > maxQty) {
      // displaySnackMessages(
      //   "Min Order Quantity should not be greater than Max Order Quantity",
      //   "error"
      // );
    } else {
      newMinValue = userMinQty;
    }
    return newMinValue;
  };

  const onBlur = (_e, data, column, isChanged) => {
    let validatedMaxQty = 0;
    let validatedMinQty = 0;
    let maxQty = data.max_order_quantity;
    let minQty = data.min_order_quantity;
    let isCellEdited = false;
    let currentEditedRow = {};

    let previousEditedRows = [];
    if (updatedOrderingTableData.current)
      previousEditedRows = [...updatedOrderingTableData.current];

    if (column.colId === "max_order_quantity") {
      validatedMaxQty = validateMaxQty(maxQty, minQty);

      orderingTableGridInstance.current.api.forEachNode((node) => {
        if (data.product_code === node.data?.product_code) {
          node.data.max_order_quantity = validatedMaxQty;
          if (focusedTableCellValue.current !== validatedMaxQty) {
            isCellEdited = true;
          }
        }
        orderingTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["max_order_quantity"],
        });
      });

      if (isCellEdited) {
        currentEditedRow = {
          product_code: data.product_code,
          vendor_code: data.vendor_code,
          max_order_quantity: validatedMaxQty,
        };
      }
    }
    if (column.colId === "min_order_quantity") {
      validatedMinQty = validateMinQty(maxQty, minQty);
      orderingTableGridInstance.current.api.forEachNode((node) => {
        if (data.product_code == node.data?.product_code) {
          node.data.min_order_quantity = validatedMinQty;
          if (focusedTableCellValue.current !== validatedMinQty) {
            isCellEdited = true;
          }
        }
        orderingTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["min_order_quantity"],
        });
      });

      if (isCellEdited) {
        currentEditedRow = {
          product_code: data.product_code,
          vendor_code: data.vendor_code,
          min_order_quantity: validatedMinQty,
        };
      }
    }

    if (isCellEdited) {
      let isCurrentRowExistBefore = false;
      previousEditedRows.filter((row) => {
        if (
          row.product_code == currentEditedRow.product_code &&
          row.vendor_code == currentEditedRow.vendor_code
        ) {
          if (column.colId === "max_order_quantity") {
            row["max_order_quantity"] = validatedMaxQty;
            isCurrentRowExistBefore = true;
          }
          if (column.colId === "min_order_quantity") {
            row["min_order_quantity"] = validatedMinQty;
            isCurrentRowExistBefore = true;
          }
        }
      });
      if (isCurrentRowExistBefore === false) {
        previousEditedRows.push(currentEditedRow);
      }

      updatedOrderingTableData.current = [...previousEditedRows];
      setIsRowEdited(true);
    }
  };

  const sendEditProducts = async () => {
    let requestBodyOnSave = {};
    requestBodyOnSave.orders = updatedOrderingTableData.current;
    try {
      let response = await props.setConstraintsOrderingData(requestBodyOnSave);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        updatedOrderingTableData.current = [];
        setIsRowEdited(false);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    orderingTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
  };

  const updateSetAllData = async (payload) => {
    let isPayloadValid = false;
    // if (
    //   payload[0].min_order_quantity > 0 &&
    //   payload[0].max_order_quantity <= MAX_QUANTITY_PRODUCT
    // ) {
    //   if (payload[0].min_order_quantity <= payload[0].max_order_quantity) {
    //     isPayloadValid = true;
    //   }
    // }

    //if (isPayloadValid) {
    let body = {
      orders: payload,
    };
    try {
      let response = await props.setConstraintsOrderingData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setIsRowEdited(false);

        orderingTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: false,
        });

        setSelectedSetAllRows([]);
        return true;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return false;
    }
    // } else {
    //   displaySnackMessages("Please follow the validation rules", "error");
    //   return false;
    // }
  };

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
      let response = await props.getConstraintsOrderingTableDownloadData(body);
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
      >
        {/* {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
          <Grid item xs={12} container justifyContent={"flex-end"}>
            <Button
              variant="outlined"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={openSetAllPopUp}
              disabled={selectedSetAllRows.length == 0}
            >
              Set All
            </Button>
            <Tooltip title="Update">
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                startIcon={<UpdateIcon />}
                onClick={sendEditProducts}
                disabled={!isRowEdited}
              >
                Update
              </Button>
            </Tooltip>
          </Grid>
        )} */}
        {render && (
          <Grid item xs={12} container justifyContent={"flex-end"}>
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
              "Ordering Constraints",
              downloadLink,
              csvHeaders,
              "",
              "",
              false,
              true
            )} */}
          </Grid>
        )}
      </Grid>

      <Loader
        loader={
          props.constraintsOrderingTableDataLoader ||
          props.constraintsOrderingTableConfigLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <AgGridComponent
            columns={orderingTableColumns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            loadTableInstance={loadTableInstance}
            //selectAllHeaderComponent={true}
            //hideSelectAllRecords={true}
            onBlur={onBlur}
            onCellFocused={onCellFocused}
            //rowSelection="multiple"
            rowModelType="serverSide"
            serverSideStoreType="partial"
            //onRowSelected
            totalCount={orderingTableRowCount}
            cacheBlockSize={10}
            uniqueRowId={"product_code"}
            pagination={true}
            onSelectionChanged={onSelectionChanged}
          />
        )}
      </Loader>
      {openPopUp && (
        <SetAllPopUp
          feildsData={CONSTRAINTS_OMS_SETALL_ORDERING_TIME_FIELDS_TYPE}
          setShowSetAllModal={setOpenPopUp}
          screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.Ordering}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          displaySnackMessages={displaySnackMessages}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartConstraintsFilterDependency:
      store.inventorysmartReducer.inventorySmartConstraints
        .inventorysmartConstraintsFilterDependency,
    constraintsOrderingTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsOrderingTableDataLoader,
    constraintsOrderingTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsOrderingTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsOrderingTableConfig: (payload) =>
    dispatch(getConstraintsOrderingTableConfig(payload)),
  getConstraintsOrderingTableData: (payload) =>
    dispatch(getConstraintsOrderingTableData(payload)),
  getConstraintsOrderingTableDownloadData: (payload) =>
    dispatch(getConstraintsOrderingTableDownloadData(payload)),
  setConstraintsOrderingTableConfigLoader: (payload) =>
    dispatch(setConstraintsOrderingTableConfigLoader(payload)),
  setConstraintsOrderingTableDataLoader: (payload) =>
    dispatch(setConstraintsOrderingTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsOrderingData: (payload) =>
    dispatch(setConstraintsOrderingData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderingTable);
