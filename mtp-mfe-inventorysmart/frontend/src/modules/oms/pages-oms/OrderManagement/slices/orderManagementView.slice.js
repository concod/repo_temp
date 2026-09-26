import { createSlice } from "@reduxjs/toolkit";

// Inlined from the deleted grid/components/PivotPanel/pivotPanel.util.js
// — these two helpers only depend on pivotOrder shape, no external imports.
const DC_DIMENSION_ID = "DC";
function isPivotOrderValid(pivotOrder) {
  let lastRank = Number.NEGATIVE_INFINITY;
  let lastRankedId = null;
  for (let index = 0; index < pivotOrder.length; index += 1) {
    const dimension = pivotOrder[index];
    if (dimension.rank == null || dimension.id === DC_DIMENSION_ID) continue;
    if (dimension.rank < lastRank) {
      return {
        ok: false,
        conflict: { lowerRanked: lastRankedId, higherRanked: dimension.id },
      };
    }
    lastRank = dimension.rank;
    lastRankedId = dimension.id;
  }
  return { ok: true };
}
function diffPivotOrder(originalOrder, currentOrder) {
  if (originalOrder.length !== currentOrder.length) return true;
  for (let index = 0; index < originalOrder.length; index += 1) {
    if (originalOrder[index].id !== currentOrder[index].id) return true;
  }
  return false;
}
import {
  buildEmptyViewDetails,
  cloneViewDetails,
  diffViewDetails,
  migrateLegacyPivotOrderToViewDetails,
  projectViewDetailsToPivotOrder,
} from "./viewDetails.util.js";
import {
  getColumnTimeSubDimensions,
  resolveFiscalViewFromColumnTime,
} from "../utils/timeColumnStructure.util.js";
import { ROQ_PLACEMENT_DATE } from "../constants.js";
import { normalizeRoqDateTab } from "../utils/timelineEditMode.util.js";

/** Drop pending edits when filter / pivot scope changes. */
function resetEditSessionState(state) {
  state.isCellDirty = false;
  state.grandTotal = null;
  state.cellEditMarkers = {};
  state.undoStack = [];
  state.redoStack = [];
  state.isUndoInProgress = false;
}

function cellEditMarkerKey(rowUid, colId) {
  return `${rowUid}::${colId}`;
}

