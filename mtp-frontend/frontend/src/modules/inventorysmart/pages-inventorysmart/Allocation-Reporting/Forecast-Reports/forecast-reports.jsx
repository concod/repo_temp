import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";

import React, { useEffect, useState } from "react";
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
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const ForecastReportsComponentTable = (props) => {
  const globalClasses = globalStyles();

  const [forecastReportsTableColumns, setForecastReportsTableColumns] =
    useState([]);
  const [forecastReportsTableData, setForecastReportsTableData] = useState([]);

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

  const fetchForecastReportsTableData = async () => {
    try {
      props.setForecastReportsDataLoader(true);
      let body = {
        ...props.selectedFilters,
      };

      let response = await props.getForecastReportsTableData(body);
      const forecastData = response?.data?.data;
      setForecastReportsTableData(forecastData);
      props.setForecastReportsDataLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setForecastReportsDataLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters.filters)) {
      fetchForecastReportsTableConfig();
      fetchForecastReportsTableData();
    }
  }, [props.selectedFilters]);

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
        <AgGridComponent
          columns={forecastReportsTableColumns}
          rowdata={forecastReportsTableData}
          downloadAsExcel
          disableExcelDownload={forecastReportsTableData?.length ? false : true}
          uniqueRowId={"key"}
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
