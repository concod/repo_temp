import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
  CONSTRAINTS_OMS_SETALL_DELIVERY_QC_TIME_FIELDS_TYPE,
  UPDATED_MESSAGE,
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
} from "modules/oms/constants-oms/stringConstants";
import {
  setConstraintsDeleiveryQcTimeTableConfigLoader,
  setConstraintsDeleiveryQcTimeTableDataLoader,
  getConstraintsDeleiveryQcTimeTableConfig,
  getConstraintsDeleiveryQcTimeTableData,
  setConstraintsDeliveryQcTimeData,
  getConstraintsDeleiveryQcTimeDownloadTableData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { Button } from "impact-ui-v3";
import { Grid } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import SetAllPopUp from "../setAllPopUp";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";

const QcTimeTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [qcTimeTableColumns, setQcTimeTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [deleiveryQcPayload, setDeleiveryQcPayload] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const downloadLink = useRef(null);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);

  const DeleiveryQcTableGridInstance = useRef(null);
  var deleiveryQc = useRef([]);

  const checkForEditability = (columns) => {
    if (!props?.orderingAccessControl?.isEditButton?.isVisible) {
      columns.map((col) => {
        col.is_editable = false;
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
    if (props.selectedOmsFilters.length !== 0) {
      const fetchColumnConfig = async () => {
        props.setConstraintsDeleiveryQcTimeTableConfigLoader(true);
        let columns = await props.getConstraintsDeleiveryQcTimeTableConfig({});
        //let updatedCols = checkForEditability(columns?.data?.data);
        let formattedColumns = agGridColumnFormatter(
          columns?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        props.setConstraintsDeleiveryQcTimeTableConfigLoader(false);
        setQcTimeTableColumns(formattedColumns);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
        setRender(true);
        setIsHide(true);
      };
      fetchColumnConfig();
    }
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsDeleiveryQcTimeTableDataLoader(true);
      var selection = {
        data: DeleiveryQcTableGridInstance?.current?.api?.checkConfiguration,
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
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              //...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsDeleiveryQcTimeTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTotalCount(response.data.total);
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setConstraintsDeleiveryQcTimeTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsDeleiveryQcTimeTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsDeleiveryQcTimeTableDataLoader(false);
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    DeleiveryQcTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      DeleiveryQcTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  useEffect(() => {
    if (DeleiveryQcTableGridInstance?.current) {
      DeleiveryQcTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      DeleiveryQcTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const loadTableInstance = (params) => {
    DeleiveryQcTableGridInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (params.value || params.value === 0) {
      setIsHide(false);
      if (deleiveryQc.current.length != 0) {
        var flag = false;
        deleiveryQc.current.filter((prod_code) => {
          if (prod_code.id === params.data.id) {
            prod_code.qc_time = params.value;
            flag = true;
          }
        });
        if (!flag) {
          deleiveryQc.current.push({
            product_code: params.data.product_code,
            fiscal_year_month: params.data.fiscal_year_month,
            fical_year_week: params.data.fical_year_week,
            loc_code: params.data.loc_code,
            qc_time: params.value,
          });
        }
      } else {
        deleiveryQc.current.push({
          product_code: params.data.product_code,
          fiscal_year_month: params.data.fiscal_year_month,
          fical_year_week: params.data.fical_year_week,
          loc_code: params.data.loc_code,
          qc_time: params.value,
        });
      }
      setDeleiveryQcPayload(deleiveryQc.current);

      if (params.value !== params.data.newValue) {
        var column = params.column.colDef.field;
        params.column.colDef.cellStyle = { "background-color": "#0055AF66" };
        params.api.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [column],
          rowNodes: [node],
        });
      }
    }
    updateParams(params);
  };

  const updateParams = (params) => {
    params.column.colDef.cellStyle = {};
  };

  const updateEdit = async () => {
    if (deleiveryQcPayload.length !== 0) {
      let body = {
        orders: deleiveryQcPayload,
      };
      let response = await props.setConstraintsDeliveryQcTimeData(body);
      if (response.data.status) {
        DeleiveryQcTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        displaySnackMessages(UPDATED_MESSAGE, "success");
        //props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
      }
    } else {
      displaySnackMessages("No edit data", "error");
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const updateSetAllData = async (payload, setAllData) => {
    try {
      var selection = {
        data: DeleiveryQcTableGridInstance?.current?.api?.checkConfiguration,
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
          DeleiveryQcTableGridInstance?.current?.api?.isSelectAllRecords,
      };

      let response = await props.setConstraintsDeliveryQcTimeData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        DeleiveryQcTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
        DeleiveryQcTableGridInstance?.current?.api?.setCheckConfiguration([]);
        DeleiveryQcTableGridInstance?.current?.api?.deselectAll(true);
        //return true;
        //props.setConstraintsSetAllSuccess(true)
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

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
        let response = await props.getConstraintsDeleiveryQcTimeDownloadTableData(
          body
        );
        if (response.data.status) {
          // let downloadData;
          // downloadData = agGridRowFormatter(response.data.data);
          // setCsvData(cloneDeep(downloadData), csvHeaders);
          // displaySnackMessages("", "success");
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
      {props.isFilterOmsValid && (
        <div className={globalClasses.marginVertical1rem}>
          <Grid
            container
            className={globalClasses.marginVertical1rem}
            justifyContent={"space-between"}
          >
            <Grid item xs={12} container justifyContent={"flex-end"}>
              <Button
                variant="tertiary"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={openSetAllPopUp}
                // disabled={selectedRows.length == 0}
                disabled={isUserHasViewOnlyAccess || !buttonEnabled}
              >
                Set All
              </Button>

              <Button
                variant="secondary"
                color="primary"
                className={classes.button}
                onClick={updateEdit}
                disabled={isUserHasViewOnlyAccess || ishide}
              >
                Update
              </Button>
            </Grid>

            {render && (
              <Grid item xs={12} container justifyContent={"flex-end"}>
                {/* {downloadExcelLink(
                  csvData,
                  "Delivery Qc Time",
                  downloadLink,
                  csvHeaders,
                  "",
                  "",
                  true
                )} */}
              </Grid>
            )}
          </Grid>
          <Loader
            loader={props.constraintsDeleiveryQcTimeTableDataLoader}
            minHeight={"260px"}
          >
            {render && (
              <AgGridComponent
                columns={qcTimeTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                onCellValueChanged={onCellValueChanged}
                loadTableInstance={loadTableInstance}
                onSelectionChanged={onSelectionChanged}
                pagination={true}
                totalCount={totalCount}
                cacheBlockSize={10}
                serverSideStoreType="partial"
                rowModelType="serverSide"
                uniqueRowId={"id"}
                rowSelection="multiple"
                onRowSelected
                //selectAllHeaderComponent={true}
                hideSelectAllRecords={false}
                showDownloadButton
                onDownloadButtonClick={onDownloadButtonClick}
              />
            )}
          </Loader>
          {openPopUp && (
            <SetAllPopUp
              feildsData={CONSTRAINTS_OMS_SETALL_DELIVERY_QC_TIME_FIELDS_TYPE}
              setShowSetAllModal={setOpenPopUp}
              screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.QcTime}
              rowsData={selectedRows}
              setAll={updateSetAllData}
              setCheckAllSetAllRequest={setCheckAllSetAllRequest}
              agGridInstance={DeleiveryQcTableGridInstance?.current}
              displaySnackMessages={displaySnackMessages}
            />
          )}
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    constraintsDeleiveryQcTimeTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsDeleiveryQcTimeTableDataLoader,
    setConstraintsDeleiveryQcTimeTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .setConstraintsDeleiveryQcTimeTableConfigLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,
    isFilterOmsValid:
      store.omsReducer.orderingConstraintsService.isFilterOmsValid,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsDeleiveryQcTimeTableConfig: (payload) =>
    dispatch(getConstraintsDeleiveryQcTimeTableConfig(payload)),
  getConstraintsDeleiveryQcTimeTableData: (payload) =>
    dispatch(getConstraintsDeleiveryQcTimeTableData(payload)),
  getConstraintsDeleiveryQcTimeDownloadTableData: (payload) =>
    dispatch(getConstraintsDeleiveryQcTimeDownloadTableData(payload)),
  setConstraintsDeleiveryQcTimeTableConfigLoader: (payload) =>
    dispatch(setConstraintsDeleiveryQcTimeTableConfigLoader(payload)),
  setConstraintsDeleiveryQcTimeTableDataLoader: (payload) =>
    dispatch(setConstraintsDeleiveryQcTimeTableDataLoader(payload)),
  setConstraintsDeliveryQcTimeData: (payload) =>
    dispatch(setConstraintsDeliveryQcTimeData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(QcTimeTable);
