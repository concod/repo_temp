import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";

import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  getForecastReportsTableConfig,
  getForecastReportsTableData,
  setForecastReportsConfigLoader,
  setForecastReportsDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/forecast-reports-service";
import DownloadButton from "../report-download";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const ForecastReportsComponentTable = (props) => {
  const globalClasses = globalStyles();

  const [forecastReportsTableColumns, setForecastReportsTableColumns] =
    useState([]);
  const [enableForecastReportDownload, setEnableForecastReportDownload] =
    useState(true);
  const forecastReportsInstance = useRef(null);

  const fetchForecastReportsTableConfig = async () => {
    try {
      props.setForecastReportsConfigLoader(true);
      let response = await props.getForecastReportsTableConfig();
      let formattedColumns = agGridColumnFormatter(response?.data?.data);
      setForecastReportsTableColumns(formattedColumns);
    } finally {
      props.setForecastReportsConfigLoader(false);
    }
  };

  const manualCallBackForecastReport = async (manualbody, pageIndex) => {
    try {
      props.setForecastReportsDataLoader(true);
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        ...props.selectedFilters,
      };

      let response = await props.getForecastReportsTableData(body);
      const forecastData = response?.data?.data?.map((item, index) => {
        item.index = index;
        return item;
      });
      if (pageIndex == 0) {
        if (forecastData?.length) setEnableForecastReportDownload(false);
        else setEnableForecastReportDownload(true);
      }
      props.setForecastReportsDataLoader(false);
      return {
        data: forecastData,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableForecastReportDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setForecastReportsDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchForecastReportsTableConfig();
      forecastReportsInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.selectedFilters]);

  const loadForecastReportsTableInstance = (params) => {
    forecastReportsInstance.current = params;
  };

  return (
    <>
      <Typography variant="h5" className={globalClasses.paddingVertical}>
        Forecast Reports
      </Typography>
      <Loader
        loader={
          props.forecastReportsDataLoader || props.forecastReportsConfigLoader
        }
        minHeight={"188px"}
      >
        <DownloadButton
          screenName={"forecast_report"}
          requestBody={{ ...props.selectedFilters }}
          disable={enableForecastReportDownload}
        ></DownloadButton>

        <AgGridComponent
          columns={forecastReportsTableColumns}
          loadTableInstance={loadForecastReportsTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallBackForecastReport(body, pageIndex)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"index"}
        />
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;

  return {
    selectedFilters:
      inventorysmartReducer.inventoryForecastReportsService.selectedFilters,
    forecastReportsDataLoader:
      inventorysmartReducer.inventoryForecastReportsService
        .forecastReportsDataLoader,
    forecastReportsConfigLoader:
      inventorysmartReducer.inventoryForecastReportsService
        .forecastReportsConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setForecastReportsConfigLoader: (payload) =>
    dispatch(setForecastReportsConfigLoader(payload)),
  setForecastReportsDataLoader: (payload) =>
    dispatch(setForecastReportsDataLoader(payload)),
  getForecastReportsTableConfig: (payload) =>
    dispatch(getForecastReportsTableConfig(payload)),
  getForecastReportsTableData: (payload) =>
    dispatch(getForecastReportsTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastReportsComponentTable);
