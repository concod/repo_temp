import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Button, Tooltip, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  getProductView,
  setProductViewLoader,
  applyEditChanges,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import { downloadMasterProductStoreSizeView } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  setFetchProductDetails,
  setFetchProductStoreDetails,
  setSelectedArticle as setNewFlowSelectedArticle,
  setSelectedArticles,
  setDisplayArticle as setNewFlowDisplayArticle,
  refreshProductViews,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { CREATE_SCENARIO } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { getIgnoreAllocationCode, getScenarioStyleIds } from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useRefreshSignal from "../../utils/useRefreshSignal";
import { cloneDeep, isEmpty } from "lodash";
import makeStyles from "@mui/styles/makeStyles";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import AiSmartFilterButton from "../../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_CNA_PRODUCT_VIEW } from "../../../Decision-Dashboard/components/aiSmartFilterDummyConstants";
import ProductExpansionPanel from "./ProductExpansionPanel";
import DCBreakdownBottomSheet from "./DCBreakdownBottomSheet";
import SetAllProductDetailsView from "./SetAllProductDetailsView";
import {
  PRODUCT_ALLOC_QTY_GROUP,
  PRODUCT_NET_AVAILABLE_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_PRODUCT_DETAILS,
} from "../constants/allocationEditConstants";
import {
  capValueAtAvailable,
  buildApplyEnvelope,
  notifyApplyResult,
} from "../utils/allocationEditUtils";
import {
  collectEditableAllocLeaves,
  setAllocLeafEditability,
  buildProductDetailsAllocationUpdates,
  buildProductDetailsSetAllDcConfigs,
} from "../utils/productDetailsEditUtils";

const useNestedSlotStyles = makeStyles(() => ({
  nestedSlot: {
    "& .nested-table-container": {
      overflow: "visible",
    },
    "& .impact-table-main-container.card-container": {
      overflow: "visible",
    },
  },
}));

