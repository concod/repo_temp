import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { isEmpty } from "lodash";
import { makeStyles } from "@mui/styles";
import { Chips, Select, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import ImageCellRenderer from "core/Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import Loader from "core/Utils/Loader/loader";
import UpViewIcon from "assets/up_view.svg";
import colours from "core/Styles/colours";
import {
  getStoreViewDetail,
  getStoreViewDrilldown,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import StyleColorDetailDrawer from "./StyleColorDetailDrawer";
import StoreDrilldownProductsDrawer from "./StoreDrilldownProductsDrawer";
import { commonTableContainerStyle } from "./commonStyles";
import {
  editModeGetLinkRenderer,
  getReviewStatusCellRenderer,
  progressBarCellRenderer,
  mergeFiltersWithIntersection,
} from "./transferUnitsUtils";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles(() => ({
  tableContainer: {
    "& .table-grouping-with-link-plus-icon": {
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
    },
  },
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

const valueLabelColumns = [
  "optimisation_level",
  "fulfillment_type",
  "target_inv_method",
  "transfer_strategy",
];

const DRILLDOWN_VIEW_OPTIONS = [
  { label: "Source", value: "source" },
  { label: "Destination", value: "destination" },
];

const DRILLDOWN_TABLE_NAME_MAP = {
  source: "store_transfer_review_store_view_drilldown_source",
  destination: "store_transfer_review_store_view_drilldown_dest",
};
const DRILLDOWN_TABLE_NAME_MAP_OB = {
  source: "store_transfer_ob_store_view_drilldown_source",
  destination: "store_transfer_ob_store_view_drilldown_dest",
};

const StoreProductViewTable = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectFromQuery = new URLSearchParams(location.search).get("rd");

  const [productViewData, setProductViewData] = useState([]);
  const [productViewColumns, setProductViewColumns] = useState([]);
  const [drilldownData, setDrilldownData] = useState([]);
  const [drilldownColumns, setDrilldownColumns] = useState([]);
  const [grandTotalRow, setGrandTotalRow] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState("products");
  const [selectedDrilldownView, setSelectedDrilldownView] = useState(
    DRILLDOWN_VIEW_OPTIONS[0]
  );
  const [isDrilldownViewOpen, setIsDrilldownViewOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showStyleColorDrawer, setShowStyleColorDrawer] = useState(false);
  const [selectedDrilldownStore, setSelectedDrilldownStore] = useState(null);
  const [
    showDrilldownProductsDrawer,
    setShowDrilldownProductsDrawer,
  ] = useState(false);

  const isProductsView = selectedTable === "products";
  const isDrilldownView = selectedTable === "drilldown";
  const storeCode = props.selectedStore?.store_code;

  const handleArticleClick = (data) => {
    setSelectedArticle(data);
    setShowStyleColorDrawer(true);
  };

  const handleDrilldownStoreClick = (data) => {
    setSelectedDrilldownStore(data);
    setShowDrilldownProductsDrawer(true);
  };

  const redirectToPlan = (data) => {
    navigate(
      `/inventory-smart/create-store-transfer?step=1&allocation_code=${data.plan_name}`
    );
  };

  const actionMap = {
    article: handleArticleClick,
    plan_name: redirectToPlan,
    store_code: handleDrilldownStoreClick,
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(
        "An error occurred. Please try again.",
        "error",
        props
      );
    }
  };

  const addCellRenderer = (columns, actionMap) => {
    return columns.map((column) => {
      if (column.children && column.children.length > 0) {
        const nestedChildren = addCellRenderer(column.sub_headers, actionMap);
        column.children = nestedChildren;
        column.sub_headers = nestedChildren;
      }

      if (valueLabelColumns.includes(column.column_name)) {
        return {
          ...column,
          valueGetter: (params) => {
            const columnName = column.column_name;
            const value = Array.isArray(params.data?.[columnName])
              ? params.data[columnName][0]?.label
              : params.data?.[columnName];
            return value;
          },
        };
      }

      if (column.column_name === "sizes") {
        return {
          ...column,
          cellRenderer: "agGroupCellRenderer",
          cellRendererParams: {
            suppressCount: true,
            innerRenderer: (params) => {
              if (params.data?._isParent) {
                return t("inventorysmart.viewSizes");
              }
              return params.value || "";
            },
          },
        };
      }

      if (column.column_name === "plan_name") {
        return editModeGetLinkRenderer({
          column,
          editMode: props.editMode,
          actionMap,
        });
      }

      if (column.type === "link") {
        return {
          ...column,
          cellRenderer: (params) => {
            const canRenderLink =
              params.node.rowPinned !== "top" &&
              (params.node.level === 0 || params.node.level == null);
            const hasValue =
              params.value != null &&
              params.value !== "" &&
              params.value !== "-";
            if (canRenderLink && hasValue) {
              return (
                <div className={classes.linkContainer}>
                  <button
                    className="inv-btn-link"
                    onClick={() => {
                      actionMap?.[column.column_name]?.(params.data);
                    }}
                  >
                    <span>{params.value}</span>
                    <UpViewIcon />
                  </button>
                </div>
              );
            }
            return params.value ?? null;
          },
        };
      }

      if (column.type === "image") {
        return {
          ...column,
          cellRenderer: (params) => {
            if (params.node.rowPinned !== "top") {
              return (
                ImageCellRenderer(params, true, true, column.tableConfig, []) ??
                null
              );
            }
            return params.value ?? null;
          },
        };
      }

      if (column.column_name === "review_status") {
        return getReviewStatusCellRenderer(column);
      }

      return progressBarCellRenderer(column);
    });
  };

  const fetchTableColumns = async (tableName, actionMap = null) => {
    const columns = await getColumnsAg(`table_name=${tableName}`)();
    if (columns && columns.length > 0) {
      let formattedColumns = agGridColumnFormatter(columns, null, actionMap);
      formattedColumns = addCellRenderer(formattedColumns, actionMap);
      return formattedColumns;
    }
    return [];
  };

  const fetchProductViewColumns = async () => {
    try {
      const tableName = props.isOrderBatching
        ? "store_transfer_ob_store_view_detail"
        : "store_transfer_review_store_view_detail";
      const formattedColumns = await fetchTableColumns(tableName, actionMap);
      setProductViewColumns(formattedColumns);
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const fetchProductViewData = async () => {
    try {
      setIsLoading(true);

      await fetchProductViewColumns();

      const payload = {
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : {
              allocation_code:
                props.allocationCode ||
                props.selectedArticle?.allocation_code ||
                props.selectedStore?.allocation_code,
              ...(props.planStatus === "Finalized" &&
              REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
                ? { plan_status: props.planStatus }
                : {}),
            }),
        store_code: storeCode,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      };

      const response = await props.getStoreViewDetail(payload);

      if (response?.data?.status) {
        const tableData = response.data.data.data || [];
        const grandTotalData = response.data.data.grand_total || {};
        const grandTotal = !isEmpty(grandTotalData)
          ? {
              ...grandTotalData,
              isGrandTotal: true,
              product_image_link: t("inventorysmart.grandTotal"),
            }
          : {};
        const updatedData = transformToTreeData(tableData, "child", "article");
        setProductViewData(updatedData);
        setGrandTotalRow(grandTotal);
      } else {
        setProductViewData([]);
        setGrandTotalRow({});
        displaySnackMessages(
          response?.data?.message || "Failed to load product view",
          "error",
          props
        );
      }
    } catch (error) {
      setProductViewData([]);
      setGrandTotalRow({});
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrilldownData = async () => {
    try {
      setIsLoading(true);
      setDrilldownData([]);
      setGrandTotalRow({});

      const viewType = selectedDrilldownView?.value || "source";
      const tableName = props.isOrderBatching
        ? DRILLDOWN_TABLE_NAME_MAP_OB[viewType]
        : DRILLDOWN_TABLE_NAME_MAP[viewType];

      const formattedColumns = await fetchTableColumns(tableName, actionMap);
      setDrilldownColumns(formattedColumns);

      const payload = {
        allocation_code:
          props.allocationCode ||
          props.selectedArticle?.allocation_code ||
          props.selectedStore?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        store_code: storeCode,
        mode: selectedDrilldownView?.label,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      };

      const response = await props.getStoreViewDrilldown(payload);

      if (response?.data?.status) {
        const tableData = response.data.data.data || [];
        const grandTotalData = response.data.data.grand_total || {};
        const grandTotal = !isEmpty(grandTotalData)
          ? {
              ...grandTotalData,
              isGrandTotal: true,
              store_code: t("inventorysmart.grandTotal"),
            }
          : {};
        setDrilldownData(tableData);
        setGrandTotalRow(grandTotal);
      } else {
        setDrilldownData([]);
        setGrandTotalRow({});
        displaySnackMessages(
          response?.data?.message || "Failed to load drilldown view",
          "error",
          props
        );
      }
    } catch (error) {
      setDrilldownData([]);
      setGrandTotalRow({});
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseButtonClick = () => {
    props.setShowProductView(false);
    props.setSelectedStore(null);
    setProductViewData([]);
    setDrilldownData([]);
    setGrandTotalRow({});
    setSelectedTable("products");
    setSelectedDrilldownView(DRILLDOWN_VIEW_OPTIONS[0]);
    setShowStyleColorDrawer(false);
    setSelectedArticle(null);
    setShowDrilldownProductsDrawer(false);
    setSelectedDrilldownStore(null);
  };

  const handleDrilldownViewChange = (option) => {
    setSelectedDrilldownView(option || DRILLDOWN_VIEW_OPTIONS[0]);
  };

  useEffect(() => {
    if (!props.selectedStore) return;

    if (isProductsView) {
      fetchProductViewData();
    } else if (isDrilldownView) {
      fetchDrilldownData();
    }
  }, [
    props.selectedStore,
    selectedTable,
    selectedDrilldownView,
    props.createStoreTransferRecommFilterDependency,
    props.microFilterSelectedFilters,
  ]);

  useEffect(() => {
    if (props.refreshKey > 0 && props.selectedStore) {
      if (isProductsView) {
        fetchProductViewData();
      } else if (isDrilldownView) {
        fetchDrilldownData();
      }
    }
  }, [props.refreshKey]);

  useEffect(() => {
    const updatedColumns = addCellRenderer(
      isProductsView ? productViewColumns : drilldownColumns,
      actionMap
    );
    if (isProductsView) {
      setProductViewColumns(updatedColumns);
    } else {
      setDrilldownColumns(updatedColumns);
    }
  }, [props.editMode]);

  const renderTableHeader = () => (
    <span className={classes.headerContainer}>
      <span className="header-title">
        {isProductsView
          ? t("inventorysmart.styleView")
          : t("inventorysmart.drilldownView")}
      </span>
      <span className="header-separator" />
      <span className="sub-header-title">
        {t("inventorysmart.s2sStoreID")}:{" "}
      </span>
      <span className="sub-header-subtitle">{storeCode || ""}</span>
      <span className="header-separator" />
    </span>
  );

  const renderTopLeftOptions = () => (
    <>
      <Chips
        isActive={selectedTable === "products"}
        label={t("inventorysmart.products")}
        onClick={() => setSelectedTable("products")}
        type="single"
      />
      <Chips
        isActive={selectedTable === "drilldown"}
        label={t("inventorysmart.drilldown")}
        onClick={() => setSelectedTable("drilldown")}
        type="single"
      />
    </>
  );

  const renderTopRightOptions = () => {
    if (!isDrilldownView) return null;

    return (
      <Select
        label={t("inventorysmart.viewBy")}
        labelOrientation="left"
        isClearable={true}
        isOpen={isDrilldownViewOpen}
        setIsOpen={setIsDrilldownViewOpen}
        currentOptions={DRILLDOWN_VIEW_OPTIONS}
        selectedOptions={selectedDrilldownView}
        initialOptions={DRILLDOWN_VIEW_OPTIONS}
        handleChange={handleDrilldownViewChange}
        setSelectedOptions={() => {}}
        setCurrentOptions={() => {}}
        width="200px"
        minWidth="200px"
      />
    );
  };

  return (
    <div
      className={`${classes.tableContainer} ${commonStyles.commonContainer}`}
    >
      <Loader loader={isLoading} minHeight="404px">
        {!isLoading && (
          <AgGridComponent
            key={`${selectedTable}-${selectedDrilldownView?.value || ""}`}
            tableHeader={renderTableHeader()}
            columns={isProductsView ? productViewColumns : drilldownColumns}
            rowdata={isProductsView ? productViewData : drilldownData}
            pinnedTopRowData={!isEmpty(grandTotalRow) ? [grandTotalRow] : []}
            getRowStyle={getRowStyleForGrandTotal}
            pagination={false}
            height="460px"
            adjustTableHeight={true}
            showCustomNoRowOverlay={false}
            uniqueRowId={isProductsView ? "index" : "key"}
            treeData={isProductsView}
            getDataPath={isProductsView ? getTreeDataPath : undefined}
            groupDisplayType={isProductsView ? "custom" : undefined}
            hideChildSelection={true}
            closeButton={true}
            handleCloseButtonClick={handleCloseButtonClick}
            topLeftOptions={renderTopLeftOptions()}
            topRightOptions={renderTopRightOptions()}
            hideMarginBottom={true}
          />
        )}
      </Loader>
      {showStyleColorDrawer && (
        <StyleColorDetailDrawer
          open={showStyleColorDrawer}
          selectedArticle={selectedArticle}
          selectedStore={props.selectedStore}
          allocationCode={props.allocationCode}
          isOrderBatching={props.isOrderBatching}
          onClose={() => {
            setShowStyleColorDrawer(false);
            setSelectedArticle(null);
          }}
        />
      )}
      {showDrilldownProductsDrawer && (
        <StoreDrilldownProductsDrawer
          open={showDrilldownProductsDrawer}
          selectedStore={props.selectedStore}
          selectedDrilldownStore={selectedDrilldownStore}
          mode={selectedDrilldownView?.label}
          allocationCode={props.allocationCode}
          isOrderBatching={props.isOrderBatching}
          onClose={() => {
            setShowDrilldownProductsDrawer(false);
            setSelectedDrilldownStore(null);
          }}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
    editMode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.editMode,
    microFilterSelectedFilters:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.microFilterSelectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreViewDetail: (payload) => dispatch(getStoreViewDetail(payload)),
  getStoreViewDrilldown: (payload) => dispatch(getStoreViewDrilldown(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreProductViewTable);
