import React, {
  useEffect,
  useState,
  useRef,
} from "react";
import AgGridComponent from "core/Utils/agGrid";
import { Grid } from "@mui/material";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import {
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getStoreSizeLevelData,
  setPopUpTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/store-stock-drill-down-service";
import AgGrid from "core/Utils/agGrid";
import { makeStyles } from "@mui/styles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { BottomSheet, Tooltip, useTranslation } from "impact-ui-v3";
import { downloadSSD } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { getArticleSizeLevelData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/store-stock-drill-down-service";
import { GET_STORE_STOCK_DRILL_DOWN_ARTICLE_STORE_LEVEL_TABLE_DETAILS, GET_STORE_STOCK_DRILL_DOWN_BAND_LEVEL_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import InventoryDetailsPanel from "./components/InventoryDetailsPanel.jsx";
import { STORE_STOCK_DRILL_DOWN_MODULE } from "../CustomHooks/moduleConstants";
import { GET_STORE_STOCK_DRILL_DOWN_PRODUCT_VIEW_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import ReportingViewChips from "../ReportingViewChips";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const useStyles = makeStyles((theme) => ({
  tableName: {
    fontWeight: "bold",
    marginBottom: "20px",
    marginTop: "25px",
  },
  inventoryDetailsBtnContainer: {
    borderRadius: "8px",
    padding: "1px",
    background:
      "linear-gradient(136.31deg, #2AC2EE 12.23%, #6962EF 49.23%, #F26921 88.52%)",

    "& .inventory-details-btn": {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      background: "#FFF",
      transition: "all 0.3s ease",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      position: "relative",
      overflow: "hidden",
      animation: "$inventoryDetailsCycle 3s infinite",
      color: "#1F2B4D",

      "& svg": {
        width: 18,
        height: 18,
      },
      "&:hover": {
        color: "#FFF",
        backgroundSize: "200% 200%",
        background:
          "linear-gradient(-45deg, #2ac2aa, #6666ef, #f26922, #8863c0, #0f1937)",
        animation: "$gradientShift 5s ease-in-out infinite",
        "& path": {
          fill: "#FFF",
        },
      },
    },
  },
  disableInvDetails: {
    background: "none",
    border: "1px solid #d9dde7",
    "& .inventory-details-btn": {
      backgroundColor: "#f8f9fb",
      color: "#b4bac7",
      cursor: "not-allowed",
      animation: "none",
      "& path": {
        fill: "#b4bac7",
      },
      "&:hover": {
        color: "#b4bac7",
        background: "#d9dde7",
        animation: "none",
        "& path": {
          fill: "#b4bac7",
        },
      },
    },
  },
}));
const StockDrillDownTableView = (props) => {
  const { t } = useTranslation();
  const radioVal = props?.radioVal;
  const setRadioVal = props?.setRadioVal;
  const filterDependency = props?.filterDependency;
  const agGridInstance = useRef(null);
  const [colDef, setColDef] = useState([]);
  const columnsInitializedRef = useRef(false);
  const [showStoreSizeTable, setShowStoreSizeTable] = useState(false);
  const [storeSizeLevelColumns, setStoreSizeLevelColumns] = useState([]);
  const [storeSizeLevelData, setStoreSizeLevelData] = useState([]);
  const [storeSizeLevelHeader, setStoreSizeLevelHeader] = useState("");
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [
    inventoryDetailsPanelStatus,
    setInventoryDetailsPanelStatus,
  ] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const classes = useStyles();
  const pageSize = props.pageSize;

  const isHeatMapEnabled = props.moduleConfig?.[STORE_STOCK_DRILL_DOWN_MODULE]?.isHeatMapEnabled ?? false;
  const buttonGroupOptions = props?.buttonGroupOptions;
  const enableDownload =
        props.moduleConfig?.[STORE_STOCK_DRILL_DOWN_MODULE]?.enableDownload ?? false;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      props?.displaySnackMessages(errObj?.message, "error");
    else props?.displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const handleDownload = async (path) => {
    let body = {
      meta: {
        range: [],
        search: [],
        sort: [],
        limit: { limit: 100, page: 1 },
      },
      filters: isEmpty(filterDependency) ? [] : filterDependency,
    };

    try {
      let response = await props.downloadSSD(body, path);
      props?.displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };
  const handleClickAction = async (data, col_name, config) => {
    setStoreSizeLevelColumns([]);
    setStoreSizeLevelData([]);
    setStoreSizeLevelHeader("");
    const store_size_level_payload = {
      article: data.article || data.article_orig,
      store_code: data.store_code,
      type: col_name,
    };
    setShowStoreSizeTable(true);
    props.setPopUpTableLoader(true);
    let store_size_level_data;
    if (radioVal == "product_view" || radioVal == "ssd_product_view") {
      const {
        store_code,
        ...article_size_level_payload
      } = store_size_level_payload;
      store_size_level_data = await props.getArticleSizeLevelData(
        article_size_level_payload
      );
    } else {
      store_size_level_data = await props.getStoreSizeLevelData(
        store_size_level_payload
      );
    }
    const table_details = store_size_level_data?.data?.data;
    const { columns, data: store_size_table_data } = table_details;
    const processedData = (Array.isArray(store_size_table_data) ? store_size_table_data : []).map((row) =>
      Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [
          key,
          value === null || value === undefined || value === '' ? '-' : value,
        ])
      )
    );
    setStoreSizeLevelColumns(agGridColumnFormatter(columns));
    setStoreSizeLevelData(processedData);
    setStoreSizeLevelHeader(config.label);
    props.setPopUpTableLoader(false);
  };
  const getColumnActions = () => {
    const stockDrillDownActions = {
      oh: handleClickAction,
      oo: handleClickAction,
      it: handleClickAction,
      total_inv: handleClickAction,
      initial_oh: handleClickAction,
      rfid_delta: handleClickAction,
      epc_units: handleClickAction,
      store_reserve: handleClickAction,
      wip: handleClickAction,
      store_on_hand: handleClickAction,
      store_on_order: handleClickAction,
      store_in_transit: handleClickAction,
      total_store_inventory: handleClickAction,
      store_oh: handleClickAction,
      store_it: handleClickAction,
      store_oo: handleClickAction,
      store_oh_it_oo: handleClickAction,
      store_avail_oh: handleClickAction,
    };
    return stockDrillDownActions;
  };

  const fetchAndSetTableCol = async () => {
    let coldef = [];
    coldef = await getColumnsAg(
      `table_name=${props.table_name}`,
      null,
      getColumnActions()
    )();
    setColDef(coldef);
  };
  useEffect(() => {
    fetchAndSetTableCol();
  }, [radioVal]);

  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <div
        className={`${classes.inventoryDetailsBtnContainer} ${
          selectedArticleIds.length === 0 ? classes.disableInvDetails : ""
        }`}
      >
        <Tooltip
          title={
            selectedArticleIds.length === 0
              ? t("inventorysmart.pleaseSelectProductToProceed")
              : ""
          }
          disabled={selectedArticleIds.length > 0}
          variant="tertiary"
        >
          <div
            onClick={async () => {
              if (selectedArticleIds?.length > 0) {
                setInventoryDetailsPanelStatus(true);
              }
            }}
            className={`inventory-details-btn`}
          >
            <AiIcon />
            {t("inventorysmart.inventoryDetails")}
          </div>
        </Tooltip>
      </div>
    );

    return options;
  };

  const getTableHeader = () => {
    const storeLabel = dynamicLabelsBasedOnTenant("store", "core") || "Store";
    return `${storeLabel} Stock Drilldown - Table View`;
  };

  const getTopCenterOptions = () => {
    if (buttonGroupOptions) {
      return (
        <ReportingViewChips
          options={buttonGroupOptions}
          selectedOption={radioVal}
          onChange={props.handleChangeRadioVal}
        />
      );
    }
    return null;
  };

  const manualCallFetchList = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: pageSize || 10, page: pageIndex + 1 },
      },
      filters: isEmpty(filterDependency) ? [] : filterDependency,
    };
    try {
      let response = await props.getRowData(body);
      if (response?.data?.show_message) {
        props.setStockDrillDownTableLoader(false);
        props.displaySnackMessages(response?.data?.message, "success");
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        const data = response?.data?.data;
        let result = cloneDeep(data?.data);
        if (data?.columns && !columnsInitializedRef.current) {
          columnsInitializedRef.current = true;
          let formattedCols = agGridColumnFormatter(data?.columns, null, getColumnActions());
          setColDef(formattedCols);
        }
        props.setStockDrillDownTableLoader(false);
        return {
          data: result,
          totalCount: response.data.total,
        };
      }
    } catch (e) {
      props.setStockDrillDownTableLoader(false);
      handleErrorMessage(e);

      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedArticleIds(selections.map((selectedRow) => selectedRow.article));
    setSelectedRows(selections);
  };

  const isCommentFeatureEnabled = Boolean(
    props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
      ?.isCommentFeatureEnabled
  );

  ////To Do: should clean this render after backend api is optimised and simplified

  return (
    <>
      <Grid>
        {radioVal == "store" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={`${isCommentFeatureEnabled ? "article" : "key"}`}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={isHeatMapEnabled}
            hideHeaderCheckboxComponent={isHeatMapEnabled}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload()}
            enableCellComment={false}
            tableName={props.table_name}
            requestUrl={
              "inventory-smart/reporting/store-stock-drill-down/store-code-level"
            }
            appliedFilters={filterDependency}
            isChatEnabled={false} //cannot select row in store stock drill down
            {...(isHeatMapEnabled && {
              onSelectionChanged: onSelectionChanged,
              rowSelection: "multiple",
              topRightOptions: getTopRightOptions(),
            })}
          />
        )}
        {radioVal == "product_view" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={"key"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={false}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload()}
          />
        )}
        {radioVal == "store_band" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={"key"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={false}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload(GET_STORE_STOCK_DRILL_DOWN_BAND_LEVEL_TABLE_DETAILS)}
          />
        )}
        {radioVal == "product_store_view" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={"key"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={false}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() =>
              handleDownload(
                GET_STORE_STOCK_DRILL_DOWN_ARTICLE_STORE_LEVEL_TABLE_DETAILS
              )
            }
          />
        )}
        {radioVal == "ssd_product_store_view" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={"key"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={false}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() => handleDownload() }
          />
        )}
        {radioVal == "ssd_product_view" && (
          <AgGridComponent
            hideSelectAllRecords={true}
            uniqueRowId={"key"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={false}
            columns={colDef}
            cacheBlockSize={pageSize || 10}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallFetchList(body, pageIndex)
            }
            paginationPageSize={pageSize}
            tableHeader={getTableHeader()}
            topCenterOptions={getTopCenterOptions()}
            showDownloadButton={enableDownload}
            onDownloadButtonClick={() =>
              handleDownload(
                GET_STORE_STOCK_DRILL_DOWN_PRODUCT_VIEW_TABLE_DETAILS
              )
            }
          />
        )}
      </Grid>
      {inventoryDetailsPanelStatus && (
        <InventoryDetailsPanel
          inventoryDetailsPanelStatus={inventoryDetailsPanelStatus}
          setInventoryDetailsPanelStatus={setInventoryDetailsPanelStatus}
          radioVal={radioVal}
          filters={filterDependency}
          selectedRows={selectedRows}
        />
      )}
      <BottomSheet
        onClose={() => {
          setShowStoreSizeTable(false);
        }}
        className={classes.root}
        size={"medium"}
        aria-labelledby="customized-dialog-title"
        open={showStoreSizeTable}
        title={storeSizeLevelHeader}
      >
        <Loader loader={props.popUpTableLoader} minHeight={"450px"}>
          {storeSizeLevelColumns.length > 0 && (
            <AgGrid
              rowdata={storeSizeLevelData}
              columns={storeSizeLevelColumns}
              uniqueRowId={"store_code"}
              tableId={"table-wrapper-comp"}
              autoSizeColumnsFlag
              sizeColumnsToFitFlag
            />
          )}
        </Loader>
      </BottomSheet>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    moduleConfig:
      inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    popUpTableLoader:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .popUpTableLoader,
    pageSize:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getStoreSizeLevelData: (store_size_level_payload) =>
      dispatch(getStoreSizeLevelData(store_size_level_payload)),
    getArticleSizeLevelData: (article_size_level_payload) =>
      dispatch(getArticleSizeLevelData(article_size_level_payload)),
    setPopUpTableLoader: (payload) => dispatch(setPopUpTableLoader(payload)),
    downloadSSD: (body, path) => dispatch(downloadSSD(body, path)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StockDrillDownTableView);
