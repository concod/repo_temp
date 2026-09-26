import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { Button, Grid, Typography, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import {
  setForecastAccuracyReportsTableData,
  setForecastAccuracyReportsFilterConfig,
  setForecastAccuracyReportsTableDataLoader,
  setForecastAccuracyTableConfigLoader,
  getForecastAccuracyTableData,
  getForecastAccuracyTableConfig,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/forecast-accuracy-service";
import { getLateOrdersTableConfig } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/late-orders";
import { getColumnsAg } from "core/actions/tableColumnActions";

const ForecastAccuracyTable = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [tableColumns, setTableColumns] = useState();
  const [tableRowCount, setTableRowCount] = useState(0);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRenderAgGrid(false);
  }, [props.selectedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setForecastAccuracyTableConfigLoader(true);
      const cols = await getColumnsAg(
        "table_name=Inventorysmart_oms_forcasting_data_report"
      )();
      setTableColumns(cols);
      setRenderAgGrid(true);
      let formattedColumns = agGridColumnFormatter(cols, null);
      props.setForecastAccuracyTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setForecastAccuracyReportsTableDataLoader(false);
      let filterArray = [];
      if (props.selectedFilters.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }
      let body = {
        filters: filterArray,
        date_filter: [props?.startEndDate],
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      let response = await props.getForecastAccuracyTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response?.data?.data,
          params?.api?.checkConfiguration,
          "vendor_code"
        );
        setTableRowCount(formatedData.length);
        props.setForecastAccuracyReportsTableDataLoader(false);

        setTotalCount(response?.data?.total);
        // if (response?.data?.total.length === 0) setEmptyGrid(true);
        // else setEmptyGrid(false);

        return { data: formatedData, totalCount: response?.data?.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setForecastAccuracyReportsTableDataLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      console.log("error", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setForecastAccuracyReportsTableDataLoader(false);
      return defaultTableData;
    }
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      let filterArray = [];
      if (props.selectedFilters.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }
      let body = {
        filters: filterArray,
        date_filter: [props?.startEndDate],
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: totalCount, page: 1 },
        },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = await props.getForecastAccuracyTableData(body);

      if (response.data.status) {
        let downloadData = agGridRowFormatter(response?.data?.data);
        setCsvData(cloneDeep(downloadData), csvHeaders);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "error");
    }
  };

  return (
    <>
      <div className={classes.stepperWrapper}>
        <Grid
          container
          alignItems={"center"}
          justifyContent={"space-between"}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">Forecast Accuracy</Typography>

          <div>
            <Tooltip title="Download">
              <Button
                variant="contained"
                onClick={async () => {
                  await downloadCsv();
                  downloadLink.current.link.click();
                }}
                startIcon={<DownloadIcon />}
                disabled={!renderAgGrid || totalCount === 0}
              >
                Download
              </Button>
            </Tooltip>
            {downloadExcelLink(
              csvData,
              "forecast_accuracy",
              downloadLink,
              csvHeaders,
              "",
              "",
              false,
              true
            )}
          </div>
        </Grid>

        <Loader
          loader={
            props.forecastAccuracyTableDataLoader ||
            props.forecastAccuracyTableConfigLoader
          }
          minHeight={"260px"}
        >
          {renderAgGrid && (
            <div>
              <AgGridComponent
                columns={tableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                totalCount={tableRowCount}
                loadTableInstance={loadTableInstance}
                pagination={true}
                cacheBlockSize={10}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                uniqueRowId={"product_code"}
              />
            </div>
          )}
        </Loader>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOMSForecastAccuracyService
        .selectedFilters,
    forecastAccuracyTableDataLoader:
      store.inventorysmartReducer.inventorySmartOMSForecastAccuracyService
        .forecastAccuracyReportsTableDataLoader,
    forecastAccuracyTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOMSForecastAccuracyService
        .forecastAccuracyReportsTableConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setForecastAccuracyTableConfigLoader: (payload) =>
    dispatch(setForecastAccuracyTableConfigLoader(payload)),
  setForecastAccuracyReportsTableDataLoader: (payload) =>
    dispatch(setForecastAccuracyReportsTableDataLoader(payload)),
  setForecastAccuracyReportsFilterConfig: (payload) =>
    dispatch(setForecastAccuracyReportsFilterConfig(payload)),
  setForecastAccuracyReportsTableData: (payload) =>
    dispatch(setForecastAccuracyReportsTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getForecastAccuracyTableData: (payload) =>
    dispatch(getForecastAccuracyTableData(payload)),
  getForecastAccuracyTableConfig: (payload) => {
    dispatch(getForecastAccuracyTableConfig(payload));
  },
  getLateOrdersTableConfig: (payload) =>
    dispatch(getLateOrdersTableConfig(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastAccuracyTable);
