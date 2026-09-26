import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
  CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE,
  UPDATED_MESSAGE,
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  TENANT_DATE_FORMAT,
  INVALID_DATE,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
} from "modules/oms/constants-oms/stringConstants";
import {
  getConstraintsPoConversionTableConfig,
  setConstraintsPoConversionTableConfigLoader,
  setConstraintsPoConversionTableDataLoader,
  getConstraintsPoConversionTableData,
  setConstraintsPoConveersionData,
  getConstraintsPoConversionTableDownloadData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { Grid } from "@mui/material";
import SetAllPopUp from "../setAllPopUp";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import moment from "moment";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { Button } from "impact-ui-v3";

const PoConversionTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [poConversionTableColumns, setPoConversionTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [poConversionPayload, setPoConversionPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const downloadLink = useRef(null);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);

  // const allocationRef = useRef();
  const PoConversionTableGridInstance = useRef(null);
  var PoConversion = useRef([]);

  const checkForEditability = (columns) => {
    if (!props?.orderingAccessControl?.isEditButton?.isVisible) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.type === "list") col.type = "str";
      });
    }
    return columns;
  };

  useEffect(() => {
    if (props?.orderingAccessControl) {
      let canUserEdit = props?.orderingAccessControl?.isEditButton?.isVisible;
      setIsUserHasViewOnlyAccess(!canUserEdit);
    }
  }, [props?.orderingAccessControl]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsPoConversionTableConfigLoader(true);
      let columns = await props.getConstraintsPoConversionTableConfig({});
      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedColumns = agGridColumnFormatter(
        updatedCols,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      props.setConstraintsPoConversionTableConfigLoader(false);
      setPoConversionTableColumns(formattedColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
    };
    fetchColumnConfig();
  }, [props?.selectedOmsFilters]);

  useEffect(() => {
    !isEmpty(props.selectedOmsFilters) && setRender(false);
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsPoConversionTableDataLoader(true);
      var selection = {
        data: PoConversionTableGridInstance?.current?.api?.checkConfiguration,
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
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsPoConversionTableData(body);
      if (response.data.status) {
        response.data.data.map((data, i) => {
          data.unique_id = i;
        });
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTotalCount(response.data.total);

        props.setConstraintsPoConversionTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsPoConversionTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsPoConversionTableDataLoader(false);
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

  const loadTableInstance = (params) => {
    PoConversionTableGridInstance.current = params;
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
    PoConversionTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      PoConversionTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  useEffect(() => {
    if (PoConversionTableGridInstance?.current) {
      PoConversionTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      PoConversionTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    var column = params.column.colDef.field;
    var invalidDate = false;
    if (PoConversion.current.length !== 0) {
      if (column == "future_conversion_date") {
        if (
          moment(data.future_conversion_date).format(TENANT_DATE_FORMAT) ===
          INVALID_DATE
        ) {
          invalidDate = true;
          displaySnackMessages("Please enter valide date", "info");
        }
        setIsHide(false);
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.future_conversion_date = invalidDate
              ? null
              : moment(data.future_conversion_date).format(TENANT_DATE_FORMAT);
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            future_conversion_date: invalidDate
              ? null
              : moment(data.future_conversion_date).format(TENANT_DATE_FORMAT),
          });
        }
      }
    } else {
      if (column == "future_conversion_date") {
        if (
          moment(data.future_conversion_date).format(TENANT_DATE_FORMAT) ===
          INVALID_DATE
        ) {
          invalidDate = true;
          displaySnackMessages("Please enter valide date", "info");
        }
        setIsHide(false);
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.future_conversion_date = invalidDate
              ? null
              : moment(data.future_conversion_date).format(TENANT_DATE_FORMAT);
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data?.loc_code,
            future_conversion_date: invalidDate
              ? null
              : moment(data.future_conversion_date).format(TENANT_DATE_FORMAT),
          });
        }
      }
    }
    setPoConversionPayload(PoConversion.current);
  };

  const onBlur = (_e, data, column, isChanged, value) => {
    // if(value === "")
    // {
    //   return displaySnackMessages("No edit data", "info");
    // }
    setIsHide(false);
    if (PoConversion.current.length !== 0) {
      if (column.colId == "cancelled_memo_po_qty") {
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.cancelled_memo_po_qty =
              value === "" ? null : data.cancelled_memo_po_qty;
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            cancelled_memo_po_qty:
              value === "" ? null : data.cancelled_memo_po_qty,
          });
        }
      } else if (column.colId == "committed_not_oo_qty") {
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.committed_not_oo_qty =
              value === "" ? null : data.committed_not_oo_qty;
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            committed_not_oo_qty:
              value === "" ? null : data.committed_not_oo_qty,
          });
        }
      }
    } else {
      if (column.colId == "cancelled_memo_po_qty") {
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.cancelled_memo_po_qty =
              value === "" ? null : data.cancelled_memo_po_qty;
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            cancelled_memo_po_qty:
              value === "" ? null : data.cancelled_memo_po_qty,
          });
        }
      } else if (column.colId == "committed_not_oo_qty") {
        let flag = false;
        PoConversion.current.filter((code) => {
          if (code.product_code == data.product_code) {
            code.committed_not_oo_qty =
              value === "" ? null : data.committed_not_oo_qty;
            flag = true;
          }
        });
        if (flag == false) {
          PoConversion.current.push({
            product_code: data.product_code,
            vendor_code: data.vendor_code,
            loc_code: data.loc_code,
            committed_not_oo_qty:
              value === "" ? null : data.committed_not_oo_qty,
          });
        }
      }
    }
    setPoConversionPayload(PoConversion.current);
  };
  // const openSetAllPopUp = () => {
  //   setOpenPopUp(true);
  // };

  const updateEdit = async () => {
    try {
      if (poConversionPayload.length !== 0) {
        let body = {
          orders: poConversionPayload,
        };
        let response = await props.setConstraintsPoConveersionData(body);
        if (response.data.status) {
          PoConversion.current = [];
          displaySnackMessages(UPDATED_MESSAGE, "success");
          //props.setConstraintsSetAllSuccess(true);
          setIsHide(true);
          PoConversionTableGridInstance.current.api?.refreshServerSideStore({
            purge: true,
          });
        } else {
          displaySnackMessages("Something went wrong", "error");
        }
      } else {
        displaySnackMessages("No edit data", "error");
      }
    } catch (err) {
      PoConversion.current = [];
      displaySnackMessages("Something went wrong", "error");
      setIsHide(true);
    }
  };

  // const updateSetAllData = async (payload, setAllData) => {
  //   try {
  //     var selection = {
  //       data: PoConversionTableGridInstance?.current?.api?.checkConfiguration,
  //       unique_columns: ["id"],
  //     };
  //     let body = {
  //       orders: payload,
  //       filters: [...props.selectedOmsFilters],
  //       meta: {
  //         sort: [],
  //         range: [],
  //       },
  //       selection,
  //       set_all: setAllData,
  //       isSelectAllRecords:
  //         PoConversionTableGridInstance?.current?.api?.isSelectAllRecords,
  //     };
  //     let response = await props.setConstraintsPoConveersionData(body);
  //     if (response.data.status) {
  //       displaySnackMessages(UPDATED_MESSAGE, "success");
  //       PoConversionTableGridInstance?.current?.api?.refreshServerSideStore({
  //         purge: false,
  //       });
  //       //return true;
  //       //props.setConstraintsSetAllSuccess(true)
  //     }
  //   } catch (error) {
  //     displaySnackMessages(ERROR_MESSAGE, "error");
  //   }
  // };

  const downloadCsv = async () => {
    try {
      if (totalCount > 0) {
        const filterArray = (props.selectedOmsFilters ?? []).filter(
          (filter) => filter?.values?.length > 0
        );
        let body = {
          filters: filterArray,
          meta: {
            ...manualBodyData,
            limit: { limit: totalCount, page: 1 },
          },
        };
        displaySnackMessages(FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS, "info");
        let response = await props.getConstraintsPoConversionTableDownloadData(
          body
        );
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
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onDownloadButtonClick = async () => {
    try {
      if (totalCount === 0) {
        displaySnackMessages(NO_DATA_FOUND, "info");
      } else {
        await downloadCsv();
        downloadLink.current.link.click();
      }
    } catch (error) {
      console.log("Error in downloading CSV", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
          display={"flex"}
        >
          <Grid item xs={12} container justifyContent={"flex-end"}>
            {/* <Button
                variant="outlined"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                //onClick={openSetAllPopUp}
                disabled={isUserHasViewOnlyAccess || !buttonEnabled}
              >
                Set All
              </Button> */}

            <Button
              variant="secondary"
              color="primary"
              className={classes.button}
              onClick={updateEdit}
              disabled={isUserHasViewOnlyAccess || ishide}
            >
              Update
            </Button>

            {/* {downloadExcelLink(
              csvData,
              "PO Conversion Constraints",
              downloadLink,
              csvHeaders,
              "",
              "",
              true
            )} */}
          </Grid>
        </Grid>
        <Loader
          loader={
            props.constraintsPoConversionTableConfigLoader ||
            props.constraintsPoConversionTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <div>
              <AgGridComponent
                columns={poConversionTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={loadTableInstance}
                onSelectionChanged={onSelectionChanged}
                onBlur={onBlur}
                onCellValueChanged={onCellValueChanged}
                onCe
                pagination={true}
                totalCount={totalCount}
                cacheBlockSize={10}
                serverSideStoreType="partial"
                rowModelType="serverSide"
                uniqueRowId={"unique_id"}
                rowSelection="multiple"
                onRowSelected
                //selectAllHeaderComponent={true}
                hideSelectAllRecords={false}
                showDownloadButton
                onDownloadButtonClick={onDownloadButtonClick}
              />
            </div>
          )}
        </Loader>
        {/* {openPopUp && (
          <SetAllPopUp
            feildsData={CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE}
            setShowSetAllModal={setOpenPopUp}
            screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.Status}
            rowsData={selectedRows}
            setAll={updateSetAllData}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            agGridInstance={PoConversionTableGridInstance?.current}
            displaySnackMessages={displaySnackMessages}
          />
        )} */}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsPoConversionTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsPoConversionTableConfigLoader,
    constraintsPoConversionTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsPoConversionTableDataLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,

    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsPoConversionTableConfig: (payload) =>
    dispatch(getConstraintsPoConversionTableConfig(payload)),
  getConstraintsPoConversionTableData: (payload) =>
    dispatch(getConstraintsPoConversionTableData(payload)),
  getConstraintsPoConversionTableDownloadData: (payload) =>
    dispatch(getConstraintsPoConversionTableDownloadData(payload)),
  setConstraintsPoConversionTableConfigLoader: (payload) =>
    dispatch(setConstraintsPoConversionTableConfigLoader(payload)),
  setConstraintsPoConversionTableDataLoader: (payload) =>
    dispatch(setConstraintsPoConversionTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsPoConveersionData: (payload) =>
    dispatch(setConstraintsPoConveersionData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(PoConversionTable);
