import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import {
  getInStockTableConfig,
  getInStockTableData,
  setInStockConfigLoader,
  setInStockDataLoader,
  getInStockKPI,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/in-stock-service";

import { Paper, Grid } from "@mui/material";
import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import colours from "core/Styles/colours";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import {
  ERROR_MESSAGE,
  IN_STOCK_ALLOCATION_SUMMARY,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";
import CardComponent from "../components/CardComponent";
import DownloadReport from "../report-download";
import InventoryIcon from '@mui/icons-material/Inventory';

const InStockComponentTable = (props) => {
  const [inStockTableColumns, setInStockTableColumns] = useState([]);
  const [inStockStoreViewTableColumns, setInStockStoreViewTableColumns] =
    useState([]);
  const [inStockTableData, setInStockTableData] = useState([]);
  const [instockSumarryCards, setInstockSummaryCards] = useState([]);
  const [instockStoreKPICards, setInstockStoreKPICards] = useState([]);
  const [requestBody, setRequestBody] = useState([]);
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);

  const filtersRef = useRef({});
  const instockStoreViewRef = useRef(null);

  const classes = useStyles();

  const fetchInStockTableConfig = async () => {
    try {
      props.setInStockConfigLoader(true);
      let response = await props.getInStockTableConfig(props.tableConfigName);
      let formattedColumns = agGridColumnFormatter(response?.data?.data, null);
      setInstockStoreKPICards([]);
      setInstockSummaryCards([]);
      if (props.tabValue === "article") {
        setInStockTableColumns(formattedColumns);
      } else {
        setInStockStoreViewTableColumns(formattedColumns);
      }
    } finally {
      props.setInStockConfigLoader(false);
    }
  };

  useEffect(async () => {
    if (!isEmpty(props.selectedFilters?.filters)) {
      fetchInStockTableConfig();
      filtersRef.current = props.selectedFilters;
      try {
        props.setInStockDataLoader(true);
        let body = {
          meta: {
            ...tableConfigurationMetaData.meta,
            limit: { limit: 10, page: 0 + 1 },
          },
          filters: filtersRef.current?.filters,
          fiscal_year_week: filtersRef.current?.fiscal_year_week,
        };
        let kpiResponse = await props.getInStockKPI(body);
        setInstockStoreKPICards(kpiResponse.data?.data);
        props.setInStockDataLoader(false);
      } catch (e) {
        props.displaySnackMessages(ERROR_MESSAGE, "error");
        props.setInStockDataLoader(false);
      }
      if (props.tabValue === "article") fetchInStockTableData();
      else
        instockStoreViewRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
    }
  }, [props.selectedFilters, props.tabValue]);

  const manualCallBackStoreView = async (manualbody, pageIndex) => {
    props.setInStockDataLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: filtersRef.current?.filters,
      fiscal_year_week: filtersRef.current?.fiscal_year_week,
    };
    try {
      setRequestBody(body);
      let response = await props.getInStockTableData({
        main: body,
        type: props.tabValue,
      });
      let finalData = [...response?.data?.data].map((item) => {
        item.key = `${item.product_code}+${item.store_code}`;
        return item;
      });
      if (finalData?.length) setEnableStoreViewDownload(false);
      else setEnableStoreViewDownload(true);
      props.setInStockDataLoader(false);
      return {
        data: finalData,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableStoreViewDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setInStockDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const fetchInStockTableData = async () => {
    try {
      props.setInStockDataLoader(true);
      setInStockTableData([]);
      let body = {
        filters: props.selectedFilters?.filters,
        fiscal_year_week: props.selectedFilters?.fiscal_year_week,
        meta: tableConfigurationMetaData.meta,
      };

      let response = await props.getInStockTableData({
        main: body,
        type: props.tabValue,
      });
      setInStockTableData([...response?.data?.data]);
      props.setInStockDataLoader(false);
    } catch (err) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setInStockDataLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(instockStoreKPICards)) {
      let summaryCards = IN_STOCK_ALLOCATION_SUMMARY.map((item) => {
        let keyValueToAggregate = instockStoreKPICards[0];
        let color = colours.royalBlue;
        let icon = <InventoryIcon />;
        let avg = keyValueToAggregate[item.key];
        return {
          ...item,
          color,
          icon,
          count: !avg && avg != 0 ? "-" : avg,
        };
      });
      setInstockSummaryCards(summaryCards);
    }
  }, [props.tabValue, instockStoreKPICards]);

  const loadStoreViewTableInstance = (params) => {
    instockStoreViewRef.current = params;
  };

  return (
    <>
      <Loader
        loader={
          props.inStockDataLoader ||
          props.inStockConfigLoader ||
          props.inStockStoreViewDataLoader
        }
        minHeight={"188px"}
      >
        <Grid container className={classes.kpiContainer} spacing={3}>
          {instockSumarryCards.map((item) => {
            return (
              <Grid item xs={3}>
                <Paper elevation={3} className={classes.summaryContainer}>
                  <CardComponent kpiItem={item} />
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {props.tabValue === "article" && (
          <AgGridComponent
            columns={inStockTableColumns}
            rowdata={inStockTableData}
            downloadAsExcel={
              inStockTableData.length ? props.enableDownload : false
            }
            uniqueRowId={"key"}
          />
        )}

        {props.tabValue === "store" && (
          <>
            <DownloadReport
              screenName={"instock-store"}
              requestBody={requestBody}
              disable={enableStoreViewDownload}
              columns={inStockStoreViewTableColumns}
            ></DownloadReport>
            <AgGridComponent
              columns={inStockStoreViewTableColumns}
              loadTableInstance={loadStoreViewTableInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackStoreView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"key"}
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
      inventorysmartReducer.inventoryInStockService.selectedFilters,
    inStockDataLoader:
      inventorysmartReducer.inventoryInStockService.inStockDataLoader,
    inStockStoreViewDataLoader:
      inventorysmartReducer.inventoryInStockService.inStockStoreViewDataLoader,
    inStockConfigLoader:
      inventorysmartReducer.inventoryInStockService.inStockConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setInStockConfigLoader: (payload) =>
    dispatch(setInStockConfigLoader(payload)),
  setInStockDataLoader: (payload) => dispatch(setInStockDataLoader(payload)),
  getInStockTableConfig: (payload) => dispatch(getInStockTableConfig(payload)),
  getInStockTableData: (payload) => dispatch(getInStockTableData(payload)),
  getInStockKPI: (payload) => dispatch(getInStockKPI(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InStockComponentTable);
