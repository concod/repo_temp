import React, { useState, useEffect, useRef } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getOrderBatchingSummaryStoreTableConfiguration,
  getOrderBatchingSummaryStoreTableData,
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setOrderBatchingSummaryStoreDataLoader,
  setOrderBatchingSummaryStoreTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";
import {
  handleErrorMessage,
  displaySnackMessages,
} from "../../inventorysmart-utility";
import { Typography } from "@mui/material";

const OrderBatchingSummaryStoreTable = (props) => {
  const agGridInstance = useRef(null);

  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(true);
      let columns = await props.getOrderBatchingSummaryStoreTableConfiguration();
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(false);

      columns.data.data = columns?.data?.data.map((column, index) => {
        column.index = index;
        return column;
      });

      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      setColumnConfigs(formattedColumns);
    };
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && fetchOrderBatchingSummaryTableData();
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData &&
      fetchOrderBatchingSummaryTableData();
  }, [props.inventorysmartReloadOrderBatchingData]);

  const fetchOrderBatchingSummaryTableData = async () => {
    try {
      props.setOrderBatchingSummaryStoreDataLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      let response = await props.getOrderBatchingSummaryStoreTableData(body);
      if (response.data.show_message) {
        displaySnackMessages(response.data.message, "success", props);
      }
      if (response.data.status) {
        response.data.data = response.data.data.map((item, index) => {
          item.allocation_index = index;
          return item;
        });
        setTableData(cloneDeep(response.data.data));
        props.setOrderBatchingSummaryStoreTableData(response.data);
        props.setOrderBatchingSummaryStoreDataLoader(false);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
        return { data: response.data, totalCount: response.data.total };
      } else {
        setTableData([]);
        props.setOrderBatchingSummaryStoreTableData({
          data: [],
          totalCount: 0,
        });
        props.setOrderBatchingSummaryStoreDataLoader(false);
        return { data: [], totalCount: 0 };
      }
    } catch (e) {
      handleErrorMessage(e, props);
      props.setOrderBatchingSummaryStoreDataLoader(false);
      return { data: [], totalCount: 0 };
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return (
    <>
      <Loader
        loader={
          props.inventorysmartOrderBatchingSummaryTableConfigLoader ||
          props.orderBatchingSummaryStoreDataLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingSummaryTableConfigLoader &&
          !props.orderBatchingSummaryStoreDataLoader && (
            <AgGridComponent
              downloadAsExcel={tableData?.length ? true : false}
              columns={columnConfigs}
              rowdata={tableData}
              uniqueRowId={"allocation_index"}
              loadTableInstance={loadTableInstance}
              skipAutoColumn
            />
          )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    inventorysmartOrderBatchingSummaryTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .inventorysmartOrderBatchingSummaryTableConfigLoader,
    orderBatchingSummaryStoreDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStoreDataLoader,
    orderBatchingSummaryData:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryStoreTableConfiguration: () =>
    dispatch(getOrderBatchingSummaryStoreTableConfiguration()),
  getOrderBatchingSummaryStoreTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStoreTableData(payload)),
  setInventorysmartOrderBatchingSummaryTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableConfigLoader(payload)),
  setOrderBatchingSummaryStoreDataLoader: (payload) =>
    dispatch(setOrderBatchingSummaryStoreDataLoader(payload)),
  setOrderBatchingSummaryStoreTableData: (payload) =>
    dispatch(setOrderBatchingSummaryStoreTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderBatchingSummaryStoreTable);
