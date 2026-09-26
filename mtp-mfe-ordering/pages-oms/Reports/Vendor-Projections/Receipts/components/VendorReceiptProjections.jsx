import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_REPORTS_TABLE_COLUMN_FILTER,
} from "modules/oms/constants-oms/stringConstants";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { getFormattedDataForDownload } from "../../../utils";
import {
  setSelectedFilters,
  getReceiptsVendorLevelTableConfig,
  getReceiptsVendorLevelTableData,
  setReceiptsVendorTableConfigLoader,
  setReceiptsVendorTableDataLoader,
} from "modules/oms/services-oms/Reports/vendor-projections-receipts-service";

const VendorOrderProjections = (props) => {
  const classes = useStyles();
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForUnits, setTableRowCountForUnits] = useState(0);
  const [tableRowCountForCosts, setTableRowCountForCosts] = useState(0);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableMeta, setTableMeta] = useState({});
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  // user access for vendor projections receipts
  const vendorProjectionsAccess = props.userAccess?.find(
    (item) =>
      item.module === "vendor_projections" && item.screen === "reports_oms"
  );
  const canDownload =
    vendorProjectionsAccess?.receipts_tab?.isVendorReceiptsDownload || false;

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      setIsUserHasDownloadAccess(canDownload);
    } else {
      setIsUserHasDownloadAccess(true);
    }
  }, [props?.userAccess, canDownload]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  //Fetching the column config
  useEffect(() => {
    const fetchColumnData = async () => {
      props.setReceiptsVendorTableConfigLoader(true);
      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      let columns = await props.getReceiptsVendorLevelTableConfig({
        filters: filterArray,
      });
      if (props.showProjectionCosts) {
        columns?.data?.data?.data?.map((data) => {
          if (OMS_REPORTS_TABLE_COLUMN_FILTER.indexOf(data.column_name) === -1)
            data.label = data.label + " ($)";
        });
      }

      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data?.data,
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
      props.setReceiptsVendorTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };
    fetchColumnData();
  }, [props.selectedFilters, props?.showProjectionCosts]);

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

        if (props.displayType) {
          requestBody.screen = props.displayType;
        }

        let response = await props.getReceiptsVendorLevelTableData(requestBody);
        if (response.data.status) {
          let downloadData;
          if (props.showProjectionCosts) {
            downloadData = getFormattedDataForDownload(
              response?.data?.data.costs
            );
            setCsvData(cloneDeep(downloadData));
          } else {
            downloadData = getFormattedDataForDownload(
              response?.data?.data.units
            );
            setCsvData(cloneDeep(downloadData));
          }
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

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRenderAgGrid(false);
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setReceiptsVendorTableDataLoader(true);
      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
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
      if (props.displayType) {
        body.screen = props.displayType;
      }
      let response = await props.getReceiptsVendorLevelTableData(body);
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
        props.setReceiptsVendorTableDataLoader(false);
        setTotalCount(response.data?.total);
        setTableMeta(body.meta);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setReceiptsVendorTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setReceiptsVendorTableDataLoader(false);
      return defaultTableData;
    }
  };

  const getTopRightOptions = () => {
    const topRightOptions = [];

    const tableheader = "vendor_receipt_projections";
    const fileName = replaceSpacesWithUnderscores(tableheader);

    if (!props.receiptsVendorTableDataLoader) {
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
    }
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

  const getTableHeader = () => {
    return (
      props?.moduleConfig?.module_screens_info?.reports_oms?.vendor_projections
        ?.vendor_receipt_header || "Vendor Receipt Projection Table"
    );
  };

  return (
    <>
      <div>
        <Loader
          loader={
            props.receiptsVendorTableDataLoader ||
            props.receiptsVendorTableConfigLoader
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
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                  tableHeader={getTableHeader()}
                  topRightOptions={getTopRightOptions()}
                  showDownloadButton={isUserHasDownloadAccess}
                  onDownloadButtonClick={onDownloadButtonClick}
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
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"vendor_code"}
                  tableHeader={getTableHeader()}
                  topRightOptions={getTopRightOptions()}
                  showDownloadButton={isUserHasDownloadAccess}
                  onDownloadButtonClick={onDownloadButtonClick}
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
      store.omsReducer.reportsVendorProjectionsService.selectedFilters,
    receiptsVendorTableDataLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsVendorTableDataLoader,
    receiptsVendorTableConfigLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsVendorTableConfigLoader,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getReceiptsVendorLevelTableConfig: (payload) =>
    dispatch(getReceiptsVendorLevelTableConfig(payload)),
  getReceiptsVendorLevelTableData: (payload) =>
    dispatch(getReceiptsVendorLevelTableData(payload)),
  setReceiptsVendorTableConfigLoader: (payload) =>
    dispatch(setReceiptsVendorTableConfigLoader(payload)),
  setReceiptsVendorTableDataLoader: (payload) =>
    dispatch(setReceiptsVendorTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorOrderProjections);
