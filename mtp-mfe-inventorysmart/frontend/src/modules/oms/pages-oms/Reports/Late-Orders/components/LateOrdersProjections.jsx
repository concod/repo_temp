import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { Button } from "impact-ui-v3";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
} from "modules/oms/constants-oms/stringConstants";
import {
  getLateOrdersTableConfig,
  getLateOrdersTableData,
  setLateOrdersTableConfigLoader,
  setLateOrdersTableDataLoader,
} from "modules/oms/services-oms/Reports/late-orders";
import { getFormattedDataForDownload } from "../../utils";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";

const LateOrdersProjections = (props) => {
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
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  // user access for late orders download
  const lateOrdersAccess = props.userAccess?.find(
    (item) => item.module === "late_orders" && item.screen === "reports_oms"
  );
  const canDownload = lateOrdersAccess?.isDownloadButton || false;

  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

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
      props.setLateOrdersTableConfigLoader(true);
      let columns = await props.getLateOrdersTableConfig();
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

      formattedColumns.forEach((eachCol) => {
        if (eachCol.sub_headers && eachCol.sub_headers.length > 0) {
          eachCol.sub_headers.forEach((subHeader) => {
            if (subHeader.column_name === "view_pack_config") {
              subHeader.cellRenderer = (params, extraProps) => {
                const cellValue =
                  params?.value || params?.data?.view_pack_config;

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
        }
      });

      setTableColumns(formattedColumns);
      setRenderAgGrid(true);
      props.setLateOrdersTableConfigLoader(false);
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
      let response = await props.getLateOrdersTableData(body);
      if (response.data.status) {
        const updatedData = response?.data?.data.map((item, index) => ({
          ...item,
          id: index + 1, // Generating a unique ID
        }));
        let formatedData = agGridRowFormatter(
          updatedData,
          params?.api?.checkConfiguration,
          "vendor_code"
        );
        setTableRowCount(formatedData.length);
        setTableMeta(body.meta);
        props.setLateOrdersTableDataLoader(false);

        setTotalCount(response.data?.total);

        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setLateOrdersTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setLateOrdersTableDataLoader(false);
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
    if (totalCount <= 0) {
      displaySnackMessages(NO_DATA_FOUND, "info");
      return;
    }

    try {
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

      const response = await props.getLateOrdersTableData(requestBody);

      if (response.data.status) {
        const downloadData = getFormattedDataForDownload(response?.data?.data);
        setCsvData(cloneDeep(downloadData));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error("Download CSV error:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const getTopRightOptions = () => {
    const topRightOptions = [];

    const tableheader = "late_orders_projections";
    const fileName = replaceSpacesWithUnderscores(tableheader);

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
            props.lateOrdersTableDataLoader || props.lateOrdersTableConfigLoader
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
                    uniqueRowId={"id"}
                    tableHeader="Late Orders Projections"
                    topRightOptions={getTopRightOptions()}
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

        {packConfigState.isOpen && (
          <PackConfigBottomSheet
            openPackConfigDetailSheet={packConfigState.isOpen}
            setOpenPackConfigDetailSheet={handlePackConfigClose}
            l1DisplayName="Master SKU ID"
            activeChildHierarchyKey={packConfigState.selectedArticle}
            screenName="reports_late_orders"
          />
        )}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.reportsLateOrdersService.selectedFilters,
    lateOrdersTableDataLoader:
      store.omsReducer.reportsLateOrdersService.lateOrdersTableDataLoader,
    lateOrdersTableConfigLoader:
      store.omsReducer.reportsLateOrdersService.lateOrdersTableConfigLoader,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setLateOrdersTableConfigLoader: (payload) =>
    dispatch(setLateOrdersTableConfigLoader(payload)),
  setLateOrdersTableDataLoader: (payload) =>
    dispatch(setLateOrdersTableDataLoader(payload)),
  getLateOrdersTableConfig: (payload) =>
    dispatch(getLateOrdersTableConfig(payload)),
  getLateOrdersTableData: (payload) =>
    dispatch(getLateOrdersTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LateOrdersProjections);
