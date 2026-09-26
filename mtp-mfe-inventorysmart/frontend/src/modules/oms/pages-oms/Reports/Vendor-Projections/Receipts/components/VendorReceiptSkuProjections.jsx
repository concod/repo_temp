import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { Modal } from "impact-ui-v3";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { getFormattedDataForDownload } from "../../../utils";
import {
  defaultTableData,
  tableConfigurationMetaData,
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_REPORTS_TABLE_COLUMN_FILTER,
  OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  setSelectedFilters,
  setReceiptsVendorSkuTableConfigLoader,
  setReceiptsVendorSkuTableDataLoader,
  getReceiptsDCSizeLevelProjectionsTableData,
  getReceiptsVendorSkuLevelTableData,
  getReceiptsVendorSkuLevelTableConfig,
  getReceiptsDCSizeLevelProjectionsTableConfig,
} from "modules/oms/services-oms/Reports/vendor-projections-receipts-service";
import { useStyles } from "modules/oms/styles-oms/reportsCustomStyles";

const VendorReceiptSkuProjections = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForUnits, setTableRowCountForUnits] = useState(0);
  const [tableRowCountForCosts, setTableRowCountForCosts] = useState(0);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const tableGridInstance = useRef(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dcSizeLevelColumns, setDcSizeLevelColumns] = useState([]);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };
  const [tableMeta, setTableMeta] = useState({});
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  const UNIQUE_ROW_ID =
    props?.screenConfig?.vendorProductReceipt?.unique_id || "vendor_code";

  // user access for vendor projections receipts
  const vendorProjectionsAccess = props.userAccess?.find(
    (item) =>
      item.module === "vendor_projections" && item.screen === "reports_oms"
  );
  const canDownload =
    vendorProjectionsAccess?.receipts_tab?.isVendorProductReceiptsDownload ||
    false;

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      setIsUserHasDownloadAccess(canDownload);
    } else {
      setIsUserHasDownloadAccess(true);
    }
  }, [props?.userAccess, canDownload]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setReceiptsVendorSkuTableConfigLoader(true);

      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      if (filterArray?.length === 0) return;

      let columns = await props.getReceiptsVendorSkuLevelTableConfig({
        filters: filterArray,
        isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
      });
      let dcColumns = await props.getReceiptsDCSizeLevelProjectionsTableConfig({
        filters: filterArray,
      });
      if (props.showProjectionCosts) {
        columns?.data?.data?.data?.map((data) => {
          if (OMS_REPORTS_TABLE_COLUMN_FILTER.indexOf(data.column_name) === -1)
            data.label = data.label + " ($)";
        });
        dcColumns?.data?.data?.data?.map((data) => {
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
      formattedColumns.forEach((eachCol) => {
        if (eachCol.type === "link") {
          eachCol.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={eachCol}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          eachCol.onClick = (tableInfo) => {
            setSelectedArticle(tableInfo.cellData.data);
            setShowProductModal(true);
          };
        }

        if (eachCol.sub_headers?.length) {
          eachCol.sub_headers.forEach((subHeader) => {
            if (subHeader.type === "link") {
              subHeader.cellRenderer = (cellProps, extraProps) => {
                return (
                  <CellRenderers
                    cellData={cellProps}
                    column={subHeader}
                    extraProps={extraProps}
                  ></CellRenderers>
                );
              };
              subHeader.onClick = (tableInfo) => {
                setSelectedArticle(tableInfo.cellData.data);
                setShowProductModal(true);
              };
            }
          });
        }
      });
      setDcSizeLevelColumns(
        agGridColumnFormatter(
          dcColumns?.data?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        )
      );

      const displayColumns = formattedColumns.filter(
        (col) => !(col.extra && col.extra.download)
      );
      setTableColumns(displayColumns);
      setRenderAgGrid(true);
      props.setReceiptsVendorSkuTableConfigLoader(false);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    };

    fetchColumnConfig();
  }, [props.selectedFilters, props.showProjectionCosts]);

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

  const createMetaBody = (baseMeta, count) => ({
    ...baseMeta,
    limit: {
      limit: count,
      page: 1,
    },
  });

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setReceiptsVendorSkuTableDataLoader(true);
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
        isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
      };
      if (props.displayType) {
        body.screen = props.displayType;
      }
      let response = await props.getReceiptsVendorSkuLevelTableData(body);
      if (response.data.status) {
        let formatedData;
        if (props.showProjectionCosts) {
          formatedData = agGridRowFormatter(
            response?.data?.data.costs,
            params?.api?.checkConfiguration,
            UNIQUE_ROW_ID
          );
          setTableRowCountForCosts(formatedData.length);
        } else {
          formatedData = agGridRowFormatter(
            response?.data?.data.units,
            params?.api?.checkConfiguration,
            UNIQUE_ROW_ID
          );
          setTableRowCountForUnits(formatedData.length);
        }
        setTotalCount(response.data?.total);
        setTableMeta(body.meta);
        props.setReceiptsVendorSkuTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setReceiptsVendorSkuTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setReceiptsVendorSkuTableDataLoader(false);
      return defaultTableData;
    }
  };

  const downloadCsv = async () => {
    displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

    try {
      if (totalCount > 0) {
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
          download: true,
          isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
        };

        if (props.displayType) {
          requestBody.screen = props.displayType;
        }
        let response = await props.getReceiptsVendorSkuLevelTableData(
          requestBody
        );
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

  const dcTableManualCallBack = async (manualbody, pageIndex, params) => {
    setIsLoading(true);
    try {
      const attributeName =
        props?.screenConfig?.dcSizeLevelProjection?.unique_id || "article";
      const filterArray = [
        ...props.selectedFilters.filter((filter) => filter?.values?.length > 0),
        {
          filter_type: "cascaded",
          attribute_name: attributeName,
          operator: "in",
          dimension: "Product",
          values: [
            replaceSpecialCharToCharCode(selectedArticle[attributeName]),
          ],
        },
      ];
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
        isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
      };
      if (props.displayType) {
        body.screen = props.displayType;
      }
      let response = await props.getReceiptsDCSizeLevelProjectionsTableData(
        body
      );
      setIsLoading(false);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success");
      }
      if (!response?.data.total) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      return {
        data: props.showProjectionCosts
          ? response?.data.data.costs
          : response?.data?.data?.units,
        totalCount: response?.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setIsLoading(false);
    }
  };

  const getTopRightOptions = () => {
    const topRightOptions = [];

    const tableheader =
      props?.moduleConfig?.vendor_product_receipt_header ||
      "Vendor-Product Receipt Projections";
    const fileName = replaceSpacesWithUnderscores(tableheader);

    if (!props.receiptsVendorSkuTableDataLoader) {
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
      props?.moduleConfig?.vendor_product_receipt_header ||
      "Vendor-Product Receipt Projections"
    );
  };

  return (
    <>
      <div className={classes.vendorOrderSkuProjectionsContainer}>
        <Loader
          loader={
            props.receiptsVendorSkuTableConfigLoader ||
            props.receiptsVendorSkuTableDataLoader
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
                  uniqueRowId={UNIQUE_ROW_ID}
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
                  uniqueRowId={UNIQUE_ROW_ID}
                  tableHeader={getTableHeader()}
                  topRightOptions={getTopRightOptions()}
                  showDownloadButton={isUserHasDownloadAccess}
                  onDownloadButtonClick={onDownloadButtonClick}
                />
              )}
            </div>
          )}

          <Modal
            size="large"
            title={
              props?.moduleConfig?.receipt_popup_title || "Product Details"
            }
            open={showProductModal}
            aria-labelledby=""
            aria-describedby=""
            onClose={() => setShowProductModal(false)}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => {
              setShowProductModal(false);
            }}
            footerButtons={[
              {
                label: "Cancel",
                onClick: () => {
                  setShowProductModal(false);
                },
              },
            ]}
          >
            <Loader loader={isLoading} spinner>
              <AgGridComponent
                columns={dcSizeLevelColumns}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  dcTableManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"unique_row_id"}
                suppressClickEdit={true}
              />
            </Loader>
          </Modal>
        </Loader>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.omsReducer.reportsVendorProjectionsService.selectedFilters,
    receiptsVendorSkuTableDataLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsVendorSkuTableDataLoader,
    receiptsVendorSkuTableConfigLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsVendorSkuTableConfigLoader,
    moduleConfig:
      store.omsReducer.orderingCommonService.orderingModuleConfig
        ?.module_screens_info?.reports_oms?.vendor_projections,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.reports?.[
        OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY
      ],
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    isCalledFromVendorStore:
      store.omsReducer.reportsVendorProjectionsService.isCalledFromVendorStore,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getReceiptsDCSizeLevelProjectionsTableData: (payload) =>
    dispatch(getReceiptsDCSizeLevelProjectionsTableData(payload)),
  getReceiptsDCSizeLevelProjectionsTableConfig: (payload) =>
    dispatch(getReceiptsDCSizeLevelProjectionsTableConfig(payload)),
  getReceiptsVendorSkuLevelTableConfig: (payload) =>
    dispatch(getReceiptsVendorSkuLevelTableConfig(payload)),
  getReceiptsVendorSkuLevelTableData: (payload) =>
    dispatch(getReceiptsVendorSkuLevelTableData(payload)),
  setReceiptsVendorSkuTableConfigLoader: (payload) =>
    dispatch(setReceiptsVendorSkuTableConfigLoader(payload)),
  setReceiptsVendorSkuTableDataLoader: (payload) =>
    dispatch(setReceiptsVendorSkuTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorReceiptSkuProjections);
