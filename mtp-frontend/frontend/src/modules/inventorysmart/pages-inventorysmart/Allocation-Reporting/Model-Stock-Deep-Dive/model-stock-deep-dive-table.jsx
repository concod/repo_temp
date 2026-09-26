import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

import {
  getModelStockDeepDiveTableConfig,
  getModelStockDeepDiveTableData,
  setModelStockDeepDiveConfigLoader,
  setModelStockDeepDiveDataLoader,
  setModelStockDeepDiveStoreDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/model-stock-deep-dive-service";

import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import ModelStockDeepDiveComponentPopup from "./model-stock-deep-dive-popup";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const ModelStockDeepDiveComponentTable = (props) => {
  const enableDownload =
    props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.indexOf(
      "download_reports"
    ) === -1;

  const [modelStockDeepDiveTableColumns, setModelStockDeepDiveTableColumns] =
    useState([]);
  const [modelStockDeepDiveTableData, setModelStockDeepDiveTableData] =
    useState([]);

  const [
    modelStockDeepDiveStoreViewTableColumns,
    setModelStockDeepDiveStoreViewTableColumns,
  ] = useState([]);
  const [
    modelStockDeepDiveStoreViewTableData,
    setModelStockDeepDiveStoreViewTableData,
  ] = useState([]);

  const [openModelStockDeepDiveDialog, setOpenModelStockDeepDiveDialog] =
    useState(false);
  const [modelStockDeepDiveStoreData, setModelStockDeepDiveStoreData] =
    useState([]);

  const toggleStoreInventoryPopup = (data, columnName) => {
    setModelStockDeepDiveStoreData([...data?.pop_up_data]);
    openModelStockDeepDivePopUp();
  };

  const modelStockActionMap = {
    product_code: toggleStoreInventoryPopup,
  };

  const openModelStockDeepDivePopUp = () => {
    setOpenModelStockDeepDiveDialog(true);
  };

  const closeModelStockDeepDivePopUp = () => {
    setOpenModelStockDeepDiveDialog(false);
  };

  const fetchModelStockDeepDiveTableConfig = async () => {
    try {
      props.setModelStockDeepDiveConfigLoader(true);
      let response = await props.getModelStockDeepDiveTableConfig(
        props.tableConfigName
      );
      let formattedColumns = agGridColumnFormatter(
        response?.data?.data,
        null,
        modelStockActionMap
      );
      if (props.tabValue === "article")
        setModelStockDeepDiveTableColumns(formattedColumns);
      else setModelStockDeepDiveStoreViewTableColumns(formattedColumns);
    } finally {
      props.setModelStockDeepDiveConfigLoader(false);
    }
  };

  const fetchModelStockDeepDiveTableData = async () => {
    try {
      setModelStockDeepDiveTableData([]);
      props.setModelStockDeepDiveDataLoader(true);
      let body = {
        filters: { ...props.selectedFilters },
        meta: props.tabValue,
      };
      let response = await props.getModelStockDeepDiveTableData(body);
      setModelStockDeepDiveTableData(response?.data?.data);
      props.setModelStockDeepDiveDataLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setModelStockDeepDiveDataLoader(false);
    }
  };

  const fetchModelStockDeepDiveStoreTableData = async () => {
    try {
      setModelStockDeepDiveStoreViewTableData([]);
      props.setModelStockDeepDiveStoreDataLoader(true);
      let body = {
        filters: { ...props.selectedFilters },
        meta: props.tabValue,
      };
      let response = await props.getModelStockDeepDiveTableData(body);
      setModelStockDeepDiveStoreViewTableData(response?.data?.data);
      props.setModelStockDeepDiveStoreDataLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setModelStockDeepDiveStoreDataLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchModelStockDeepDiveTableConfig();
      if (props.tabValue === "article") fetchModelStockDeepDiveTableData();
      else fetchModelStockDeepDiveStoreTableData();
    }
  }, [props.selectedFilters, props.tabValue]);

  return (
    <>
      <Loader
        loader={
          props.modelStockDeepDiveDataLoader ||
          props.modelStockDeepDiveConfigLoader ||
          props.modelStockDeepDiveStoreDataLoader
        }
        minHeight={"188px"}
      >
        {props.tabValue === "article" && (
          <AgGridComponent
            columns={modelStockDeepDiveTableColumns}
            rowdata={modelStockDeepDiveTableData}
            downloadAsExcel={props.enableDownload}
            uniqueRowId={props.uniqueKey}
          />
        )}

        {props.tabValue === "store" && (
          <AgGridComponent
            columns={modelStockDeepDiveStoreViewTableColumns}
            rowdata={modelStockDeepDiveStoreViewTableData}
            downloadAsExcel={props.enableDownload}
            uniqueRowId={props.uniqueKey}
          />
        )}
      </Loader>
      <ModelStockDeepDiveComponentPopup
        active={openModelStockDeepDiveDialog}
        enableDownload={enableDownload}
        openModal={openModelStockDeepDivePopUp}
        closeModal={closeModelStockDeepDivePopUp}
        data={modelStockDeepDiveStoreData}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;

  return {
    selectedFilters:
      inventorysmartReducer.inventoryModelStockDeepDiveService.selectedFilters,
    modelStockDeepDiveDataLoader:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDiveDataLoader,
    modelStockDeepDiveStoreDataLoader:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDiveStoreDataLoader,
    modelStockDeepDiveConfigLoader:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDiveConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setModelStockDeepDiveConfigLoader: (payload) =>
    dispatch(setModelStockDeepDiveConfigLoader(payload)),
  setModelStockDeepDiveDataLoader: (payload) =>
    dispatch(setModelStockDeepDiveDataLoader(payload)),
  setModelStockDeepDiveStoreDataLoader: (payload) =>
    dispatch(setModelStockDeepDiveStoreDataLoader(payload)),
  getModelStockDeepDiveTableConfig: (payload) =>
    dispatch(getModelStockDeepDiveTableConfig(payload)),
  getModelStockDeepDiveTableData: (payload) =>
    dispatch(getModelStockDeepDiveTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModelStockDeepDiveComponentTable);
