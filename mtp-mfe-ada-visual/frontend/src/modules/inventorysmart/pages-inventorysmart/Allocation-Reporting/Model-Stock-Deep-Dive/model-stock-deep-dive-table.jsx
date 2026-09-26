import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

import {
  getModelStockDeepDiveTableConfig,
  getModelStockDeepDiveTableData,
  setModelStockDeepDiveConfigLoader,
  setModelStockDeepDiveDataLoader,
  setModelStockDeepDiveStoreDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/model-stock-deep-dive-service";

import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import ModelStockDeepDiveComponentPopup from "./model-stock-deep-dive-popup";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../report-download";

const ModelStockDeepDiveComponentTable = (props) => {
  const enableDownload =
    props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.indexOf(
      "download_reports"
    ) === -1;

  const [modelStockDeepDiveTableColumns, setModelStockDeepDiveTableColumns] =
    useState([]);

  const [
    modelStockDeepDiveStoreViewTableColumns,
    setModelStockDeepDiveStoreViewTableColumns,
  ] = useState([]);

  const [openModelStockDeepDiveDialog, setOpenModelStockDeepDiveDialog] =
    useState(false);
  const [modelStockDeepDiveStoreData, setModelStockDeepDiveStoreData] =
    useState([]);
  const [requestBody, setRequestBody] = useState({});
  const [enableProductViewDownload, setEnableProductViewDownload] =
    useState(true);
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);

  const filterConfigRef = useRef({});
  const modelStockProductViewRef = useRef({});
  const modelStockStoreViewRef = useRef({});

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
        response?.data?.data
        // null,
        // modelStockActionMap  // commenting out for time being as we are not showing the pop up
      );
      if (props.tabValue === "article")
        setModelStockDeepDiveTableColumns(formattedColumns);
      else setModelStockDeepDiveStoreViewTableColumns(formattedColumns);
    } finally {
      props.setModelStockDeepDiveConfigLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchModelStockDeepDiveTableConfig();
      filterConfigRef.current = { ...props.selectedFilters };
      if (props.tabValue === "article")
        modelStockProductViewRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
      else
        modelStockStoreViewRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
    }
  }, [props.selectedFilters, props.tabValue]);

  const manaualCallBackModelStockProductView = async (
    manualbody,
    pageIndex
  ) => {
    props.setModelStockDeepDiveDataLoader(true);
    let body = {
      ...filterConfigRef.current,
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
    };
    try {
      setRequestBody(body);
      let response = await props.getModelStockDeepDiveTableData({
        body: body,
        tabValue: props?.tabValue,
      });
      if (pageIndex == 0) {
        if (response.data.data?.length) setEnableProductViewDownload(false);
        else setEnableProductViewDownload(true);
      }
      props.setModelStockDeepDiveDataLoader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableProductViewDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setModelStockDeepDiveDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackModelStockStoreView = async (manualbody, pageIndex) => {
    props.setModelStockDeepDiveStoreDataLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      ...filterConfigRef.current,
    };
    try {
      setRequestBody(body);
      let response = await props.getModelStockDeepDiveTableData({
        body: body,
        tabValue: props?.tabValue,
      });
      if (pageIndex == 0) {
        if (response.data.data?.length) setEnableStoreViewDownload(false);
        else setEnableStoreViewDownload(true);
      }
      props.setModelStockDeepDiveStoreDataLoader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableStoreViewDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setModelStockDeepDiveStoreDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadModelStockProductView = (params) => {
    modelStockProductViewRef.current = params;
  };

  const loadModelStockStoreView = (params) => {
    modelStockStoreViewRef.current = params;
  };

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
          <>
            <DownloadReport
              screenName={"model_stock_article"}
              requestBody={requestBody}
              disable={enableProductViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadModelStockProductView}
              manualCallBack={(body, pageIndex) =>
                manaualCallBackModelStockProductView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={modelStockDeepDiveTableColumns}
              uniqueRowId={props.uniqueKey}
            />
          </>
        )}

        {props.tabValue === "store" && (
          <>
            <DownloadReport
              screenName={"model_stock_store"}
              requestBody={requestBody}
              disable={enableStoreViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadModelStockStoreView}
              manualCallBack={(body, pageIndex) =>
                manualCallBackModelStockStoreView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={modelStockDeepDiveStoreViewTableColumns}
              uniqueRowId={props.uniqueKey}
            />
          </>
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
