import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { makeStyles } from "@mui/styles";
import { isEmpty, groupBy } from "lodash";
import { Button, useTranslation, Menu } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import DownloadIcon from "coreAssets/IA_DOWNLOAD.svg";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import {
  setStoreViewLoader,
  getProductViewSummary,
  resetTransferUnits,
  exportProductView,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import ProductStoreDetailTable from "./ProductStoreDetailTable";
import useResizeGrandTotal from "../useResizeGrandTotal";
import ImageCellRenderer from "core/Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import { commonTableContainerStyle } from "./commonStyles";
import {
  editModeGetLinkRenderer,
  getReviewStatusCellRenderer,
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
}));

const valueLabelColumns = [
  "optimisation_level",
  "fulfillment_type",
  "target_inv_method",
  "transfer_strategy",
  "transfer_rule",
];

const ProductViewTable = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tableInstance = useRef(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectFromQuery = searchParams.get("rd");
  const allocationCodeFromQuery = searchParams.get("allocation_code");

  const [productViewData, setProductViewData] = useState([]);
  const [productViewColumns, setProductViewColumns] = useState([]);
  const [showStoreDetail, setShowStoreDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [groupByData, setGroupByData] = useState({});
  const [grandTotalRow, setGrandTotalRow] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [applyLoading, setApplyLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

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

  const toggleStoreDetailTable = (data) => {
    setSelectedArticle(data);
    setShowStoreDetail(true);
  };

  const redirectToPlan = (data) => {
    navigate(
      `/inventory-smart/create-store-transfer?step=1&allocation_code=${data.plan_name}`
    );
  };

  const {
    containerRef,
    loadTableInstance: loadTableInstanceResizer,
  } = useResizeGrandTotal({
    cssPropertyName: "--product-view-width",
  });

  const loadTableInstance = (params) => {
    tableInstance.current = params;
    loadTableInstanceResizer(params);
  };

  useEffect(() => {
    const onRowGroupOpened = () => {
      setShowStoreDetail(false);
      setSelectedArticle(null);
    };
    const api = tableInstance.current?.api;
    if (api) {
      api.addEventListener("rowGroupOpened", onRowGroupOpened);
      return () => {
        api.removeEventListener("rowGroupOpened", onRowGroupOpened);
      };
    }
  }, [tableInstance.current]);

  useEffect(() => {
    if (tableInstance.current && tableInstance.current.api) {
      // to close the Row Grouping when The nested Table is opened
      if (showStoreDetail) {
        tableInstance.current.api.collapseAll();
      }
    }
  }, [showStoreDetail]);

  const addCellRenderer = (columns, actionMap) => {
    return columns.map((column) => {
      if (column.children && column.children.length > 0) {
        column.children = addCellRenderer(column.children, actionMap);
        column.sub_headers = addCellRenderer(column.sub_headers, actionMap);
      }

      if (valueLabelColumns.includes(column.column_name)) {
        return {
          ...column,
          valueGetter: (params) => {
            const columnName = column.column_name;
            const value = Array.isArray(params.data[columnName])
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

      if (column.column_name === "article") {
        return {
          ...column,
          cellRenderer: (params, extraProps) => {
            if (params.node.level === 0 && params.node.rowPinned !== "top") {
              return (
                <CellRenderer
                  cellData={params}
                  column={column}
                  extraProps={extraProps}
                  actions={actionMap}
                />
              );
            } else {
              return params.value;
            }
          },
        };
      }
      if (column.column_name === "review_status") {
        return getReviewStatusCellRenderer(column);
      }
      if (column.type === "image") {
        return {
          ...column,
          cellRenderer: (params) => {
            if (params.node.rowPinned !== "top") {
              return ImageCellRenderer(
                params,
                true,
                true,
                column.tableConfig,
                []
              );
            }
            return params.value;
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
      return column;
    });
  };

  const actionMap = {
    article: toggleStoreDetailTable,
    plan_name: redirectToPlan,
  };

  const fetchProductViewColumns = async () => {
    try {
      const tableName = props.isOrderBatching
        ? "store_transfer_ob_product"
        : "store_transfer_product_summary";
      const columns = await getColumnsAg(`table_name=${tableName}`)();

      if (columns && columns.length > 0) {
        let formattedColumns = agGridColumnFormatter(columns, null, actionMap);
        formattedColumns = addCellRenderer(formattedColumns, actionMap);
        setProductViewColumns(formattedColumns);
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const fetchProductViewData = async () => {
    try {
      props.setStoreViewLoader(true);
      setIsLoading(true);

      setProductViewData([]);
      await fetchProductViewColumns();

      const payload = {
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
        ...(props.isOrderBatching
          ? {
              screen: "order_batching",
              ...(allocationCodeFromQuery
                ? { allocation_code: allocationCodeFromQuery }
                : {}),
            }
          : {
              allocation_code: props.allocationCode,
              ...(props.planStatus === "Finalized" &&
              REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
                ? { plan_status: props.planStatus }
                : {}),
            }),
      };

      const response = await props.getProductViewSummary(payload);

      if (response?.data?.status) {
        const data = response.data.data.data || [];
        const grandTotalData = response.data.data.grand_total || {};
        const grandTotal = !isEmpty(grandTotalData)
          ? { ...grandTotalData, product_image_link: "Grand Total" }
          : {};
        setGrandTotalRow(grandTotal);
        const updatedData = transformToTreeData(data, "child", "article");
        setProductViewData(updatedData);
        setGroupByData(response.data.data.group_by || {});
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
      props.setStoreViewLoader(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const updatedColumns = addCellRenderer(productViewColumns, actionMap);
    setProductViewColumns(updatedColumns);
  }, [props.editMode]);

  useEffect(() => {
    const filters = props.isOrderBatching
      ? props.s2sFilterDependency
      : props.createStoreTransferRecommFilterDependency;
    const shouldFetch = props.isOrderBatching
      ? !isEmpty(filters)
      : props.allocationCode && !isEmpty(filters);
    if (shouldFetch) {
      fetchProductViewData();
      setShowStoreDetail(false);
      setSelectedArticle(null);
    }
  }, [
    props.allocationCode,
    props.createStoreTransferRecommFilterDependency,
    props.s2sFilterDependency,
    props.microFilterSelectedFilters,
  ]);

  useEffect(() => {
    if (
      props.refreshKey > 0 &&
      (props.allocationCode || props.isOrderBatching)
    ) {
      fetchProductViewData();
    }
  }, [props.refreshKey]);

  const onRowSelected = () => {
    const api = tableInstance.current?.api;
    if (!api) return;
    const rows = api.getSelectedRows();
    const parentRows = rows.filter((row) => row._isParent);
    const articles = parentRows.map((row) => row.article);
    setSelectedArticles(articles);
    setSelectedRows(parentRows);
    if (props.onSelectionChange) {
      props.onSelectionChange(articles, parentRows);
    }
  };

  const handleApprove = async () => {
    setApplyLoading(true);
    try {
      const grouped = groupBy(selectedRows, "allocation_code");
      const plans = Object.entries(grouped).map(([code, rows]) => ({
        allocation_code: code,
        articles: rows.map((row) => row.article),
      }));
      await props.handleCreateTransfer(plans);
    } finally {
      setApplyLoading(false);
      tableInstance.current?.api?.deselectAll();
    }
  };

  const handleDiscard = () => {
    setSelectedArticles([]);
    setSelectedRows([]);
    tableInstance.current?.api?.deselectAll();
    if (props.onSelectionChange) {
      props.onSelectionChange([], []);
    }
  };

  const handleResetTransfers = async () => {
    try {
      const payload = {
        ...(props.isOrderBatching
          ? { screen: "order_batching", filters: props.s2sFilterDependency }
          : { allocation_code: props.allocationCode }),
        articles: selectedArticles,
      };
      const response = await props.resetTransferUnits(payload);
      if (response?.data?.status) {
        displaySnackMessages(
          response?.data?.message || "Transfers reset successfully",
          "success",
          props
        );
        fetchProductViewData();
        setSelectedArticles([]);
        tableInstance.current.api.deselectAll();
      } else {
        displaySnackMessages(
          response?.data?.message || "Failed to reset transfers",
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const handleExport = async (type) => {
    let payload = {
      ...(props.planStatus === "Finalized" &&
      REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
        ? { plan_status: props.planStatus }
        : {}),
      ...(props.isOrderBatching
        ? {
            screen: "order_batching",
          }
        : {}),
      allocation_code: "",
    };
    if (type === "download_all") {
      payload.allocation_code = props.allocationCode;
    } else {
      payload.allocation_code = props.allocationCode;
      payload.articles = selectedArticles;
    }
    try {
      const response = await props.exportProductView(payload);
      if (response?.data?.data?.message) {
        displaySnackMessages(
          "Request received. We’ll let you know through the notification panel once it’s ready.",
          "success",
          props
        );
      }
    } catch (err) {
      handleErrorMessage(err);
    } finally {
      setAnchorEl(null);
    }
  };

  return (
    <div className={commonStyles.commonContainer}>
      <div className={classes.tableContainer} ref={containerRef}>
        <Loader loader={isLoading} minHeight="383px">
          <AgGridComponent
            tableHeader={t("inventorysmart.productView")}
            columns={productViewColumns}
            rowdata={productViewData}
            pagination={false}
            loadTableInstance={loadTableInstance}
            uniqueRowId="index"
            treeData={true}
            getDataPath={getTreeDataPath}
            groupDisplayType="custom"
            height="460px"
            adjustTableHeight={true}
            showCustomNoRowOverlay={false}
            getRowStyle={getRowStyleForGrandTotal}
            pinnedTopRowData={!isEmpty(grandTotalRow) ? [grandTotalRow] : []}
            hideChildSelection={true}
            selectAllHeaderComponent={
              !(
                props.planStatus === "Finalized" &&
                REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
              )
            }
            onRowSelected={onRowSelected}
            topRightOptions={
              <>
                {selectedArticles.length > 0 && !props.isOrderBatching ? (
                  <Button onClick={handleResetTransfers} variant="text">
                    {t("inventorysmart.resetTransfers")} (
                    {selectedArticles.length})
                  </Button>
                ) : null}
                {props.isOrderBatching && selectedArticles.length > 0 && (
                  <>
                    <Button onClick={handleDiscard} variant="secondary">
                      Discard
                    </Button>
                    <Button onClick={handleApprove} loading={applyLoading}>
                      Approve
                    </Button>
                  </>
                )}
                <Button
                  icon={<DownloadIcon />}
                  iconPlacement="left"
                  variant="text"
                  onClick={(event) => {
                    if (selectedArticles.length) {
                      setAnchorEl(event.currentTarget);
                    } else {
                      handleExport("download_all");
                    }
                  }}
                />
              </>
            }
            hideMarginBottom={true}
            nestedTable={showStoreDetail}
            nestedTableComponent={
              <ProductStoreDetailTable
                allocationCode={props.allocationCode}
                selectedArticle={selectedArticle}
                setShowStoreDetail={setShowStoreDetail}
                setSelectedArticle={setSelectedArticle}
                groupByData={groupByData}
                isOrderBatching={props.isOrderBatching}
              />
            }
          />
        </Loader>
      </div>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        options={[
          {
            label: "Download Selected Rows",
            value: "download_selected",
            onClick: () => handleExport("download_selected"),
          },
          {
            label: "Download All Rows",
            value: "download_all",
            onClick: () => handleExport("download_all"),
          },
        ]}
      />
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
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
    microFilterSelectedFilters:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.microFilterSelectedFilters,
    editMode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.editMode,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getProductViewSummary: (payload) => dispatch(getProductViewSummary(payload)),
  resetTransferUnits: (payload) => dispatch(resetTransferUnits(payload)),
  exportProductView: (payload) => dispatch(exportProductView(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductViewTable);
