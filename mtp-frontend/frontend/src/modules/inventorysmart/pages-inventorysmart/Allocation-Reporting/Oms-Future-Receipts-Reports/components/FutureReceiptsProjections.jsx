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
import {
  getFutureReceiptsReportsTableData,
  setFutureReceiptsReportsTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/future-receipts-reports";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_REPORTS_TABLE_COLUMN_FILTER,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";

const FutureReceiptsProjections = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForUnits, setTableRowCountForUnits] = useState(0);
  const [tableRowCountForCosts, setTableRowCountForCosts] = useState(0);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setEmptyGrid(false);
      setRenderAgGrid(false);
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!renderAgGrid) setRenderAgGrid(true);
  }, [props.selectedFilters, renderAgGrid]);

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
      props.setFutureReceiptsReportsTableDataLoader(true);

      let filterArray = [];
      if (props?.selectedFilters?.length > 0) {
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

      let response = await props.getFutureReceiptsReportsTableData(body);

      if (response.data.status) {
        let columns = response?.data?.data?.column;
        if (columns.length === 0) {
          setEmptyGrid(true);
          return;
        }
        columns.map((data) => {
          if (props.showProjectionCosts) {
            if (
              OMS_REPORTS_TABLE_COLUMN_FILTER.indexOf(data.column_name) === -1
            )
              data.sub_headers.map((sub_header) => {
                sub_header.label = sub_header.label + " ($)";
              });
          }
          if (data.column_name === "actuals") {
            data.label = data.label + " - MTD";
          }
        });
        let formattedColumns = agGridColumnFormatter(columns, null);
        setEmptyGrid(false);
        setTableColumns(formattedColumns);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));

        let data = [];
        if (props.showProjectionCosts) data = response?.data?.data?.data?.costs;
        else data = response?.data?.data?.data?.units;

        let formatedData = agGridRowFormatter(
          data,
          params?.api?.checkConfiguration,
          "vendor_code"
        );

        if (props.showProjectionCosts)
          setTableRowCountForCosts(formatedData.length);
        else setTableRowCountForUnits(formatedData.length);

        props.setFutureReceiptsReportsTableDataLoader(false);
        setTotalCount(response.data?.total);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setFutureReceiptsReportsTableDataLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setFutureReceiptsReportsTableDataLoader(false);
      return defaultTableData;
    }
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      let filterArray = [];
      if (props?.selectedFilters?.length > 0) {
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

      let response = await props.getFutureReceiptsReportsTableData(body);

      if (response.data.status) {
        let data = [];
        if (props.showProjectionCosts) data = response?.data?.data?.data?.costs;
        else data = response?.data?.data?.data?.units;
        let downloadData = agGridRowFormatter(data);
        setCsvData(cloneDeep(downloadData), csvHeaders);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  return (
    <>
      <div className={classes.stepperWrapper}>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        >
          <Grid container alignItems={"center"} item xs={6}>
            <Typography variant="h6">
              Future Receipts Vendor Projection
            </Typography>
          </Grid>

          <Grid
            container
            alignItems={"center"}
            item
            xs={6}
            justifyContent={"flex-end"}
          >
            {!props.futureReceiptsReportsTableDataLoader && (
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
                  "oms_future_receipts_projections",
                  downloadLink,
                  csvHeaders,
                  "",
                  "",
                  false,
                  true
                )}
              </>
            )}
          </Grid>
        </Grid>
        {emptyGrid ? (
          <div className={globalClasses.centerAlign}>
            <Typography variant="h7" className={globalClasses.paperWrapper}>
              No data is present for the selected filters
            </Typography>
          </div>
        ) : (
          <Loader
            loader={props.futureReceiptsReportsTableDataLoader}
            minHeight={"260px"}
          >
            {props.showProjectionCosts && renderAgGrid && (
              <div>
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  totalCount={tableRowCountForCosts}
                  loadTableInstance={loadTableInstance}
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                  selectedFilters={props.selectedFilters}
                />
              </div>
            )}

            {!props.showProjectionCosts && renderAgGrid && (
              <div>
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  totalCount={tableRowCountForUnits}
                  loadTableInstance={loadTableInstance}
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                />
              </div>
            )}
          </Loader>
        )}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOMSFutureReceiptsService
        .selectedFilters,
    futureReceiptsReportsTableDataLoader:
      store.inventorysmartReducer.inventorySmartOMSFutureReceiptsService
        .futureReceiptsReportsTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getFutureReceiptsReportsTableData: (payload) =>
    dispatch(getFutureReceiptsReportsTableData(payload)),
  setFutureReceiptsReportsTableDataLoader: (payload) =>
    dispatch(setFutureReceiptsReportsTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FutureReceiptsProjections);
