import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

import {
  getExcessInventoryTableConfig,
  getExcessInventoryTableData,
  setExcessInventoryConfigLoader,
  setExcessInventoryDataLoader,
  setExcessInventoryStoreViewLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-fiscal-week-list-service";

import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const ExcessInventoryComponentTable = (props) => {
  const [excessInventoryTableColumns, setExcessInventoryTableColumns] =
    useState([]);
  const [excessInventoryTableData, setExcessInventoryTableData] = useState([]);

  const [
    excessInventoryStoreTableColumns,
    setExcessInventoryStoreTableColumns,
  ] = useState([]);
  const [excessInventoryStoreTableData, setExcessInventoryStoreTableData] =
    useState([]);

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

  const fetchExcessInventoryTableData = async () => {
    try {
      setExcessInventoryTableData([]);
      props.setExcessInventoryDataLoader(true);
      let body = {
        filters: props.selectedFilters.filters,
        report_level: props.tabValue,
        fiscal_year_week: props.selectedFilters.fiscal_year_week,
        meta: {
          search: [],
          range: [],
          sort: [],
        },
      };
      let response = await props.getExcessInventoryTableData(body);
      let finalData = [...response?.data?.data].map((item) => {
        item.uniqueKey = `${item.product_code}+${item.store_code}`;
        return item;
      });
      setExcessInventoryTableData(finalData);
      props.setExcessInventoryDataLoader(false);
    } catch (err) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExcessInventoryDataLoader(false);
    }
  };

  const fetchExcessInventoryStoreTableData = async () => {
    try {
      setExcessInventoryStoreTableData([]);
      props.setExcessInventoryStoreViewLoader(true);
      let body = {
        filters: props.selectedFilters.filters,
        report_level: props.tabValue,
        fiscal_year_week: props.selectedFilters.fiscal_year_week,
        meta: {
          search: [],
          range: [],
          sort: [],
        },
      };
      let response = await props.getExcessInventoryTableData(body);
      let finalData = [...response?.data?.data].map((item) => {
        item.uniqueKey = `${item.product_code}+${item.store_code}`;
        return item;
      });
      setExcessInventoryStoreTableData(finalData);
      props.setExcessInventoryStoreViewLoader(false);
    } catch (err) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExcessInventoryStoreViewLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchExcessInventoryTableConfig();

      if (props.tabValue === "product_code") fetchExcessInventoryTableData();
      else fetchExcessInventoryStoreTableData();
    }
  }, [props.selectedFilters, props.tabValue]);

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
          <AgGridComponent
            columns={excessInventoryTableColumns}
            rowdata={excessInventoryTableData}
            downloadAsExcel={
              excessInventoryTableData?.length ? props.enableDownload : false
            }
            uniqueRowId={"uniqueKey"}
          />
        )}

        {props.tabValue === "store" && (
          <AgGridComponent
            columns={excessInventoryStoreTableColumns}
            rowdata={excessInventoryStoreTableData}
            downloadAsExcel={
              excessInventoryStoreTableData?.length
                ? props.enableDownload
                : false
            }
            uniqueRowId={"uniqueKey"}
          />
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
