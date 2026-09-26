import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useTranslation, ButtonGroup, Chips, Button,Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import AiIcon from "../../../../../../assets/IS_icons/IS_AI.svg";
import AlanSummaryPanel from "../../../Decision-Dashboard/AISummaryData/AlanSummaryPanel";
import { cloneDeep, isEmpty } from "lodash";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import moment from "moment";
import {
  getProductStoreView,
  getStoreSizeView,
  refreshProductViews,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { applyEditChanges } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useRefreshSignal from "../../utils/useRefreshSignal";
import ProductStoreSizeView from "./ProductStoreSizeView";
import SetAllProductStoreView from "./SetAllProductStoreView";
import { VIEW_BY_STORE, VIEW_BY_SIZE, EDIT_BY_STORE, EDIT_BY_SIZE } from "./constants";
import { finalizeAllocationContext } from "../../index";
import {
  ALLOC_QTY_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_PRODUCT_STORE,
  EDIT_VIEW_PRODUCT_STORE_SIZE,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import {
  applyAllocNullHyphen,
  buildApplyEnvelope,
  capValueAtAvailable,
  makeEditGate,
  notifyApplyResult,
} from "../utils/allocationEditUtils";
import {
  attachOtherColumnRenderers,
  attachStoreAllocRenderers,
} from "../utils/allocRenderers";
import {
  buildSetAllByStoreUpdates,
  buildSetAllBySizeUpdates,
  buildSetAllShipDateUpdates,
  buildStoreAllocationUpdates,
  buildStoreOtherUpdates,
  buildStoreSizeAllocationUpdates,
  collectDcGridEditableLeaves,
  prepareOtherColumns,
} from "../utils/storeEditUtils";

// Renderers close over this gate; it reads live edit state from editStateRef.
const storeEditOn = makeEditGate(EDIT_BY_STORE);

/**
 * Stable size-detail renderer. Lives at module scope so its identity never
 * changes between renders — ag-Grid won't remount open detail rows.
 * All live props are read from `propsRef.current` at render time.
 */
const StoreSizeDetailInner = ({ data, propsRef }) => {
  const panelProps = propsRef.current || {};
  return (
      <ProductStoreSizeView
        selectedKey={data?.store_code}
        allocationCode={panelProps.allocationCode}
        originalAllocationCode={panelProps.originalAllocationCode}
        planStatus={panelProps.planStatus}
        planType={panelProps.planType}
        isV3={panelProps.isV3}
        selectedArticle={panelProps.selectedArticle}
        displayArticle={panelProps.displayArticle}
        fetchFn={panelProps.fetchFn}
        addSnack={panelProps.addSnack}
        editStateRef={panelProps.editStateRef}
        onSizeEditsChange={panelProps.onSizeEditsChange}
      />
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────

const useProductStoreStyles = makeStyles((theme) => ({
  topRightRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.typography.pxToRem(8),
  },
  editByLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(12),
    lineHeight: "normal",
    color: "#60697d",
    whiteSpace: "nowrap",
  },
  chipsRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.typography.pxToRem(12),
  },
  tableWrap: {
    overflow: "visible",
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
      padding: "5px 11px",
      borderRadius: "8px",
      cursor: "pointer",
      background: "#FFF",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      color: "#0D152C",
      "& svg": {
        width: 18,
        height: 18,
      },
    },
  },
}));

// ─── component ───────────────────────────────────────────────────────────────