const ProductDetailsTable = (props) => {
  const { isEditMode = false, sessionId } = props;
  const globalClasses = globalStyles();
  const nestedSlotClasses = useNestedSlotStyles();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [displayArticle, setDisplayArticle] = useState(null);
  const [viewExpansion, setViewExpansion] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [breakdownDcName, setBreakdownDcName] = useState(null);
  const [breakdownTableConfig, setBreakdownTableConfig] = useState(null);
  const [breakdownTableData, setBreakdownTableData] = useState(null);
  const tableInstance = useRef(null);
  const actionMapRef = useRef({});

  // Snapshots of the original API response for reset / comparison
  const originalColumnsRef = useRef([]);
  const originalRowsRef = useRef([]);
  const dcOptionsRef = useRef([]);
  const [editableAllocLeaves, setEditableAllocLeaves] = useState([]);

  // Row selection
  const [selectedRows, setSelectedRows] = useState([]);

  // Product-level edit state
  const [productEditActive, setProductEditActive] = useState(false);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const updatedRowEditsRef = useRef([]);
  // Child (store/size) Cancel/Apply locks Edit by Product until resolved
  const [childEditActive, setChildEditActive] = useState(false);

  // Set All modal
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [setAllLoading, setSetAllLoading] = useState(false);

  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const aiChips = useAiSmartFilterChips();
  const showMasterSkuStoreDownload =
    props?.finalizeAllocationConfig?.showMasterSkuStoreDownload;

  const displaySnackMessages = (message, variant) => {
    props.addSnack({ message, options: { variant, disableOnClose: true } });
  };

  const handleArticleClick = useCallback(
    (data) => {
      const article = data?.article || null;
      const display = data?.display_article || data?.article || null;

      // Product dirty state is grid-scoped, not article-scoped. Child
      // views remount on article change and stay view-only via productEditActive.
      setShowSetAllModal(false);

      props.setFetchProductStoreDetails(null);
      props.setNewFlowSelectedArticle(article);
      props.setNewFlowDisplayArticle(display);
      setSelectedArticle(article);
      setDisplayArticle(display);
      setViewExpansion(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.setFetchProductStoreDetails, props.setNewFlowSelectedArticle, props.setNewFlowDisplayArticle]
  );

  const onSelectionChanged = useCallback((event) => {
    const selected = event?.api?.getSelectedRows() || [];
    setSelectedRows(selected);
    props.setSelectedArticles(selected.map((row) => row.article));
  }, []);

  actionMapRef.current = useMemo(
    () => ({
      article: handleArticleClick,
      display_article: handleArticleClick,
    }),
    [handleArticleClick]
  );

  const fetchProductData = async ({ resetSelection } = {}) => {
    try {
      props.setProductViewLoader(true);
      const payload = {
        allocation_code: props.allocationCode,
        article: props.articles || [],
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType,
      };
      const res = await props.getProductView(
        payload,
        props.isV3?.includes("productDetails")
      );
      if (res?.data?.status) {
        const resData = res.data.data;

        // Snapshot dc_dict for Set All / save payloads later
        dcOptionsRef.current = resData.dc_dict || [];

        const formattedCols = agGridColumnFormatter(
          resData.table_config || [],
          null,
          actionMapRef.current
        );
        applyAbsentKeyHyphen(formattedCols);
        applyBadgeColumns(formattedCols);

        // Disable all editable columns and collect only packs/eaches leaves
        const { editableLeaves } = collectEditableAllocLeaves(
          formattedCols,
          dcOptionsRef.current
        );
        setEditableAllocLeaves(editableLeaves);

        // If product edit is active during refetch, re-enable packs/eaches
        if (isEditMode && productEditActive && editableLeaves.length > 0) {
          const editableKeys = editableLeaves.map((c) => c.column_name);
          setAllocLeafEditability(formattedCols, editableKeys, true);
        }

        // Keep deep copies for reset / diff (snapshot taken after editability is applied)
        originalColumnsRef.current = cloneDeep(formattedCols);
        originalRowsRef.current = cloneDeep(resData.table_data || []);

        setColumns(formattedCols);
        setRows(resData.table_data || []);
        if (resetSelection) {
          setSelectedRows([]);
          props.setSelectedArticles(null);
          tableInstance.current?.api?.deselectAll();
        }
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      props.setProductViewLoader(false);
    }
  };

  useEffect(() => {
    if (
      props.allocationCode &&
      props.planType &&
      props.fetchProductDetails === null
    ) {
      fetchProductData();
    }
    // Intentionally narrow: matches ArticleSummaryTable / ProductDetailsTable orchestration pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planType, props.fetchProductDetails]);

  useEffect(() => {
    if (props.fetchProductDetails) {
      fetchProductData()
        .then(() => {
          props.setFetchProductDetails(false);
          props.setFetchProductStoreDetails(true);
        })
        .catch(() => {
          props.setFetchProductDetails(false);
          props.setFetchProductStoreDetails(true);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fetchProductDetails]);

  useRefreshSignal(props.productViewRefreshToken, () =>
    fetchProductData({ resetSelection: true })
  );

  // Toggle editable leaves when the page switches between view ↔ edit
  useEffect(() => {
    if (columns.length === 0 || editableAllocLeaves.length === 0) return;

    const editableKeys = editableAllocLeaves.map((c) => c.column_name);
    setAllocLeafEditability(columns, editableKeys, isEditMode && productEditActive);
    setColumns([...columns]);
    tableInstance.current?.api?.refreshCells({ force: true });
  }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit product edit when page switches back to view mode
  useEffect(() => {
    if (!isEditMode && productEditActive) {
      handleCancelProductEdit();
    }
  }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the ref in sync with state
  useEffect(() => {
    updatedRowEditsRef.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  // ── Product-level edit: activate / cancel ──

  const activateProductEdit = () => {
    setProductEditActive(true);
    const editableKeys = editableAllocLeaves.map((c) => c.column_name);
    setAllocLeafEditability(columns, editableKeys, true);
    setColumns([...columns]);
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  const handleCancelProductEdit = () => {
    setProductEditActive(false);
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
    setSelectedRows([]);
    props.setSelectedArticles(null);
    tableInstance.current?.api?.deselectAll();
    // Restore original row data without an API call
    setRows(cloneDeep(originalRowsRef.current));
    // Disable editable leaves
    const editableKeys = editableAllocLeaves.map((c) => c.column_name);
    setAllocLeafEditability(columns, editableKeys, false);
    setColumns([...columns]);
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  // ── Dirty-row tracking ──

  const updateEditedRowState = (rowData) => {
    const cloned = cloneDeep(updatedRowEditsRef.current);
    const idx = cloned.findIndex((r) => r.article === rowData.article);
    if (idx !== -1) {
      cloned[idx] = rowData;
    } else {
      cloned.push(rowData);
    }
    setUpdatedRowEdits(cloned);
  };

  // ── Cell edit handlers ──

  /**
   * Cap `value` at original_allocated + net_available for this DC/unit combo.
   * Returns { capped: boolean, finalValue: number }.
   */
  const capAtAvailable = (colId, rowArticle, value) => {
    const originalRow = originalRowsRef.current.find(
      (r) => r.article === rowArticle
    );
    return capValueAtAvailable({
      value,
      originalRow,
      columnId: colId,
      allocGroup: PRODUCT_ALLOC_QTY_GROUP,
      availableGroup: PRODUCT_NET_AVAILABLE_GROUP,
    });
  };

  // onCellValueChanged fires after onBlur has already capped and validated the value.
  // Dirty-row tracking is handled inside onBlur; nothing extra needed here.
  const onCellValueChanged = () => {};

  const onBlur = (e, data, column, isChanged, value) => {
    const isAllocationColumn =
      column.colId.includes("_eaches") || column.colId.includes("_packs");

    if (isAllocationColumn && isChanged) {
      // data[colId] already holds the freshly-typed value (committed by the
      // wrapper's handleInputChange before blur). The 5th `value` arg is the
      // previous render value, so it lags one edit behind — do not use it.
      const numValue = Number(data[column.colId] ?? 0);
      const { capped, finalValue } = capAtAvailable(
        column.colId,
        data.article,
        numValue
      );

      if (capped) {
        displaySnackMessages(CAPPED_WARNING_MSG, "warning");
      }

      data[column.colId] = finalValue;

      const originalAlloc = originalRowsRef.current.find(
        (r) => r.article === data.article
      )?.[column.colId];
      if (finalValue !== originalAlloc) {
        updateEditedRowState(data);
      }

      const rowNode = tableInstance.current?.api?.getRowNode(data.article);
      if (rowNode) {
        tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
      }
    }
  };

  // ── Build save payload for product_details view ──

  const buildAllocationUpdates = () =>
    buildProductDetailsAllocationUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      editableAllocLeaves
    );

  // ── Apply edited changes via API ──

  const handleApplyProductEdit = async () => {
    const allocationUpdates = buildAllocationUpdates();
    if (allocationUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      props.setProductViewLoader(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_PRODUCT_DETAILS,
        allocationUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setProductEditActive(false);
        setUpdatedRowEdits([]);
        updatedRowEditsRef.current = [];
        // Server recalculates totals across every grain, so refresh the whole
        // product view — summary, this grid, DC KPI and the open breakdown.
        // The refetch owns the loader from here; clearing it now would uncover
        // the stale rows until the new data lands.
        props.refreshProductViews();
        return;
      }
      displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
      props.setProductViewLoader(false);
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      props.setProductViewLoader(false);
    }
  };

  // ── Set All: build dcConfigs from selected rows ──

  const buildSetAllDcConfigs = () =>
    buildProductDetailsSetAllDcConfigs(
      selectedRows,
      originalRowsRef.current,
      editableAllocLeaves
    );

  const handleSetAllApply = async (packLevelUpdates) => {
    if (packLevelUpdates.length === 0) return;

    const allocationUpdates = selectedRows.map((row) => ({
      row_filters: { article: row.article },
      pack_level_updates: packLevelUpdates,
      pack_type_id_updates: [],
    }));

    try {
      setSetAllLoading(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_PRODUCT_DETAILS,
        allocationUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Set All applied successfully"
        );
        setShowSetAllModal(false);
        setProductEditActive(false);
        setUpdatedRowEdits([]);
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(
          res?.data?.message || ERROR_MESSAGE,
          "error"
        );
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      setSetAllLoading(false);
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let customFilters = downloadFormatChipsDependency?.custom;
      customFilters = {
        ...customFilters,
        value: customFilters.value.map((date) => {
          return getNearestDay(date.trim());
        }),
      };
      let prependContentReq = prependExtraData({
        ...downloadFormatChipsDependency,
        custom: customFilters,
      });
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  const handleMasterSkuStoreDownload = async () => {
    const payload = {
      allocation_code: props.allocationCode,
      article: "",
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode,
        props.allocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType ? props?.planType : "",
    };
    try {
      const response = await props.downloadMasterProductStoreSizeView(
        payload,
        props.isV3?.includes("productDetails")
      );
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      displaySnackMessages(err, "error");
    }
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = tableInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  const smartFilterButton = props?.finalizeAllocationConfig
    ?.enableSmartFilter ? (
    <AiSmartFilterButton
      key="ai-smart-filter-btn"
      columns={columns}
      allocationCode={props.allocationCode}
      onFilterApplied={applyAiSmartFilterToColumn}
      onAppliedFilterChange={aiChips.onAppliedFilterChange}
      onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_CNA_PRODUCT_VIEW.screenName}
      tableId={AI_SMART_FILTER_CNA_PRODUCT_VIEW.tableId}
      hideSuggestions
    />
  ) : null;

  const getTopLeftOptions = () => {
    if (!smartFilterButton) return [];
    return [
      <AiSmartFilterChips
        key="ai-smart-filter-chips"
        chips={aiChips.chips}
        onChipClick={(chip) =>
          aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
        }
        onChipRemove={(chip) =>
          aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
        }
      />,
    ];
  };

  // ── Top-right options per Figma ──

  const handleCreateScenario = () => {
    const selected =
      tableInstance.current?.api?.getSelectedRows() || [];
    if (selected.length === 0) {
      displaySnackMessages("Please select at least one row", "warning");
      return;
    }
    const articleIds = getScenarioStyleIds(
      selected,
      props.finalizeAllocationConfig
    );
    const scenarioAllocationCode =
      props.originalAllocationCode || props.allocationCode;
    navigate(
      `${CREATE_SCENARIO}?step=0&allocation_code=${scenarioAllocationCode}`,
      {
        state: {
          allocationCode: scenarioAllocationCode,
          articleIds: articleIds,
        },
      }
    );
  };

  const getTopRightOptions = () => {
    const options = [];

    if (!isEditMode) {
      // View mode: Create Scenario only once a product row is selected
      if (props.finalizeAllocationConfig?.createSceanrio && selectedRows.length > 0) {
        options.push(
          <Button
            key="create-scenario"
            variant="primary"
            size="large"
            type="default"
            disabled={props.planStatus === "Finalized"}
            onClick={handleCreateScenario}
          >
            Create Scenario
          </Button>
        );
      }
      if (smartFilterButton) {
        options.push(smartFilterButton);
      }
      return options;
    }

    // Edit mode
    if (productEditActive) {
      // Active editing: Cancel + Apply
      options.push(
        <Button
          key="cancel-product-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelProductEdit}
        >
          Cancel
        </Button>,
        <Button
          key="apply-product-edit"
          variant="primary"
          size="large"
          type="default"
          disabled={updatedRowEdits.length === 0}
          onClick={handleApplyProductEdit}
        >
          Apply
        </Button>
      );
    } else if (selectedRows.length > 0) {
      // Edit mode idle, rows selected: Create Scenario + Set All
      if (props.finalizeAllocationConfig?.createSceanrio) {
        options.push(
          <Button
            key="create-scenario"
            variant="secondary"
            size="large"
            type="default"
            disabled={props.planStatus === "Finalized"}
            onClick={handleCreateScenario}
          >
            Create Scenario
          </Button>
        );
      }
      options.push(
        <Button
          key="set-all"
          variant="primary"
          size="large"
          type="default"
          onClick={() => setShowSetAllModal(true)}
        >
          Set All
        </Button>
      );
    } else {
      // Edit mode idle, no rows selected: Edit by Product only
      options.push(
        <Button
          key="edit-by-product"
          variant="primary"
          size="large"
          type="default"
          disabled={childEditActive}
          onClick={activateProductEdit}
        >
          Edit by Product
        </Button>
      );
    }

    if (smartFilterButton) {
      options.push(smartFilterButton);
    }
    return options;
  };

  const handleBreakdown = useCallback((dcName, tableConfig, tableData) => {
    setBreakdownDcName(dcName);
    setBreakdownTableConfig(tableConfig);
    setBreakdownTableData(tableData);
    setBottomSheetOpen(true);
  }, []);

  const expansionPanel = useMemo(
    () => (
      <ProductExpansionPanel
        selectedArticle={selectedArticle}
        displayArticle={displayArticle}
        isEditMode={isEditMode}
        productEditActive={productEditActive}
        onChildEditActiveChange={setChildEditActive}
        onClose={() => setViewExpansion(false)}
        onBreakdown={handleBreakdown}
      />
    ),
    [
      selectedArticle,
      displayArticle,
      isEditMode,
      productEditActive,
      handleBreakdown,
    ]
  );

  const tableHeaderLabel = useMemo(
    () => t("inventorysmart.finalize.recommendation.productDetails"),
    [t]
  );

  return (
    <>
      <Loader loader={props.productViewLoader}>
        <div className={`${nestedSlotClasses.nestedSlot}`}>
          <AgGridComponent
            columns={columns}
            rowdata={rows}
            uniqueRowId="article"
            tableHeader={tableHeaderLabel}
            sizeColumnsToFitFlag
            suppressFieldDotNotation
            pagination={false}
            loadTableInstance={(p) => {
              tableInstance.current = p;
            }}
            nestedTable={viewExpansion}
            nestedTableComponent={expansionPanel}
            topRightOptions={getTopRightOptions()}
            topLeftOptions={getTopLeftOptions()}
            customSystemButton={
              rows.length ? (
                <>
                  <Tooltip
                    title="Download"
                    orientation="top"
                    variant="tertiary"
                  >
                    <Button
                      id="productDownloadMenuBtn"
                      variant="tertiary"
                      icon={<IA_DOWNLOAD />}
                      onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                      sx={{
                        background: "#f5f6fa !important",
                        border: "none !important",
                      }}
                    />
                  </Tooltip>
                  <Menu
                    anchorEl={downloadMenuAnchor}
                    open={Boolean(downloadMenuAnchor)}
                    onClose={() => setDownloadMenuAnchor(null)}
                    PaperProps={{
                      sx: {
                        borderRadius: "12px",
                        boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)",
                        minWidth: "200px",
                        mt: 1,
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setDownloadMenuAnchor(null);
                        tableInstance.current?.api?.exportDataAsExcel();
                      }}
                      sx={{
                        fontSize: "14px",
                        fontWeight: 400,
                        color: "#2b3348",
                        padding: "10px 16px",
                      }}
                    >
                      Product Download
                    </MenuItem>
                    {showMasterSkuStoreDownload && (
                      <MenuItem
                        onClick={() => {
                          setDownloadMenuAnchor(null);
                          handleMasterSkuStoreDownload();
                        }}
                        sx={{
                          fontSize: "14px",
                          fontWeight: 400,
                          color: "#2b3348",
                          padding: "10px 16px",
                        }}
                      >
                        Master SKU–Store Download
                      </MenuItem>
                    )}
                  </Menu>
                </>
              ) : null
            }
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            onCellValueChanged={onCellValueChanged}
            onBlur={onBlur}
            rowSelection="multiple"
            selectAllHeaderComponent
            onSelectionChanged={onSelectionChanged}
          />
        </div>
      </Loader>

      {bottomSheetOpen && (
        <DCBreakdownBottomSheet
          open={bottomSheetOpen}
          onClose={() => {
            setBottomSheetOpen(false);
            setBreakdownDcName(null);
          }}
          dcName={breakdownDcName}
          tableConfig={breakdownTableConfig}
          tableData={breakdownTableData}
        />
      )}

      <SetAllProductDetailsView
        open={showSetAllModal}
        onClose={() => setShowSetAllModal(false)}
        onApply={handleSetAllApply}
        displaySnack={displaySnackMessages}
        dcConfigs={showSetAllModal ? buildSetAllDcConfigs() : []}
        loading={setAllLoading}
      />
    </>
  );
};

const mapStateToProps = (store) => ({
  productViewLoader:
    store.inventorysmartReducer.inventorySmartNewFlowProductViewService
      .productViewLoader,
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .originalAllocationCode,
  articles:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.articles,
  isV3:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
  fetchProductDetails:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .fetchProductDetails,
  productViewRefreshToken:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .productViewRefreshToken,
  finalizeAllocationConfig:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartFinalizeAllocationConfig,
  filterDashboardConfiguration:
    store.filterReducer?.filterDashboardConfiguration?.[
      "viewPastAllocationFilterConfiguration"
    ]?.appliedFilterData,
  excelDownloadMetaData:
    store.inventorysmartReducer.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.excelDownloadMetaData,
});

const mapDispatchToProps = (dispatch) => ({
  getProductView: (payload, isV3) => dispatch(getProductView(payload, isV3)),
  setProductViewLoader: (val) => dispatch(setProductViewLoader(val)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setFetchProductDetails: (val) => dispatch(setFetchProductDetails(val)),
  setFetchProductStoreDetails: (val) =>
    dispatch(setFetchProductStoreDetails(val)),
  setNewFlowSelectedArticle: (val) =>
    dispatch(setNewFlowSelectedArticle(val)),
  setSelectedArticles: (val) => dispatch(setSelectedArticles(val)),
  setNewFlowDisplayArticle: (val) =>
    dispatch(setNewFlowDisplayArticle(val)),
  applyEditChanges: (payload) => dispatch(applyEditChanges(payload)),
  refreshProductViews: () => dispatch(refreshProductViews()),
  downloadMasterProductStoreSizeView: (payload, isV3) =>
    dispatch(downloadMasterProductStoreSizeView(payload, isV3)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsTable);
