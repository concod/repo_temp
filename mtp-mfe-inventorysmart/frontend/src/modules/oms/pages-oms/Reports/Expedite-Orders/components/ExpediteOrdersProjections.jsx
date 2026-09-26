import React, { useEffect, useState, useRef } from "react";
import { isEmpty, cloneDeep } from "lodash";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { getFormattedDataForDownload } from "modules/oms/pages-oms/Reports/utils";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
} from "modules/oms/constants-oms/stringConstants";
import {
  getExpediteOrdersTableConfig,
  getExpediteOrdersTableData,
  setExpediteOrdersTableConfigLoader,
  setExpediteOrdersTableDataLoader,
} from "modules/oms/services-oms/Reports/expedite-orders";

const ExpediteOrdersProjections = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCount, setTableRowCount] = useState(0);
  const [tableMeta, setTableMeta] = useState({});
  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  // user access for expedite orders download
  const expediteOrdersAccess = props.userAccess?.find(
    (item) => item.module === "expedite_orders" && item.screen === "reports_oms"
  );
  const canDownload = expediteOrdersAccess?.isDownloadButton || false;

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      setIsUserHasDownloadAccess(canDownload);
    } else {
      setIsUserHasDownloadAccess(true);
    }
  }, [props?.userAccess, canDownload]);

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
      props.setExpediteOrdersTableConfigLoader(true);
      let columns = await props.getExpediteOrdersTableConfig();
      columns?.data?.data.map((data) => {
        if (data.column_name === "open_quantity") {
          data.label = data.label + " ($)";
        }
      });
      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      setTableColumns(formattedColumns);
      setRenderAgGrid(true);
      props.setExpediteOrdersTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      if (filterArray?.length === 0) return;

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
        setTableMeta(body.meta);

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

  // Helper function to create meta body with pagination
  const createMetaBody = (baseMeta, count) => ({
    ...baseMeta,
    limit: {
      limit: count,
      page: 1,
    },
  });

  const downloadCsv = async () => {
    try {
      if (totalCount > 0) {
        displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

        // Filter array processing
        const filterArray = (props.selectedFilters ?? []).filter(
          (filter) => filter?.values?.length > 0
        );
        if (filterArray?.length === 0) return;

        // Create meta body with pagination
        const metaBody = createMetaBody(
          isEmpty(tableMeta) ? tableConfigurationMetaData.meta : tableMeta,
          totalCount
        );

        // Request body
        const requestBody = {
          filters: filterArray,
          meta: metaBody,
        };

        let response = await props.getExpediteOrdersTableData(requestBody);
        if (response.data.status) {
          let downloadData = getFormattedDataForDownload(response?.data?.data);
          setCsvData(cloneDeep(downloadData));
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(NO_DATA_FOUND, "info");
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const getTopRightOptions = () => {
    const tableheader = "expedite_orders_projections";
    const fileName = replaceSpacesWithUnderscores(tableheader);
    const topRightOptions = [];
    topRightOptions.push(
      <>
        {downloadExcelLink(
          csvData,
          fileName,
          downloadLink,
          csvHeaders,
          "",
          "",
          true
        )}
      </>
    );

    return topRightOptions;
  };

  const onDownloadButtonClick = async () => {
    try {
      if (totalCount === 0) {
        displaySnackMessages(NO_DATA_FOUND, "info");
      } else {
        await downloadCsv();
        downloadLink.current.link.click();
      }
    } catch (error) {
      console.log("Error in downloading CSV", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <>
      <div className={classes.stepperWrapper}>
        <Loader
          loader={
            props.expediteOrdersTableDataLoader ||
            props.expediteOrdersTableConfigLoader
          }
          minHeight={"260px"}
        >
          {emptyGrid ? (
            <div className={globalClasses.centerAlign}>
              <EmptyStateWrapper />
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
                    uniqueRowId={"unique_row_id"}
                    tableHeader="Expedite Orders Projections"
                    topRightOptions={getTopRightOptions()}
                    showSkeleton={true}
                    showDownloadButton={
                      !isEmpty(props?.userAccess)
                        ? isUserHasDownloadAccess
                        : true
                    }
                    onDownloadButtonClick={onDownloadButtonClick}
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
      store.omsReducer.reportsExpediteOrdersService.selectedFilters,
    expediteOrdersTableDataLoader:
      store.omsReducer.reportsExpediteOrdersService
        .expediteOrdersTableDataLoader,
    expediteOrdersTableConfigLoader:
      store.omsReducer.reportsExpediteOrdersService
        .expediteOrdersTableConfigLoader,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
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
