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
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getConstraintsStatusTableConfig,
  setConstraintsStatusTableConfigLoader,
  setConstraintsStatusTableDataLoader,
  getConstraintsStatusTableData,
  setConstraintsStatusData,
  getConstraintsStatusDownloadTableData
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { scrollIntoView } from "../../inventorysmart-utility";
import globalStyles from "core/Styles/globalStyles";
import { Button, Grid, Tooltip } from "@mui/material";
import UpdateIcon from "@mui/icons-material/Update";
import SetAllPopUp from "../setAllPopUp";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import DownloadIcon from "@mui/icons-material/Download";

const VendorStatusTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [vendorStatusTableColumns, setVendorStatusTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [statusPayload, setStatusPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData,setManualBodyData] = useState({})
  const downloadLink = useRef(null);

  const allocationRef = useRef();
  const statusTableGridInstance = useRef(null);
  var status = useRef([]);

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
      props.setConstraintsStatusTableConfigLoader(true);
      let columns = await props.getConstraintsStatusTableConfig({});
      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedColumns = agGridColumnFormatter(updatedCols, null);
      props.setConstraintsStatusTableConfigLoader(false);
      setVendorStatusTableColumns(formattedColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
      scrollIntoView(allocationRef);
    };
    fetchColumnConfig();
  }, [props?.selectedOmsFilters]);

  useEffect(() => {
    !isEmpty(props.selectedOmsFilters) && setRender(false);
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsStatusTableDataLoader(true);

      //For List Component in AG Grid
      let searchParameters = manualbody.search;
      if (searchParameters.length > 0) {
        searchParameters.forEach((item) => {
          if (item.column === "status" && item.type === "list") {
            item.type = "str";
          }
        });
      }

      var selection = {
        data: statusTableGridInstance?.current?.api?.checkConfiguration,
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
      let response = await props.getConstraintsStatusTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTotalCount(response.data.total);

        props.setConstraintsStatusTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsStatusTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsStatusTableDataLoader(false);
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
    statusTableGridInstance.current = params;
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
    statusTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled = statusTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  useEffect(() => {
    if (statusTableGridInstance?.current) {
      statusTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      statusTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (params.value) {
      setIsHide(false);
      if (status.current.length != 0) {
        var flag = false;
        status.current.filter((prod_code) => {
          if (prod_code.product_code == params.data.product_code) {
            prod_code.status = params.value;
            flag = true;
          }
        });
        if (!flag) {
          status.current.push({
            product_code: params.data.product_code,
            vendor_code: params.data.vendor_code,
            loc_code: params.data.loc_code,
            status: params.value,
          });
        }
      } else {
        status.current.push({
          product_code: params.data.product_code,
          vendor_code: params.data.vendor_code,
          loc_code: params.data.loc_code,
          status: params.value,
        });
      }
      setStatusPayload(status.current);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const updateEdit = async () => {
    if (statusPayload.length !== 0) {
      let body = {
        orders: statusPayload,
      };
      let response = await props.setConstraintsStatusData(body);
      if (response.data.status) {
        statusTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        status.current = [];
        displaySnackMessages(UPDATED_MESSAGE, "success");
        //props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
      }
    } else {
      displaySnackMessages("No edit data", "error");
    }
  };

  const updateSetAllData = async (payload, setAllData) => {
    try {
      var selection = {
        data: statusTableGridInstance?.current?.api?.checkConfiguration,
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
          statusTableGridInstance?.current?.api?.isSelectAllRecords,
      };
      let response = await props.setConstraintsStatusData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        statusTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: false,
        });
        //return true;
        //props.setConstraintsSetAllSuccess(true)
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
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
      let response = await props.getConstraintsStatusDownloadTableData(body);
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
                    onClick={updateEdit}
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
              "Oms Status",
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
            props.constraintsStatusTableDataLoader ||
            props.constraintsStatusTableConfigLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <div ref={allocationRef}>
              <AgGridComponent
                columns={vendorStatusTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={loadTableInstance}
                onSelectionChanged={onSelectionChanged}
                onCellValueChanged={onCellValueChanged}
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
          <SetAllPopUp
            feildsData={CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE}
            setShowSetAllModal={setOpenPopUp}
            screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.Status}
            rowsData={selectedRows}
            setAll={updateSetAllData}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            agGridInstance={statusTableGridInstance?.current}
            displaySnackMessages={displaySnackMessages}
          />
        )}
      </div>
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
    constraintsStatusTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsStatusTableDataLoader,
    constraintsStatusTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsStatusTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsStatusTableConfig: (payload) =>
    dispatch(getConstraintsStatusTableConfig(payload)),
  getConstraintsStatusTableData: (payload) =>
    dispatch(getConstraintsStatusTableData(payload)),
  getConstraintsStatusDownloadTableData: (payload) =>
    dispatch(getConstraintsStatusDownloadTableData(payload)),
  setConstraintsStatusTableConfigLoader: (payload) =>
    dispatch(setConstraintsStatusTableConfigLoader(payload)),
  setConstraintsStatusTableDataLoader: (payload) =>
    dispatch(setConstraintsStatusTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsStatusData: (payload) =>
    dispatch(setConstraintsStatusData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorStatusTable);
