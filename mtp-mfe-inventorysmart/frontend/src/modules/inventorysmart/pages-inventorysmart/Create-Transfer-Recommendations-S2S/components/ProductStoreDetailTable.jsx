import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import UpViewIcon from "assets/up_view.svg";
import Loader from "core/Utils/Loader/loader";
import { Chips, Select, useTranslation } from "impact-ui-v3";
import { isEmpty } from "lodash";
import {
  getProductView,
  getProductViewDrilldown,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { makeStyles } from "@mui/styles";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import { loadTableData } from "modules/inventorysmart/utils-inventorysmart/tableDataUtils";
import StoreCodeDetailDrawer from "./StoreCodeDetailDrawer";
import colours from "core/Styles/colours";
import DrillDownDetailsDrawer from "./DrillDownDetailsDrawer";
import useResizeGrandTotal from "../useResizeGrandTotal";
import { handleErrorMessage } from "../../inventorysmart-utility";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { commonTableContainerStyle } from "./commonStyles";
import {
  greenRedColorNumberRenderer,
  progressBarCellRenderer,
  mergeFiltersWithIntersection,
  resolveStoreCodeFromRow,
} from "./transferUnitsUtils";
import { tagCellRenderer } from "./TagCellRenderer";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  headerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "& span": {
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: "21px",
    },
    "& .header-title": {
      color: colours.lightNeutrals,
    },
    "& .sub-header-title": {
      color: colours.neutralGrey,
    },
    "& .sub-header-subtitle": {
      color: colours.boldHeadingBlue,
    },
    "& .header-separator": {
      height: "12px",
      width: "1px",
      backgroundColor: "#D9DDE7",
    },
  },
  linkContainer: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    "& .inv-btn-link": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "2px",
      cursor: "pointer",
      color: colours.brightRoyalBlue,
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      border: "none",
      background: "transparent",
      padding: 0,
      "& svg": {
        width: "16px",
        height: "16px",
      },
    },
  },
}));

const colorColumns = ["outbound_units", "inbound_units", "transfer_units"];

