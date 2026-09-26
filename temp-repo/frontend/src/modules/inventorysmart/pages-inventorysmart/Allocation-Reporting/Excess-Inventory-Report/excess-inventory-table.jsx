import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

import {
  getExcessInventoryTableConfig,
  getExcessInventoryTableData,
  setExcessInventoryConfigLoader,
  setExcessInventoryDataLoader,
  setExcessInventoryStoreViewLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-fiscal-week-list-service";

import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../report-download";

const ExcessInventoryComponentTable = (props) => {
  const [excessInventoryTableColumns, setExcessInventoryTableColumns] =
    useState([]);
  const [
    excessInventoryStoreTableColumns,
    setExcessInventoryStoreTableColumns,
  ] = useState([]);
  const [requestBody, setRequestBody] = useState({});
  const [enableProductViewDownload, setEnableProductViewDownload] =
    useState(true);
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);
  const filterConfigRef = useRef({});
  const excessInvProductViewRef = useRef({});
  const excessInvStoreViewRef = useRef({});

  const fetchExcessInventoryTableConfig = async () => {
    try {
      props.setExcessInventoryConfigLoader(true);
      let response = await props.getExcessInventoryTableConfig(
        props.tableConfigName
      );
      let formattedColumns = agGridColumnFormatter(response?.data?.data, null);
      if (props.tabValue === "product_code")
        setExcessInventoryTableColumns(formattedColumns);
      else setExcessInventoryStoreTableColumns(formattedColumns);
    } finally {
      props.setExcessInventoryConfigLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchExcessInventoryTableConfig();
      filterConfigRef.current = props.selectedFilters;
      if (props.tabValue === "product_code")
        excessInvProductViewRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
      else
        excessInvStoreViewRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
    }
  }, [props.selectedFilters, props.tabValue]);

  const loadExcessInvProductView = (params) => {
    excessInvProductViewRef.current = params;
  };

  const loadExcessInvStoreView = (params) => {
    excessInvStoreViewRef.current = params;
  };

  const manualCallBackProductView = async (manualbody, pageIndex) => {
    props.setExcessInventoryDataLoader(true);
    let body = {
      filters: filterConfigRef.current.filters,
      report_level: props.tabValue,
      fiscal_year_week: filterConfigRef.current.fiscal_year_week,
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
    };
    try {
      setRequestBody(body);
      let response = await props.getExcessInventoryTableData(body);
      let finalData = [...response?.data?.data].map((item) => {
        item.uniqueKey = `${item.product_code}+${item.store_code}`;
        return item;
      });
      if (pageIndex == 0) {
        if (finalData?.length) setEnableProductViewDownload(false);
        else setEnableProductViewDownload(true);
      }
      props.setExcessInventoryDataLoader(false);
      return {
        data: finalData,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableProductViewDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExcessInventoryDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackStoreView = async (manualbody, pageIndex) => {
    props.setExcessInventoryStoreViewLoader(true);
    let body = {
      filters: filterConfigRef.current.filters,
      report_level: props.tabValue,
      fiscal_year_week: filterConfigRef.current.fiscal_year_week,
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
    };
    try {
      setRequestBody(body);
      let response = await props.getExcessInventoryTableData(body);
      let finalData = [...response?.data?.data].map((item) => {
        item.uniqueKey = `${item.product_code}+${item.store_code}`;
        return item;
      });
      if (pageIndex == 0) {
        if (finalData?.length) setEnableStoreViewDownload(false);
        else setEnableStoreViewDownload(true);
      }
      props.setExcessInventoryStoreViewLoader(false);
      return {
        data: finalData,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableStoreViewDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExcessInventoryStoreViewLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  return (
    <>
      <Loader
        loader={
          props.excessInventoryDataLoader ||
          props.excessInventoryConfigLoader ||
          props.excessInventoryStoreViewLoader
        }
        minHeight={"188px"}
      >
        {props.tabValue === "product_code" && (
          <>
            <DownloadReport
              screenName={"excess_inventory_product"}
              requestBody={requestBody}
              disable={enableProductViewDownload}
            ></DownloadReport>
            <AgGridComponent
              uniqueRowId={"uniqueKey"}
              loadTableInstance={loadExcessInvProductView}
              manualCallBack={(body, pageIndex) =>
                manualCallBackProductView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={excessInventoryTableColumns}
            />
          </>
        )}

        {props.tabValue === "store" && (
          <>
            <DownloadReport
              screenName={"excess_inventory_store"}
              requestBody={requestBody}
              disable={enableStoreViewDownload}
            ></DownloadReport>
            <AgGridComponent
              uniqueRowId={"uniqueKey"}
              loadTableInstance={loadExcessInvStoreView}
              manualCallBack={(body, pageIndex) =>
                manualCallBackStoreView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={excessInventoryStoreTableColumns}
            />
          </>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;

  return {
    selectedFilters:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .selectedFilters,
    excessInventoryDataLoader:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryDataLoader,
    excessInventoryStoreViewLoader:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryStoreViewLoader,
    excessInventoryConfigLoader:
      inventorysmartReducer.inventorySmartExcessInventoryReportService
        .excessInventoryConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setExcessInventoryConfigLoader: (payload) =>
    dispatch(setExcessInventoryConfigLoader(payload)),
  setExcessInventoryDataLoader: (payload) =>
    dispatch(setExcessInventoryDataLoader(payload)),
  setExcessInventoryStoreViewLoader: (payload) =>
    dispatch(setExcessInventoryStoreViewLoader(payload)),
  getExcessInventoryTableConfig: (payload) =>
    dispatch(getExcessInventoryTableConfig(payload)),
  getExcessInventoryTableData: (payload) =>
    dispatch(getExcessInventoryTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryComponentTable);
