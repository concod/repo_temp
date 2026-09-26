import { addSnack } from "core/actions/snackbarActions";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { cloneDeep, isEmpty } from "lodash";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import {
  getOrderBatchingSummaryTableConfiguration,
  getOrderBatchingSummaryTableData,
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setInventorysmartOrderBatchingSummaryTableDataLoader,
  setOrderBatchingSummaryTableConfig,
  setOrderBatchingSummaryTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";

const OrderBatchingSummaryTable = (props) => {
  const articleTableGridInstance = useRef(null);

  const [
    orderBatchingSummaryTableColumns,
    setOrderBatchingSummaryTableColumns,
  ] = useState([]);
  const [orderBatchingSummaryTableData, setOrderBatchingSummaryData] = useState(
    []
  );

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(true);
      let columns = await props.getOrderBatchingSummaryTableConfiguration();
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(false);

      columns.data.data = columns?.data?.data.map((column, index) => {
        column.index = index;
        return column;
      });

      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      setOrderBatchingSummaryTableColumns(formattedColumns);
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
      props.setInventorysmartOrderBatchingSummaryTableDataLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      let response = await props.getOrderBatchingSummaryTableData(body);
      if (response.data.status) {
        response.data.data = response.data.data.map((item, index) => {
          item.allocation_index = index;
          return item;
        });
        setOrderBatchingSummaryData(cloneDeep(response.data.data));
        props.setOrderBatchingSummaryTableData(response.data);
        props.setInventorysmartOrderBatchingSummaryTableDataLoader(false);
        return { data: response.data, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setInventorysmartOrderBatchingSummaryTableDataLoader(false);
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setInventorysmartOrderBatchingSummaryTableDataLoader(false);
      return [];
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
  };

  return (
    <>
      <Loader
        loader={
          props.inventorysmartOrderBatchingSummaryTableConfigLoader ||
          props.inventorysmartOrderBatchingSummaryTableDataLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingSummaryTableConfigLoader &&
          !props.inventorysmartOrderBatchingSummaryTableDataLoader && (
            <AgGridComponent
              downloadAsExcel
              columns={orderBatchingSummaryTableColumns}
              rowdata={orderBatchingSummaryTableData}
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
    inventorysmartOrderBatchingSummaryTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .inventorysmartOrderBatchingSummaryTableDataLoader,
    orderBatchingSummaryData:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryTableConfiguration: (payload) =>
    dispatch(getOrderBatchingSummaryTableConfiguration(payload)),
  getOrderBatchingSummaryTableData: (payload) =>
    dispatch(getOrderBatchingSummaryTableData(payload)),
  setInventorysmartOrderBatchingSummaryTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableConfigLoader(payload)),
  setInventorysmartOrderBatchingSummaryTableDataLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableDataLoader(payload)),
  setOrderBatchingSummaryTableConfig: (payload) =>
    dispatch(setOrderBatchingSummaryTableConfig(payload)),
  setOrderBatchingSummaryTableData: (payload) =>
    dispatch(setOrderBatchingSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderBatchingSummaryTable);
