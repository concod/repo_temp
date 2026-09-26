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
  getExpediteOrdersTableConfig,
  getExpediteOrdersTableData,
  setExpediteOrdersTableConfigLoader,
  setExpediteOrdersTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/expedite-orders";

const ExpediteOrdersProjections = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
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
      let filterArray = [];
      if (props.selectedFilters.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }

      props.setExpediteOrdersTableConfigLoader(true);
      let columns = await props.getExpediteOrdersTableConfig();
      columns?.data?.data.map((data) => {
        if (data.column_name === "open_quantity") {
          data.label = data.label + " ($)";
        }
      });
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setTableColumns(formattedColumns);
      setRenderAgGrid(true);
      props.setExpediteOrdersTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
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
      let response = await props.getExpediteOrdersTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response?.data?.data,
          params?.api?.checkConfiguration,
          "vendor_code"
        );
        setTableRowCount(formatedData.length);
        props.setExpediteOrdersTableDataLoader(false);
        setTotalCount(response.data?.total);
        if (response.data?.total.length === 0) setEmptyGrid(true);
        else setEmptyGrid(false);

        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setExpediteOrdersTableDataLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExpediteOrdersTableDataLoader(false);
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
      let response = await props.getExpediteOrdersTableData(body);
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
          <Typography variant="h6">Expedite Orders Projections</Typography>
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
              "expedite_orders_projections",
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
            props.expediteOrdersTableDataLoader ||
            props.expediteOrdersTableConfigLoader
          }
          minHeight={"260px"}
        >
          {emptyGrid ? (
            <div className={globalClasses.centerAlign}>
              <Typography variant="h7" className={globalClasses.paperWrapper}>
                No data is present for the selected filters
              </Typography>
            </div>
          ) : (
            <>
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
                    uniqueRowId={"vendor_code"}
                  />
                </div>
              )}
            </>
          )}
        </Loader>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartExpediteOrdersService
        .selectedFilters,
    expediteOrdersTableDataLoader:
      store.inventorysmartReducer.inventorySmartExpediteOrdersService
        .expediteOrdersTableDataLoader,
    expediteOrdersTableConfigLoader:
      store.inventorysmartReducer.inventorySmartExpediteOrdersService
        .expediteOrdersTableConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setExpediteOrdersTableConfigLoader: (payload) =>
    dispatch(setExpediteOrdersTableConfigLoader(payload)),
  setExpediteOrdersTableDataLoader: (payload) =>
    dispatch(setExpediteOrdersTableDataLoader(payload)),
  getExpediteOrdersTableConfig: (payload) =>
    dispatch(getExpediteOrdersTableConfig(payload)),
  getExpediteOrdersTableData: (payload) =>
    dispatch(getExpediteOrdersTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersProjections);
