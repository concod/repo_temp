import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { setFormFilters } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { Button, Grid, Typography, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import {
  setSelectedFilters,
  setForecastVendorSkuTableConfigLoader,
  setForecastVendorSkuTableDataLoader,
  getForecastVendorSkuLevelTableConfig,
  getForecastVendorSkuLevelTableData,
  setForecastVendorSkuTableData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/vendor-projections-forecasts-service";
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

const VendorForecastSkuProjections = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForUnits, setTableRowCountForUnits] = useState(0);
  const [tableRowCountForCosts, setTableRowCountForCosts] = useState(0);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setForecastVendorSkuTableConfigLoader(true);
      let filterArray = [];
      if (props.selectedFilters.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }
      let payloadForConfig = {
        filters: filterArray,
      };
      let columns = await props.getForecastVendorSkuLevelTableConfig(
        payloadForConfig
      );
      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data?.data,
        null
      );
      setTableColumns(formattedColumns);
      setRenderAgGrid(true);
      props.setForecastVendorSkuTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };
    fetchColumnConfig();
  }, [props.selectedFilters]);

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

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setForecastVendorSkuTableDataLoader(true);

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
      let response = await props.getForecastVendorSkuLevelTableData(body);
      if (response.data.status) {
        let formatedData;
        if (props.showProjectionCosts) {
          formatedData = agGridRowFormatter(
            response?.data?.data.costs,
            params?.api?.checkConfiguration,
            "vendor_code"
          );
          setTableRowCountForCosts(formatedData.length);
        } else {
          formatedData = agGridRowFormatter(
            response?.data?.data.units,
            params?.api?.checkConfiguration,
            "vendor_code"
          );
          setTableRowCountForUnits(formatedData.length);
        }
        props.setForecastVendorSkuTableDataLoader(false);
        setTotalCount(response.data?.total);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setForecastVendorSkuTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setForecastVendorSkuTableDataLoader(false);
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
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: totalCount, page: 1 },
        },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = await props.getForecastVendorSkuLevelTableData(body);
      if (response.data.status) {
        let downloadData;
        if (props.showProjectionCosts) {
          downloadData = agGridRowFormatter(response?.data?.data.costs);
          setCsvData(cloneDeep(downloadData), csvHeaders);
        } else {
          downloadData = agGridRowFormatter(response?.data?.data.units);
          setCsvData(cloneDeep(downloadData), csvHeaders);
        }
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  return (
    <>
      <div className={globalClasses.marginVertical1rem}>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        >
          <Grid container alignItems={"center"} item xs={6}>
            <Typography variant="h6">
              Vendor-SKU Forecast Projections
            </Typography>
          </Grid>
          <Grid
            container
            alignItems={"center"}
            item
            xs={6}
            justifyContent={"flex-end"}
          >
            {!props.forecastVendorSkuTableDataLoader && (
              <>
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
                  "vendor_forecast_sku_projections",
                  downloadLink,
                  csvHeaders,
                  "",
                  "",
                  true
                )}
              </>
            )}
          </Grid>
        </Grid>
        <Loader
          loader={
            props.forecastVendorSkuTableConfigLoader ||
            props.forecastVendorSkuTableDataLoader
          }
          minHeight={"260px"}
        >
          {props.showProjectionCosts && (
            <div>
              {renderAgGrid && (
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  totalCount={tableRowCountForCosts}
                  loadTableInstance={loadTableInstance}
                  sideBar={false}
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                />
              )}
            </div>
          )}

          {!props.showProjectionCosts && (
            <div>
              {renderAgGrid && (
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  totalCount={tableRowCountForUnits}
                  sideBar={false}
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                />
              )}
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
      store.inventorysmartReducer.inventorySmartOrdersService.selectedFilters,
    forecastVendorSkuTableConfigLoader:
      store.inventorysmartReducer.inventorySmartForecastService
        .forecastVendorSkuTableConfigLoader,
    forecastVendorSkuTableDataLoader:
      store.inventorysmartReducer.inventorySmartForecastService
        .forecastVendorSkuTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getForecastVendorSkuLevelTableConfig: (payload) =>
    dispatch(getForecastVendorSkuLevelTableConfig(payload)),
  getForecastVendorSkuLevelTableData: (payload) =>
    dispatch(getForecastVendorSkuLevelTableData(payload)),
  setForecastVendorSkuTableDataLoader: (payload) =>
    dispatch(setForecastVendorSkuTableDataLoader(payload)),
  setForecastVendorSkuTableConfigLoader: (payload) =>
    dispatch(setForecastVendorSkuTableConfigLoader(payload)),
  setForecastVendorSkuTableData: (payload) =>
    dispatch(setForecastVendorSkuTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorForecastSkuProjections);