const ProductStoreView = (props) => {
  const {
    isEditMode = false,
    productEditActive = false,
    onChildEditActiveChange,
  } = props;
  const psClasses = useProductStoreStyles();
  const { t } = useTranslation();

  // Read page-level context
  const finalizeCtx = useContext(finalizeAllocationContext);
  const { editSchema, sessionId } = finalizeCtx || {};
  const editSchemaForView = editSchema?.product_store;

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remount, setRemount] = useState(true);
  const [editByDimension, setEditByDimension] = useState(EDIT_BY_STORE);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [alanSummaryPanelStatus, setAlanSummaryPanelStatus] = useState(false);
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] = useState({});
  const [setAllSizeView, setSetAllSizeView] = useState({
    loading: false,
    columns: [],
    rows: [],
    dcDict: [],
    sizeStoreMap: {},
  });
  const tableInstance = useRef(null);
  const latestArticleRef = useRef(null);
  const previousFetchContextRef = useRef(null);
  const setAllSizeRequestRef = useRef(0);

  // Sync ref always has the latest isEditMode + editByDimension without
  // re-creating cell renderers. Renderers close over this ref.
  const editStateRef = useRef({
    isEditMode,
    editByDimension,
    productEditActive,
  });
  editStateRef.current = { isEditMode, editByDimension, productEditActive };

  // Original snapshots for reset / comparison
  const originalColumnsRef = useRef([]);
  const originalRowsRef = useRef([]);
  const dcOptionsRef = useRef([]);

  // Editable column tracking
  const [editableAllocLeaves, setEditableAllocLeaves] = useState([]);
  const [otherEditableColumns, setOtherEditableColumns] = useState([]);

  // Store-level edit state (like productEditActive in ProductDetailsTable)
  const [storeEditActive, setStoreEditActive] = useState(false);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const updatedRowEditsRef = useRef([]);

  // Size-level edit state — keyed by store_code
  const sizeEditsMapRef = useRef({});
  const [sizeEditActive, setSizeEditActive] = useState(false);

  const onSizeEditsChange = useCallback((storeCode, payload) => {
    const map = sizeEditsMapRef.current;
    if (!payload || payload.edits.length === 0) {
      delete map[storeCode];
    } else {
      map[storeCode] = payload;
    }
    setSizeEditActive(Object.keys(map).length > 0);
  }, []);

  // Bag ref keeps all detail-panel props fresh without changing the detail
  // renderer function identity. A new function identity remounts size panels.
  const detailPropsRef = useRef({});
  detailPropsRef.current = {
    allocationCode: props.allocationCode,
    originalAllocationCode: props.originalAllocationCode,
    planStatus: props.planStatus,
    planType: props.planType,
    isV3: props.isV3,
    selectedArticle: props.selectedArticle,
    displayArticle: props.displayArticle,
    fetchFn: props.getStoreSizeView,
    addSnack: props.addSnack,
    editStateRef,
    onSizeEditsChange,
  };
  // Created once — stable identity prevents ag-Grid remounting size panels.
  const storeSizeDetailRendererRef = useRef((innerProps) => (
    <StoreSizeDetailInner data={innerProps.data} propsRef={detailPropsRef} />
  ));

  const displaySnackMessages = useCallback((message, variant) => {
    props.addSnack({ message, options: { variant, disableOnClose: true } });
  }, [props.addSnack]);

  const onSelectionChanged = useCallback((event) => {
    const selected = event?.api?.getSelectedRows() || [];
    setSelectedRows(selected);
  }, []);

  const openSetAll = useCallback(() => {
    setShowSetAllModal(true);
    const requestId = ++setAllSizeRequestRef.current;
    const storeCodes = selectedRows
      .map((row) => row?.store_code)
      .filter((code) => code !== undefined && code !== null)
      .map(String);

    setSetAllSizeView({
      loading: true,
      columns: [],
      rows: [],
      dcDict: [],
      sizeStoreMap: {},
    });

    const payload = {
      allocation_code: props.allocationCode,
      article: props.selectedArticle || props.displayArticle,
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType || "",
      store_code: null,
      set_all_stores: storeCodes,
    };

    props
      .getStoreSizeView(
        payload,
        props.isV3?.includes("productStoreDetails")
      )
      .then((res) => {
        if (setAllSizeRequestRef.current !== requestId) return;
        if (res?.data?.status) {
          const data = res.data.data || {};
          setSetAllSizeView({
            loading: false,
            columns: data.table_config || [],
            rows: data.table_data || [],
            dcDict: data.dc_dict || [],
            sizeStoreMap: data.size_store_map || {},
          });
          return;
        }
        setSetAllSizeView({
          loading: false,
          columns: [],
          rows: [],
          dcDict: [],
          sizeStoreMap: {},
        });
      })
      .catch((e) => {
        if (setAllSizeRequestRef.current !== requestId) return;
        const errObj = e?.response?.data;
        displaySnackMessages(
          errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          "error"
        );
        setSetAllSizeView({
          loading: false,
          columns: [],
          rows: [],
          dcDict: [],
          sizeStoreMap: {},
        });
      });
  }, [
    selectedRows,
    props.allocationCode,
    props.selectedArticle,
    props.displayArticle,
    props.originalAllocationCode,
    props.planStatus,
    props.planType,
    props.isV3,
    props.getStoreSizeView,
    displaySnackMessages,
  ]);

  // Keep the ref in sync with state
  useEffect(() => {
    updatedRowEditsRef.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  const fetchStoreData = async ({ skipRemount = false } = {}) => {
    const requestedArticle = props.selectedArticle;
    latestArticleRef.current = requestedArticle;

    // Clear any stale edit state from the previous article / fetch cycle.
    // For apply-refetches this is a harmless no-op (already cleared by the
    // apply handler); for article changes it prevents stale detail-panel
    // edits from leaking into the next article's payload.
    sizeEditsMapRef.current = {};
    setSizeEditActive(false);
    setStoreEditActive(false);
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
    setSelectedRows([]);

    // Remounting unmounts the grid (and any in-tree Loader). Skip it on
    // apply-refetch so the overlay stays on the store table.
    if (!skipRemount) {
      setRemount(false);
    }
    try {
      setLoading(true);
      props.onLoadingChange?.(true);
      const payload = {
        allocation_code: props.allocationCode,
        article: props.selectedArticle,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType || "",
      };
      const res = await props.getProductStoreView(
        payload,
        props.isV3?.includes("productStoreDetails")
      );
      if (latestArticleRef.current !== requestedArticle) return;
      if (res?.data?.status) {
        const resData = res.data.data;

        // Snapshot dc_dict
        dcOptionsRef.current = resData.dc_dict || [];

        // Prepare other_columns (delivery_dt → datetime) BEFORE formatting
        const rawConfig = resData.table_config || [];
        const processedOtherCols = prepareOtherColumns(
          rawConfig,
          editSchemaForView?.other_columns
        );
        setOtherEditableColumns(processedOtherCols);

        const formatted = agGridColumnFormatter(rawConfig);
        applyAbsentKeyHyphen(formatted);
        applyBadgeColumns(formatted);

        formatted.forEach((col) => {
          if (col.field === "store_code") {
            col.cellRenderer = "agGroupCellRenderer";
          }
        });

        // Disable all allocated_quantity leaves and collect editable ones
        const { editableLeaves } = collectDcGridEditableLeaves(
          formatted,
          dcOptionsRef.current,
          editSchemaForView
        );
        setEditableAllocLeaves(editableLeaves);

        // Show "-" for null / missing alloc values (parity with the size grid).
        applyAllocNullHyphen(formatted, ALLOC_QTY_GROUP);

        // Attach ref-gated renderers once. They read editStateRef at call time
        // so chip changes need only refreshCells — no setColumns.
        if (editableLeaves.length > 0) {
          const editableKeys = editableLeaves.map((c) => c.column_name);
          attachStoreAllocRenderers(formatted, editableKeys, editStateRef, storeEditOn);
        }
        attachOtherColumnRenderers(formatted, processedOtherCols, editStateRef, storeEditOn);

        // Deep copies for reset / diff
        originalColumnsRef.current = cloneDeep(formatted);
        originalRowsRef.current = cloneDeep(resData.table_data || []);

        setColumns(formatted);
        setRows(resData.table_data || []);
      }
    } catch (e) {
      if (latestArticleRef.current !== requestedArticle) return;
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      if (latestArticleRef.current === requestedArticle) {
        setLoading(false);
        if (!skipRemount) {
          setRemount(true);
        }
        props.onLoadingChange?.(false);
      }
    }
  };

  const dataMode = isEditMode
    ? editSchema
      ? "edit"
      : null
    : "view";

  useEffect(() => {
    if (!props.allocationCode || !props.selectedArticle || !dataMode) return;

    const previous = previousFetchContextRef.current;
    const preserveOpenDetails =
      previous?.article === props.selectedArticle &&
      previous?.mode !== dataMode;

    previousFetchContextRef.current = {
      article: props.selectedArticle,
      allocationCode: props.allocationCode,
      mode: dataMode,
    };
    fetchStoreData({ skipRemount: preserveOpenDetails });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedArticle, props.allocationCode, dataMode]);

  // Reset edit-by dimension when the article changes so the chips don't carry
  // forward a preference from the previous article.
  useEffect(() => {
    setEditByDimension(EDIT_BY_STORE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedArticle]);

  // Any applied edit in the product view invalidates this grain. Remount so
  // open store→size detail rows collapse instead of showing stale splits;
  // reopening one refetches it.
  useRefreshSignal(props.productViewRefreshToken, () => {
    if (props.allocationCode && props.selectedArticle) {
      fetchStoreData({ skipRemount: false });
    }
  });

  // Renderers read editStateRef (updated every render) so a refreshCells is
  // enough — no setColumns needed. setColumns would rebuild columnDefs and
  // remount open size detail panels, triggering finalize-store-size-view-data.
  useEffect(() => {
    tableInstance.current?.api?.refreshCells({ force: true });
  }, [isEditMode, editByDimension, productEditActive]);

  // Exit store edit when edit mode is turned off or dimension changes
  useEffect(() => {
    if ((!isEditMode || editByDimension !== EDIT_BY_STORE) && storeEditActive) {
      handleCancelStoreEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editByDimension]);

  // Lock Edit by Product while this view (or nested) has Cancel/Apply up
  useEffect(() => {
    const active = storeEditActive || sizeEditActive;
    onChildEditActiveChange?.(active);
    return () => onChildEditActiveChange?.(false);
  }, [storeEditActive, sizeEditActive, onChildEditActiveChange]);

  // ── Store-level edit: cancel ──

  const handleCancelStoreEdit = () => {
    setStoreEditActive(false);
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
    // Restore original row data
    setRows(cloneDeep(originalRowsRef.current));
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  // ── Dirty-row tracking ──

  /**
   * Check if a row has any actual changes compared to the original.
   */
  const rowHasChanges = (rowData) => {
    const originalRow = originalRowsRef.current.find(
      (r) => r.store_code === rowData.store_code
    );
    if (!originalRow) return false;

    // Check allocation columns
    for (const { column_name } of editableAllocLeaves) {
      const newVal = Number(rowData[column_name] ?? 0);
      const oldVal = Number(originalRow[column_name] ?? 0);
      if (newVal !== oldVal) return true;
    }

    // Check other columns (use moment comparison for dates)
    for (const colName of otherEditableColumns) {
      const newFormatted = rowData[colName]
        ? moment(rowData[colName]).format("YYYY-MM-DD")
        : null;
      const oldFormatted = originalRow[colName]
        ? moment(originalRow[colName]).format("YYYY-MM-DD")
        : null;
      if (newFormatted !== oldFormatted) return true;
    }

    return false;
  };

  const updateEditedRowState = (rowData) => {
    const clonedRow = cloneDeep(rowData);
    // Evaluate outside the setter so it closes over the current render's
    // editableAllocLeaves / otherEditableColumns, not a potentially stale snapshot.
    const hasChanges = rowHasChanges(clonedRow);
    setUpdatedRowEdits((prev) => {
      const idx = prev.findIndex((r) => r.store_code === clonedRow.store_code);
      if (hasChanges) {
        return idx !== -1
          ? prev.map((r, i) => (i === idx ? clonedRow : r))
          : [...prev, clonedRow];
      }
      return idx !== -1 ? prev.filter((_, i) => i !== idx) : prev;
    });
  };

  // ── Cell edit handlers ──

  /**
   * onCellValueChanged is fired by ag-Grid when cell data is set via
   * `node.setDataValue` — which is how the DatePicker commits its value.
   * Regular text/number inputs are handled in `onBlur`; date and other
   * non-allocation columns are handled here.
   */
  const onCellValueChanged = (params) => {
    const colId = params?.column?.colId;
    if (!colId) return;

    const isOtherColumn = otherEditableColumns.includes(colId);
    if (!isOtherColumn) return;

    const data = params.data;

    // Activate store edit mode on first change
    if (!storeEditActive) {
      setStoreEditActive(true);
    }

    // Close any open size-detail rows on every edit
    tableInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) node.setExpanded(false);
    });

    updateEditedRowState(data);
  };

  const onBlur = (e, data, column, isChanged, value) => {
    const colId = column.colId;
    const isAllocationColumn = colId.startsWith(ALLOC_QTY_GROUP);
    const isOtherColumn = otherEditableColumns.includes(colId);

    if (!isChanged) return;

    // Activate store edit mode on first change
    if (!storeEditActive) {
      setStoreEditActive(true);
    }

    // Close any open size-detail rows on every edit
    tableInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) node.setExpanded(false);
    });

    if (isAllocationColumn) {
      // data[colId] already holds the freshly-typed value (committed by the
      // wrapper's handleInputChange before blur). The 5th `value` arg is the
      // previous render value, so it lags one edit behind — do not use it.
      const numValue = Number(data[colId] ?? 0);
      const originalRow = originalRowsRef.current.find(
        (r) => r.store_code === data.store_code
      );
      const { capped, finalValue } = capValueAtAvailable({
        value: numValue,
        originalRow,
        columnId: colId,
        allocGroup: ALLOC_QTY_GROUP,
        availableGroup: REMAINING_DC_ATA_GROUP,
      });

      if (capped) {
        displaySnackMessages(CAPPED_WARNING_MSG, "warning");
      }

      data[colId] = finalValue;

      // Always call updateEditedRowState — it will add/update or remove based on diff
      updateEditedRowState(data);

      const rowNode = tableInstance.current?.api?.getRowNode(data.store_code);
      if (rowNode) {
        // Update node data and redraw to restore cell styling
        rowNode.setData(data);
        tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
      }
    } else if (isOtherColumn) {
      // data[colId] is already set by the wrapper's handleInputChange before
      // onBlur fires. The 5th `value` arg is the previous render value — do not use it.
      updateEditedRowState(data);

      const rowNode = tableInstance.current?.api?.getRowNode(data.store_code);
      if (rowNode) {
        // Update node data and redraw to restore cell styling
        rowNode.setData(data);
        tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
      }
    }
  };

  // ── Apply edited changes via API ──

  const handleApplyStoreEdit = async () => {
    const allocationUpdates = buildStoreAllocationUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      editableAllocLeaves
    );
    const otherUpdates = buildStoreOtherUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      otherEditableColumns
    );

    if (allocationUpdates.length === 0 && otherUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoading(true);
      props.onLoadingChange?.(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_PRODUCT_STORE,
        article: props.selectedArticle,
        allocationUpdates,
        otherUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setStoreEditActive(false);
        setUpdatedRowEdits([]);
        updatedRowEditsRef.current = [];
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setLoading(false);
        props.onLoadingChange?.(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoading(false);
      props.onLoadingChange?.(false);
    }
  };

  // ── Size-level edit: cancel / apply ──

  const handleCancelSizeEdit = () => {
    sizeEditsMapRef.current = {};
    setSizeEditActive(false);
    // Detail panels will reset via their own ctxEditBy effect when we
    // briefly flip editByDimension or they can be cleared by refetch.
    // The simplest approach: re-fetch store data to remount detail panels.
    fetchStoreData({ skipRemount: false });
  };

  const handleApplySizeEdit = async () => {
    const { updates, storeCode } = buildStoreSizeAllocationUpdates(
      sizeEditsMapRef.current
    );
    if (updates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoading(true);
      props.onLoadingChange?.(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_PRODUCT_STORE_SIZE,
        article: props.selectedArticle,
        store: storeCode,
        allocationUpdates: updates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        sizeEditsMapRef.current = {};
        setSizeEditActive(false);
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setLoading(false);
        props.onLoadingChange?.(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoading(false);
      props.onLoadingChange?.(false);
    }
  };

  // ── Set All apply handler ──

  const handleSetAllApply = async ({
    activeTab,
    fieldValues,
    mapping: setAllMapping,
    sizeFieldValues,
    sizeMapping: setSizeMapping,
    shipDate,
  }) => {
    const isSize = activeTab === EDIT_BY_SIZE;

    // ── Build allocation_updates ──
    let allocationUpdates = [];

    if (!isSize) {
      // EDIT_BY_STORE: one entry per selected store, filtered by presentOn
      allocationUpdates = buildSetAllByStoreUpdates(
        selectedRows,
        setAllMapping,
        fieldValues
      );
    } else {
      // EDIT_BY_SIZE: expand each filled field across stores from size_store_map.
      // Pack type ID → row_filters: { store } (no size — Pack Count aggregate).
      // Eaches → row_filters: { size, store } (per product-size-store split).
      if (!setSizeMapping?.dcGroups) return;
      allocationUpdates = buildSetAllBySizeUpdates(setSizeMapping, sizeFieldValues);
    }

    const otherUpdates = isSize
      ? []
      : buildSetAllShipDateUpdates(
          selectedRows,
          setAllMapping?.shipDateColumn?.column_name,
          shipDate
        );

    if (allocationUpdates.length === 0 && otherUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoading(true);
      props.onLoadingChange?.(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: isSize ? EDIT_VIEW_PRODUCT_STORE_SIZE : EDIT_VIEW_PRODUCT_STORE,
        article: props.selectedArticle,
        allocationUpdates,
        otherUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setLoading(false);
        props.onLoadingChange?.(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoading(false);
      props.onLoadingChange?.(false);
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

  // ── Top-right options ──

  const topRightOptions = useMemo(() => {
    const options = [];

    if (props?.alanExplainability === true && selectedRows.length === 1) {
      options.push(
        <div className={psClasses.inventoryDetailsBtnContainer} key="iris-explainatory">
          <Tooltip title="" variant="tertiary">
            <div
              onClick={() => setAlanSummaryPanelStatus(true)}
              className={`inventory-details-btn`}
            >
              <AiIcon />
              Iris Explainatory
            </div>
          </Tooltip>
        </div>
      );
    }

    const anyEditActive = storeEditActive || sizeEditActive;
    const showEditChips =
      isEditMode && !anyEditActive && selectedRows.length === 0;

    // Edit-by chips — hidden while Set All is up or Cancel/Apply is showing
    if (showEditChips) {
      options.push(
        <div key="edit-by-row" className={psClasses.topRightRow}>
          <span className={psClasses.editByLabel}>Edit by</span>
          <div className={psClasses.chipsRow}>
            <Chips
              type="single"
              label="Store"
              isActive={editByDimension === EDIT_BY_STORE}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_STORE);
              }}
            />
            <Chips
              type="single"
              label="Size"
              isActive={editByDimension === EDIT_BY_SIZE}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_SIZE);
              }}
            />
          </div>
        </div>
      );
    }

    if (
      isEditMode &&
      selectedRows.length > 0 &&
      !anyEditActive &&
      !productEditActive
    ) {
      options.push(
        <Button
          key="set-all"
          variant="primary"
          size="large"
          type="default"
          onClick={openSetAll}
        >
          {t("inventorysmart.setAll")}
        </Button>
      );
    }

    // Cancel / Apply for store-level edits
    if (storeEditActive && updatedRowEdits.length > 0) {
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
          onClick={handleApplyStoreEdit}
        >
          Apply
        </Button>
      );
    } else if (storeEditActive) {
      options.push(
        <Button
          key="cancel-store-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelStoreEdit}
        >
          Cancel
        </Button>
      );
    }

    // Cancel / Apply for size-level edits
    if (sizeEditActive) {
      options.push(
        <Button
          key="cancel-size-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelSizeEdit}
        >
          Cancel
        </Button>,
        <Button
          key="apply-size-edit"
          variant="primary"
          size="large"
          type="default"
          onClick={handleApplySizeEdit}
        >
          Apply
        </Button>
      );
    }

    return options;
  }, [
    editByDimension,
    psClasses,
    isEditMode,
    productEditActive,
    storeEditActive,
    sizeEditActive,
    updatedRowEdits.length,
    selectedRows.length,
    openSetAll,
    editableAllocLeaves,
    t,
    props?.alanExplainability,
  ]);

  // Nested provider injects editByDimension so ProductStoreSizeView's
  // useEffect can call refreshCells on the size grid when chips change.
  const storeFinalizeCtx = useMemo(
    () => ({ ...(finalizeCtx || {}), editByDimension, productEditActive }),
    [finalizeCtx, editByDimension, productEditActive]
  );

  return (
    <finalizeAllocationContext.Provider value={storeFinalizeCtx}>
      <Loader loader={loading} minHeight={loading ? "400px" : "auto"}>
        {remount && (
          <div className={psClasses.tableWrap}>
            <AgGridComponent
              columns={columns}
              rowdata={rows}
              uniqueRowId="store_code"
              tableHeader={t("inventorysmart.finalize.recommendation.storeBreakdown")}
              sizeColumnsToFitFlag
              suppressFieldDotNotation
              pagination={false}
              loadTableInstance={(p) => {
                tableInstance.current = p;
              }}
              masterDetail
              detailRowAutoHeight
              keepDetailRows
              detailCellRenderer={storeSizeDetailRendererRef.current}
              downloadAsExcel={rows.length > 0}
              showDownloadTooltip
              toPrependContent={props.excelDownloadMetaData}
              prependedContentDetails={prependData()}
              topRightOptions={topRightOptions}
              onBlur={onBlur}
              onCellValueChanged={onCellValueChanged}
              rowSelection="multiple"
              selectAllHeaderComponent
              onSelectionChanged={onSelectionChanged}
              topCenterOptions={
                <ButtonGroup
                  selectedOption={props.activeView || VIEW_BY_STORE}
                  onChange={(e, val) => props.onViewChange && props.onViewChange(val)}
                  options={[
                    { label: t("inventorysmart.finalize.recommendation.byStore"), value: VIEW_BY_STORE },
                    { label: t("inventorysmart.finalize.recommendation.bySize"), value: VIEW_BY_SIZE },
                  ]}
                />
              }
            />
          </div>
        )}
      </Loader>
      <SetAllProductStoreView
        open={showSetAllModal}
        onClose={() => {
          setAllSizeRequestRef.current += 1;
          setShowSetAllModal(false);
        }}
        onApply={(applyArgs) => {
          setShowSetAllModal(false);
          handleSetAllApply(applyArgs);
        }}
        displaySnack={displaySnackMessages}
        columns={originalColumnsRef.current}
        dcDict={dcOptionsRef.current}
        originalRows={originalRowsRef.current}
        selectedRows={selectedRows}
        editSchema={editSchemaForView}
        editByDimension={editByDimension}
        sizeColumns={setAllSizeView.columns}
        sizeRows={setAllSizeView.rows}
        sizeDcDict={setAllSizeView.dcDict}
        sizeStoreMap={setAllSizeView.sizeStoreMap}
        sizeLoading={setAllSizeView.loading}
        allocationCode={props.allocationCode}
        originalAllocationCode={props.originalAllocationCode}
        planStatus={props.planStatus}
        planType={props.planType}
        selectedArticle={props.selectedArticle}
        displayArticle={props.displayArticle}
      />
      {alanSummaryPanelStatus && (
        <AlanSummaryPanel
          open={alanSummaryPanelStatus}
          onClose={setAlanSummaryPanelStatus}
          selectedRows={selectedRows}
          explainatoryAllocationCode={props?.allocationCode}
          selectedStoreColorId={props?.selectedArticle}
          setStoreCode={selectedRows?.[0]?.store_code}
          alanExplainability={props?.alanExplainability}
        />
      )}
    </finalizeAllocationContext.Provider>
  );
};

const mapStateToProps = (store) => ({
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .originalAllocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  isV3:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
  selectedArticle:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .selectedArticle,
  displayArticle:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .displayArticle,
  productViewRefreshToken:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .productViewRefreshToken,
  alanExplainability:
    store.inventorysmartReducer.inventorySmartDashboardService
      ?.alanExplainability,
  excelDownloadMetaData:
    store.inventorysmartReducer.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.excelDownloadMetaData,
  filterDashboardConfiguration:
    store.filterReducer?.filterDashboardConfiguration?.[
      "viewPastAllocationFilterConfiguration"
    ]?.appliedFilterData,
});

const mapDispatchToProps = (dispatch) => ({
  getProductStoreView: (payload, isV3) =>
    dispatch(getProductStoreView(payload, isV3)),
  getStoreSizeView: (payload, isV3) =>
    dispatch(getStoreSizeView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  applyEditChanges: (payload) => dispatch(applyEditChanges(payload)),
  refreshProductViews: () => dispatch(refreshProductViews()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreView);
