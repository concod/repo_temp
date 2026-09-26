import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { connect } from "react-redux";
import { Button, Tooltip, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { applyEditChanges } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import { downloadMasterProductStoreSizeView } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  getStoreView,
  setFetchStoreDetails,
  setFetchProductDetails,
  refreshProductViews,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import AiSmartFilterButton from "../../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_CNA_STORE_VIEW } from "../../../Decision-Dashboard/components/aiSmartFilterDummyConstants";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useRefreshSignal from "../../utils/useRefreshSignal";
import StoreProductView from "./StoreProductView";
import SetAllProductDetailsView from "../product-view/SetAllProductDetailsView";
import {
  STORE_ALLOC_QTY_GROUP,
  STORE_ALLOC_LEAF_PREFIX,
  STORE_NET_AVAILABLE_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_STORE_DETAILS,
  EDITABLE_SUFFIXES,
} from "../constants/allocationEditConstants";
import {
  capValueAtAvailable,
  buildApplyEnvelope,
  matchDcOption,
  notifyApplyResult,
} from "../utils/allocationEditUtils";
import { attachStoreAllocRenderers } from "../utils/allocRenderers";
import useSnack from "../utils/useSnack";
import useEditTracker from "../utils/useEditTracker";
import {
  collectStoreDetailsEditableLeaves,
  buildStoreDetailsAllocationUpdates,
  buildStoreDetailsSetAllDcConfigs,
} from "../utils/storeDetailsEditUtils";

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

/** Check if a column is an editable allocation leaf (packs/eaches). */
const isEditableAllocColumn = (colId = "") =>
  EDITABLE_SUFFIXES.some((suffix) => colId.endsWith(suffix));

/** Edit gate for store_details renderers: true when store-level edit is active. */
const storeDetailsEditOn = (editStateRef) =>
  Boolean(
    editStateRef?.current?.isEditMode && editStateRef.current.storeEditActive
  );

/** Resolve unique row ID for ag-Grid: prefers psa_name, then store_code, fallback to index. */
const resolveUniqueRowId = (formattedCols, rows) => {
  if (formattedCols.some((col) => col.column_name === "psa_name")) {
    return "psa_name";
  }
  if (rows.some((row) => row.store_code != null)) {
    return "store_code";
  }
  return "index";
};

const StoreDetailsTable = (props) => {
  const { isEditMode = false, sessionId } = props;
  const { t } = useTranslation();
  const nestedSlotClasses = useNestedSlotStyles();

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [uniqueRowId, setUniqueRowId] = useState("store_code");
  const [loader, setLoader] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [viewExpansion, setViewExpansion] = useState(false);
  const tableInstance = useRef(null);
  const actionMapRef = useRef({});

  const originalColumnsRef = useRef([]);
  const originalRowsRef = useRef([]);
  const dcOptionsRef = useRef([]);
  const [editableAllocLeaves, setEditableAllocLeaves] = useState([]);

  const [selectedRows, setSelectedRows] = useState([]);
  const [storeEditActive, setStoreEditActive] = useState(false);
  const {
    updatedRowEdits,
    updatedRowEditsRef,
    updateEditedRowState,
    resetEdits,
  } = useEditTracker("store_code", editableAllocLeaves, originalRowsRef);

  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [setAllLoading, setSetAllLoading] = useState(false);
  const [childEditActive, setChildEditActive] = useState(false);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const aiChips = useAiSmartFilterChips();
  const showMasterSkuStoreDownload =
    props?.finalizeAllocationConfig?.showMasterSkuStoreDownload;

  const editStateRef = useRef({ isEditMode, storeEditActive: false });
  editStateRef.current = { isEditMode, storeEditActive };

  const displaySnackMessages = useSnack(props.addSnack);

  /** Open the nested store→product panel for the clicked store row. */
  const handleStoreClick = useCallback(
    (data) => {
      const row = data?.data || data;
      const store = row?.store || row?.store_code || row?.store_id || null;
      if (!store) return;
      setSelectedRows([]);
      setShowSetAllModal(false);
      props.setFetchProductDetails(null);
      setSelectedStore(store);
      setViewExpansion(true);
    },
    [props.setFetchProductDetails]
  );

  const onSelectionChanged = useCallback((event) => {
    const selected = event?.api?.getSelectedRows() || [];
    setSelectedRows(selected);
  }, []);

  actionMapRef.current = useMemo(
    () => ({
      store_code: handleStoreClick,
    }),
    [handleStoreClick]
  );

  /** Fetch store_details grid: allocation by store with nested store→product expansion. */
  const fetchStoreData = async () => {
    try {
      setLoader(true);
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
      const res = await props.getStoreView(
        payload,
        props.isV3?.includes("storeDetails")
      );
      if (res?.data?.status) {
        const resData = res.data.data;
        const tableData = (resData.table_data || []).map((item, index) => ({
          ...item,
          index,
        }));

        dcOptionsRef.current = resData.dc_dict || [];

        const formattedCols = agGridColumnFormatter(
          resData.table_config || [],
          null,
          actionMapRef.current
        );
        applyAbsentKeyHyphen(formattedCols);
        applyBadgeColumns(formattedCols);

        const { editableLeaves } = collectStoreDetailsEditableLeaves(
          formattedCols,
          dcOptionsRef.current
        );
        editableLeaves.forEach((leaf) => {
          if (leaf.dc_code) return;
          const dcHeaderLabel = leaf.columnLabel.split(" - ")[0];
          const dcOption = matchDcOption(dcOptionsRef.current, {
            label: dcHeaderLabel,
          });
          leaf.dc_code = dcOption?.value || dcOption?.dc_code;
        });
        setEditableAllocLeaves(editableLeaves);

        if (editableLeaves.length > 0) {
          attachStoreAllocRenderers(
            formattedCols,
            editableLeaves.map((c) => c.column_name),
            editStateRef,
            storeDetailsEditOn,
            STORE_ALLOC_QTY_GROUP
          );
        }

        originalColumnsRef.current = cloneDeep(formattedCols);
        originalRowsRef.current = cloneDeep(tableData);

        setUniqueRowId(resolveUniqueRowId(formattedCols, tableData));
        setColumns(formattedCols);
        setRows(tableData);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      setLoader(false);
    }
  };

  // Initial fetch on mount when allocationCode + planType are ready and fetchStoreDetails is null.
  // Intentionally omits fetchStoreData (stable) and allocationCode (redundant guard).
  useEffect(() => {
    if (
      props.allocationCode &&
      props.planType &&
      props.fetchStoreDetails === null
    ) {
      fetchStoreData();
    }
    // Narrow deps: fetchStoreData is stable, allocationCode is guarded in condition
  }, [props.planType, props.fetchStoreDetails]);

  // Imperative refetch when parent sets fetchStoreDetails to true.
  useEffect(() => {
    if (props.fetchStoreDetails) {
      fetchStoreData()
        .then(() => {
          props.setFetchStoreDetails(false);
        })
        .catch(() => {
          props.setFetchStoreDetails(false);
        });
    }
    // Narrow deps: setFetchStoreDetails is a stable dispatch function
  }, [props.fetchStoreDetails]);

  useRefreshSignal(props.productViewRefreshToken, fetchStoreData);

  // Exit store edit when page switches back to view mode; refresh cells to
  // pick up the new editStateRef on any isEditMode / storeEditActive change.
  useEffect(() => {
    if (!isEditMode && storeEditActive) {
      handleCancelStoreEdit();
      return;
    }
    tableInstance.current?.api?.refreshCells({ force: true });
    // Narrow deps: only responds to page edit-mode toggle, not storeEditActive
  }, [isEditMode]);

  /** Enable edit mode for store_details grid. */
  const activateStoreEdit = () => {
    setStoreEditActive(true);
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  /** Cancel store edits: revert to original data and exit edit mode. */
  const handleCancelStoreEdit = () => {
    setStoreEditActive(false);
    resetEdits();
    setSelectedRows([]);
    tableInstance.current?.api?.deselectAll();
    setRows(cloneDeep(originalRowsRef.current));
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  /** Cap edited value at original allocated + net available for this store row. */
  const capAtAvailable = (colId, storeCode, value) => {
    const originalRow = originalRowsRef.current.find(
      (r) => r.store_code === storeCode
    );
    return capValueAtAvailable({
      value,
      originalRow,
      columnId: colId,
      allocGroup: STORE_ALLOC_LEAF_PREFIX,
      availableGroup: STORE_NET_AVAILABLE_GROUP,
    });
  };

  const onCellValueChanged = () => {};

  /** Cap the typed value, mark the row dirty via useEditTracker, redraw. */
  const onBlur = (e, data, column, isChanged) => {
    if (!isEditableAllocColumn(column.colId) || !isChanged) return;

    const numValue = Number(data[column.colId] ?? 0);
    const { capped, finalValue } = capAtAvailable(
      column.colId,
      data.store_code,
      numValue
    );

    if (capped) {
      displaySnackMessages(CAPPED_WARNING_MSG, "warning");
    }

    data[column.colId] = finalValue;
    updateEditedRowState(data);

    const rowNode = tableInstance.current?.api?.getRowNode(data[uniqueRowId]);
    if (rowNode) {
      rowNode.setData(data);
      tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
    }
  };

  /** Build allocation_updates payload from dirty store rows. */
  const buildAllocationUpdates = () =>
    buildStoreDetailsAllocationUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      editableAllocLeaves
    );

  /** Apply store_details grid edits: build payload, call API, refresh on success. */
  const handleApplyStoreEdit = async () => {
    const allocationUpdates = buildAllocationUpdates();
    if (allocationUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoader(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_STORE_DETAILS,
        article: null,
        store: null,
        size: null,
        allocationUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setStoreEditActive(false);
        resetEdits();
        props.refreshProductViews();
        return;
      }
      displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
      setLoader(false);
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoader(false);
    }
  };

  /** Build Set All DC field configs from selected store rows. */
  const buildSetAllDcConfigs = () =>
    buildStoreDetailsSetAllDcConfigs(
      selectedRows,
      originalRowsRef.current,
      editableAllocLeaves
    );

  /** Apply Set All: expand uniform values across selected stores and submit. */
  const handleSetAllApply = async (packLevelUpdates) => {
    if (packLevelUpdates.length === 0) return;

    const allocationUpdates = selectedRows.map((row) => ({
      row_filters: { store: row.store_code },
      pack_level_updates: packLevelUpdates,
      pack_type_id_updates: [],
    }));

    try {
      setSetAllLoading(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_STORE_DETAILS,
        article: null,
        store: null,
        size: null,
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
        resetEdits();
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
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
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
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
        props.isV3?.includes("storeDetails")
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
      screenName={AI_SMART_FILTER_CNA_STORE_VIEW.screenName}
      tableId={AI_SMART_FILTER_CNA_STORE_VIEW.tableId}
      hideSuggestions
    />
  ) : null;

  const smartFilterChips = smartFilterButton ? (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  ) : null;

  /** Build toolbar buttons based on current edit state. */
  const getTopRightOptions = () => {
    const options = [];

    if (!isEditMode) {
      if (smartFilterButton) {
        options.push(smartFilterButton);
      }
      return options;
    }

    if (storeEditActive) {
      options.push(
        <Button
          key="cancel-store-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelStoreEdit}
        >
          Cancel
        </Button>,
        <Button
          key="apply-store-edit"
          variant="primary"
          size="large"
          type="default"
          disabled={updatedRowEdits.length === 0}
          onClick={handleApplyStoreEdit}
        >
          Apply
        </Button>
      );
    } else if (selectedRows.length > 0) {
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
      options.push(
        <Button
          key="edit-by-store"
          variant="primary"
          size="large"
          type="default"
          disabled={childEditActive}
          onClick={activateStoreEdit}
        >
          Edit by Store
        </Button>
      );
    }

    if (smartFilterButton) {
      options.push(smartFilterButton);
    }
    return options;
  };

  const expansionPanel = useMemo(
    () => (
      <StoreProductView
        selectedStore={selectedStore}
        onClose={() => setViewExpansion(false)}
        isEditMode={isEditMode}
        productEditActive={storeEditActive}
        onChildEditActiveChange={setChildEditActive}
      />
    ),
    [selectedStore, isEditMode, storeEditActive]
  );

  const tableHeaderLabel = useMemo(
    () => t("inventorysmart.finalize.recommendation.storeDetails"),
    [t]
  );

  return (
    <>
      <Loader loader={loader}>
        <div className={nestedSlotClasses.nestedSlot}>
          <AgGridComponent
            columns={columns}
            rowdata={rows}
            uniqueRowId={uniqueRowId}
            tableHeader={tableHeaderLabel}
            sizeColumnsToFitFlag
            suppressFieldDotNotation
            pagination={false}
            loadTableInstance={(params) => {
              tableInstance.current = params;
            }}
            nestedTable={viewExpansion}
            nestedTableComponent={expansionPanel}
            topRightOptions={getTopRightOptions()}
            topLeftOptions={smartFilterChips}
            customSystemButton={
              rows.length ? (
                <>
                  <Tooltip
                    title="Download"
                    orientation="top"
                    variant="tertiary"
                  >
                    <Button
                      id="storeDownloadMenuBtn"
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
                      Store Download
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
  fetchStoreDetails:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .fetchStoreDetails,
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
  getStoreView: (payload, isV3) => dispatch(getStoreView(payload, isV3)),
  setFetchStoreDetails: (payload) => dispatch(setFetchStoreDetails(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  applyEditChanges: (payload) => dispatch(applyEditChanges(payload)),
  refreshProductViews: () => dispatch(refreshProductViews()),
  addSnack: (snack) => dispatch(addSnack(snack)),
  downloadMasterProductStoreSizeView: (payload, isV3) =>
    dispatch(downloadMasterProductStoreSizeView(payload, isV3)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDetailsTable);
