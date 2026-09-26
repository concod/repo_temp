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
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorysmartConstraintsFilterDependency,
  setConstraintsDeleiveryQcTimeTableConfigLoader,
  setConstraintsDeleiveryQcTimeTableDataLoader,
  getConstraintsDeleiveryQcTimeTableConfig,
  getConstraintsDeleiveryQcTimeTableData,
  setConstraintsDeliveryQcTimeData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { Button, Grid, Tooltip } from "@mui/material";
import UpdateIcon from "@mui/icons-material/Update";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import SetAllPopUp from "../setAllPopUp";

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

  const DeleiveryQcTableGridInstance = useRef(null);
  var deleiveryQc = useRef([]);

  useEffect(() => {
    if (props.selectedOmsFilters.length !== 0) {
      const fetchColumnConfig = async () => {
        props.setConstraintsDeleiveryQcTimeTableConfigLoader(true);
        let columns = await props.getConstraintsDeleiveryQcTimeTableConfig({});
        props.setConstraintsDeleiveryQcTimeTableConfigLoader(false);
        let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
        setQcTimeTableColumns(formattedColumns);
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
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              //...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
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
          purge: false,
        });
        //return true;
        //props.setConstraintsSetAllSuccess(true)
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <div className={globalClasses.marginVertical2rem}>
      {props.isFilterOmsValid && (
        <div className={globalClasses.marginVertical2rem}>
          <Grid
            container
            className={globalClasses.marginVertical1rem}
            justifyContent={"space-between"}
          >
            {/* <Grid item xs={12} container justifyContent={"flex-end"}>
              <Button
                variant="outlined"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={openSetAllPopUp}
                // disabled={selectedRows.length == 0}
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
                  onClick={updateEdit}
                  disabled={ishide}
                >
                  <UpdateIcon fontSize="small"></UpdateIcon>
                </Button>
              </Tooltip>
            </Grid> */}
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
                //hideSelectAllRecords={false}
              />
            )}
          </Loader>
          {openPopUp && (
            <SetAllPopUp
              feildsData={CONSTRAINTS_OMS_SETALL_DELIVERY_QC_TIME_FIELDS_TYPE}
              setShowSetAllModal={setOpenPopUp}
              screenName={"QcTime"}
              rowsData={selectedRows}
              setAll={updateSetAllData}
              setCheckAllSetAllRequest={setCheckAllSetAllRequest}
              agGridInstance={DeleiveryQcTableGridInstance?.current}
            />
          )}
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsDeleiveryQcTimeTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsDeleiveryQcTimeTableDataLoader,
    setConstraintsDeleiveryQcTimeTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .setConstraintsDeleiveryQcTimeTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
    isFilterOmsValid:
      store.inventorysmartReducer.inventorySmartConstraints.isFilterOmsValid,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsDeleiveryQcTimeTableConfig: (payload) =>
    dispatch(getConstraintsDeleiveryQcTimeTableConfig(payload)),
  getConstraintsDeleiveryQcTimeTableData: (payload) =>
    dispatch(getConstraintsDeleiveryQcTimeTableData(payload)),
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
