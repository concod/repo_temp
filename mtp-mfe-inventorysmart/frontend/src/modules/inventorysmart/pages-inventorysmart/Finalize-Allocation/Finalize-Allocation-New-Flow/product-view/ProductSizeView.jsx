import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useTranslation, ButtonGroup, Chips, Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep } from "lodash";
import {
  getProductSizeView,
  getProductSizeStoreView,
  refreshProductViews,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { applyEditChanges } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useRefreshSignal from "../../utils/useRefreshSignal";
import ProductSizeStoreView from "./ProductSizeStoreView";
import SetAllProductSizeView from "./SetAllProductSizeView";
import {
  VIEW_BY_STORE,
  VIEW_BY_SIZE,
  EDIT_BY_STORE,
  EDIT_BY_SIZE,
  PACK_COUNT_SIZE,
  getPackCountRowStyle,
} from "./constants";
import { finalizeAllocationContext } from "../../index";
import {
  ALLOC_QTY_GROUP,
  REMAINING_DC_ATA_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_PRODUCT_SIZE,
  EDIT_VIEW_PRODUCT_SIZE_STORE,
} from "../constants/allocationEditConstants";
import {
  applyAllocNullHyphen,
  capValueAtAvailable,
  makeEditGate,
  buildApplyEnvelope,
  notifyApplyResult,
} from "../utils/allocationEditUtils";
import { attachDetailAllocRenderers } from "../utils/allocRenderers";
import { collectDcGridEditableLeaves } from "../utils/storeEditUtils";
import {
  buildProductSizeAllocationUpdates,
  buildProductSizeStoreAllocationUpdates,
  buildProductSizeSetAllUpdates,
  buildSizeStoreSetAllMapping,
  buildSizeStoreSetAllUpdates,
} from "../utils/sizeEditUtils";

// Renderers close over this gate; it reads live edit state from editStateRef.
// Pack-type-id columns edit only on Pack Count rows and eaches only on the
// real size rows — the per-row rule (canEditOnRow) is the renderer's default.
const sizeEditOn = makeEditGate(EDIT_BY_SIZE);

// ─── styles ──────────────────────────────────────────────────────────────────

const useProductSizeStyles = makeStyles((theme) => ({
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
}));

/**
 * Stable size-store detail renderer. Lives at module scope so its identity
 * never changes between renders — ag-Grid won't remount open detail rows.
 * All live props are read from `propsRef.current` at render time.
 */
const SizeStoreDetailInner = ({ data, propsRef }) => {
  const panelProps = propsRef.current || {};
  return (
      <ProductSizeStoreView
        selectedKey={data?.size}
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

// ─── component ───────────────────────────────────────────────────────────────

const ProductSizeView = (props) => {
  const {
    isEditMode = false,
    productEditActive = false,
    onChildEditActiveChange,
  } = props;
  const psClasses = useProductSizeStyles();
  const { t } = useTranslation();

  const finalizeCtx = useContext(finalizeAllocationContext);
  const { editSchema, sessionId } = finalizeCtx || {};
  const editSchemaForView = editSchema?.product_size;

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remount, setRemount] = useState(true);
  const [editByDimension, setEditByDimension] = useState(EDIT_BY_SIZE);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [storeSetAllView, setStoreSetAllView] = useState({
    loading: false,
    rows: [],
    dcDict: [],
    sizeStoreMap: {},
  });
  const storeSetAllRequestRef = useRef(0);
  const tableInstance = useRef(null);
  const latestArticleRef = useRef(null);
  const previousFetchContextRef = useRef(null);

  const editStateRef = useRef({
    isEditMode,
    editByDimension,
    productEditActive,
  });
  editStateRef.current = { isEditMode, editByDimension, productEditActive };

  const originalColumnsRef = useRef([]);
  const originalRowsRef = useRef([]);
  const dcOptionsRef = useRef([]);

  const [editableAllocLeaves, setEditableAllocLeaves] = useState([]);

  // Size-level edit state
  const [sizeEditActive, setSizeEditActive] = useState(false);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const updatedRowEditsRef = useRef([]);

  // Keep the ref in sync with state
  useEffect(() => {
    updatedRowEditsRef.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  // Store-level edit state (for breakdown detail panels)
  const storeEditsMapRef = useRef({});
  const [storeEditActive, setStoreEditActive] = useState(false);

  const onStoreEditsChange = useCallback((sizeKey, payload) => {
    const map = storeEditsMapRef.current;
    if (!payload || payload.edits.length === 0) {
      delete map[sizeKey];
    } else {
      map[sizeKey] = payload;
    }
    setStoreEditActive(Object.keys(map).length > 0);
  }, []);

  // Bag ref for detail panels — stable identity prevents remount
  const detailPropsRef = useRef({});
  detailPropsRef.current = {
    allocationCode: props.allocationCode,
    originalAllocationCode: props.originalAllocationCode,
    planStatus: props.planStatus,
    planType: props.planType,
    isV3: props.isV3,
    selectedArticle: props.selectedArticle,
    displayArticle: props.displayArticle,
    fetchFn: props.getProductSizeStoreView,
    addSnack: props.addSnack,
    editStateRef,
    onSizeEditsChange: onStoreEditsChange,
  };

  // Created once — stable identity prevents ag-Grid remounting size detail rows.
  const detailCellRendererRef = useRef((innerProps) => (
    <SizeStoreDetailInner data={innerProps.data} propsRef={detailPropsRef} />
  ));

  const displaySnackMessages = useCallback((message, variant) => {
    props.addSnack({ message, options: { variant, disableOnClose: true } });
  }, [props.addSnack]);

  const onSelectionChanged = useCallback((event) => {
    const selected = event?.api?.getSelectedRows() || [];
    setSelectedRows(selected);
  }, []);

  // ── Data fetching & column processing ──

  const processColumns = (resData) => {
    dcOptionsRef.current = resData.dc_dict || [];

    const formatted = agGridColumnFormatter(resData.table_config || []);
    applyAbsentKeyHyphen(formatted);
    applyBadgeColumns(formatted);

    // Size column: agGroupCellRenderer for non-Pack Count rows
    formatted.forEach((col) => {
      if (col.field === "size") {
        col.cellRenderer = "agGroupCellRenderer";
      }
    });

    // Disable all alloc leaves and collect editables
    const { editableLeaves } = collectDcGridEditableLeaves(
      formatted,
      dcOptionsRef.current,
      editSchemaForView
    );
    setEditableAllocLeaves(editableLeaves);
    // Show "-" for null/missing alloc values (including __total)
    applyAllocNullHyphen(formatted, ALLOC_QTY_GROUP);

    // Attach ref-gated renderers with canEditOnRow logic
    if (editableLeaves.length > 0) {
      attachDetailAllocRenderers(formatted, editableLeaves, editStateRef, sizeEditOn);
    }

    originalColumnsRef.current = cloneDeep(formatted);
    originalRowsRef.current = cloneDeep(resData.table_data || []);
    return { formatted, tableData: resData.table_data || [] };
  };

  const fetchSizeData = async ({ skipRemount = false } = {}) => {
    const requestedArticle = props.selectedArticle;
    latestArticleRef.current = requestedArticle;

    // Clear any stale edit state from the previous article / fetch cycle.
    storeEditsMapRef.current = {};
    setStoreEditActive(false);
    setSizeEditActive(false);
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
    setSelectedRows([]);

    if (!skipRemount) {
      setRemount(false);
    }
    try {
      setLoading(true);
      props.onLoadingChange?.(true);
      const payload = {
        allocation_code: props.allocationCode,
        article: props.selectedArticle || props.displayArticle,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType || "",
      };
      const res = await props.getProductSizeView(
        payload,
        props.isV3?.includes("productStoreDetails")
      );
      if (latestArticleRef.current !== requestedArticle) return;
      if (res?.data?.status) {
        const resData = res.data.data;
        const { formatted, tableData } = processColumns(resData);
        setColumns(formatted);
        setRows(tableData);
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
    fetchSizeData({ skipRemount: preserveOpenDetails });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedArticle, props.allocationCode, dataMode]);

  // Reset edit-by dimension when the article changes so the chips don't carry
  // forward a preference from the previous article.
  useEffect(() => {
    setEditByDimension(EDIT_BY_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedArticle]);

  // Any applied edit in the product view invalidates this grain. Remount so
  // open size→store detail rows collapse instead of showing stale splits;
  // reopening one refetches it.
  useRefreshSignal(props.productViewRefreshToken, () => {
    if (props.allocationCode && props.selectedArticle) {
      fetchSizeData({ skipRemount: false });
    }
  });

  // Refresh cells when edit mode or dimension changes — no setColumns
  useEffect(() => {
    tableInstance.current?.api?.refreshCells({ force: true });
  }, [isEditMode, editByDimension, productEditActive]);

  // Exit size edit when edit mode off or dimension changes
  useEffect(() => {
    if ((!isEditMode || editByDimension !== EDIT_BY_SIZE) && sizeEditActive) {
      handleCancelSizeEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editByDimension]);

  // Lock Edit by Product while this view (or nested) has Cancel/Apply up
  useEffect(() => {
    const active = sizeEditActive || storeEditActive;
    onChildEditActiveChange?.(active);
    return () => onChildEditActiveChange?.(false);
  }, [sizeEditActive, storeEditActive, onChildEditActiveChange]);

  // ── Size-level edit: activate / cancel ──

  const handleCancelSizeEdit = () => {
    setSizeEditActive(false);
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
    setSelectedRows([]);
    setRows(cloneDeep(originalRowsRef.current));
    tableInstance.current?.api?.deselectAll();
    // redrawRows destroys and recreates cell renderers, resetting InputCell
    // internal state so the original values are rendered after cancel.
    tableInstance.current?.api?.redrawRows();
  };

  // ── Dirty-row tracking ──

  const rowHasChanges = (rowData) => {
    const originalRow = originalRowsRef.current.find(
      (r) => r.size === rowData.size
    );
    if (!originalRow) return false;
    for (const { column_name } of editableAllocLeaves) {
      const newVal = Number(rowData[column_name] ?? 0);
      const oldVal = Number(originalRow[column_name] ?? 0);
      if (newVal !== oldVal) return true;
    }
    return false;
  };

  const updateEditedRowState = (rowData) => {
    const clonedRow = cloneDeep(rowData);
    // Evaluate outside the setter so it closes over the current render's
    // editableAllocLeaves, not a potentially stale snapshot.
    const hasChanges = rowHasChanges(clonedRow);
    setUpdatedRowEdits((prev) => {
      const idx = prev.findIndex((r) => r.size === clonedRow.size);
      if (hasChanges) {
        return idx !== -1
          ? prev.map((r, i) => (i === idx ? clonedRow : r))
          : [...prev, clonedRow];
      }
      return idx !== -1 ? prev.filter((_, i) => i !== idx) : prev;
    });
  };

  // ── Cell edit handlers ──

  const onBlur = (e, data, column, isChanged, value) => {
    if (!isChanged) return;
    const colId = column.colId;
    const isAllocationColumn = colId.startsWith(ALLOC_QTY_GROUP);
    if (!isAllocationColumn) return;

    if (!sizeEditActive) {
      setSizeEditActive(true);
    }

    // Close any open store-detail rows on every edit
    tableInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) node.setExpanded(false);
    });

    // data[colId] is already updated by handleInputChange before onBlur fires,
    // so it holds the user-typed value. Use it directly instead of the wrapper's
    // 5th argument which is the previous render value.
    const numValue = Number(data[colId] ?? 0);
    const originalRow = originalRowsRef.current.find((r) => r.size === data.size);
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
    updateEditedRowState(data);

    const rowNode = tableInstance.current?.api?.getRowNode(data.size);
    if (rowNode) {
      rowNode.setData(data);
      tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
    }
  };

  // ── Build payload for product_size view ──

  const buildAllocationUpdates = () =>
    buildProductSizeAllocationUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      editableAllocLeaves
    );

  const handleSetAllApply = async ({
    activeTab,
    fieldValues,
    mapping: sizeSetAllMapping,
    storeFieldValues: setAllStoreValues,
    storeMapping: setAllStoreMapping,
  }) => {
    const isStore = activeTab === EDIT_BY_STORE;

    let allocationUpdates = [];
    let view = EDIT_VIEW_PRODUCT_SIZE;
    let sizeCode = null;

    if (!isStore) {
      if (!sizeSetAllMapping?.dcGroups) return;
      allocationUpdates = buildProductSizeSetAllUpdates(sizeSetAllMapping, fieldValues);
    } else {
      const selectedSizes = selectedRows
        .map((r) => r?.size)
        .filter((s) => s != null && s !== PACK_COUNT_SIZE)
        .map(String);

      const result = buildSizeStoreSetAllUpdates({
        mapping: storeSetAllMapping,
        sizeStoreMap: storeSetAllView.sizeStoreMap,
        selectedSizes,
        fieldValues: setAllStoreValues,
      });
      allocationUpdates = result.updates;
      sizeCode = result.sizeCode;
      view = EDIT_VIEW_PRODUCT_SIZE_STORE;
    }

    if (allocationUpdates.length === 0) {
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
        view,
        article: props.selectedArticle,
        size: sizeCode,
        allocationUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        if (isStore) {
          storeEditsMapRef.current = {};
          setStoreEditActive(false);
        }
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

  const openStoreSetAll = useCallback(() => {
    const selectedSizes = selectedRows
      .map((r) => r?.size)
      .filter((s) => s != null && String(s) !== PACK_COUNT_SIZE)
      .map(String);
    if (selectedSizes.length === 0) return;

    setStoreSetAllView({
      loading: true,
      rows: [],
      dcDict: [],
      sizeStoreMap: {},
    });

    const requestId = ++storeSetAllRequestRef.current;

    const payload = {
      allocation_code: props.allocationCode,
      article: props.selectedArticle || props.displayArticle,
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode,
        props.allocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType || "",
      size: null,
      set_all_sizes: selectedSizes,
    };

    props
      .getProductSizeStoreView(
        payload,
        props.isV3?.includes("productStoreDetails")
      )
      .then((res) => {
        if (storeSetAllRequestRef.current !== requestId) return;
        if (res?.data?.status) {
          const data = res.data.data || {};
          setStoreSetAllView({
            loading: false,
            rows: data.table_data || [],
            dcDict: data.dc_dict || [],
            sizeStoreMap: data.size_store_map || {},
          });
          return;
        }
        setStoreSetAllView({
          loading: false,
          rows: [],
          dcDict: [],
          sizeStoreMap: {},
        });
      })
      .catch((e) => {
        if (storeSetAllRequestRef.current !== requestId) return;
        const errObj = e?.response?.data;
        displaySnackMessages(
          errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          "error"
        );
        setStoreSetAllView({
          loading: false,
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
    props.getProductSizeStoreView,
    displaySnackMessages,
  ]);

  const storeSetAllMapping = useMemo(
    () =>
      buildSizeStoreSetAllMapping({
        rows: storeSetAllView.rows,
        dcDict: storeSetAllView.dcDict,
      }),
    [storeSetAllView.rows, storeSetAllView.dcDict]
  );

  // ── Store-level edit from breakdown detail panels ──

  const handleCancelStoreEdit = () => {
    storeEditsMapRef.current = {};
    setStoreEditActive(false);
    fetchSizeData({ skipRemount: false });
  };

  const buildStoreAllocationUpdates = () =>
    buildProductSizeStoreAllocationUpdates(storeEditsMapRef.current);

  // ── Apply edited changes via API ──

  const handleApplySizeEdit = async () => {
    const allocationUpdates = buildAllocationUpdates();
    if (allocationUpdates.length === 0) {
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
        view: EDIT_VIEW_PRODUCT_SIZE,
        article: props.selectedArticle,
        allocationUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setSizeEditActive(false);
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

  const handleApplyStoreEdit = async () => {
    const { updates, sizeCode } = buildStoreAllocationUpdates();
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
        view: EDIT_VIEW_PRODUCT_SIZE_STORE,
        article: props.selectedArticle,
        size: sizeCode,
        allocationUpdates: updates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        storeEditsMapRef.current = {};
        setStoreEditActive(false);
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

  // ── Top-right options ──

  const topRightOptions = useMemo(() => {
    const options = [];
    const anyEditActive = sizeEditActive || storeEditActive;
    const showEditChips =
      isEditMode && !anyEditActive && selectedRows.length === 0;

    if (showEditChips) {
      options.push(
        <div key="edit-by-row" className={psClasses.topRightRow}>
          <span className={psClasses.editByLabel}>Edit by</span>
          <div className={psClasses.chipsRow}>
            <Chips
              type="single"
              label="Size"
              isActive={editByDimension === EDIT_BY_SIZE}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_SIZE);
              }}
            />
            <Chips
              type="single"
              label="Store"
              isActive={editByDimension === EDIT_BY_STORE}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_STORE);
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
          onClick={() => {
            setShowSetAllModal(true);
            openStoreSetAll();
          }}
        >
          {t("inventorysmart.setAll")}
        </Button>
      );
    }

    if (sizeEditActive && updatedRowEdits.length > 0) {
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
    } else if (sizeEditActive) {
      // All edits reverted — keep Cancel visible but hide Apply until there is something to submit
      options.push(
        <Button
          key="cancel-size-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelSizeEdit}
        >
          Cancel
        </Button>
      );
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
          onClick={handleApplyStoreEdit}
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
    sizeEditActive,
    storeEditActive,
    selectedRows.length,
    updatedRowEdits.length,
    editableAllocLeaves,
    openStoreSetAll,
    t,
  ]);

  // Nested provider so ProductSizeStoreView can read editByDimension
  const sizeFinalizeCtx = useMemo(
    () => ({ ...(finalizeCtx || {}), editByDimension, productEditActive }),
    [finalizeCtx, editByDimension, productEditActive]
  );

  return (
    <finalizeAllocationContext.Provider value={sizeFinalizeCtx}>
      <Loader loader={loading} minHeight="400px">
        {remount && (
          <div className={psClasses.tableWrap}>
            <AgGridComponent
              columns={columns}
              rowdata={rows}
              uniqueRowId="size"
              tableHeader={t("inventorysmart.finalize.recommendation.sizeBreakdown")}
              sizeColumnsToFitFlag
              suppressFieldDotNotation
              pagination={false}
              getRowStyle={getPackCountRowStyle}
              loadTableInstance={(p) => {
                tableInstance.current = p;
              }}
              masterDetail
              detailRowAutoHeight
              keepDetailRows
              detailCellRenderer={detailCellRendererRef.current}
              isRowMaster={(dataItem) => dataItem?.size !== "Pack Count"}
              downloadAsExcel={rows.length > 0}
              showDownloadTooltip
              toPrependContent={props.excelDownloadMetaData}
              topRightOptions={topRightOptions}
              onBlur={onBlur}
              rowSelection="multiple"
              selectAllHeaderComponent
              onSelectionChanged={onSelectionChanged}
              topCenterOptions={
                <ButtonGroup
                  selectedOption={props.activeView || VIEW_BY_SIZE}
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
      <SetAllProductSizeView
        open={showSetAllModal}
        onClose={() => {
          storeSetAllRequestRef.current += 1;
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
        storeMapping={storeSetAllMapping}
        storeLoading={storeSetAllView.loading}
      />
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
  excelDownloadMetaData:
    store.inventorysmartReducer.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.excelDownloadMetaData,
});

const mapDispatchToProps = (dispatch) => ({
  getProductSizeView: (payload, isV3) =>
    dispatch(getProductSizeView(payload, isV3)),
  getProductSizeStoreView: (payload, isV3) =>
    dispatch(getProductSizeStoreView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  applyEditChanges: (payload) => dispatch(applyEditChanges(payload)),
  refreshProductViews: () => dispatch(refreshProductViews()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSizeView);