const initialState = {
  entryLevel: null,
  // FE-only LIFO of successful auto-saved edits for Undo / View Edited Only.
  // Each edit auto-saves independently — there is no backend session overlay.
  undoStack: [],
  // Entries popped off undoStack via Undo land here so Redo can replay them.
  // A fresh user edit (never a redo replay) clears this — same convention as
  // browser/editor undo-redo: new work invalidates the "future" branch.
  redoStack: [],
  isUndoInProgress: false,
  hlsFilterContext: null,
  hlsFilterSignature: null,
  availableDimensions: [],
  availableDCs: [],
  defaultOrder: [],
  pivotOrder: [],
  appliedPivotOrder: [],
  selectedKpi: null,
  kpiOptions: [],
  orderQtyEditableLevels: null,
  selectedRoqDateTab: ROQ_PLACEMENT_DATE,
  distributionMethod: null,
  setAllConfig: null,
  fiscalView: "week",
  hlsDateFilter: null,
  hlsWeekColumnCount: 8,
  hlsMonthColumnCount: 6,
  // Number of consecutive months clubbed into one Month-view column. 1 => one
  // column per month (the "1M" tab), 3 => "3M" (Apr-Jun, Jul-Sep…), 6 => "6M".
  // Display-only clubbing: row data stays granular, columns sum their members
  // (see utils/periodDescriptors.util.js). Clubbed columns (>1) are read-only.
  monthBucketSize: 1,
  fiscalCalendar: {
    placement: { fiscalCalendarData: [], weekStartDay: 0 },
    receipt: { fiscalCalendarData: [], weekStartDay: 0 },
  },
  selectedDateRange: {
    roq_placement_date: null,
    roq_receipt_date: null,
  },
  ssrmRefreshTick: 0,
  initialPivotOrder: [],
  selectedRowKeys: [],
  // Parallel to selectedRowKeys: full dimensionPath arrays for each
  // shallowest selected node. Keys alone drop ancestor context ("l2::X"
  // loses which l0/l1 it sits under); traces keep the full breadcrumb so
  // Product Details / Set All can build selected_hierarchies payloads.
  selectedRowTraces: [],
  // isSelectAll = true means "the user picked the entire filter universe"
  // (Select All), which carries forward into BE mutation payloads so the
  // backend can act on the full filtered set rather than the loaded SSRM
  // page. isSelectAll = false means a normal Select Page / per-row selection
  // — `selectedRowKeys` enumerates exactly what the user picked.
  isSelectAll: false,
  grandTotal: null,
  cellEditMarkers: {},
  isPivotDirty: false,
  isCellDirty: false,
  isValidView: false,
  isBootstrapping: false,
  bootstrapError: null,
  isSaving: false,
  saveError: null,
  // Pivot model v2 (rule #60). `viewDetails` holds the rich pivot shape
  // (row + column + measure axes, calculated fields, view settings) used by
  // View Management v2 and the future cross-tab table engine. v1 callers
  // continue to read `pivotOrder` / `appliedPivotOrder`; v2 callers read
  // `viewDetails` / `appliedViewDetails`. Both shapes are kept in sync on
  // every pivot mutation via the projection helpers in `viewDetails.util.js`.
  viewDetails: buildEmptyViewDetails(),
  appliedViewDetails: buildEmptyViewDetails(),
  isViewDirty: false,
  // Pivot Panel v2 working state. Mirrors the Plansmart pivot.slice fields
  // the PivotPanel / RenderDimension / MetricsPanel components subscribe
  // to. Kept on this slice (not a sibling) because they share lifecycle
  // with the same view-details draft.
  isPivotPanelOpen: false,
  pivotDescriptionData: null,
  // Flat ordered list of `${measure.name}_${version}` ids the user has
  // checked in the metrics overlay. Drives the SelectedMetric vertical
  // list inside the Measures axis card.
  selectedIds: [],
  // Resolved measure rows keyed by selectedId — { id, name, version,
  // label }. The measures overlay populates this so SelectedMetric can
  // render rows without re-doing the lookup.
  kpiMeasures: [],
  calculatedFieldsSelection: { variance: [], contribution: [] },
  // tempViewDetails is the snapshot the user clicked Apply with — used
  // when Save & Apply needs to round-trip the panel state through the
  // SaveViewModal before the panel closes.
  tempViewDetails: null,
  pivotAttributeFilters: {},
  appliedPivotAttributeFilters: {},
  // Page-owned view bootstrap (list → details/template) before grid mount.
  viewBootstrapStatus: "idle",
  viewBootstrapError: null,
  viewBootstrapScreenId: null,
};

const orderManagementViewSlice = createSlice({
  name: "orderManagementViewSlice",
  initialState,
  reducers: {
    bootstrapStarted(state) {
      state.isBootstrapping = true;
      state.bootstrapError = null;
    },
    viewBootstrapStarted(state, action) {
      state.viewBootstrapStatus = "loading";
      state.viewBootstrapError = null;
      state.viewBootstrapScreenId = action.payload?.screenId ?? null;
    },
    viewBootstrapSucceeded(state) {
      state.viewBootstrapStatus = "ready";
      state.viewBootstrapError = null;
    },
    viewBootstrapFailed(state, action) {
      state.viewBootstrapStatus = "error";
      state.viewBootstrapError = action.payload || "View bootstrap failed";
    },
    resetViewBootstrap(state) {
      state.viewBootstrapStatus = "idle";
      state.viewBootstrapError = null;
      state.viewBootstrapScreenId = null;
    },
    bootstrapSucceeded(state, action) {
      const {
        entryLevel,
        hlsFilterContext,
        hlsFilterSignature,
        availableDimensions,
        availableDCs,
        defaultOrder,
        defaultKpi,
        kpiOptions,
        grandTotal,
        selectedRoqDateTab,
        distributionMethod,
        orderQtyEditableLevels,
      } = action.payload;

      const normalizedRoqDateTab = normalizeRoqDateTab(
        selectedRoqDateTab ??
          hlsFilterContext?.selectedRoqDateTab ??
          ROQ_PLACEMENT_DATE
      );

      const dimensionsById = new Map(
        availableDimensions.map((dimension) => [dimension.id, dimension])
      );
      const initialPivot = defaultOrder
        .map((dimensionId) => dimensionsById.get(dimensionId))
        .filter(Boolean);

      state.entryLevel = entryLevel;
      state.undoStack = [];
      state.redoStack = [];
      state.isUndoInProgress = false;
      state.hlsFilterContext = hlsFilterContext;
      state.hlsFilterSignature = hlsFilterSignature;
      state.availableDimensions = availableDimensions;
      state.availableDCs = availableDCs;
      state.defaultOrder = defaultOrder;
      state.pivotOrder = initialPivot;
      state.appliedPivotOrder = initialPivot;
      state.initialPivotOrder = initialPivot;
      const initialViewDetails = migrateLegacyPivotOrderToViewDetails(
        initialPivot
      );
      state.viewDetails = initialViewDetails;
      state.appliedViewDetails = cloneViewDetails(initialViewDetails);
      state.isViewDirty = false;
      state.selectedKpi = defaultKpi;
      state.kpiOptions = kpiOptions;
      state.selectedRoqDateTab = normalizedRoqDateTab;
      state.distributionMethod = distributionMethod || null;
      state.orderQtyEditableLevels = Array.isArray(orderQtyEditableLevels)
        ? orderQtyEditableLevels
        : null;
      state.grandTotal = grandTotal || null;
      state.isPivotDirty = false;
      state.isCellDirty = false;
      state.isValidView = initialPivot.length > 0;
      state.isBootstrapping = false;
      state.bootstrapError = null;
    },
    bootstrapFailed(state, action) {
      state.isBootstrapping = false;
      state.bootstrapError = action.payload || "bootstrap failed";
      state.isValidView = false;
    },
    setPivotOrderDraft(state, action) {
      state.pivotOrder = action.payload;
      state.isPivotDirty = diffPivotOrder(
        state.appliedPivotOrder,
        action.payload
      );
      // Mirror into v2 row axis so v2 readers see the same pending pivot
      // even when the user is dragging in the v1 panel.
      state.viewDetails = migrateLegacyPivotOrderToViewDetails(action.payload);
      state.isViewDirty = diffViewDetails(
        state.appliedViewDetails,
        state.viewDetails
      );
    },
    setViewDetailsDraft(state, action) {
      const nextViewDetails = action.payload || buildEmptyViewDetails();
      state.viewDetails = nextViewDetails;
      state.isViewDirty = diffViewDetails(
        state.appliedViewDetails,
        nextViewDetails
      );
      // Project the v2 row + column axes back into v1 pivotOrder so the v1
      // colDef builder + bootstrap consumers stay live behind the feature
      // flag. `time` and `measures` are excluded — time flips fiscalView at
      // apply-time and measures contribute no pivot level. True cross-tab
      // columns (Product/Location on columns) fold into the row hierarchy
      // for now (deferred — see rollout-and-regression.md). De-duped by id.
      const projected = projectViewDetailsToPivotOrder(nextViewDetails);
      state.pivotOrder = projected;
      state.isPivotDirty = diffPivotOrder(state.appliedPivotOrder, projected);
    },
    applyPivotOrder(state) {
      if (!state.pivotOrder?.length) return;
      const validation = isPivotOrderValid(state.pivotOrder);
      if (!validation.ok) return;
      const pivotChanged = diffPivotOrder(
        state.appliedPivotOrder,
        state.pivotOrder
      );
      const viewDetailsChanged = diffViewDetails(
        state.appliedViewDetails,
        state.viewDetails
      );
      state.appliedPivotOrder = state.pivotOrder;
      state.appliedViewDetails = cloneViewDetails(state.viewDetails);
      state.isPivotDirty = false;
      state.isViewDirty = false;
      state.isValidView = state.pivotOrder.length > 0;
      const columnTimeSubs = getColumnTimeSubDimensions(state.viewDetails);
      const resolvedFiscalView = resolveFiscalViewFromColumnTime(
        columnTimeSubs
      );
      let fiscalViewChanged = false;
      if (resolvedFiscalView && state.fiscalView !== resolvedFiscalView) {
        state.fiscalView = resolvedFiscalView;
        fiscalViewChanged = true;
      }
      if (pivotChanged || viewDetailsChanged || fiscalViewChanged) {
        resetEditSessionState(state);
        state.ssrmRefreshTick += 1;
      }
      // Selection keys are tied to the previous pivot's row identities
      // (group keys like "L4::Jeans", leaf keys like "leaf::TSH-M-001::DC1").
      // Once the pivot changes, those keys no longer correspond to any row
      // in the new view, but the bulk-action toolbar (Set All / Product
      // Details / Approve Orders) keeps rendering because `selectedRowKeys`
      // is non-empty — and worse, hides the KPI cluster behind it. Reset.
      state.selectedRowKeys = [];
      state.selectedRowTraces = [];
      state.isSelectAll = false;
    },
    /** Draft + apply in one reducer tick — avoids /columns firing on stale applied pivot. */
    applySavedViewDetails(state, action) {
      const payload = action.payload;
      const nextViewDetails =
        payload?.viewDetails ?? payload ?? buildEmptyViewDetails();
      const viewId =
        payload?.viewId ?? payload?.view_id ?? nextViewDetails?.view_id ?? null;
      state.viewDetails = nextViewDetails;
      state.isViewDirty = false;
      const projected = projectViewDetailsToPivotOrder(nextViewDetails);
      state.pivotOrder = projected;
      state.isPivotDirty = false;
      if (!state.pivotOrder?.length) return;
      const validation = isPivotOrderValid(state.pivotOrder);
      if (!validation.ok) return;
      const pivotChanged = diffPivotOrder(
        state.appliedPivotOrder,
        state.pivotOrder
      );
      const viewDetailsChanged = diffViewDetails(
        state.appliedViewDetails,
        state.viewDetails
      );
      state.appliedPivotOrder = state.pivotOrder;
      state.appliedViewDetails = cloneViewDetails(state.viewDetails);
      if (viewId != null) {
        state.appliedViewDetails.view_id = viewId;
      }
      state.isValidView = state.pivotOrder.length > 0;
      const columnTimeSubs = getColumnTimeSubDimensions(state.viewDetails);
      const resolvedFiscalView = resolveFiscalViewFromColumnTime(
        columnTimeSubs
      );
      let fiscalViewChanged = false;
      if (resolvedFiscalView && state.fiscalView !== resolvedFiscalView) {
        state.fiscalView = resolvedFiscalView;
        fiscalViewChanged = true;
      }
      if (pivotChanged || viewDetailsChanged || fiscalViewChanged) {
        resetEditSessionState(state);
        state.ssrmRefreshTick += 1;
      }
      state.selectedRowKeys = [];
      state.selectedRowTraces = [];
      state.isSelectAll = false;
    },
    resetPivotOrder(state) {
      state.pivotOrder = state.appliedPivotOrder;
      state.viewDetails = cloneViewDetails(state.appliedViewDetails);
      state.isPivotDirty = false;
      state.isViewDirty = false;
    },
    setSelectedKpi(state, action) {
      state.selectedKpi = action.payload;
    },
    setSelectedRoqDateTab(state, action) {
      const normalizedRoqDateTab = normalizeRoqDateTab(action.payload);
      if (state.selectedRoqDateTab === normalizedRoqDateTab) {
        return;
      }
      state.selectedRoqDateTab = normalizedRoqDateTab;
      state.isCellDirty = false;
      if (state.hlsFilterContext) {
        state.hlsFilterContext = {
          ...state.hlsFilterContext,
          selectedRoqDateTab: normalizedRoqDateTab,
        };
      }
    },
    setDistributionMethod(state, action) {
      const next = action.payload || null;
      if (state.distributionMethod === next) return;
      // Stacks are scoped to a single distribution strategy — clear history
      // on a real user change so Undo never replays under a different method.
      // Skip when distributionMethod is still null (mount-time default seed
      // from DistributionMethodSelect) so bootstrap never wipes an existing stack.
      if (state.distributionMethod != null) {
        state.undoStack = [];
        state.redoStack = [];
        state.isUndoInProgress = false;
      }
      state.distributionMethod = next;
    },
    setSetAllConfig(state, action) {
      state.setAllConfig = action.payload || null;
    },
    setFiscalView(state, action) {
      const next = action.payload;
      if (next !== "week" && next !== "month") {
        return;
      }
      if (state.fiscalView === next) {
        return;
      }
      state.fiscalView = next;
      state.ssrmRefreshTick += 1;
    },
    setHlsTimeSelection(state, action) {
      const {
        dateFilter,
        weekColumnCount,
        monthColumnCount,
        monthBucketSize,
        startFw,
        endFw,
      } = action.payload || {};
      const nextWeekColumnCount =
        Number.isFinite(weekColumnCount) && weekColumnCount > 0
          ? weekColumnCount
          : state.hlsWeekColumnCount;
      const nextMonthColumnCount =
        Number.isFinite(monthColumnCount) && monthColumnCount > 0
          ? monthColumnCount
          : state.hlsMonthColumnCount;
      const nextMonthBucketSize =
        Number.isFinite(monthBucketSize) && monthBucketSize > 0
          ? monthBucketSize
          : state.monthBucketSize;
      const nextDateFilter = dateFilter ?? state.hlsDateFilter;
      const context = state.hlsFilterContext;
      const nextStartFw =
        startFw != null ? startFw : context?.selected_start_week_date ?? null;
      const nextEndFw =
        endFw != null ? endFw : context?.selected_end_week_date ?? null;

      const isUnchanged =
        state.hlsDateFilter === nextDateFilter &&
        state.hlsWeekColumnCount === nextWeekColumnCount &&
        state.hlsMonthColumnCount === nextMonthColumnCount &&
        state.monthBucketSize === nextMonthBucketSize &&
        (context?.date_filter ?? null) === nextDateFilter &&
        (context?.selected_start_week_date ?? null) === nextStartFw &&
        (context?.selected_end_week_date ?? null) === nextEndFw;
      if (isUnchanged) {
        return;
      }

      state.hlsDateFilter = nextDateFilter;
      state.hlsWeekColumnCount = nextWeekColumnCount;
      state.hlsMonthColumnCount = nextMonthColumnCount;
      state.monthBucketSize = nextMonthBucketSize;
      if (context) {
        state.hlsFilterContext = {
          ...context,
          ...(dateFilter != null ? { date_filter: dateFilter } : {}),
          ...(startFw != null ? { selected_start_week_date: startFw } : {}),
          ...(endFw != null ? { selected_end_week_date: endFw } : {}),
        };
      }
    },
    setFiscalCalendar(state, action) {
      state.fiscalCalendar = action.payload || {
        placement: { fiscalCalendarData: [], weekStartDay: 0 },
        receipt: { fiscalCalendarData: [], weekStartDay: 0 },
      };
    },
    setSelectedDateRange(state, action) {
      const { tab, range } = action.payload || {};
      if (!tab) return;
      state.selectedDateRange = {
        ...state.selectedDateRange,
        [tab]: range,
      };
    },
    bumpSsrmRefreshTick(state) {
      state.ssrmRefreshTick += 1;
    },
    setPivotAttributeFiltersDraft(state, action) {
      state.pivotAttributeFilters = action.payload || {};
    },
    applyPivotAttributeFilters(state) {
      state.appliedPivotAttributeFilters = {
        ...(state.pivotAttributeFilters || {}),
      };
      resetEditSessionState(state);
      state.ssrmRefreshTick += 1;
    },
    resetPivotAttributeFilters(state) {
      state.pivotAttributeFilters = {};
      state.appliedPivotAttributeFilters = {};
      resetEditSessionState(state);
      state.ssrmRefreshTick += 1;
    },
    applyFilterContextChange(state, action) {
      // Live-applied DC / non-cascaded filter change from the parent
      // DcFilter shell. Update the slice's hlsFilterContext snapshot so
      // useOrderManagementDatasource picks up the new filter scope on the
      // next SSRM call, bump the refresh tick to force a purge, and
      // clear selection keys because they reference rows that may not
      // exist under the new filter scope (rule #44).
      const { selectedDcs, selectedFilters } = action.payload || {};
      if (state.hlsFilterContext == null) return;
      const nextFilters = Array.isArray(selectedFilters) ? selectedFilters : [];
      const nextDcs = Array.isArray(selectedDcs) ? selectedDcs : [];
      state.hlsFilterContext = {
        ...state.hlsFilterContext,
        selectedDcs: nextDcs,
        selectedFilters: nextFilters,
      };
      state.hlsFilterSignature = JSON.stringify({
        filters: nextFilters,
        dcs: nextDcs,
      });
      state.selectedRowKeys = [];
      state.selectedRowTraces = [];
      state.isSelectAll = false;
      resetEditSessionState(state);
      state.ssrmRefreshTick += 1;
    },
    resetPivotOrderToInitial(state) {
      state.pivotOrder = state.initialPivotOrder.length
        ? state.initialPivotOrder
        : state.appliedPivotOrder;
      state.isPivotDirty = diffPivotOrder(
        state.appliedPivotOrder,
        state.pivotOrder
      );
    },
    setSelectedRowKeys(state, action) {
      state.selectedRowKeys = Array.isArray(action.payload)
        ? action.payload
        : [];
      if (state.selectedRowKeys.length === 0) {
        state.selectedRowTraces = [];
      }
      // Any per-row mutation cancels a prior "Select All universe" intent —
      // once the user starts deselecting individual rows, the selection no
      // longer represents the full filter universe. Callers that want to
      // preserve isSelectAll (e.g. handleSelectAllUniverse) must dispatch
      // setIsSelectAll(true) AFTER setSelectedRowKeys to override.
      state.isSelectAll = false;
    },
    setSelectedRowTraces(state, action) {
      state.selectedRowTraces = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setIsSelectAll(state, action) {
      state.isSelectAll = Boolean(action.payload);
    },
    setGrandTotal(state, action) {
      state.grandTotal = action.payload || null;
    },
    pushToUndoStack(state, action) {
      if (state.isUndoInProgress) return;
      const entry = action.payload;
      if (!entry) return;
      if (!Array.isArray(state.undoStack)) state.undoStack = [];
      state.undoStack.push(entry);
    },
    popFromUndoStack(state) {
      if (!Array.isArray(state.undoStack) || state.undoStack.length === 0) {
        return;
      }
      state.undoStack.pop();
    },
    clearUndoStack(state) {
      state.undoStack = [];
      state.redoStack = [];
      state.isUndoInProgress = false;
    },
    setUndoInProgress(state, action) {
      state.isUndoInProgress = Boolean(action.payload);
    },
    /** Undo moves an entry from undoStack → redoStack (browser/editor convention). */
    pushToRedoStack(state, action) {
      const entry = action.payload;
      if (!entry) return;
      if (!Array.isArray(state.redoStack)) state.redoStack = [];
      state.redoStack.push(entry);
    },
    popFromRedoStack(state) {
      if (!Array.isArray(state.redoStack) || state.redoStack.length === 0) {
        return;
      }
      state.redoStack.pop();
    },
    /** A brand-new user edit invalidates whatever was available to redo. */
    clearRedoStack(state) {
      state.redoStack = [];
    },
    setCellDirty(state, action) {
      state.isCellDirty = Boolean(action.payload);
    },
    clearDirtyFlags(state) {
      state.isPivotDirty = false;
      state.isCellDirty = false;
    },
    markCellEditImpact(state, action) {
      const { editedRowUid, colId, affectedRowUids } = action.payload || {};
      if (editedRowUid == null || !colId) return;
      if (!state.cellEditMarkers) state.cellEditMarkers = {};
      state.cellEditMarkers[cellEditMarkerKey(editedRowUid, colId)] = "edited";
      // Marker value is "updated" (BE's own field name) — never a third
      // made-up label; see the matching comment in mergeCellEditMarkers.
      (affectedRowUids || []).forEach((rowUid) => {
        if (rowUid == null || String(rowUid) === String(editedRowUid)) return;
        const key = cellEditMarkerKey(rowUid, colId);
        if (state.cellEditMarkers[key] !== "edited") {
          state.cellEditMarkers[key] = "updated";
        }
      });
    },
    clearCellEditMarkers(state) {
      state.cellEditMarkers = {};
    },
    saveStarted(state) {
      state.isSaving = true;
      state.saveError = null;
    },
    saveSucceeded(state) {
      state.isSaving = false;
      state.saveError = null;
      state.isCellDirty = false;
      state.cellEditMarkers = {};
      state.undoStack = [];
      state.redoStack = [];
      state.isUndoInProgress = false;
    },
    saveFailed(state, action) {
      state.isSaving = false;
      state.saveError = action.payload || "save failed";
    },
    setIsPivotPanelOpen(state, action) {
      state.isPivotPanelOpen = Boolean(action.payload);
    },
    setPivotDescriptionData(state, action) {
      state.pivotDescriptionData = action.payload || null;
    },
    setSelectedIds(state, action) {
      state.selectedIds = Array.isArray(action.payload) ? action.payload : [];
    },
    setKpiMeasures(state, action) {
      state.kpiMeasures = Array.isArray(action.payload) ? action.payload : [];
    },
    setCalculatedFieldsSelection(state, action) {
      state.calculatedFieldsSelection = action.payload || {
        variance: [],
        contribution: [],
      };
    },
    setTempViewDetails(state, action) {
      state.tempViewDetails = action.payload || null;
    },
    resetOrderManagementView(state) {
      const preserved = {
        viewBootstrapStatus: state.viewBootstrapStatus,
        viewBootstrapError: state.viewBootstrapError,
        viewBootstrapScreenId: state.viewBootstrapScreenId,
        fiscalCalendar: state.fiscalCalendar,
        setAllConfig: state.setAllConfig,
      };
      return { ...initialState, ...preserved };
    },
  },
});

export const {
  bootstrapStarted,
  bootstrapSucceeded,
  bootstrapFailed,
  viewBootstrapStarted,
  viewBootstrapSucceeded,
  viewBootstrapFailed,
  resetViewBootstrap,
  setPivotOrderDraft,
  setViewDetailsDraft,
  applyPivotOrder,
  applySavedViewDetails,
  resetPivotOrder,
  setSelectedKpi,
  setSelectedRoqDateTab,
  setDistributionMethod,
  setSetAllConfig,
  setFiscalView,
  setHlsTimeSelection,
  setFiscalCalendar,
  setSelectedDateRange,
  bumpSsrmRefreshTick,
  setPivotAttributeFiltersDraft,
  applyPivotAttributeFilters,
  resetPivotAttributeFilters,
  applyFilterContextChange,
  resetPivotOrderToInitial,
  setSelectedRowKeys,
  setSelectedRowTraces,
  setIsSelectAll,
  setGrandTotal,
  pushToUndoStack,
  popFromUndoStack,
  clearUndoStack,
  setUndoInProgress,
  pushToRedoStack,
  popFromRedoStack,
  clearRedoStack,
  setCellDirty,
  clearDirtyFlags,
  markCellEditImpact,
  clearCellEditMarkers,
  saveStarted,
  saveSucceeded,
  saveFailed,
  setIsPivotPanelOpen,
  setPivotDescriptionData,
  setSelectedIds,
  setKpiMeasures,
  setCalculatedFieldsSelection,
  setTempViewDetails,
  resetOrderManagementView,
} = orderManagementViewSlice.actions;

export const selectOrderManagementView = (store) =>
  store?.omsReducer?.matrixSummaryReducer?.orderManagementViewReducer ||
  initialState;

export const selectIsAnyDirty = (store) => {
  const slice = selectOrderManagementView(store);
  return slice.isPivotDirty || slice.isCellDirty;
};

export const selectIsPivotPanelOpen = (store) =>
  selectOrderManagementView(store).isPivotPanelOpen;

export const selectUndoStack = (store) =>
  selectOrderManagementView(store).undoStack || [];

export const selectRedoStack = (store) =>
  selectOrderManagementView(store).redoStack || [];

export const selectIsUndoInProgress = (store) =>
  selectOrderManagementView(store).isUndoInProgress;

export const selectPivotDescriptionData = (store) =>
  selectOrderManagementView(store).pivotDescriptionData;

export const selectSelectedIds = (store) =>
  selectOrderManagementView(store).selectedIds || [];

export const selectKpiMeasures = (store) =>
  selectOrderManagementView(store).kpiMeasures || [];

export const selectCalculatedFieldsSelection = (store) =>
  selectOrderManagementView(store).calculatedFieldsSelection || {
    variance: [],
    contribution: [],
  };

export const selectTempViewDetails = (store) =>
  selectOrderManagementView(store).tempViewDetails;

export const selectCellEditMarkers = (store) =>
  selectOrderManagementView(store).cellEditMarkers || {};

export default orderManagementViewSlice.reducer;