const ProductViewDetailTable = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();
  const { t } = useTranslation();
  const location = useLocation();
  const redirectFromQuery = new URLSearchParams(location.search).get("rd");

  const [isOpen, setIsOpen] = useState(false);
  const [storeDetailData, setStoreDetailData] = useState([]);
  const [storeDetailColumns, setStoreDetailColumns] = useState([]);
  const [drilldownData, setDrilldownData] = useState([]);
  const [drilldownColumns, setDrilldownColumns] = useState([]);
  const [selectedTable, setSelectedTable] = useState("store_view");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(
    props.groupByData.is_default
  );
  const [showStoreCodeDrawer, setShowStoreCodeDrawer] = useState(false);
  const [showDrillDownDrawer, setShowDrillDownDrawer] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null); // direct value or Object beacuse it drilldown we need all data;
  const [grandTotalRow, setGrandTotalRow] = useState({});

  useEffect(() => {
    setSelectedOptions(props.groupByData.is_default);
  }, [props.groupByData.is_default]);

  const addCellRenderer = (columns, actionMap) => {
    return columns.map((column) => {
      if (column.children && column.children.length > 0) {
        const nested = addCellRenderer(column.children, actionMap);
        column.children = nested;
        column.sub_headers = nested;
      }

      if (
        column.column_name === "store_code" ||
        (column.column_name === "region" &&
          selectedOptions.value !== "store") ||
        (column.column_name === "psa_name" && selectedOptions.value !== "store")
      ) {
        return {
          ...column,
          cellRendererSelector: (params) => {
            if (params.node.rowPinned === "top") {
              return {
                component: (params) => params.value || "",
              };
            }
            return {
              component: "agGroupCellRenderer",
              params: {
                suppressCount: true,
              },
            };
          },
        };
      }

      if (colorColumns.includes(column.column_name)) {
        return greenRedColorNumberRenderer(column);
      }
      const tagCol = tagCellRenderer(column);
      if (tagCol) return tagCol;
      return progressBarCellRenderer(column);
    });
  };

  const fetchStoreDetailData = async () => {
    try {
      setIsLoading(true);
      const payload = {
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
        allocation_code:
          props.allocationCode || props.selectedArticle?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        article: props.selectedArticle?.article,
        group_by: selectedOptions?.value,
      };
      const response = await props.getProductView(payload);

      if (response?.data?.status) {
        const tableDataRes = response.data.data.data || [];
        const key =
          selectedOptions.value === "store"
            ? "store_code"
            : selectedOptions.value;
        const tableData = transformToTreeData(tableDataRes, "child", key);

        const grandTotalData = response.data.data.grand_total || {};
        const columns = response.data.data.columns || [];
        const grandTotal = !isEmpty(grandTotalData)
          ? {
              ...grandTotalData,
              isGrandTotal: true,
              [key]: t("inventorysmart.grandTotal"),
            }
          : {};
        let updatedColumns = agGridColumnFormatter(columns, null, {});
        updatedColumns = addCellRenderer(updatedColumns, {});
        setStoreDetailColumns(updatedColumns);
        setStoreDetailData(tableData);
        setGrandTotalRow(grandTotal);
      } else {
        setStoreDetailData([]);
        setGrandTotalRow({});
        handleErrorMessage({ response: { data: response?.data } }, props);
      }
    } catch (err) {
      setStoreDetailData([]);
      setGrandTotalRow({});
      handleErrorMessage(err, props);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrilldownData = () => {
    loadTableData({
      tableName: props.isOrderBatching
        ? "store_transfer_ob_product_drilldown"
        : "store_transfer_review_product_drilldown",
      key: "source_store_code",
      apiFunction: props.getProductViewDrilldown,
      payload: {
        allocation_code:
          props.allocationCode || props.selectedArticle?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        article: props.selectedArticle?.article,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      },
      setColumns: setDrilldownColumns,
      setData: setDrilldownData,
      setLoading: setIsLoading,
      setGrandTotalRow: setGrandTotalRow,
      props,
      columnFormatter: (cols) => addCellRenderer(cols, {}),
    });
  };

  const handleCloseButtonClick = () => {
    props.setShowStoreDetail(false);
    props.setSelectedArticle(null);
    setStoreDetailData([]);
  };

  useEffect(() => {
    if (props.selectedArticle) {
      if (selectedTable === "store_view") {
        fetchStoreDetailData();
      } else if (selectedTable === "drilldown") {
        fetchDrilldownData();
      }
    }
  }, [
    props.selectedArticle,
    selectedOptions,
    selectedTable,
    props.createStoreTransferRecommFilterDependency,
    props.microFilterSelectedFilters,
  ]);

  useEffect(() => {
    if (props.refreshKey > 0 && props.selectedArticle) {
      if (selectedTable === "store_view") {
        fetchStoreDetailData();
      } else if (selectedTable === "drilldown") {
        fetchDrilldownData();
      }
    }
  }, [props.refreshKey]);

  const { containerRef, loadTableInstance } = useResizeGrandTotal({
    cssPropertyName: "--product-store-view-width",
  });

  const isStoreView = selectedTable === "store_view";

  const tableColumns = useMemo(() => {
    const viewActionColumn = {
      field: isStoreView ? "store_view" : "drilldown_view",
      headerName: "",
      is_frozen: true,
      pinned: "right",
      width: 93,
      maxWidth: 93,
      suppressMenu: true,
      resizable: false,
      headerClass: "inv-up-icon",
      cellRenderer: (params) => {
        // We have to show this view icon only for the store rows not for other rows that
        // why added this condition manually
        if (
          params.node.rowPinned !== "top" &&
          (selectedTable === "store_view"
            ? (params.node.level === 0 && selectedOptions.value === "store") ||
              (params.node.level === 1 &&
                selectedOptions.value === "psa_name") ||
              (params.node.level === 2 && selectedOptions.value === "region")
            : true)
        ) {
          return (
            <div className={classes.linkContainer}>
              <button
                className="inv-btn-link"
                onClick={() => {
                  const storeCode = resolveStoreCodeFromRow(params.data);
                  setSelectedStore({
                    ...params.data,
                    store_code: storeCode,
                  });
                  if (isStoreView) setShowStoreCodeDrawer(true);
                  else setShowDrillDownDrawer(true);
                }}
              >
                <span>{t("inventorysmart.view")}</span>
                <UpViewIcon />
              </button>
            </div>
          );
        }
        return null;
      },
    };

    return [
      ...(isStoreView ? storeDetailColumns : drilldownColumns),
      viewActionColumn,
    ];
  }, [isStoreView, storeDetailColumns, drilldownColumns]);

  return (
    <div className={`${commonStyles.commonContainer} `} ref={containerRef}>
      <Loader loader={isLoading} minHeight="351px">
        {!isLoading && (
          <AgGridComponent
            tableHeader={
              <span className={classes.headerContainer}>
                <span className="header-title">
                  {isStoreView
                    ? t("inventorysmart.storeView")
                    : t("inventorysmart.drilldownView")}
                </span>
                <span className="header-separator" />
                <span className="sub-header-title">
                  {t("inventorysmart.styleId")}
                </span>
                <span className="sub-header-subtitle">
                  {props.selectedArticle?.article}
                </span>
                <span className="header-separator" />
              </span>
            }
            columns={tableColumns}
            rowdata={isStoreView ? storeDetailData : drilldownData}
            pagination={false}
            getRowStyle={getRowStyleForGrandTotal}
            pinnedTopRowData={!isEmpty(grandTotalRow) ? [grandTotalRow] : []}
            loadTableInstance={loadTableInstance}
            uniqueRowId={isStoreView ? "index" : "key"}
            height="460px"
            showCustomNoRowOverlay={false}
            closeButton={true}
            treeData={isStoreView}
            getDataPath={isStoreView ? getTreeDataPath : undefined}
            groupDisplayType={isStoreView ? "custom" : undefined}
            handleCloseButtonClick={handleCloseButtonClick}
            hideChildSelection={true}
            hideMarginBottom={true}
            topLeftOptions={
              <>
                <Chips
                  isActive={selectedTable === "store_view"}
                  label={t("inventorysmart.storeView")}
                  onClick={() => setSelectedTable("store_view")}
                  type="single"
                />
                <Chips
                  isActive={selectedTable === "drilldown"}
                  label={t("inventorysmart.drilldown")}
                  onClick={() => setSelectedTable("drilldown")}
                  type="single"
                />
              </>
            }
            topRightOptions={
              isStoreView ? (
                <Select
                  label={t("inventorysmart.viewBy")}
                  labelOrientation="left"
                  isClearable={true}
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  currentOptions={props.groupByData?.data}
                  selectedOptions={selectedOptions}
                  isCloseWhenClickOutside={true}
                  handleChange={(option) => {
                    setSelectedOptions(option);
                  }}
                  setSelectedOptions={() => {}}
                  setCurrentOptions={() => {}}
                  width="200px"
                  minWidth="200px"
                />
              ) : undefined
            }
          />
        )}
      </Loader>
      {showStoreCodeDrawer && (
        <StoreCodeDetailDrawer
          open={showStoreCodeDrawer}
          selectedStore={selectedStore}
          selectedArticle={props.selectedArticle}
          allocationCode={props.allocationCode}
          isOrderBatching={props.isOrderBatching}
          onClose={() => {
            setShowStoreCodeDrawer(false);
            setSelectedStore(null);
          }}
        />
      )}
      {showDrillDownDrawer && (
        <DrillDownDetailsDrawer
          open={showDrillDownDrawer}
          selectedStore={selectedStore}
          selectedArticle={props.selectedArticle}
          allocationCode={props.allocationCode}
          isOrderBatching={props.isOrderBatching}
          onClose={() => {
            setShowDrillDownDrawer(false);
            setSelectedStore(null);
          }}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    storeViewLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.storeViewLoader,
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    microFilterSelectedFilters:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.microFilterSelectedFilters,
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductView: (payload) => dispatch(getProductView(payload)),
  getProductViewDrilldown: (payload) =>
    dispatch(getProductViewDrilldown(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductViewDetailTable);
