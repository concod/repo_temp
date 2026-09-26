import React, { useState, useEffect, useRef } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getOrderBatchingSummaryStyleTableConfiguration,
  getOrderBatchingSummaryStyleTableData,
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setOrderBatchingSummaryStyleDataLoader,
  setOrderBatchingSummaryStyleTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";
import {
  handleErrorMessage,
  displaySnackMessages,
} from "../../inventorysmart-utility";
import { Typography } from "@mui/material";

const OrderBatchingSummaryStyleTable = (props) => {
  const agGridInstance = useRef(null);

  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(true);
      let columns = await props.getOrderBatchingSummaryStyleTableConfiguration();
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
      props.setOrderBatchingSummaryStyleDataLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      let response = await props.getOrderBatchingSummaryStyleTableData(body);
      if (response.data.status) {
        response.data.data = response.data.data.map((item, index) => {
          item.allocation_index = index;
          return item;
        });
        setTableData(cloneDeep(response.data.data));
        props.setOrderBatchingSummaryStyleTableData(response.data);
        props.setOrderBatchingSummaryStyleDataLoader(false);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
      } else {
        setTableData([]);
        props.setOrderBatchingSummaryStyleDataLoader(false);
      }
    } catch (e) {
      handleErrorMessage(e, props);
      props.setOrderBatchingSummaryStyleDataLoader(false);
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
          props.orderBatchingSummaryStyleDataLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingSummaryTableConfigLoader &&
          !props.orderBatchingSummaryStyleDataLoader && (
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
    orderBatchingSummaryStyleDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStyleDataLoader,
    orderBatchingSummaryData:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryStyleTableConfiguration: () =>
    dispatch(getOrderBatchingSummaryStyleTableConfiguration()),
  getOrderBatchingSummaryStyleTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStyleTableData(payload)),
  setInventorysmartOrderBatchingSummaryTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableConfigLoader(payload)),
  setOrderBatchingSummaryStyleDataLoader: (payload) =>
    dispatch(setOrderBatchingSummaryStyleDataLoader(payload)),
  setOrderBatchingSummaryStyleTableData: (payload) =>
    dispatch(setOrderBatchingSummaryStyleTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderBatchingSummaryStyleTable);
