import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
  CONSTRAINTS_OMS_SETALL_DELIVERY_LEAD_TIME_FIELDS_TYPE,
  UPDATED_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorysmartConstraintsFilterDependency,
  getConstraintsDeleiveryLeadTimeTableConfig,
  setConstraintsDeleiveryLeadTimeTableConfigLoader,
  setConstraintsDeleiveryLeadTimeTableDataLoader,
  getConstraintsDeleiveryLeadTimeTableData,
  setConstraintsDeliveryLeadTimeData,
  setConstraintsSetAllSuccess,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { scrollIntoView } from "../../inventorysmart-utility";
import { Button, Grid, Tooltip } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import UpdateIcon from "@mui/icons-material/Update";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import SetAllPopUp from "../setAllPopUp";

const DeleiveryLeadTimeTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [leadTimeTableColumns, setLeadTimeTableColumns] = useState([]);
  const [render, setRender] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [deleiveryLeadPayload, setDeleiveryLeadPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const allocationRef = useRef();
  const DeleiveryLeadTableGridInstance = useRef(null);
  var deleiveryLead = useRef([]);
  // var deleiveryLead = [];

  useEffect(() => {
    if (props.selectedOmsFilters.length !== 0) {
      const fetchColumnConfig = async () => {
        setIsHide(true);
        props.setConstraintsDeleiveryLeadTimeTableConfigLoader(true);
        let columns = await props.getConstraintsDeleiveryLeadTimeTableConfig(
          {}
        );
        props.setConstraintsDeleiveryLeadTimeTableConfigLoader(false);
        let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
        setLeadTimeTableColumns(formattedColumns);
        setRender(true);
        scrollIntoView(allocationRef);
        setIsHide(true);
      };

      fetchColumnConfig();
    }
  }, [props.selectedOmsFilters]);

  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsDeleiveryLeadTimeTableDataLoader(true);
      var selection = {
        data: DeleiveryLeadTableGridInstance?.current?.api?.checkConfiguration,
        unique_columns: ["id"],
      };
      let body = {
        filters: [
          ...props.selectedOmsFilters,
          //   ...tableColumnsToBeSentInDataRequest,
        ],
        //...props.startEndDate,
        //is_recommended: isRecommended.current,
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
              sort: [{ column: "product_code", order: "asc" }],
              range: [],
              //...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      let response = await props.getConstraintsDeleiveryLeadTimeTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTotalCount(response.data.total);
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);
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

  const loadTableInstance = (params) => {
    DeleiveryLeadTableGridInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (params.value || params.value === 0) {
      setIsHide(false);
      if (deleiveryLead.current.length != 0) {
        var flag = false;
        if (colDef.accessor == "lead_time") {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code.product_code === params.data.product_code) {
              prod_code.lead_time = params.value;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              product_code: params.data.product_code,
              vendor_code: params.data.vendor_code,
              loc_code: params.data.loc_code,
              lead_time: params.value,
            });
          }
        }
        if (colDef.accessor == "variance") {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code.product_code === params.data.product_code) {
              prod_code.variance = params.value;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              product_code: params.data.product_code,
              vendor_code: params.data.vendor_code,
              loc_code: params.data.loc_code,
              variance: params.value,
            });
          }
        }
      } else {
        if (colDef.accessor == "lead_time") {
          deleiveryLead.current.push({
            product_code: params.data.product_code,
            vendor_code: params.data.vendor_code,
            loc_code: params.data.loc_code,
            lead_time: params.value,
          });
        }
        if (colDef.accessor == "variance") {
          deleiveryLead.current.push({
            product_code: params.data.product_code,
            vendor_code: params.data.vendor_code,
            loc_code: params.data.loc_code,
            variance: params.value,
          });
        }
      }
      setDeleiveryLeadPayload(deleiveryLead.current);

      if (params.value !== params.data.newValue) {
        var column = params.column.colDef.field;
        params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
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
    if (deleiveryLeadPayload.length !== 0) {
      let body = {
        orders: deleiveryLeadPayload,
      };
      let response = await props.setConstraintsDeliveryLeadTimeData(body);
      if (response.data.status) {
        DeleiveryLeadTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        displaySnackMessages(UPDATED_MESSAGE, "success");
        deleiveryLead.current = [];
        props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
      }
    } else {
      displaySnackMessages("No edit data", "error");
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    DeleiveryLeadTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      DeleiveryLeadTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const updateSetAllData = async (payload, setAllData) => {
    var selection = {
      data: DeleiveryLeadTableGridInstance?.current?.api?.checkConfiguration,
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
        DeleiveryLeadTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    let response = await props.setConstraintsDeliveryLeadTimeData(body);
    if (response.data.status) {
      displaySnackMessages(UPDATED_MESSAGE, "success");
      DeleiveryLeadTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: false,
      });
      return true;
      //props.setConstraintsSetAllSuccess(true)
    }
  };

  useEffect(() => {
    if (DeleiveryLeadTableGridInstance?.current) {
      //checkconfig
      DeleiveryLeadTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      DeleiveryLeadTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  return (
    <>
      {/* <DeleiveryFilter/> */}
      {props.isFilterOmsValid && (
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
              </Grid>
            )}
          </Grid>
          <Loader
            loader={
              props.constraintsDeleiveryLeadTimeTableDataLoader ||
              props.constraintsDeleiveryLeadTimeTableConfigLoader
            }
            minHeight={"260px"}
          >
            {render && (
              <div ref={allocationRef}>
                <AgGridComponent
                  columns={leadTimeTableColumns}
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
                  selectAllHeaderComponent={true}
                  hideSelectAllRecords={false}
                />
              </div>
            )}
          </Loader>
          {openPopUp && (
            <SetAllPopUp
              feildsData={CONSTRAINTS_OMS_SETALL_DELIVERY_LEAD_TIME_FIELDS_TYPE}
              setShowSetAllModal={setOpenPopUp}
              screenName={"LeadTime"}
              rowsData={selectedRows}
              setAll={updateSetAllData}
              setCheckAllSetAllRequest={setCheckAllSetAllRequest}
              agGridInstance={DeleiveryLeadTableGridInstance?.current}
            />
          )}
        </div>
      )}
    </>
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
    constraintsDeleiveryLeadTimeTableDataLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsDeleiveryLeadTimeTableDataLoader,
    constraintsDeleiveryLeadTimeTableConfigLoader:
      store.inventorysmartReducer.inventorySmartConstraints
        .constraintsDeleiveryLeadTimeTableConfigLoader,
    selectedOmsFilters:
      store.inventorysmartReducer.inventorySmartConstraints.selectedOmsFilters,
    isFilterOmsValid:
      store.inventorysmartReducer.inventorySmartConstraints.isFilterOmsValid,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsDeleiveryLeadTimeTableConfig: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeTableConfig(payload)),
  getConstraintsDeleiveryLeadTimeTableData: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeTableData(payload)),
  setConstraintsDeleiveryLeadTimeTableConfigLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableConfigLoader(payload)),
  setConstraintsDeleiveryLeadTimeTableDataLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsDeliveryLeadTimeData: (payload) =>
    dispatch(setConstraintsDeliveryLeadTimeData(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeleiveryLeadTimeTable);
