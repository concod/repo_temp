import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { Modal, Button } from "impact-ui-v3";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { getFormattedDataForDownload } from "../../../utils";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_REPORTS_TABLE_COLUMN_FILTER,
  OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  setSelectedFilters,
  setForecastVendorSkuTableConfigLoader,
  setForecastVendorSkuTableDataLoader,
  getForecastVendorSkuLevelTableConfig,
  getForecastVendorSkuLevelTableData,
  setForecastVendorSkuTableData,
  getForecastDCSizeLevelProjectionsTableData,
  getForecastDCSizeLevelProjectionsTableConfig,
} from "modules/oms/services-oms/Reports/vendor-projections-forecasts-service";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const VendorForecastSkuProjections = (props) => {
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
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dcSizeLevelColumns, setDcSizeLevelColumns] = useState([]);
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });
  const [tableMeta, setTableMeta] = useState({});
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  const UNIQUE_ROW_ID =
    props?.screenConfig?.vendorProductForecast?.unique_id || "vendor_code";

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  // user access for vendor projections forecasts
  const vendorProjectionsAccess = props.userAccess?.find(
    (item) =>
      item.module === "vendor_projections" && item.screen === "reports_oms"
  );
  const canDownload =
    vendorProjectionsAccess?.forecast_tab?.isVendorProductForecastDownload ||
    false;

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      setIsUserHasDownloadAccess(canDownload);
    } else {
      setIsUserHasDownloadAccess(true);
    }
  }, [props?.userAccess, canDownload]);

  const sizeColumnClickHandler = useCallback((params) => {
    const article = params?.data?.article;
    if (article) {
      setPackConfigState({
        isOpen: true,
        selectedArticle: article,
      });
    }
  }, []);

  const handlePackConfigClose = useCallback(() => {
    setPackConfigState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setForecastVendorSkuTableConfigLoader(true);
      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      let columns = await props.getForecastVendorSkuLevelTableConfig({
        filters: filterArray,
      });
      let dcColumns = await props.getForecastDCSizeLevelProjectionsTableConfig({
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
        if (eachCol.sub_headers.length) {
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

        if (eachCol.column_name === "view_pack_config") {
          eachCol.cellRenderer = (params, extraProps) => {
            const cellValue = params?.value || params?.data?.view_pack_config;

            if (cellValue === "View Pack Config") {
              return (
                <Button
                  variant="url"
                  onClick={() => sizeColumnClickHandler(params)}
                >
                  {cellValue}
                </Button>
              );
            }

            return cellValue || "";
          };
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
      props.setForecastVendorSkuTableConfigLoader(false);
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

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setForecastVendorSkuTableDataLoader(true);

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
      let response = await props.getForecastVendorSkuLevelTableData(body);
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
        props.setForecastVendorSkuTableDataLoader(false);
        setTotalCount(response.data?.total);
        setTableMeta(body.meta);
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
          download: true,
        };

        if (props.displayType) {
          requestBody.screen = props.displayType;
        }

        let response = await props.getForecastVendorSkuLevelTableData(
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
            downloadData = agGridRowFormatter(response?.data?.data.units);
            setCsvData(cloneDeep(downloadData));
          }
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(NO_DATA_FOUND, "info");
      }
    } catch (e) {
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
      };
      if (props.displayType) {
        body.screen = props.displayType;
      }
      let response = await props.getForecastDCSizeLevelProjectionsTableData(
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
      props?.moduleConfig?.vendor_product_forecast_header ||
      "Vendor-Product Forecast Projections";
    const fileName = replaceSpacesWithUnderscores(tableheader);

    if (!props.forecastVendorSkuTableDataLoader) {
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
      props?.moduleConfig?.vendor_product_forecast_header ||
      "Vendor-Product Forecast Projections"
    );
  };

  return (
    <>
      <div className={classes.vendorOrderSkuProjectionsContainer}>
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
              props?.moduleConfig?.forecast_popup_title || "Product Details"
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
                // loadTableInstance={setNewProductTableInstance}
                suppressClickEdit={true}
              />
            </Loader>
          </Modal>

          {packConfigState.isOpen && (
            <PackConfigBottomSheet
              openPackConfigDetailSheet={packConfigState.isOpen}
              setOpenPackConfigDetailSheet={handlePackConfigClose}
              l1DisplayName={
                props?.screenConfig?.l1DisplayName || "Master SKU ID"
              }
              activeChildHierarchyKey={packConfigState.selectedArticle}
              screenName="reports_vendor_projection_forecast"
            />
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
    forecastVendorSkuTableConfigLoader:
      store.omsReducer.reportsVendorProjectionsForecastService
        .forecastVendorSkuTableConfigLoader,
    forecastVendorSkuTableDataLoader:
      store.omsReducer.reportsVendorProjectionsForecastService
        .forecastVendorSkuTableDataLoader,
    moduleConfig:
      store.omsReducer.orderingCommonService.orderingModuleConfig
        ?.module_screens_info?.reports_oms?.vendor_projections,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.reports?.[
        OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY
      ],
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getForecastDCSizeLevelProjectionsTableConfig: (payload) =>
    dispatch(getForecastDCSizeLevelProjectionsTableConfig(payload)),
  getForecastDCSizeLevelProjectionsTableData: (payload) =>
    dispatch(getForecastDCSizeLevelProjectionsTableData(payload)),
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorForecastSkuProjections);
