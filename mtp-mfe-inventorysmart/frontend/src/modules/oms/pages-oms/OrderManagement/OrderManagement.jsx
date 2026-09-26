import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch, useStore } from "react-redux";
import { get } from "lodash";
import moment from "moment";
import { ButtonGroup, Chips, Switch, Button, Prompt } from "impact-ui-v3";
import "core/Utils/agGrid/ag-theme-mtp.scss";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import AutoSavedIcon from "assets/oms/AutoSavedIcon.svg";
import SavingIcon from "assets/oms/SavingIcon.svg";
import UndoIcon from "assets/oms/UndoIcon.svg";
import RedoIcon from "assets/oms/RedoIcon.svg";

// ── OMS view management ──────────────────────────────────────────────────────
import ActionContainer from "./ActionContainer/ActionContainer.jsx";
import CustomActionButton from "../../shared/components/CustomActionButton/CustomActionButton.jsx";
import PivotPanel from "../../shared/components/PivotPanel/PivotPanel";
import PivotFilters from "../../shared/components/PivotPanel/components/PivotFilters/PivotFilters";
import { PivotHostProvider } from "../../shared/pivot/PivotHostContext";
import "./OrderManagementLayout.css";
import {
  selectIsPivotPanelOpen,
  setPivotPayload,
  selectTempViewDetails,
  selectPivotPayload,
  selectSelectedIds,
} from "./slices/pivot.slice";
import {
  selectActiveViewDetail,
  selectIsViewDetailsLoading,
} from "../../shared/ViewManagement/slices/viewManagement.slice";
import { useScreenId } from "../../shared/ViewManagement/viewManagement.util";
import { getScreensMapping } from "../../shared/ViewManagement/api/screensMapping.api";
import { getUserRole } from "../../shared/ViewManagement/api/userRole.api";
import { getTemplateDetails } from "../../shared/ViewManagement/api/viewManagementTemplate.api";
import { bootstrapOrderManagementView } from "./api/bootstrapOrderManagementView.api.js";
import { ORDER_MANAGEMENT_V3_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  ERROR_MESSAGE,
} from "modules/oms/constants-oms/stringConstants.js";
import {
  mergeOrderManagementToolbarScreenConfig,
  resolveDefaultMonthTab,
  resolveOrderManagementTabListWithFallback,
} from "./utils/orderManagementToolbarConfig.util.js";

// ── Slices ────────────────────────────────────────────────────────────────────
import {
  bootstrapSucceeded,
  applySavedViewDetails,
  resetOrderManagementView as resetMatrixSummaryView,
  selectOrderManagementView as selectMatrixSummaryView,
  setSelectedRowKeys,
  setSelectedRowTraces,
  setIsSelectAll,
  setCellDirty,
  setGrandTotal,
  resetViewBootstrap,
  applyFilterContextChange,
  saveStarted,
  saveSucceeded,
  saveFailed,
  markCellEditImpact,
  selectCellEditMarkers,
  pushToUndoStack,
  popFromUndoStack,
  clearUndoStack,
  setUndoInProgress,
  pushToRedoStack,
  popFromRedoStack,
  clearRedoStack,
  clearCellEditMarkers,
  setSetAllConfig,
} from "./slices/orderManagementView.slice.js";
import {
  createBlastRadiusLoadingController,
  findRowNodesByUid,
  mergeCellEditMarkers,
  refreshOrderQtyEditMarkerCells,
  resolveOrderQtyColId,
} from "./utils/cellEditMarkers.util.js";
import { PRESERVE_OM_VIEW_SESSION_KEY } from "./constants/navigation.constants.js";
import {
  selectOrderManagementScreenConfig,
  selectHighLevelSummaryScreenConfig,
  selectEditableFromLevel,
  selectShowDistributionMethod,
  selectDistributionMethodOptions,
  selectViewBootstrapStatus,
  selectViewBootstrapError,
} from "./slices/orderManagementView.selectors.js";
// ── Column definitions ────────────────────────────────────────────────────────
import {
  buildHierarchyColumn,
  GRAND_TOTAL_ROW_ID,
} from "./components/orderManagement.colDefs.js";
import { getHierarchyLevelBorderStyle } from "./utils/hierarchyLevelStyle.util.js";
import {
  selectOrderManagementColDef,
  selectOrderManagementLoader,
  selectRowDimensions,
  setOrderManagementResp,
} from "./slices/grid.slice.js";
// ── UI components ─────────────────────────────────────────────────────────────
import OrderManagementBottomLegend from "./components/OrderManagementBottomLegend.jsx";
import OrderManagementCalendarToolbar from "./components/OrderManagementCalendarToolbar.jsx";
import RowSelectionActionCluster from "./components/RowSelectionActionCluster.jsx";
import DistributionMethodSelect from "./components/DistributionMethodSelect.jsx";
import { GRID_HEIGHT_CAP } from "modules/oms/utils-oms/agGridPageSize";
// ── Utilities ─────────────────────────────────────────────────────────────────
import {
  buildPeriodDescriptors,
  flattenDescriptorMembers,
} from "./utils/periodDescriptors.util.js";
import { applyHlsTimeSelectionToMatrixView } from "./utils/hlsTimeRangeSync.util.js";
import { getMaxEditableReceiptDateV3 } from "./api/orderManagementMaxReceiptDate.api.js";
import {
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  collectEditableColIds,
  deriveCostColId,
  deriveEachesColId,
  formatBeColumnsForAgGrid,
  isEditableReceiptDateColumn,
  resolveColumnFiscalMembers,
} from "./utils/orderManagementColumns.util.js";
import { resolveOmIsV3Schema } from "./utils/resolveOmIsV3Schema.util.js";
import { normalizeOmDeliveryDate } from "./utils/normalizeOmDeliveryDate.util.js";
import {
  createLockState,
  createOrderManagementLockHandlers,
} from "./utils/orderManagementLock.util.js";
// ── Constants ─────────────────────────────────────────────────────────────────
import {
  DEFAULT_SSRM_CACHE_BLOCK_SIZE,
  OM_UNDO_STACK_BACKUP_KEY,
} from "./constants.js";
import { createRenderOmsOrderQtyCell } from "./components/OrderQtyCellRenderer.jsx";
import OrderQtyBudgetInfoPopover from "./components/OrderQtyBudgetInfoPopover.jsx";
import {
  selectOmsBudgetConfig,
  isOmsBudgetInfoPopoverEnabled,
  isOmsBudgetHierarchyBadgeEnabled,
  resolveOmsBudgetInfoPopoverLabels,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";
import { buildColumnDimensionsPayload } from "./utils/columnsApiPayload.util.js";
import {
  buildDrilldownColumnsPayload,
  buildGlobalFilters,
  buildDynamicHierarchy,
  resolveTimelineSelection,
} from "./utils/drilldownMatrixPayload.util.js";
import { stableSerializeViewDetails } from "./slices/viewDetails.util.js";
import { filterBePeriodColumnsByGrandTotal } from "./utils/filterPeriodColumnsByGrandTotal.util.js";
import { deferGridApiCall } from "./utils/deferGridApi.util.js";
import {
  isMeasuresOnlyChange,
  getNewMeasureColNames,
} from "./utils/measuresDiff.util.js";
import ShimmerCell from "./components/ShimmerCell.jsx";
import { buildEditIntentFromCell } from "./utils/buildEditIntent.util.js";
import {
  ORDER_QTY_INVALID_INTEGER_MESSAGE,
  parseOrderQtyEditInput,
} from "./utils/orderQtyEditInput.util.js";
import {
  applyEditDelta,
  applyUpdatedCells,
  collectLoadedRowsUnderEditedCell,
  buildHierarchyOnlyOpenItems,
} from "./utils/applyEditDelta.util.js";
import {
  isGrandTotalRow,
  buildRowDimensionsEditableMap,
} from "./utils/orderQtyEditability.util.js";
import { editOrderManagementCell } from "./api/editOrderManagement.api.js";
import { saveOrderManagement } from "./api/saveOrderManagement.api.js";
import { resetAllEdits } from "./api/resetAllEdits.api.js";
import { setAllOrderManagement } from "./api/setAllOrderManagement.api.js";
import { fetchSetAllConfig } from "./api/fetchSetAllConfig.api.js";
import { refreshOrderManagementConfigs } from "./api/refreshOrderManagementConfigs.api.js";
import SetAllPopup from "./components/popups/SetAllPopup.jsx";
import { buildSelectionTrace } from "./utils/selectionTrace.util.js";
// ── Pivot column/row APIs ─────────────────────────────────────────────────────
import { getOrderManagementPivotData } from "../api/planningScreen.api.js";
import PackConfigBottomSheet from "../common/PackConfigBottomSheet";
import { getArticleFromDimensionPath } from "./utils/orderManagementPack.util.js";
import { useOrderManagementTreeDatasource } from "./components/useOrderManagementDatasource.js";

// ── Dimension helpers ─────────────────────────────────────────────────────────
// Derives the ordered pivot dimensions directly from the template/view response.
// Uses real DB column names (e.g. "l0_name", "l1_name") as IDs — no alias
// translation needed since the BE rows API accepts them natively.
function deriveOmsDimensions(activeViewDetail) {
  const rowDims = get(activeViewDetail, "view_details.rowDimensions", []);
  const dims = rowDims
    .flatMap((card) => get(card, "selectedDimension", []))
    .map((sd, idx) => ({
      id: sd.value, // e.g. "l0_name", "l1_name", "l2_name"
      rank: idx + 1,
      label: sd.label || sd.value,
    }));
  return dims.length ? dims : null;
}

// ── Tree / selection helpers ──────────────────────────────────────────────────

function syncExpandedGroupKeysFromApi(api, expandedGroupKeys) {
  expandedGroupKeys.clear();
  if (!api) return;
  api.forEachNode((rowNode) => {
    if (rowNode.expanded && rowNode.data?.rowUid != null) {
      expandedGroupKeys.add(String(rowNode.data.rowUid));
    }
  });
}

function resetOmsGridExpansionState({ expandedGroupKeys }) {
  expandedGroupKeys.clear();
}

function collapseGridTree(api) {
  deferGridApiCall(api, () => {
    if (!api || api.isDestroyed?.()) return;
    if (typeof api.collapseAll === "function") {
      api.collapseAll();
      return;
    }
    api.forEachNode((node) => {
      if (node.group && node.expanded) node.setExpanded(false);
    });
  });
}

/** Drop cached SSRM blocks under the edited path so expand re-fetches session overlay. */
function purgeEditedSubtreeCache(
  api,
  dimensionPath,
  { isTopLineEdit = false } = {}
) {
  deferGridApiCall(api, () => {
    if (!api || api.isDestroyed?.()) return;
    try {
      if (typeof api.refreshServerSide !== "function") return;
      // Grand total edits redistribute every branch — purge the full SSRM store.
      if (isTopLineEdit) {
        if (typeof api.refreshServerSideStore === "function") {
          api.refreshServerSideStore({ purge: true });
        } else {
          api.refreshServerSide({ purge: true });
        }
        return;
      }
      const path = Array.isArray(dimensionPath) ? dimensionPath : [];
      for (let depth = 0; depth <= path.length; depth += 1) {
        api.refreshServerSide({ route: path.slice(0, depth), purge: true });
      }
    } catch (error) {
      console.error("[OMS] edited subtree purge failed", error);
    }
  });
}

/**
 * After a successful edit, reveal the edited row's next-level children if
 * they aren't already visible — so the user can immediately see the
 * drill-down effect without a manual click. Only acts when the row is
 * still collapsed (a row the user already expanded, or has no further
 * hierarchy level, is left untouched — never fights a deliberate collapse
 * with a forced re-open beyond that first reveal).
 */
function autoExpandEditedRow(api, rowUid) {
  if (!api || rowUid == null) return;
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    const nodeRowUid = node.data?.rowUid ?? node.data?.leafId;
    if (nodeRowUid == null || String(nodeRowUid) !== String(rowUid)) return;
    if (node.group && node.expanded !== true) {
      node.setExpanded(true);
    }
  });
}

/** Re-fetch SSRM rows without purging cached blocks — keeps existing row data
 * visible so no row-level skeleton shows. Used for KPI-only soft reload where
 * only new KPI columns need shimmer (via ShimmerCell), not every row. */
function softRefreshSsrm(api) {
  deferGridApiCall(api, () => {
    if (!api || api.isDestroyed?.()) return;
    try {
      if (typeof api.refreshServerSide === "function") {
        api.refreshServerSide({ route: [], purge: false });
      } else if (typeof api.refreshServerSideStore === "function") {
        api.refreshServerSideStore({ purge: false });
      }
    } catch (error) {
      console.error("[OMS] SSRM soft refresh failed", error);
    }
  });
}

/** Keep expanded nodes and soft-refresh rows — no row skeleton, used for soft KPI reload.
 * Child blocks return cached data via isSoftReloadActive flag in the datasource,
 * so they stay visible without re-fetching. */
function refreshSsrmPreservingExpansionSoft(api, expandedGroupKeys) {
  if (!api) return;
  syncExpandedGroupKeysFromApi(api, expandedGroupKeys);
  softRefreshSsrm(api);
}

/** Collapse tree and purge SSRM — use on Apply, view change, filter/pivot change. */
function refreshSsrmResettingExpansion(api, expansionState) {
  if (!api) return;
  resetOmsGridExpansionState(expansionState);
  deferGridApiCall(api, () => {
    if (!api || api.isDestroyed?.()) return;
    if (typeof api.collapseAll === "function") {
      api.collapseAll();
    } else {
      api.forEachNode((node) => {
        if (node.group && node.expanded) node.setExpanded(false);
      });
    }
    try {
      if (typeof api.refreshServerSide === "function") {
        api.refreshServerSide({ route: [], purge: true });
      } else if (typeof api.refreshServerSideStore === "function") {
        api.refreshServerSideStore({ purge: true });
      }
    } catch (error) {
      console.error("[OMS] SSRM purge failed", error);
    }
  });
}

const VIEW_EDIT_MODE_OPTIONS = [
  { label: "View Only", value: "view" },
  { label: "Edit Mode", value: "edit" },
];

/** @type {React.CSSProperties} */
// Padding + spacing (not the divider) mirror legacy High Level Summary's
// MONTH_WEEK_TAB_DATERANGE_STYLE (HighLevelSummaryTable.jsx) for visual
// parity — 1rem uniform padding, margin gap instead of a border line.
const hlsToolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem",
  flexWrap: "wrap",
};

// ── Component ─────────────────────────────────────────────────────────────────

function OrderManagementTable({
  selectedFilters,
  selectedDcs,
  selectedScreenViewName = ORDER_MANAGEMENT_V3_FILTER_CONFIG,
}) {
  const dispatch = useDispatch();
  const store = useStore();
  const isV3Schema = resolveOmIsV3Schema({
    screenViewName: selectedScreenViewName,
  });

  // ── Bootstrap view-management APIs on mount ───────────────────────────────
  // Owning these here means ActionContainer / ViewManagementController are pure
  // UI; they receive data via props instead of dispatching their own API calls.
  useEffect(() => {
    dispatch(getScreensMapping());
    dispatch(getUserRole());
  }, [dispatch]);

  // Tenant Set All config (inv_oms_setall_config) — Distribution Method option
  // labels/values. Silent catch: selector falls back to the hardcoded list.
  useEffect(() => {
    let isCancelled = false;
    fetchSetAllConfig()
      .then((setAllConfig) => {
        if (!isCancelled && setAllConfig) {
          dispatch(setSetAllConfig(setAllConfig));
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [dispatch]);

  const fetchTemplateDetails = useCallback(
    (sid, callback) => {
      dispatch(getTemplateDetails(sid, [], callback));
    },
    [dispatch]
  );

  const screenId = useScreenId({
    selectedScreenViewName,
  });
  const lastViewBootstrapScreenIdRef = useRef(null);

  // Page-owned view bootstrap: list → default view OR template (before grid).
  // refresh-configs fires first so the BE rebuilds its cached screen config
  // before view-config / columns / rows read it; never block bootstrap on it.
  useEffect(() => {
    if (!screenId) return;
    if (lastViewBootstrapScreenIdRef.current === screenId) return;
    lastViewBootstrapScreenIdRef.current = screenId;
    refreshOrderManagementConfigs(screenId)
      .catch(() => {})
      .finally(() => dispatch(bootstrapOrderManagementView(screenId)));
  }, [screenId, dispatch]);

  // OMS view management
  const activeViewDetail = useSelector(selectActiveViewDetail);
  const isViewDetailsLoading = useSelector(selectIsViewDetailsLoading);
  const isPivotPanelOpen = useSelector(selectIsPivotPanelOpen);
  const tempViewDetails = useSelector(selectTempViewDetails);

  const pivotPayload = useSelector(selectPivotPayload);
  const selectedIds = useSelector(selectSelectedIds);

  // Order management grid slice (drives columns, datasource, edit handlers)
  const view = useSelector(selectMatrixSummaryView);
  // BE-driven column defs from /columns API (null until API responds)
  const beColDefs = useSelector(selectOrderManagementColDef);
  // BE-driven row axis dimensions from /columns — carries the real
  // `is_hierarchy_editable` flag per hierarchy LEVEL (never on the columns).
  const beRowDimensions = useSelector(selectRowDimensions);
  const columnsLoading = useSelector(selectOrderManagementLoader);
  const viewBootstrapStatus = useSelector(selectViewBootstrapStatus);
  const viewBootstrapError = useSelector(selectViewBootstrapError);
  const editableFromLevel = useSelector(selectEditableFromLevel);
  const orderManagementScreenConfig = useSelector(
    selectOrderManagementScreenConfig
  );
  const omsBudgetConfig = useSelector(selectOmsBudgetConfig);
  const isBudgetInfoPopoverEnabled =
    isOmsBudgetInfoPopoverEnabled(omsBudgetConfig);
  const isBudgetHierarchyBadgeEnabled =
    isOmsBudgetHierarchyBadgeEnabled(omsBudgetConfig);
  const budgetInfoPopoverLabels =
    resolveOmsBudgetInfoPopoverLabels(omsBudgetConfig);
  const highLevelSummaryScreenConfig = useSelector(
    selectHighLevelSummaryScreenConfig
  );
  const calendarScreenConfig = useMemo(
    () =>
      mergeOrderManagementToolbarScreenConfig(
        orderManagementScreenConfig,
        highLevelSummaryScreenConfig
      ),
    [highLevelSummaryScreenConfig, orderManagementScreenConfig]
  );
  const tabListOptions = useMemo(
    () => resolveOrderManagementTabListWithFallback(calendarScreenConfig),
    [calendarScreenConfig]
  );
  const defaultMonthTab = useMemo(
    () => resolveDefaultMonthTab(calendarScreenConfig, tabListOptions),
    [calendarScreenConfig, tabListOptions]
  );
  const roqDateTabOptions = useMemo(
    () =>
      calendarScreenConfig?.roq_date_options ||
      OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
    [calendarScreenConfig?.roq_date_options]
  );
  const maxEditableReceiptDate = useSelector(
    (state) => state?.omsReducer?.orderManagementService?.maxEditableReceiptDate
  );
  const highLevelSummaryState = useSelector(
    (state) => state?.omsReducer?.orderManagementService?.highLevelSummaryState
  );
  const showDistributionMethod = useSelector(selectShowDistributionMethod);
  const cellEditMarkers = useSelector(selectCellEditMarkers);
  const hasSelection = view.selectedRowKeys.length > 0 || view.isSelectAll;

  // Grid
  const [gridApi, setGridApi] = useState(null);
  const tableRef = useRef({ api: null });
  // Tracks the live AG Grid instance — set by loadTableInstance, never cleared
  // by beginOrderManagementTableReload so /columns .then(), ssrmRefreshTick,
  // and Undo/Redo can always reach the mounted grid even when gridApi React
  // state is null (grid stays mounted across universe reloads).
  const liveApiRef = useRef(null);
  const getGridApi = useCallback(() => {
    const api = liveApiRef.current;
    return api && !api.isDestroyed?.() ? api : null;
  }, []);
  const expandedGroupKeysRef = useRef(new Set());
  const gridContainerRef = useRef(null);
  const skipInitialSsrmRefreshRef = useRef(true);
  const lastRefreshTickRef = useRef(0);

  const resetExpansionForViewChange = useCallback(() => {
    resetOmsGridExpansionState({
      expandedGroupKeys: expandedGroupKeysRef.current,
    });
    const api = getGridApi();
    if (api) {
      collapseGridTree(api);
    }
  }, [getGridApi]);
  const [viewMode, setViewMode] = useState("edit");
  const viewModeRef = useRef("edit");
  const [hideEmptyPeriods, setHideEmptyPeriods] = useState(false);
  const [isEditInFlight, setIsEditInFlight] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | auto-saved
  const [viewEditedOnly, setViewEditedOnly] = useState(false);
  const [isSetAllOpen, setIsSetAllOpen] = useState(false);
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState(false);
  const [cellsInFlight, setCellsInFlight] = useState(() => new Set());
  const cellsInFlightRef = useRef(new Set());
  const viewEditedOnlyRef = useRef(false);
  const [budgetInfoPopover, setBudgetInfoPopover] = useState({
    anchorEl: null,
    data: null,
  });

  // Edit/undo/redo and bulk mutations resolve after network round-trips; if
  // the screen unmounted meanwhile (route change, HMR swap) their late
  // continuations must no-op instead of setState on a dead component.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const setCellsInFlightIfMounted = useCallback((next) => {
    if (isMountedRef.current) setCellsInFlight(next);
  }, []);
  const setSaveStatusIfMounted = useCallback((next) => {
    if (isMountedRef.current) setSaveStatus(next);
  }, []);
  const setIsEditInFlightIfMounted = useCallback((next) => {
    if (isMountedRef.current) setIsEditInFlight(next);
  }, []);

  // Pack detail sheet
  const [packSheetState, setPackSheetState] = useState({
    open: false,
    sku: "",
  });

  // HLS timeline state (placement / receipt + time-bucket tabs)
  const [selectedMonthTab, setSelectedMonthTab] = useState("1m");
  const monthTabInitializedRef = useRef(false);
  const [selectedPlacementDate, setSelectedPlacementDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [selectedReceiptDate, setSelectedReceiptDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [fiscalDates, setFiscalDates] = useState({});
  const [roqFiscalDates, setRoqFiscalDates] = useState({});
  const [
    isDateRangeDisabledForPlacement,
    setIsDateRangeDisabledForPlacement,
  ] = useState(false);
  const [
    isDateRangeDisabledForReceipt,
    setIsDateRangeDisabledForReceipt,
  ] = useState(false);
  const [selectionRangeForPlacement, setSelectionRangeForPlacement] = useState(
    8
  );
  const [selectionRangeForReceipt, setSelectionRangeForReceipt] = useState(8);
  const selectedPlacementDateRef = useRef(selectedPlacementDate);
  const selectedReceiptDateRef = useRef(selectedReceiptDate);
  const fiscalDatesRef = useRef(fiscalDates);
  const roqFiscalDatesRef = useRef(roqFiscalDates);
  useEffect(() => {
    selectedPlacementDateRef.current = selectedPlacementDate;
  }, [selectedPlacementDate]);
  useEffect(() => {
    selectedReceiptDateRef.current = selectedReceiptDate;
  }, [selectedReceiptDate]);
  useEffect(() => {
    fiscalDatesRef.current = fiscalDates;
  }, [fiscalDates]);
  useEffect(() => {
    roqFiscalDatesRef.current = roqFiscalDates;
  }, [roqFiscalDates]);
  const fiscalCalendarForToolbar = useMemo(
    () => ({
      placement: {
        fiscalCalendarData:
          view.fiscalCalendar?.placement?.fiscalCalendarData || [],
      },
      receipt: {
        fiscalCalendarData:
          view.fiscalCalendar?.receipt?.fiscalCalendarData || [],
      },
    }),
    [view.fiscalCalendar]
  );
  const placementCalendarData =
    view.fiscalCalendar?.placement?.fiscalCalendarData || [];
  const receiptCalendarData =
    view.fiscalCalendar?.receipt?.fiscalCalendarData || [];
  const showWeekDateRange = Boolean(calendarScreenConfig?.show_week_date_range);

  // Placement and receipt fiscal calendars can start their week on different
  // days (e.g. Mon vs Sun); `moment.updateLocale` mutates a single GLOBAL
  // locale, so only one of the two week-start-days can be "active" at a
  // time. Re-apply the one matching whichever timeline tab is selected so
  // NormalCalendarFiscalMapping's day math (isOutsideRange, getFiscalWeekStart,
  // moment().startOf("week")) is always correct for the visible calendar —
  // without this, the receipt-tab date picker used placement's week-start-day
  // whenever the two differed.
  useEffect(() => {
    const activeCalendar =
      view.selectedRoqDateTab === "roq_receipt_date"
        ? view.fiscalCalendar?.receipt
        : view.fiscalCalendar?.placement;
    const dow = activeCalendar?.weekStartDay;
    if (dow == null) return;
    moment.updateLocale("en", { week: { dow } });
  }, [view.selectedRoqDateTab, view.fiscalCalendar]);

  useEffect(() => {
    if (!tabListOptions?.length) return;
    const isValidTab = tabListOptions.some(
      (tab) => tab?.value === selectedMonthTab
    );
    if (!monthTabInitializedRef.current || !isValidTab) {
      setSelectedMonthTab(defaultMonthTab);
      monthTabInitializedRef.current = true;
    }
  }, [tabListOptions, defaultMonthTab, selectedMonthTab]);

  const resetCalendarPickerDraft = useCallback(() => {
    setSelectedPlacementDate({
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    });
    setSelectedReceiptDate({
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    });
    selectedPlacementDateRef.current = {
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    };
    selectedReceiptDateRef.current = {
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    };
  }, []);

  // Stable ref for pack-click handler — column defs (useMemo) never re-fires on handler change.
  const packClickHandlerRef = useRef((_rowData) => {});
  const onPackClickStable = useCallback((rowData) => {
    packClickHandlerRef.current?.(rowData);
  }, []);

  // Refs used by handlers/datasource without causing dep-array re-renders.
  const periodIdsRef = useRef([]);
  const fiscalViewRef = useRef("week");
  const appliedPivotOrderRef = useRef(view.appliedPivotOrder);
  const activeViewDetailRef = useRef(activeViewDetail);
  const tempViewDetailsRef = useRef(tempViewDetails);
  const selectedMonthTabRef = useRef(selectedMonthTab);
  const lockStateRef = useRef(createLockState());
  const editableColIdsRef = useRef([]);
  const viewRef = useRef(view);
  const editInFlightRef = useRef(false);
  // Populated once useOrderManagementTreeDatasource mounts below; read via
  // .current inside handleCellBlur/handleUndo/handleRedo (declared earlier
  // in this file than the hook call) so Grand Total can be refetched from
  // BE after every successful edit/undo/redo instead of derived via a
  // client-side delta (see createBlastRadiusLoadingController's doc
  // comment in cellEditMarkers.util.js).
  const fetchGrandTotalRef = useRef(null);

  /**
   * Standalone Grand Total refresh, fired (never awaited) right after a
   * successful edit/undo/redo applies its hierarchy patch — Grand Total is
   * a pinned row outside the SSRM tree, so BE's edit-drilldown response
   * never carries its new value. `loadingController.markGrandTotal(false)`
   * always runs in the `finally` so a failed refetch still clears the
   * loader instead of leaving Grand Total's cell spinning forever; on
   * failure the row simply keeps showing its last-known value.
   */
  const refreshGrandTotalAfterEdit = useCallback(
    async (loadingController) => {
      try {
        const grandTotalData = await fetchGrandTotalRef.current?.();
        if (grandTotalData) {
          dispatch(
            setGrandTotal({
              ...grandTotalData,
              meta: { ...(grandTotalData.meta || {}), __isGrandTotal: true },
            })
          );
        }
      } finally {
        loadingController?.markGrandTotal?.(false);
      }
    },
    [dispatch]
  );
  const cellEditMarkersRef = useRef({});
  // Row selection (tri-state cascade) — declared here (rather than next to
  // the handlers that use them) so beginOrderManagementTableReload can reset
  // them without a forward reference; see the full cascade below.
  // Survives SSRM cache eviction — getSelectedNodes() only returns loaded rows,
  // so Product Details selected_hierarchies must be built from this map instead.
  const selectedPathsByUidRef = useRef(new Map());
  const previousSelectedNodeIdsRef = useRef(new Set());
  useEffect(() => {
    appliedPivotOrderRef.current = view.appliedPivotOrder;
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    cellEditMarkersRef.current = cellEditMarkers;
  }, [cellEditMarkers]);
  useEffect(() => {
    activeViewDetailRef.current = activeViewDetail;
  }, [activeViewDetail]);
  useEffect(() => {
    tempViewDetailsRef.current = tempViewDetails;
  }, [tempViewDetails]);
  useEffect(() => {
    selectedMonthTabRef.current = selectedMonthTab;
  }, [selectedMonthTab]);

  const lockHandlers = useMemo(
    () =>
      createOrderManagementLockHandlers({
        gridApiRef: tableRef,
        lockStateRef,
        editableColIdsRef,
        pivotOrderRef: appliedPivotOrderRef,
        onLockChanged: () => dispatch(setCellDirty(true)),
      }),
    [dispatch]
  );

  // ── Bootstrap: OMS view management → grid slice bridge ───────────────────────
  // lastBootstrappedViewIdRef tracks which view_id we last applied. On
  // subsequent activeViewDetail changes (after first bootstrap) we ONLY fire
  // matrixApplyPivotOrder when the view_id actually changed — i.e. the user
  // selected a different saved view. PivotPanel chip edits (add/remove a
  // hierarchy) also update activeViewDetail but keep the same view_id; those
  // should NOT trigger a grid reload — that must wait for the Apply button.
  const bootstrappedRef = useRef(false);
  const lastBootstrappedViewIdRef = useRef(null);
  const hlsTimeInitializedRef = useRef(false);
  const columnsRequestSignatureRef = useRef(null);
  const columnsRequestInFlightRef = useRef(null);
  // Holds the last successfully applied signature — NOT nulled on pivot-panel
  // apply, so isMeasuresOnlyChange can compare prev vs next across re-applies.
  const prevColumnsSignatureRef = useRef(null);
  const [columnsLoadPhase, setColumnsLoadPhase] = useState("idle");
  // Soft-reload state: true when only KPI measures changed (no full grid teardown).
  const isSoftColumnReloadRef = useRef(false);
  // Column names that are new in a soft reload — show ShimmerCell until rows arrive.
  const pendingMeasureColNamesRef = useRef(new Set());
  // Snapshot of pending names captured when shimmer is cleared — used to
  // refresh only the new KPI columns instead of force-refreshing all cells.
  const clearedMeasureColNamesRef = useRef(new Set());
  // Incremented when shimmer clears so columnDefs useMemo re-runs.
  const [softReloadVersion, setSoftReloadVersion] = useState(0);
  // True during the window between soft-refresh call and first rows arrival —
  // datasource reads this ref synchronously in getRows to skip child re-fetches.
  // Must be a ref (not state) so it is set synchronously before refreshServerSide fires.
  const isSoftKpiReloadRef = useRef(false);

  const emptyOrderManagementColumnsResp = useMemo(
    () => ({
      column_config: [],
      rowDimensions: [],
      columnDimensions: [],
      isKPIWiseRows: false,
    }),
    []
  );

  /** Drop grid + column state so /columns and SSRM bootstrap from scratch. */
  const beginOrderManagementTableReload = useCallback(() => {
    resetExpansionForViewChange();
    columnsRequestSignatureRef.current = null;
    columnsRequestInFlightRef.current = null;
    prevColumnsSignatureRef.current = null;
    isSoftColumnReloadRef.current = false;
    pendingMeasureColNamesRef.current = new Set();
    setColumnsLoadPhase("idle");
    skipInitialSsrmRefreshRef.current = true;
    dispatch(setGrandTotal(null));
    dispatch(setOrderManagementResp(emptyOrderManagementColumnsResp));
    // The FE-only edit-dot fallback (see resolveEditDotStatus) is keyed by
    // `${rowUid}::${colId}` — a plain fiscal-week/month bucket id shared by
    // every timeline tab (placement vs receipt render the SAME period ids,
    // just aligned to a different week-start-day). Every full reload here
    // throws away the entire SSRM/columns cache and refetches fresh rows,
    // so any stale marker left behind would otherwise bleed its purple/blue
    // dot onto an unrelated tab/view that never actually touched that cell
    // — e.g. an edit made on Placement showing as "edited" after switching
    // to Receipt. Clear it in lockstep with every other piece of state this
    // function already resets.
    dispatch(clearCellEditMarkers());
    cellEditMarkersRef.current = {};
    // Undo/redo history and the tri-state selection cascade are both scoped
    // to "this exact query universe". Global filters, frequency (1W/1M/...),
    // the calendar date range, and placement/receipt all fall through here
    // (via syncTimeSelectionToView or the filter-change effect), so clearing
    // once in this shared reload path covers every one of those triggers.
    // Undo/redo stacks: same reasoning as the edit markers above — an
    // undo/redo entry captured against the old universe is meaningless (and
    // potentially wrong) once rows are refetched under a new one.
    dispatch(clearUndoStack());
    dispatch(clearRedoStack());
    dispatch(setUndoInProgress(false));
    // Selection refs are plain JS state (not Redux, not cleared by
    // setSelectedRowKeys([])) keyed by rowUid/dimensionPath. Those can recur
    // across an unrelated reload, so a stale entry here would silently
    // re-select rows the user never touched in the new universe.
    selectedPathsByUidRef.current = new Map();
    previousSelectedNodeIdsRef.current = new Set();
    // Do not null gridApi / liveApiRef here — the grid stays mounted across
    // universe reloads and loadTableInstance does not re-fire. Clearing
    // gridApi would leave Undo/Redo/Reset All with no live api for the rest
    // of the session. Real teardown lives in the !isPivotApplied effect.
    setViewEditedOnly(false);
    viewEditedOnlyRef.current = false;
  }, [dispatch, emptyOrderManagementColumnsResp, resetExpansionForViewChange]);

  const syncTimeSelectionToView = useCallback(
    ({
      monthTab = selectedMonthTabRef.current,
      roqTab = viewRef.current?.selectedRoqDateTab || "roq_placement_date",
      nextFiscalDates = fiscalDatesRef.current,
      nextRoqFiscalDates = roqFiscalDatesRef.current,
    } = {}) => {
      beginOrderManagementTableReload();
      applyHlsTimeSelectionToMatrixView({
        dispatch,
        selectedMonthTab: monthTab,
        tabListOptions,
        selectedRoqDateTab: roqTab,
        fiscalDates: nextFiscalDates || {},
        roqFiscalDates: nextRoqFiscalDates || {},
        fiscalCalendar: fiscalCalendarForToolbar,
      });
    },
    [
      dispatch,
      fiscalCalendarForToolbar,
      beginOrderManagementTableReload,
      tabListOptions,
    ]
  );

  const getMaxPlacementEndDate = useCallback(() => {
    const weeksToAdd =
      (calendarScreenConfig?.order_placement_weeks_limit || 26) - 1;
    return moment().endOf("week").add(weeksToAdd, "weeks");
  }, [calendarScreenConfig?.order_placement_weeks_limit]);

  const isOutsidePlacementRange = useCallback(
    (date) => {
      const weekStartDay = moment().startOf("week");
      const weekEndDay = getMaxPlacementEndDate();
      return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
    },
    [getMaxPlacementEndDate]
  );

  // Match legacy HighLevelSummaryTable.isRoqDateOutsideRange: when max is
  // missing, do not restrict; otherwise clamp to current week → max week end.
  const isOutsideReceiptRange = useCallback(
    (date) => {
      if (!maxEditableReceiptDate) {
        return false;
      }
      const currentWeekStart = moment().startOf("week");
      const maxReceiptWeekEnd = moment(maxEditableReceiptDate).endOf("week");
      return !moment(date).isBetween(
        currentWeekStart,
        maxReceiptWeekEnd,
        undefined,
        "[]"
      );
    },
    [maxEditableReceiptDate]
  );

  const handlePlacementDateRangeChange = useCallback((dates) => {
    setSelectedPlacementDate(dates);
    selectedPlacementDateRef.current = dates;
  }, []);

  const handleReceiptDateRangeChange = useCallback((dates) => {
    setSelectedReceiptDate(dates);
    selectedReceiptDateRef.current = dates;
  }, []);

  const handlePlacementDateRangeApply = useCallback(() => {
    const currentDates = selectedPlacementDateRef.current;
    const nextFiscalDates =
      currentDates?.fiscalInfoStartDate != null
        ? {
            start_fw: currentDates.fiscalInfoStartDate?.fiscal_year_week,
            end_fw: currentDates.fiscalInfoEndDate?.fiscal_year_week,
          }
        : {};
    setFiscalDates(nextFiscalDates);
    fiscalDatesRef.current = nextFiscalDates;
    syncTimeSelectionToView({
      nextFiscalDates,
      nextRoqFiscalDates: roqFiscalDatesRef.current,
    });
  }, [syncTimeSelectionToView]);

  const handleReceiptDateRangeApply = useCallback(() => {
    const currentDates = selectedReceiptDateRef.current;
    const nextRoqFiscalDates =
      currentDates?.fiscalInfoStartDate != null
        ? {
            start_fw: currentDates.fiscalInfoStartDate?.fiscal_year_week,
            end_fw: currentDates.fiscalInfoEndDate?.fiscal_year_week,
          }
        : {};
    setRoqFiscalDates(nextRoqFiscalDates);
    roqFiscalDatesRef.current = nextRoqFiscalDates;
    syncTimeSelectionToView({
      nextFiscalDates: fiscalDatesRef.current,
      nextRoqFiscalDates,
    });
  }, [syncTimeSelectionToView]);

  useEffect(() => {
    resetCalendarPickerDraft();

    const selectedTabDetails = tabListOptions.find(
      (tab) => tab?.value === selectedMonthTab
    );
    const totalColumnWeeks = selectedTabDetails?.week_count
      ? 8 * selectedTabDetails.week_count
      : null;

    if (view.selectedRoqDateTab === "roq_placement_date") {
      const disablingValues = calendarScreenConfig?.placement_datepicker_disabling_values || [
        "1m",
        "3m",
        "6m",
      ];
      const isDatePickerDisabled = disablingValues.includes(selectedMonthTab);
      setIsDateRangeDisabledForPlacement(isDatePickerDisabled);
      if (!isDatePickerDisabled) {
        setSelectionRangeForPlacement(totalColumnWeeks);
      }
    } else {
      const disablingValues =
        calendarScreenConfig?.receipt_datepicker_disabling_values || [];
      const isDatePickerDisabled = disablingValues.includes(selectedMonthTab);
      setIsDateRangeDisabledForReceipt(isDatePickerDisabled);
      if (!selectedTabDetails?.week_count) {
        setSelectionRangeForReceipt(null);
      } else {
        setSelectionRangeForReceipt(totalColumnWeeks);
      }
    }
  }, [
    selectedMonthTab,
    view.selectedRoqDateTab,
    calendarScreenConfig?.placement_datepicker_disabling_values,
    calendarScreenConfig?.receipt_datepicker_disabling_values,
    resetCalendarPickerDraft,
    tabListOptions,
  ]);

  /** Apply view_details to matrix state — /columns is triggered by the columns effect only. */
  const applyViewDetailsToGrid = useCallback(
    (viewDetails, viewId = null) => {
      if (!viewDetails?.rowDimensions?.length) return;
      lockStateRef.current = createLockState();
      resetExpansionForViewChange();
      dispatch(setGrandTotal(null));
      dispatch(applySavedViewDetails({ viewDetails, viewId }));
    },
    [dispatch, resetExpansionForViewChange]
  );

  // Reload when the user picks a different saved view (view_id change).
  useEffect(() => {
    if (bootstrappedRef.current) {
      if (!activeViewDetail?.view_details) return;
      const newViewId = activeViewDetail?.view_id;
      if (!newViewId || newViewId === lastBootstrappedViewIdRef.current) return;
      lastBootstrappedViewIdRef.current = newViewId;
      applyViewDetailsToGrid(
        activeViewDetail.view_details,
        activeViewDetail.view_id
      );
      dispatch(
        addSnack({
          message: "New view applied",
          options: { variant: "success" },
        })
      );
      return;
    }
    if (!activeViewDetail?.view_details) return;
    bootstrappedRef.current = true;
    lastBootstrappedViewIdRef.current = activeViewDetail?.view_id ?? null;

    // Initial view-management load — no default view configured falls back
    // to the template response (view_id === -1, see getTemplateDetails);
    // otherwise the user's saved default (or last-active) view was applied.
    {
      const isTemplateFallback =
        activeViewDetail?.view_id === -1 || activeViewDetail?.view_id == null;
      const loadedViewLabel = isTemplateFallback
        ? "Template Global"
        : activeViewDetail?.view_name || "Default";
      dispatch(
        addSnack({
          message: `${loadedViewLabel} view loaded`,
          options: { variant: "success" },
        })
      );
    }

    // Build available dimensions from the live template/view response so the
    // pivot order uses real DB column names (e.g. "l0_name") rather than aliases.
    const availableDimensions = deriveOmsDimensions(activeViewDetail) || [];
    const defaultOrder = availableDimensions.map((d) => d.id);

    hlsTimeInitializedRef.current = false;
    columnsRequestSignatureRef.current = null;
    dispatch(resetMatrixSummaryView());
    dispatch(
      bootstrapSucceeded({
        entryLevel: defaultOrder[0] || "l0_name",
        hlsFilterContext: {
          selectedFilters: Array.isArray(selectedFilters)
            ? selectedFilters
            : [],
          selectedDcs: Array.isArray(selectedDcs) ? selectedDcs : [],
        },
        hlsFilterSignature: JSON.stringify({
          filters: Array.isArray(selectedFilters) ? selectedFilters : [],
          dcs: Array.isArray(selectedDcs) ? selectedDcs : [],
        }),
        availableDimensions,
        availableDCs: [],
        defaultOrder,
        defaultKpi: "order_qty",
        kpiOptions: [],
        selectedRoqDateTab: "roq_placement_date",
        orderQtyEditableLevels: null,
        distributionMethod: null,
        grandTotal: null,
      })
    );
    const viewDetails = activeViewDetail.view_details;
    if (viewDetails?.rowDimensions?.length) {
      dispatch(
        applySavedViewDetails({
          viewDetails,
          viewId: activeViewDetail.view_id,
        })
      );
    }
  }, [
    activeViewDetail,
    dispatch,
    selectedFilters,
    selectedDcs,
    applyViewDetailsToGrid,
  ]);

  const viewDetailsApplyCallback = useCallback(
    (viewDetail) => {
      if (!viewDetail) return;
      const viewId =
        viewDetail?.view_id ?? activeViewDetailRef.current?.view_id;
      if (viewId !== lastBootstrappedViewIdRef.current) return;
      const viewDetails = viewDetail.view_details || viewDetail;
      const incoming = stableSerializeViewDetails(viewDetails);
      const applied = stableSerializeViewDetails(
        viewRef.current?.appliedViewDetails
      );
      if (incoming === applied) {
        return;
      }
      applyViewDetailsToGrid(viewDetails, viewId);
    },
    [applyViewDetailsToGrid]
  );

  const filtersSignature = useMemo(
    () =>
      JSON.stringify({
        filters: selectedFilters || [],
        dcs: selectedDcs || [],
      }),
    [selectedFilters, selectedDcs]
  );

  const fetchMaxEditableReceiptDate = useCallback(async () => {
    try {
      dispatch(setMaxEditableReceiptDateLoader(true));
      const filterPayload = buildGlobalFilters(selectedFilters);
      const response = await getMaxEditableReceiptDateV3(filterPayload, {
        isV3Schema,
      });
      if (
        response?.data?.status &&
        response?.data?.data?.max_editable_expected_receipt_date
      ) {
        dispatch(
          setMaxEditableReceiptDate(
            response.data.data.max_editable_expected_receipt_date
          )
        );
      } else {
        dispatch(setMaxEditableReceiptDate(null));
      }
    } catch (_error) {
      dispatch(setMaxEditableReceiptDate(null));
    } finally {
      dispatch(setMaxEditableReceiptDateLoader(false));
    }
  }, [dispatch, selectedFilters, isV3Schema]);

  useEffect(() => {
    if (view.selectedRoqDateTab !== "roq_receipt_date") return;
    fetchMaxEditableReceiptDate();
  }, [view.selectedRoqDateTab, filtersSignature, fetchMaxEditableReceiptDate]);

  useEffect(() => {
    if (view.selectedRoqDateTab !== "roq_receipt_date") return;
    const currentStart =
      selectedReceiptDateRef.current?.fiscalInfoStartDate
        ?.calendar_week_start_date;
    if (!maxEditableReceiptDate) {
      if (currentStart) {
        resetCalendarPickerDraft();
        syncTimeSelectionToView({
          roqTab: "roq_receipt_date",
          nextFiscalDates: {},
          nextRoqFiscalDates: {},
        });
      }
      return;
    }
    const maxReceiptWeekEnd = moment(maxEditableReceiptDate).endOf("week");
    if (currentStart && moment(currentStart).isAfter(maxReceiptWeekEnd)) {
      resetCalendarPickerDraft();
      syncTimeSelectionToView({
        roqTab: "roq_receipt_date",
        nextFiscalDates: {},
        nextRoqFiscalDates: {},
      });
    }
  }, [
    maxEditableReceiptDate,
    view.selectedRoqDateTab,
    filtersSignature,
    resetCalendarPickerDraft,
    syncTimeSelectionToView,
  ]);

  useEffect(() => {
    if (!bootstrappedRef.current) return;
    if (view.hlsFilterSignature === filtersSignature) return;
    lockStateRef.current = createLockState();
    beginOrderManagementTableReload();
    dispatch(
      applyFilterContextChange({
        selectedFilters: selectedFilters || [],
        selectedDcs: selectedDcs || [],
      })
    );
  }, [
    filtersSignature,
    view.hlsFilterSignature,
    selectedFilters,
    selectedDcs,
    dispatch,
    beginOrderManagementTableReload,
  ]);

  // Cleanup on unmount — preserve view state when navigating to Product Details
  // so back-navigation restores pivot order, time selection and row selection.
  useEffect(
    () => () => {
      const preserve =
        sessionStorage.getItem(PRESERVE_OM_VIEW_SESSION_KEY) === "1";
      if (preserve) {
        sessionStorage.removeItem(PRESERVE_OM_VIEW_SESSION_KEY);
        return;
      }
      dispatch(resetMatrixSummaryView());
      dispatch(resetViewBootstrap());
      lastViewBootstrapScreenIdRef.current = null;
    },
    [dispatch]
  );

  // ── Columns API helper ────────────────────────────────────────────────────────
  // Central function that dispatches getOrderManagementPivotData using the
  // current view state from viewRef (always fresh via ref). Optional `overrides`
  // let callers inject a just-dispatched fiscalView / dateFilter before the ref
  // has been updated by the next render cycle.
  // IMPORTANT: declared before handleMonthTabChange / handleRoqDateTabChange so
  // their dep arrays can reference it without a TDZ ReferenceError.
  const callColumnsApi = useCallback(
    (overrides = {}, { silent = false } = {}) => {
      const v = viewRef.current;
      const pivotPayload = selectPivotPayload(store.getState());
      const selectedIdsFromStore = selectSelectedIds(store.getState());
      const roqTab =
        overrides.selectedRoqDateTab ??
        v?.selectedRoqDateTab ??
        "roq_placement_date";
      const dateRange =
        overrides.dateRange ?? v?.selectedDateRange?.[roqTab] ?? {};
      const fiscalView = overrides.fiscalView ?? v?.fiscalView ?? "week";
      const dateFilter =
        overrides.dateFilter ??
        v?.hlsDateFilter ??
        selectedMonthTabRef.current ??
        (fiscalView === "month" ? "1m" : "1w");
      const viewDetails = overrides.viewDetails ?? v?.appliedViewDetails;
      return dispatch(
        getOrderManagementPivotData(
          buildDrilldownColumnsPayload({
            screenId,
            kpis: overrides.kpis ?? pivotPayload?.kpis,
            selectedIds: selectedIdsFromStore,
            hlsDateFilter: dateFilter,
            dateRange,
            viewDetails,
            selectedRoqDateTab: roqTab,
          }),
          { silent }
        )
      );
    },
    [dispatch, store, screenId]
  );

  useEffect(() => {
    if (!bootstrappedRef.current) return;
    const placementRows = view.fiscalCalendar?.placement?.fiscalCalendarData;
    if (!Array.isArray(placementRows) || placementRows.length === 0) return;
    if (!tabListOptions?.length) return;
    const activeMonthTab = tabListOptions.some(
      (tab) => tab?.value === selectedMonthTab
    )
      ? selectedMonthTab
      : defaultMonthTab;
    if (!activeMonthTab) return;
    if (hlsTimeInitializedRef.current) return;
    hlsTimeInitializedRef.current = true;
    const seededRange =
      highLevelSummaryState?.selected_start_week_date != null
        ? {
            start_fw: highLevelSummaryState.selected_start_week_date,
            end_fw: highLevelSummaryState.selected_end_week_date,
          }
        : null;
    const isReceiptSeed =
      highLevelSummaryState?.selectedRoqDateTab === "roq_receipt_date";
    const initialPlacement = !isReceiptSeed && seededRange ? seededRange : {};
    const initialRoq = isReceiptSeed && seededRange ? seededRange : {};
    if (seededRange) {
      if (isReceiptSeed) {
        setRoqFiscalDates(initialRoq);
        roqFiscalDatesRef.current = initialRoq;
      } else {
        setFiscalDates(initialPlacement);
        fiscalDatesRef.current = initialPlacement;
      }
    }
    applyHlsTimeSelectionToMatrixView({
      dispatch,
      selectedMonthTab: activeMonthTab,
      tabListOptions,
      selectedRoqDateTab: view.selectedRoqDateTab,
      fiscalDates: initialPlacement,
      roqFiscalDates: initialRoq,
      fiscalCalendar: fiscalCalendarForToolbar,
    });
  }, [
    dispatch,
    selectedMonthTab,
    defaultMonthTab,
    tabListOptions,
    view.fiscalCalendar,
    view.selectedRoqDateTab,
    view.appliedPivotOrder,
    fiscalCalendarForToolbar,
    highLevelSummaryState?.selected_start_week_date,
    highLevelSummaryState?.selected_end_week_date,
    highLevelSummaryState?.selectedRoqDateTab,
  ]);

  // Single /columns entry point — pivot order, fiscal range, and time tab together.
  useEffect(() => {
    if (!bootstrappedRef.current || !view.appliedPivotOrder?.length) return;
    const roqTab = view.selectedRoqDateTab || "roq_placement_date";
    const range = view.selectedDateRange?.[roqTab];
    if (!range?.start_fw || !range?.end_fw) return;
    const signature = JSON.stringify({
      pivot: (view.appliedPivotOrder || []).map((dim) => dim.id),
      viewDetails: stableSerializeViewDetails(view.appliedViewDetails),
      start_fw: range?.start_fw ?? null,
      end_fw: range?.end_fw ?? null,
      date_filter: view.hlsDateFilter,
      roqTab,
      fiscalView: view.fiscalView,
      view_id: view.appliedViewDetails?.view_id ?? null,
      filters: view.hlsFilterSignature,
    });
    const existingCols = selectOrderManagementColDef(store.getState());
    if (columnsRequestInFlightRef.current === signature) {
      return;
    }
    if (
      columnsRequestSignatureRef.current === signature &&
      Array.isArray(existingCols) &&
      existingCols.length > 0
    ) {
      return;
    }

    // Soft reload: only KPI measures changed — keep existing grid + columns,
    // fetch /columns silently, shimmer new columns only.
    // Use prevColumnsSignatureRef which persists across dedup-bypass resets.
    const prevSignature =
      prevColumnsSignatureRef.current ?? columnsRequestSignatureRef.current;
    const isSoft =
      Array.isArray(existingCols) &&
      existingCols.length > 0 &&
      isMeasuresOnlyChange(prevSignature, signature);

    isSoftColumnReloadRef.current = isSoft;

    if (isSoft) {
      isSoftKpiReloadRef.current = true;
    }

    columnsRequestSignatureRef.current = signature;
    columnsRequestInFlightRef.current = signature;
    if (!isSoft) {
      // Hard reload: tear down the grid and clear columns so the skeleton shows
      // while /columns re-fetches. Skip if beginOrderManagementTableReload already
      // ran (filter-change path resets refs before this effect fires).
      if (Array.isArray(existingCols) && existingCols.length > 0) {
        beginOrderManagementTableReload();
        // Restore the signature we just set — beginOrderManagementTableReload nulls it.
        columnsRequestSignatureRef.current = signature;
        columnsRequestInFlightRef.current = signature;
      }
      setColumnsLoadPhase("loading");
    }
    let cancelled = false;
    callColumnsApi({}, { silent: isSoft })
      .then((result) => {
        if (cancelled) return;
        const cols = result?.column_config;
        if (!Array.isArray(cols) || cols.length === 0) {
          columnsRequestSignatureRef.current = null;
          isSoftColumnReloadRef.current = false;
          pendingMeasureColNamesRef.current = new Set();
          setColumnsLoadPhase("error");
          return;
        }
        if (isSoft) {
          // Compute which column_names are newly added before updating beColDefs.
          const prevCols = selectOrderManagementColDef(store.getState());
          pendingMeasureColNamesRef.current = getNewMeasureColNames(
            prevCols,
            cols
          );
        }
        // Keep prevColumnsSignatureRef in sync for the next change comparison.
        prevColumnsSignatureRef.current = signature;
        setColumnsLoadPhase("ready");
        const api = getGridApi();
        if (api) {
          deferGridApiCall(api, () => {
            lastRefreshTickRef.current = viewRef.current?.ssrmRefreshTick ?? 0;
            if (isSoft) {
              // Preserve expansion; soft refresh keeps existing row data visible
              // (no row skeleton) — only new KPI columns show ShimmerCell.
              refreshSsrmPreservingExpansionSoft(
                api,
                expandedGroupKeysRef.current
              );
            } else {
              refreshSsrmResettingExpansion(api, {
                expandedGroupKeys: expandedGroupKeysRef.current,
              });
            }
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          columnsRequestSignatureRef.current = null;
          isSoftColumnReloadRef.current = false;
          pendingMeasureColNamesRef.current = new Set();
          setColumnsLoadPhase("error");
        }
      })
      .finally(() => {
        if (!cancelled && columnsRequestInFlightRef.current === signature) {
          columnsRequestInFlightRef.current = null;
          isSoftColumnReloadRef.current = false;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    view.appliedPivotOrder,
    view.selectedDateRange,
    view.selectedRoqDateTab,
    view.hlsDateFilter,
    view.fiscalView,
    view.appliedViewDetails,
    view.hlsFilterSignature,
    dispatch,
    callColumnsApi,
    beginOrderManagementTableReload,
    getGridApi,
    store,
  ]);

  // ── HLS timeline handlers ─────────────────────────────────────────────────────
  const handleMonthTabChange = useCallback(
    (_event, nextValue) => {
      if (!nextValue) return;
      setSelectedMonthTab(nextValue);
      setFiscalDates({});
      setRoqFiscalDates({});
      fiscalDatesRef.current = {};
      roqFiscalDatesRef.current = {};
      resetCalendarPickerDraft();
      syncTimeSelectionToView({
        monthTab: nextValue,
        nextFiscalDates: {},
        nextRoqFiscalDates: {},
      });
    },
    [resetCalendarPickerDraft, syncTimeSelectionToView]
  );

  const handleRoqDateTabChange = useCallback(
    (nextValue) => {
      setFiscalDates({});
      setRoqFiscalDates({});
      fiscalDatesRef.current = {};
      roqFiscalDatesRef.current = {};
      resetCalendarPickerDraft();
      syncTimeSelectionToView({
        roqTab: nextValue,
        nextFiscalDates: {},
        nextRoqFiscalDates: {},
      });
    },
    [resetCalendarPickerDraft, syncTimeSelectionToView]
  );

  // ── loadTableInstance ─────────────────────────────────────────────────────────
  const loadTableInstance = useCallback((instance) => {
    const api = instance?.api;
    if (!api) return;
    try {
      api.setGridOption?.("maxConcurrentDatasourceRequests", 1);
    } catch (_e) {
      /* AG-Grid v27 */
    }
    // Keep tableRef in sync for PivotPanel / PivotFilters — never leave it
    // mirroring a nullable gridApi React state that beginOrderManagementTableReload
    // used to clear without remounting the grid.
    liveApiRef.current = api;
    tableRef.current.api = api;
    // Defer state update so onGridReady can finish setServerSideDatasource
    // before React effects run collapse/purge (AG Grid mid-draw error).
    deferGridApiCall(api, () => {
      if (api.isDestroyed?.()) return;
      setGridApi(api);
    });
  }, []);

  // ── Pack handler ──────────────────────────────────────────────────────────────
  const handlePackClick = useCallback((rowData) => {
    const path = rowData?.dimensionPath;
    const pivotOrder = viewRef.current?.appliedPivotOrder || [];
    const article =
      getArticleFromDimensionPath(pivotOrder, path) ||
      (Array.isArray(path) && path.length ? path[path.length - 1] : "");
    setPackSheetState({ open: true, sku: String(article || "") });
  }, []);
  const closePackSheet = useCallback(
    () => setPackSheetState({ open: false, sku: "" }),
    []
  );

  useEffect(() => {
    packClickHandlerRef.current = handlePackClick;
  }, [handlePackClick]);

  // ── Period descriptors ────────────────────────────────────────────────────────
  const periodDescriptors = useMemo(() => {
    const tabKey = view.selectedRoqDateTab;
    const calendarRows =
      view.fiscalCalendar?.[
        tabKey === "roq_receipt_date" ? "receipt" : "placement"
      ]?.fiscalCalendarData || [];
    const activeRange = view.selectedDateRange?.[tabKey] || null;
    if (view.fiscalView === "month") {
      const filteredRows = activeRange
        ? calendarRows.filter(
            (row) =>
              row.fiscal_year_week >= activeRange.start_fw &&
              row.fiscal_year_week <= activeRange.end_fw
          )
        : calendarRows;
      const monthIds = [];
      const seen = new Set();
      const monthCap = 8 * (view.monthBucketSize || 1);
      for (const row of filteredRows) {
        const monthId = row.fiscal_year_month;
        if (monthId == null) continue;
        const key = String(monthId);
        if (seen.has(key)) continue;
        seen.add(key);
        monthIds.push(key);
        if (monthIds.length >= monthCap) break;
      }
      return buildPeriodDescriptors({
        fiscalView: "month",
        monthBucketSize: view.monthBucketSize || 1,
        monthPeriodIds: monthIds,
      }).slice(0, 8);
    }
    const filteredRows = activeRange
      ? calendarRows.filter(
          (row) =>
            row.fiscal_year_week >= activeRange.start_fw &&
            row.fiscal_year_week <= activeRange.end_fw
        )
      : calendarRows;
    const weekWindow = view.hlsWeekColumnCount || 8;
    const weekIds = filteredRows
      .slice(0, weekWindow)
      .map((row) => String(row.fiscal_year_week));
    return buildPeriodDescriptors({
      fiscalView: "week",
      weekPeriodIds: weekIds,
    });
  }, [
    view.fiscalView,
    view.monthBucketSize,
    view.fiscalCalendar,
    view.selectedDateRange,
    view.selectedRoqDateTab,
    view.hlsWeekColumnCount,
  ]);

  const periodIds = useMemo(() => flattenDescriptorMembers(periodDescriptors), [
    periodDescriptors,
  ]);
  useEffect(() => {
    periodIdsRef.current = periodIds;
    fiscalViewRef.current = view.fiscalView || "week";
  }, [periodIds, view.fiscalView]);

  const selectedHierarchyL0ForBudget =
    orderManagementScreenConfig?.selecteddHierarchyL0ForBudget || "article";

  const handleOpenBudgetInfo = useCallback((anchorEl, data) => {
    setBudgetInfoPopover({ anchorEl, data });
  }, []);

  const handleCloseBudgetInfo = useCallback(() => {
    setBudgetInfoPopover({ anchorEl: null, data: null });
  }, []);

  const orderQtyBudgetContext = useMemo(
    () => ({
      // TAM inv_oms_budget_config — missing/`disabled: false` keeps feature on.
      enabled: isBudgetInfoPopoverEnabled,
      pivotOrder: view.appliedPivotOrder || [],
      fiscalView: view.fiscalView || "week",
      periodDescriptors,
      fiscalCalendar: view.fiscalCalendar,
      selectedRoqDateTab: view.selectedRoqDateTab || "roq_receipt_date",
      selectedHierarchyL0: selectedHierarchyL0ForBudget,
      highLevelSummaryState,
      filters: selectedFilters || [],
      onOpenBudgetInfo: handleOpenBudgetInfo,
      cellEditMarkers,
      cellEditMarkersRef,
      cellsInFlight,
      cellsInFlightRef,
      viewModeRef,
      viewEditedOnlyRef,
    }),
    [
      isBudgetInfoPopoverEnabled,
      view.appliedPivotOrder,
      view.fiscalView,
      view.fiscalCalendar,
      view.selectedRoqDateTab,
      periodDescriptors,
      selectedHierarchyL0ForBudget,
      highLevelSummaryState,
      selectedFilters,
      handleOpenBudgetInfo,
      cellEditMarkers,
      cellsInFlight,
    ]
  );

  // AG-Grid's `customCellRenderer` hook is read off `gridOptions` by the grid
  // wrapper, not re-subscribed like a normal React prop — the same class of
  // staleness `viewModeRef`/`cellEditMarkersRef`/`cellsInFlightRef` above
  // already guard against. `selectedRoqDateTab` (and the other Placement/
  // Receipt-derived fields) didn't get that treatment, so a renderer
  // invocation captured before the user ever switches tabs could keep
  // reading the mount-time "roq_placement_date" default forever and the
  // receipt-only gate in `shouldShowBudgetInfoIcon` would never pass. Mirror
  // the whole context into a ref, updated after every commit, so the
  // renderer always reads live values regardless of which closure AG-Grid
  // happens to still be holding.
  const orderQtyBudgetContextRef = useRef(orderQtyBudgetContext);
  useEffect(() => {
    orderQtyBudgetContextRef.current = orderQtyBudgetContext;
  }, [orderQtyBudgetContext]);

  const renderOmsOrderQtyCell = useMemo(
    () =>
      createRenderOmsOrderQtyCell({
        ...orderQtyBudgetContext,
        budgetContextRef: orderQtyBudgetContextRef,
      }),
    [orderQtyBudgetContext]
  );

  const buildEditViewContext = useCallback(() => {
    const currentView = viewRef.current;
    const roqTab = currentView.selectedRoqDateTab || "roq_placement_date";
    const activeRange = currentView.selectedDateRange?.[roqTab] || null;
    const hlsCtx = currentView.hlsFilterContext || {};
    return {
      filters: hlsCtx.selectedFilters || [],
      hlsFilterContext: hlsCtx,
      selected_roq_date_tab: roqTab,
      roq_date_option: roqTab,
      aggregation_level: currentView.fiscalView === "month" ? "M" : "W",
      date_filter:
        currentView.hlsDateFilter ??
        hlsCtx?.date_filter ??
        (currentView.fiscalView === "month" ? "1m" : "1w"),
      start_week_id: activeRange?.start_fw ?? null,
      end_week_id: activeRange?.end_fw ?? null,
      start_fiscal_week: activeRange?.start_fw ?? null,
      end_fiscal_week: activeRange?.end_fw ?? null,
      column_dimensions: buildColumnDimensionsPayload(
        currentView.appliedViewDetails
      ),
      rowGroupCols: (currentView.appliedPivotOrder || [])
        .slice(0, -1)
        .map((dimension) => ({
          id: dimension.id,
          field: dimension.id,
          displayName: dimension.label,
        })),
      leafDimension: (() => {
        const leaf = (currentView.appliedPivotOrder || []).slice(-1)[0];
        return leaf
          ? { id: leaf.id, field: leaf.id, displayName: leaf.label }
          : null;
      })(),
      distribution_method: currentView.distributionMethod || null,
    };
  }, []);

  // InputCell blur — auto-save edit immediately (no backend session).
  const handleCellBlur = useCallback(
    async (
      _e,
      data,
      column,
      isChanged,
      _prevValue,
      initialValue,
      cellData,
      newValue
    ) => {
      const changed =
        isChanged === true ||
        String(newValue ?? "") !== String(initialValue ?? "");
      if (!changed) return;

      const api = cellData?.api || getGridApi();
      const editedColId = resolveOrderQtyColId(column, cellData);
      const isDateEdit = isEditableReceiptDateColumn(editedColId);

      let numericValue = null;
      let dateValue = null;
      let priorNumeric = null;
      let priorDate = null;

      if (isDateEdit) {
        dateValue = normalizeOmDeliveryDate(newValue);
        if (!dateValue) {
          dispatch(
            addSnack({
              message: "Enter a valid delivery date",
              options: { variant: "error" },
            })
          );
          return;
        }
        priorDate = normalizeOmDeliveryDate(initialValue);
      } else {
        const parsed = parseOrderQtyEditInput(newValue);
        if (!parsed.ok) {
          dispatch(
            addSnack({
              message: ORDER_QTY_INVALID_INTEGER_MESSAGE,
              options: { variant: "error" },
            })
          );
          return;
        }
        numericValue = parsed.value;
        priorNumeric =
          initialValue !== undefined && initialValue !== null
            ? Number(initialValue)
            : null;
      }

      if (!api) return;
      if (editInFlightRef.current) return;
      editInFlightRef.current = true;
      setIsEditInFlightIfMounted(true);

      const currentView = viewRef.current;
      const editedRowUid = data?.rowUid ?? data?.leafId ?? null;
      const cellKey =
        editedRowUid != null && editedColId
          ? `${editedRowUid}::${editedColId}`
          : null;
      const groupKeys = Array.isArray(data?.dimensionPath)
        ? data.dimensionPath
        : [];
      const isTopLineEdit = isGrandTotalRow(data);
      // Everything visible in the edited cell's blast radius (ancestors +
      // descendants) — reused both for the payload and to proactively lock
      // every affected cell's loader so a user can't fire a second edit into
      // a row that's about to be overwritten by this one's response.
      const openItemsForEdit = collectLoadedRowsUnderEditedCell(
        api,
        groupKeys,
        { isTopLineEdit }
      );
      const blastRadiusRowUids = openItemsForEdit
        .map((row) => row?.rowUid ?? row?.leafId)
        .filter((id) => id != null && String(id) !== String(editedRowUid));

      // Grand Total is always in scope for an order-quantity edit (any qty
      // change rolls up to the top line) but is refreshed via its own
      // follow-up fetchGrandTotal() call rather than the edit-drilldown
      // response — the controller splits it out so hierarchy rows can
      // release their loader as soon as the edit-drilldown response lands,
      // without waiting on that extra round-trip (see
      // createBlastRadiusLoadingController doc comment).
      const loadingController = createBlastRadiusLoadingController({
        api,
        cellsInFlightRef,
        setCellsInFlight: setCellsInFlightIfMounted,
        cellKey,
        colId: editedColId,
        editedRowUid,
        blastRadiusRowUids: [...blastRadiusRowUids, GRAND_TOTAL_ROW_ID],
        grandTotalRowId: GRAND_TOTAL_ROW_ID,
      });

      // BE /columns puts the granular fiscal week/month ids a bucket column
      // aggregates on the GROUP (bucket wrapper) column's own
      // `extra.fiscal_buckets` — never on the leaf order_quantity_<bucket>
      // sub-header itself (see read_drilldown_columns_order_management_service.py
      // `_bucket_columns`). `beColToMtpConfig` copies it down onto every leaf's
      // `extra` so `column`/`cellData.colDef` (already-formatted AG-Grid
      // colDefs) carry it directly.
      const weekListFromCol = resolveColumnFiscalMembers(
        column,
        cellData?.colDef
      );
      // Fallback: look up the same value from the last raw /columns payload
      // by field name. `beColDefs` is the RAW BE response (pre-beColToMtpConfig),
      // so fiscal members must be read off the matching leaf's PARENT group —
      // carry the parent's resolved members down while walking so a leaf
      // match can fall back to them.
      const weekListFromBe =
        weekListFromCol ||
        (() => {
          const field = editedColId;
          if (!field || !Array.isArray(beColDefs)) return null;
          const walk = (cols, inheritedFiscalMembers) => {
            for (const col of cols || []) {
              if (col?.column_name === field) {
                return (
                  resolveColumnFiscalMembers(col) || inheritedFiscalMembers
                );
              }
              if (col?.sub_headers?.length) {
                const nested = walk(
                  col.sub_headers,
                  resolveColumnFiscalMembers(col) || inheritedFiscalMembers
                );
                if (nested) return nested;
              }
            }
            return null;
          };
          return walk(beColDefs, null);
        })();
      const weekList = weekListFromBe;
      const pivotOrder = currentView.appliedPivotOrder || [];
      const isPackEnabled = data?.is_pack_enabled === true;
      const dynamicHierarchy = buildDynamicHierarchy(
        groupKeys,
        pivotOrder,
        isPackEnabled
      );
      const hlsCtx = currentView.hlsFilterContext || {};
      const filtersForEdit = hlsCtx.selectedFilters || selectedFilters || [];
      const dcsForEdit = hlsCtx.selectedDcs || selectedDcs || [];
      // Same bucket-size string sent to /columns + /rows (see
      // buildDrilldownColumnsPayload / buildEditViewContext's `date_filter`)
      // so the edit's fiscal-bucket math matches whatever grouping the grid
      // is currently rendered at (e.g. "1w", "3w", "2m").
      const frequency =
        currentView.hlsDateFilter ??
        hlsCtx?.date_filter ??
        (currentView.fiscalView === "month" ? "1m" : "1w");

      const editBase = {
        kind: isDateEdit ? "drilldown_date" : "drilldown_quantity",
        screen_id: screenId,
        global_filters: buildGlobalFilters(filtersForEdit),
        selected_dcs: Array.isArray(dcsForEdit)
          ? dcsForEdit.map((dc) =>
              typeof dc === "object" ? dc?.value ?? dc : dc
            )
          : [],
        dynamic_hierarchy: dynamicHierarchy,
        timeline_selection: resolveTimelineSelection(
          currentView.selectedRoqDateTab
        ),
        week_list: Array.isArray(weekList) ? weekList : [],
        frequency,
        available_hierarchies: pivotOrder.map((d) =>
          typeof d === "string" ? d : d?.id
        ),
        // Scope to what's actually visible under the cell being edited —
        // never the entire loaded SSRM cache (see collectLoadedRowsUnderEditedCell)
        // — and trim each row to hierarchy key/values + rowUid only, never
        // the full row payload (measures/meta/flags stay FE-only).
        current_open_items: buildHierarchyOnlyOpenItems(
          openItemsForEdit,
          pivotOrder
        ),
      };

      const editPayload = isDateEdit
        ? {
            ...editBase,
            new_date: dateValue,
          }
        : {
            ...editBase,
            new_total: numericValue,
            distribution_algorithm: "component",
            distribution_method: currentView.distributionMethod || null,
            target_column: "order_quantity",
          };

      // Keep legacy intent for subtree purge / top-line detection.
      const intent = buildEditIntentFromCell({
        data,
        column,
        newValue: isDateEdit ? dateValue : numericValue,
        priorValue: initialValue,
        pivotOrder,
        fiscalView: currentView.fiscalView,
      });

      try {
        loadingController.markAll(true);
        setSaveStatusIfMounted("saving");

        const result = await editOrderManagementCell(editPayload);

        if (
          Array.isArray(result?.updated_cells) &&
          result.updated_cells.length
        ) {
          deferGridApiCall(api, () => {
            applyUpdatedCells({
              api,
              updatedCells: result.updated_cells,
              editedColId,
              eachesColId: isDateEdit ? null : deriveEachesColId(editedColId),
              costColId: isDateEdit ? null : deriveCostColId(editedColId),
            });
          });
        } else if (
          Array.isArray(result?.changedRows) &&
          result.changedRows.length
        ) {
          deferGridApiCall(api, () => {
            applyEditDelta({ api, changedRows: result.changedRows });
          });
        }

        // Soft-purge edited subtree cache so next expand refetch reflects BE.
        purgeEditedSubtreeCache(api, data?.dimensionPath || [], {
          isTopLineEdit: Boolean(intent?.isTopLineEdit),
        });

        // Reveal the edited row's next-level children automatically if they
        // weren't already visible. Runs after the purge above so it fetches
        // fresh (not stale-cached) data. Doesn't apply to a top-line/Grand
        // Total edit — that's a pinned row with no "next level" of its own.
        if (!isTopLineEdit && editedRowUid != null) {
          deferGridApiCall(api, () => {
            autoExpandEditedRow(api, editedRowUid);
          });
        }

        if (editedColId && editedRowUid != null && !isDateEdit) {
          // BE only ever sends `edited`/`updated` per cell (no `affected`
          // flag) — "affected" (blue dot) is the FE-derived state for a
          // rolled-up row whose value changed without being the cell the
          // user typed into (see resolveEditDotStatus).
          const affectedRowUids = (result?.updated_cells || [])
            .filter((cell) => cell?.updated && !cell?.edited)
            .map((cell) => cell?.rowUid ?? cell?.leafId)
            .filter(
              (rowUid) =>
                rowUid != null && String(rowUid) !== String(editedRowUid)
            );

          // Also derive from legacy changedRows when present.
          (result?.changedRows || []).forEach((row) => {
            const rowUid = row?.rowUid ?? row?.leafId;
            if (
              rowUid != null &&
              String(rowUid) !== String(editedRowUid) &&
              !affectedRowUids.includes(rowUid)
            ) {
              affectedRowUids.push(rowUid);
            }
          });

          cellEditMarkersRef.current = mergeCellEditMarkers(
            cellEditMarkersRef.current,
            { editedRowUid, colId: editedColId, affectedRowUids }
          );
          dispatch(
            markCellEditImpact({
              editedRowUid,
              colId: editedColId,
              affectedRowUids,
            })
          );
          deferGridApiCall(api, () => {
            refreshOrderQtyEditMarkerCells(api, {
              editedRowUid,
              affectedRowUids,
            });
          });
        }

        // Hierarchy rows' values are already final now that the
        // edit-drilldown response has been applied above — release their
        // loader immediately rather than holding the whole visible
        // hierarchy hostage to the extra Grand Total round-trip below.
        loadingController.markHierarchy(false);

        // Grand Total is a pinned row outside the SSRM node tree, so BE
        // never returns its new value as part of the edit-drilldown
        // response — refetch it from its own endpoint (never derived via a
        // client-side delta) and keep its cell in the loading state until
        // that resolves.
        refreshGrandTotalAfterEdit(loadingController);

        const canPushUndo = isDateEdit
          ? Boolean(priorDate) && priorDate !== dateValue
          : Number.isFinite(priorNumeric);

        // Push to undo stack only when this was a user edit (not an undo replay)
        // and we know the prior value — never record oldValue: 0 as a fallback
        // that a later Undo would wrongly write back to the cell.
        if (
          !currentView.isUndoInProgress &&
          editedRowUid != null &&
          editedColId &&
          canPushUndo
        ) {
          dispatch(
            pushToUndoStack({
              timestamp: Date.now(),
              cellKey,
              rowUid: editedRowUid,
              colId: editedColId,
              oldValue: isDateEdit ? priorDate : priorNumeric,
              newValue: isDateEdit ? dateValue : numericValue,
              editPayload,
              dimensionPath: groupKeys,
              isTopLineEdit,
            })
          );
          // A brand-new edit invalidates whatever was available to Redo —
          // same convention as browser/editor undo-redo.
          dispatch(clearRedoStack());
        }

        dispatch(setCellDirty(true));
        setSaveStatusIfMounted("auto-saved");
        window.setTimeout(() => {
          setSaveStatusIfMounted((prev) =>
            prev === "auto-saved" ? "idle" : prev
          );
        }, 3000);
      } catch (error) {
        setSaveStatusIfMounted("idle");
        // The InputCell already wrote `newValue` straight into the grid's
        // row data as the user typed (node.setDataValue in cellRenderer.jsx
        // handleInputChange), independent of whether this API call ever
        // succeeds. Without reverting here, a failed edit leaves the user
        // stuck staring at their typed value with no indication it was
        // never persisted — reset the cell back to its pre-edit value.
        if (editedRowUid != null && editedColId) {
          const revertNode = findRowNodesByUid(api, [editedRowUid])[0];
          if (revertNode) {
            if (typeof revertNode.setDataValue === "function") {
              revertNode.setDataValue(editedColId, initialValue);
            } else {
              revertNode.data = {
                ...revertNode.data,
                [editedColId]: initialValue,
              };
            }
            deferGridApiCall(api, () => {
              api.refreshCells({
                rowNodes: [revertNode],
                columns: [editedColId],
                force: true,
              });
            });
          }
        }
        dispatch(
          addSnack({
            message: error?.message || ERROR_MESSAGE,
            options: { variant: "error" },
          })
        );
        // Edit failed — no follow-up Grand Total fetch will happen, so
        // release every loader (hierarchy + Grand Total) here instead of
        // leaving Grand Total's cell spinning forever.
        loadingController.markAll(false);
      } finally {
        editInFlightRef.current = false;
        setIsEditInFlightIfMounted(false);
      }
    },
    [
      dispatch,
      getGridApi,
      selectedFilters,
      selectedDcs,
      beColDefs,
      screenId,
      refreshGrandTotalAfterEdit,
      setCellsInFlightIfMounted,
      setIsEditInFlightIfMounted,
      setSaveStatusIfMounted,
    ]
  );

  const handleCellValueChanged = useCallback(
    (event) => {
      const colId =
        event?.colDef?.field ||
        event?.colDef?.colId ||
        event?.column?.getColId?.() ||
        null;
      // DatePicker writes via setDataValue and does not call grid onBlur —
      // route delivery-date changes into the same unified-edit path.
      if (!isEditableReceiptDateColumn(colId)) return;
      if (String(event?.newValue ?? "") === String(event?.oldValue ?? "")) {
        return;
      }
      handleCellBlur(
        null,
        event?.data,
        event?.colDef || { colId, field: colId, column_name: colId },
        true,
        event?.oldValue,
        event?.oldValue,
        {
          api: event?.api,
          colDef: event?.colDef,
          column: event?.column,
          data: event?.data,
        },
        event?.newValue
      );
    },
    [handleCellBlur]
  );

  const handleUndo = useCallback(async () => {
    const currentView = viewRef.current;
    const stack = currentView.undoStack || [];
    const lastEdit = stack[stack.length - 1];
    if (!lastEdit || editInFlightRef.current) return;

    const api = getGridApi();
    if (!api) {
      dispatch(
        addSnack({
          message: "Undo failed — grid is not ready",
          options: { variant: "error" },
        })
      );
      return;
    }

    dispatch(setUndoInProgress(true));
    editInFlightRef.current = true;
    setIsEditInFlightIfMounted(true);
    setSaveStatusIfMounted("saving");

    const cellKey = lastEdit.cellKey;
    // Same blast-radius lock as a fresh edit — every ancestor/descendant
    // row this revert can touch gets its loader up front, not just the
    // originally-edited cell.
    const openItems = collectLoadedRowsUnderEditedCell(
      api,
      lastEdit.dimensionPath,
      { isTopLineEdit: Boolean(lastEdit.isTopLineEdit) }
    );
    const blastRadiusRowUids = openItems
      .map((row) => row?.rowUid ?? row?.leafId)
      .filter((id) => id != null && String(id) !== String(lastEdit.rowUid));
    const loadingController = createBlastRadiusLoadingController({
      api,
      cellsInFlightRef,
      setCellsInFlight: setCellsInFlightIfMounted,
      cellKey,
      colId: lastEdit.colId,
      editedRowUid: lastEdit.rowUid,
      blastRadiusRowUids: [...blastRadiusRowUids, GRAND_TOTAL_ROW_ID],
      grandTotalRowId: GRAND_TOTAL_ROW_ID,
    });
    loadingController.markAll(true);

    try {
      const revertPayload = {
        ...(lastEdit.editPayload || {}),
        ...(lastEdit.editPayload?.kind === "drilldown_date"
          ? { new_date: lastEdit.oldValue }
          : { new_total: lastEdit.oldValue }),
        current_open_items: buildHierarchyOnlyOpenItems(
          openItems,
          currentView.appliedPivotOrder || []
        ),
      };
      const result = await editOrderManagementCell(revertPayload);

      // Hierarchy rows are already final — release their loader now and
      // let Grand Total's own follow-up fetch resolve independently.
      loadingController.markHierarchy(false);
      refreshGrandTotalAfterEdit(loadingController);

      dispatch(popFromUndoStack());
      // Move the undone entry to the redo stack so Redo can replay it.
      dispatch(pushToRedoStack(lastEdit));

      // View Edited Only is BE-filtered — in-place cell paint cannot drop
      // rows that left the mem overlay. Refetch /rows; last-undo (empty
      // stack) is handled by the auto-off effect instead.
      if (viewEditedOnlyRef.current) {
        if (stack.length > 1) {
          refreshSsrmResettingExpansion(api, {
            expandedGroupKeys: expandedGroupKeysRef.current,
          });
        }
      } else {
        const hasUpdatedCells =
          Array.isArray(result?.updated_cells) &&
          result.updated_cells.length > 0;
        const hasChangedRows =
          Array.isArray(result?.changedRows) && result.changedRows.length > 0;

        if (hasUpdatedCells) {
          const isDateUndo =
            lastEdit.editPayload?.kind === "drilldown_date" ||
            isEditableReceiptDateColumn(lastEdit.colId);
          deferGridApiCall(api, () => {
            applyUpdatedCells({
              api,
              updatedCells: result.updated_cells,
              editedColId: lastEdit.colId,
              eachesColId: isDateUndo
                ? null
                : deriveEachesColId(lastEdit.colId),
              costColId: isDateUndo ? null : deriveCostColId(lastEdit.colId),
            });
          });
        } else if (hasChangedRows) {
          deferGridApiCall(api, () => {
            applyEditDelta({ api, changedRows: result.changedRows });
          });
        } else {
          // Backend may have persisted the revert (rows_affected) but returned
          // nothing to paint — leave the grid untouched and surface the gap.
          dispatch(
            addSnack({
              message:
                "Undo saved, but the grid could not be refreshed. Reload the page to see the change.",
              options: { variant: "warning" },
            })
          );
        }
      }

      setSaveStatusIfMounted("auto-saved");
      window.setTimeout(() => {
        setSaveStatusIfMounted((prev) =>
          prev === "auto-saved" ? "idle" : prev
        );
      }, 3000);
    } catch (error) {
      setSaveStatusIfMounted("idle");
      dispatch(
        addSnack({
          message: error?.message || "Undo failed",
          options: { variant: "error" },
        })
      );
      // No follow-up Grand Total fetch will happen on failure — release
      // every loader (hierarchy + Grand Total) instead of leaving Grand
      // Total's cell spinning forever.
      loadingController.markAll(false);
    } finally {
      dispatch(setUndoInProgress(false));
      editInFlightRef.current = false;
      setIsEditInFlightIfMounted(false);
    }
  }, [
    dispatch,
    getGridApi,
    refreshGrandTotalAfterEdit,
    setCellsInFlightIfMounted,
    setIsEditInFlightIfMounted,
    setSaveStatusIfMounted,
  ]);

  const handleRedo = useCallback(async () => {
    const currentView = viewRef.current;
    const stack = currentView.redoStack || [];
    const lastRedo = stack[stack.length - 1];
    if (!lastRedo || editInFlightRef.current) return;

    const api = getGridApi();
    if (!api) {
      dispatch(
        addSnack({
          message: "Redo failed — grid is not ready",
          options: { variant: "error" },
        })
      );
      return;
    }

    editInFlightRef.current = true;
    setIsEditInFlightIfMounted(true);
    setSaveStatusIfMounted("saving");

    const cellKey = lastRedo.cellKey;
    const openItems = collectLoadedRowsUnderEditedCell(
      api,
      lastRedo.dimensionPath,
      { isTopLineEdit: Boolean(lastRedo.isTopLineEdit) }
    );
    const blastRadiusRowUids = openItems
      .map((row) => row?.rowUid ?? row?.leafId)
      .filter((id) => id != null && String(id) !== String(lastRedo.rowUid));
    const loadingController = createBlastRadiusLoadingController({
      api,
      cellsInFlightRef,
      setCellsInFlight: setCellsInFlightIfMounted,
      cellKey,
      colId: lastRedo.colId,
      editedRowUid: lastRedo.rowUid,
      blastRadiusRowUids: [...blastRadiusRowUids, GRAND_TOTAL_ROW_ID],
      grandTotalRowId: GRAND_TOTAL_ROW_ID,
    });
    loadingController.markAll(true);

    try {
      // Re-apply the newValue that was in place before the Undo — recompute
      // current_open_items fresh (visible rows may have changed since).
      const redoPayload = {
        ...(lastRedo.editPayload || {}),
        ...(lastRedo.editPayload?.kind === "drilldown_date"
          ? { new_date: lastRedo.newValue }
          : { new_total: lastRedo.newValue }),
        current_open_items: buildHierarchyOnlyOpenItems(
          openItems,
          currentView.appliedPivotOrder || []
        ),
      };
      const result = await editOrderManagementCell(redoPayload);

      // Hierarchy rows are already final — release their loader now and
      // let Grand Total's own follow-up fetch resolve independently.
      loadingController.markHierarchy(false);
      refreshGrandTotalAfterEdit(loadingController);

      dispatch(popFromRedoStack());
      // Move the replayed entry back onto the undo stack so it can be
      // undone again.
      dispatch(pushToUndoStack(lastRedo));

      // Same as Undo: View Edited Only must refetch /rows so values and
      // edited-row membership match the mem overlay after redo.
      if (viewEditedOnlyRef.current) {
        refreshSsrmResettingExpansion(api, {
          expandedGroupKeys: expandedGroupKeysRef.current,
        });
      } else {
        const hasUpdatedCells =
          Array.isArray(result?.updated_cells) &&
          result.updated_cells.length > 0;
        const hasChangedRows =
          Array.isArray(result?.changedRows) && result.changedRows.length > 0;

        if (hasUpdatedCells) {
          const isDateRedo =
            lastRedo.editPayload?.kind === "drilldown_date" ||
            isEditableReceiptDateColumn(lastRedo.colId);
          deferGridApiCall(api, () => {
            applyUpdatedCells({
              api,
              updatedCells: result.updated_cells,
              editedColId: lastRedo.colId,
              eachesColId: isDateRedo
                ? null
                : deriveEachesColId(lastRedo.colId),
              costColId: isDateRedo ? null : deriveCostColId(lastRedo.colId),
            });
          });
        } else if (hasChangedRows) {
          deferGridApiCall(api, () => {
            applyEditDelta({ api, changedRows: result.changedRows });
          });
        } else {
          dispatch(
            addSnack({
              message:
                "Redo saved, but the grid could not be refreshed. Reload the page to see the change.",
              options: { variant: "warning" },
            })
          );
        }
      }

      setSaveStatusIfMounted("auto-saved");
      window.setTimeout(() => {
        setSaveStatusIfMounted((prev) =>
          prev === "auto-saved" ? "idle" : prev
        );
      }, 3000);
    } catch (error) {
      setSaveStatusIfMounted("idle");
      dispatch(
        addSnack({
          message: error?.message || "Redo failed",
          options: { variant: "error" },
        })
      );
      // No follow-up Grand Total fetch will happen on failure — release
      // every loader (hierarchy + Grand Total) instead of leaving Grand
      // Total's cell spinning forever.
      loadingController.markAll(false);
    } finally {
      editInFlightRef.current = false;
      setIsEditInFlightIfMounted(false);
    }
  }, [
    dispatch,
    getGridApi,
    refreshGrandTotalAfterEdit,
    setCellsInFlightIfMounted,
    setIsEditInFlightIfMounted,
    setSaveStatusIfMounted,
  ]);

  const handleResetAll = useCallback(() => {
    const currentView = viewRef.current;
    const stack = currentView.undoStack || [];
    if (stack.length === 0) {
      dispatch(
        addSnack({
          message: "No edits to reset",
          options: { variant: "info" },
        })
      );
      return;
    }
    setIsResetAllConfirmOpen(true);
  }, [dispatch]);

  // Only re-filter columns when grand total changes if the switch is on
  // (avoids rebuilding columnDefs after the first /rows → second SSRM fetch).
  const filteredBeCols = useMemo(
    () =>
      filterBePeriodColumnsByGrandTotal(beColDefs, view.grandTotal, {
        hideEmptyPeriods,
      }),
    [beColDefs, hideEmptyPeriods, hideEmptyPeriods ? view.grandTotal : null]
  );

  // Leaf order_quantity colId → the fiscal week/month ids its bucket column
  // aggregates. BE stamps `fiscal_buckets` on the GROUP column only, so walk
  // the raw /columns tree once and map every leaf to its group's members.
  const fiscalMembersByColId = useMemo(() => {
    const map = new Map();
    (filteredBeCols || []).forEach((col) => {
      if (!col?.sub_headers?.length) return;
      const members = (resolveColumnFiscalMembers(col) || [])
        .map(Number)
        .filter((id) => Number.isFinite(id));
      if (!members.length) return;
      col.sub_headers.forEach((sub) => {
        if (sub?.column_name && !map.has(sub.column_name)) {
          map.set(sub.column_name, members);
        }
      });
    });
    return map;
  }, [filteredBeCols]);

  const confirmResetAll = useCallback(async () => {
    setIsResetAllConfirmOpen(false);
    const currentView = viewRef.current;
    const pivotOrder = currentView.appliedPivotOrder || [];
    const hlsCtx = currentView.hlsFilterContext || {};
    const weekList = (periodIdsRef.current || [])
      .map(Number)
      .filter((id) => Number.isFinite(id));

    if (weekList.length === 0) {
      dispatch(
        addSnack({
          message: "No fiscal periods in view to reset",
          options: { variant: "info" },
        })
      );
      return;
    }

    // Scope the revert to the rows this session's undo stack actually edited
    // (deduped — several edited week cells on one row share a dimensionPath).
    // Without drilldown_selection the BE reverts every edited row in the
    // whole global-filters window, including edits from outside this session.
    let hasTopLineEdit = false;
    const traceBySignature = new Map();
    (currentView.undoStack || []).forEach((entry) => {
      const path = Array.isArray(entry?.dimensionPath)
        ? entry.dimensionPath
        : [];
      if (entry?.isTopLineEdit || path.length === 0) {
        hasTopLineEdit = true;
        return;
      }
      const signature = path.join("\u001f");
      if (!traceBySignature.has(signature)) {
        traceBySignature.set(signature, path);
      }
    });
    // A topline edit redistributes the whole universe, so its revert scope
    // stays the full filter window — drilldown_selection is omitted for it.
    const drilldownSelection = hasTopLineEdit
      ? []
      : buildSelectionTrace({
          traces: [...traceBySignature.values()],
          pivotOrder,
        });

    // Scope weeks the same way rows are scoped: only the fiscal buckets the
    // undo stack actually edited. Fall back to the full visible window when
    // the scope is unknowable — a topline edit redistributes the whole
    // timeline, and an unresolvable column must never silently skip a revert.
    let scopedWeekList = null;
    if (!hasTopLineEdit && (currentView.undoStack || []).length > 0) {
      const editedMembers = new Set();
      let hasUnresolvedColumn = false;
      (currentView.undoStack || []).forEach((entry) => {
        if (entry?.isTopLineEdit) return;
        const members = fiscalMembersByColId.get(entry?.colId);
        if (!members?.length) {
          hasUnresolvedColumn = true;
          return;
        }
        members.forEach((id) => editedMembers.add(id));
      });
      if (!hasUnresolvedColumn && editedMembers.size > 0) {
        const intersected = weekList.filter((id) => editedMembers.has(id));
        if (intersected.length > 0) scopedWeekList = intersected;
      }
    }

    const frequency =
      currentView.hlsDateFilter ??
      hlsCtx?.date_filter ??
      (currentView.fiscalView === "month" ? "1m" : "1w");

    try {
      setSaveStatusIfMounted("saving");
      const result = await resetAllEdits({
        screen_id: screenId,
        global_filters: buildGlobalFilters(
          hlsCtx.selectedFilters || selectedFilters || []
        ),
        ...(drilldownSelection.length
          ? { drilldown_selection: drilldownSelection }
          : {}),
        week_list: scopedWeekList || weekList,
        available_hierarchies: pivotOrder
          .map((dim) => (typeof dim === "string" ? dim : dim?.id))
          .filter(Boolean),
        timeline_selection: resolveTimelineSelection(
          currentView.selectedRoqDateTab
        ),
        frequency,
      });

      dispatch(clearUndoStack());
      dispatch(clearCellEditMarkers());
      cellEditMarkersRef.current = {};
      setViewEditedOnly(false);
      viewEditedOnlyRef.current = false;
      dispatch(setCellDirty(false));

      const api = getGridApi();
      if (api) {
        // Collapse + single root refetch (same reasoning as Set All).
        refreshSsrmResettingExpansion(api, {
          expandedGroupKeys: expandedGroupKeysRef.current,
        });
      }
      fetchGrandTotalRef.current?.();

      setSaveStatusIfMounted("idle");
      dispatch(
        addSnack({
          message: `All edits reset successfully${
            typeof result?.rows_reverted === "number"
              ? ` (${result.rows_reverted} row(s))`
              : ""
          }`,
          options: { variant: "success" },
        })
      );
    } catch (error) {
      setSaveStatusIfMounted("idle");
      dispatch(
        addSnack({
          message: error?.message || "Failed to reset edits",
          options: { variant: "error" },
        })
      );
    }
  }, [
    dispatch,
    fiscalMembersByColId,
    getGridApi,
    screenId,
    selectedFilters,
    setSaveStatusIfMounted,
  ]);

  const handleViewEditedOnlyToggle = useCallback(
    (event) => {
      const enabled =
        typeof event === "boolean" ? event : Boolean(event?.target?.checked);
      viewEditedOnlyRef.current = enabled;
      setViewEditedOnly(enabled);
      // Purge SSRM so /rows refetches with view_edited_only — do not clear
      // undo/redo (unlike beginOrderManagementTableReload).
      refreshSsrmResettingExpansion(getGridApi(), {
        expandedGroupKeys: expandedGroupKeysRef.current,
      });
    },
    [getGridApi]
  );

  // When the undo stack empties (Undo / Reset / Save), turn the toggle off
  // and refetch the full row universe.
  useEffect(() => {
    if (!viewEditedOnly) return;
    if ((view.undoStack || []).length > 0) return;
    viewEditedOnlyRef.current = false;
    setViewEditedOnly(false);
    refreshSsrmResettingExpansion(getGridApi(), {
      expandedGroupKeys: expandedGroupKeysRef.current,
    });
  }, [view.undoStack, viewEditedOnly, getGridApi]);

  // Legacy cleanup only — stacks are scoped to the live session and invalidated
  // on every universe change; the old localStorage mirror never restored and is gone.
  useEffect(() => {
    try {
      localStorage.removeItem(OM_UNDO_STACK_BACKUP_KEY);
    } catch (_err) {
      // Ignore private-mode / storage failures.
    }
  }, []);

  const handleSave = useCallback(async () => {
    const currentView = viewRef.current;
    dispatch(saveStarted());
    try {
      await saveOrderManagement({
        viewContext: buildEditViewContext(),
        distributionMethod: currentView.distributionMethod,
      });
      dispatch(saveSucceeded());
      dispatch(setGrandTotal(null));
      dispatch(clearUndoStack());
      setViewEditedOnly(false);
      viewEditedOnlyRef.current = false;
      refreshSsrmResettingExpansion(getGridApi(), {
        expandedGroupKeys: expandedGroupKeysRef.current,
      });
    } catch (error) {
      console.error("[OMS] save failed", error);
      dispatch(saveFailed(error?.message || "save failed"));
    }
  }, [dispatch, getGridApi, buildEditViewContext]);

  // ── Set All popup options ──────────────────────────────────────────────────
  const configuredDistributionOptions = useSelector(
    selectDistributionMethodOptions
  );
  const setAllDistributionOptions = useMemo(
    () =>
      configuredDistributionOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [configuredDistributionOptions]
  );

  // Lock feature parked for R&D — revisit once fully understood, then
  // restore lockCellApi/lockCellCustomConditionFn below (and their props on
  // <AgGridComponent>) to re-enable the padlock toggle. `stampRows` stays
  // wired regardless — it also stamps `dimensionPath`/`rowUid` on every row
  // (required for SSRM tree data), not just the lock overlay.
  // const { lockCellApi, lockCellCustomConditionFn, stampRows } = lockHandlers;
  const { stampRows } = lockHandlers;

  // Reset period filter when the applied view / column set changes.
  useEffect(() => {
    setHideEmptyPeriods(false);
  }, [view.appliedPivotOrder]);

  // Set All timeline options mirror the grid headers 1:1 — the label is the
  // bucket column's own header text and the members are the BE
  // `extra.fiscal_buckets` ids that bucket aggregates (week ids in week view,
  // month codes in month view). No fiscal-calendar re-derivation.
  const setAllTimelineOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    for (const col of filteredBeCols || []) {
      if (!col?.sub_headers?.length) continue; // period bucket = group column
      const members = resolveColumnFiscalMembers(col);
      if (!members?.length) continue;
      const key = members.map(String).join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        value: key,
        label: col.label || col.header_name || key,
        members: members.map(Number).filter((id) => Number.isFinite(id)),
      });
    }
    return options;
  }, [filteredBeCols]);

  // ── Column definitions ────────────────────────────────────────────────────────
  // Driven entirely by BE /columns. Grid is not mounted until beColDefs exist.
  const columnDefs = useMemo(() => {
    if (!beColDefs?.length) return [];

    const hierarchyCol = buildHierarchyColumn({
      pivotOrder: view.appliedPivotOrder,
      onPackClick: onPackClickStable,
      showBudgetHierarchyBadge: isBudgetHierarchyBadgeEnabled,
    });

    editableColIdsRef.current = collectEditableColIds(beColDefs);
    const editContext = {
      editableFromLevel,
      viewMode,
      viewModeRef,
      viewEditedOnly,
      viewEditedOnlyRef,
      pivotOrder: view.appliedPivotOrder,
      selectedKpi: view.selectedKpi,
      cellEditMarkersRef,
      rowDimensionsEditableMap: buildRowDimensionsEditableMap(beRowDimensions),
      maxEditableReceiptDate,
    };
    const periodCols = formatBeColumnsForAgGrid(filteredBeCols, editContext);

    // During a soft (KPI-only) reload: overlay ShimmerCell on newly-added
    // measure columns until the first SSRM rows response clears the pending set.
    const pending = pendingMeasureColNamesRef.current;
    if (pending.size > 0) {
      const applyShimmer = (colDef) => {
        if (!colDef) return colDef;
        // Leaf column — check if its field/colId matches a pending name
        if (colDef.field && pending.has(colDef.field)) {
          return { ...colDef, cellRenderer: ShimmerCell, editable: false };
        }
        // Group column — recurse into children
        if (Array.isArray(colDef.children)) {
          return { ...colDef, children: colDef.children.map(applyShimmer) };
        }
        return colDef;
      };
      return [hierarchyCol, ...periodCols.map(applyShimmer)];
    }

    return [hierarchyCol, ...periodCols];
  }, [
    beColDefs,
    filteredBeCols,
    view.appliedPivotOrder,
    view.selectedKpi,
    editableFromLevel,
    viewMode,
    viewEditedOnly,
    onPackClickStable,
    beRowDimensions,
    softReloadVersion,
    isBudgetHierarchyBadgeEnabled,
    maxEditableReceiptDate,
  ]);

  // Depth-fade accent border lives on the checkbox column (shared core
  // agGrid wrapper injects it; `customSelectCellStyle` is its sanctioned
  // per-consumer override point) instead of the hierarchy column.
  const customSelectCellStyle = useCallback((params) => {
    const borderStyle = getHierarchyLevelBorderStyle(
      params?.data,
      appliedPivotOrderRef.current
    );
    return { display: "flex", ...(borderStyle || {}) };
  }, []);

  const handleGrandTotalFromApi = useCallback(
    (grandTotal) => {
      if (!grandTotal) return;
      dispatch(
        setGrandTotal({
          ...grandTotal,
          meta: {
            ...(grandTotal.meta || {}),
            __isGrandTotal: true,
          },
        })
      );
    },
    [dispatch]
  );

  // ── SSRM Datasource ───────────────────────────────────────────────────────────
  const {
    manualCallBack,
    getSubRowsRequest,
    fetchGrandTotal,
  } = useOrderManagementTreeDatasource({
    screenId,
    pivotOrder: view.appliedPivotOrder,
    selectedFilters,
    selectedRoqDateTab: view.selectedRoqDateTab,
    hlsDateFilter: view.hlsDateFilter,
    selectedDateRange: view.selectedDateRange,
    selectedIds,
    appliedViewDetails: view.appliedViewDetails,
    pivotPayloadKpis: pivotPayload?.kpis,
    stampRows,
    onGrandTotal: handleGrandTotalFromApi,
    viewEditedOnlyRef,
  });

  useEffect(() => {
    fetchGrandTotalRef.current = fetchGrandTotal;
  }, [fetchGrandTotal]);

  useEffect(() => {
    const api = getGridApi();
    if (!api) return;
    // Grid just mounted — ssrmRefreshTick may already have advanced during
    // bootstrap/columns fetch; do not purge while the first draw is in flight.
    if (skipInitialSsrmRefreshRef.current) {
      skipInitialSsrmRefreshRef.current = false;
      lastRefreshTickRef.current = view.ssrmRefreshTick;
      return;
    }
    if (lastRefreshTickRef.current === view.ssrmRefreshTick) return;
    lastRefreshTickRef.current = view.ssrmRefreshTick;
    // Skip hard reset for soft KPI reload — /columns .then() handles SSRM refresh
    // via refreshSsrmPreservingExpansionSoft once new columns are ready.
    if (isSoftColumnReloadRef.current) return;
    dispatch(setGrandTotal(null));
    refreshSsrmResettingExpansion(api, {
      expandedGroupKeys: expandedGroupKeysRef.current,
    });
  }, [view.ssrmRefreshTick, gridApi, getGridApi, dispatch]);

  // ── Pinned grand total row ────────────────────────────────────────────────────
  const pinnedTopRowData = useMemo(() => {
    if (!view.grandTotal) return [];
    const row = {
      ...view.grandTotal,
      _hideSelection: true,
      meta: { ...(view.grandTotal.meta || {}), __isGrandTotal: true },
      leafId: GRAND_TOTAL_ROW_ID,
      rowUid: GRAND_TOTAL_ROW_ID,
    };
    return stampRows([row]);
  }, [view.grandTotal, stampRows]);

  // ── Expand / collapse ─────────────────────────────────────────────────────────

  useEffect(() => {
    const api = getGridApi();
    if (!api) return undefined;
    const onModelUpdated = () => {
      // Clear shimmer on the first SSRM rows response after a soft KPI reload.
      if (pendingMeasureColNamesRef.current.size > 0) {
        clearedMeasureColNamesRef.current = new Set(
          pendingMeasureColNamesRef.current
        );
        pendingMeasureColNamesRef.current = new Set();
        setSoftReloadVersion((v) => v + 1);
        isSoftKpiReloadRef.current = false;
      }
    };
    api.addEventListener?.("modelUpdated", onModelUpdated);
    return () => {
      if (!api.isDestroyed?.()) {
        api.removeEventListener?.("modelUpdated", onModelUpdated);
      }
    };
  }, [gridApi, getGridApi]);

  // After shimmer clears (softReloadVersion bumped), refresh only the columns
  // that previously had ShimmerCell — avoids a full-grid skeleton flash.
  useEffect(() => {
    if (softReloadVersion === 0) return;
    const api = getGridApi();
    if (!api) return;
    deferGridApiCall(api, () => {
      if (api.isDestroyed?.()) return;
      const cols = clearedMeasureColNamesRef.current;
      if (cols.size > 0) {
        api.refreshCells?.({ columns: [...cols], force: true });
      } else {
        api.refreshCells?.({ force: true });
      }
    });
  }, [softReloadVersion, gridApi, getGridApi]);

  const isServerSideGroupOpenByDefault = useCallback((params) => {
    const rowUid = params.rowNode?.data?.rowUid;
    return rowUid != null && expandedGroupKeysRef.current.has(String(rowUid));
  }, []);

  // ── Row selection ───────────────────────────────────────────────────────────
  // Every checked row's own dimensionPath is remembered in
  // selectedPathsByUidRef and emitted as its own trace — no ancestor-collapse
  // gating. The persistent map survives SSRM block eviction so selections made
  // across scroll/expansion all reach Product Details / Set All / Approve.
  // Parent-check cascades to all loaded descendants feature-side; partially
  // selected groups render a dash at every level.

  // Read selection via forEachNode + node.isSelected(), never
  // api.getSelectedNodes(): the core wrapper's getRowId returns null for
  // non-level-0 rows, so the grid's id-keyed selection registry collapses
  // those nodes onto one key and getSelectedNodes() returns only the last.
  const getSelectedRowUids = useCallback((api) => {
    const uids = new Set();
    api.forEachNode((node) => {
      if (!node?.data || node.rowPinned) return;
      if (!node.isSelected?.()) return;
      const uid = node.data.rowUid ?? node.data.leafId;
      if (uid != null) uids.add(String(uid));
    });
    return uids;
  }, []);

  const findNodeByUid = useCallback((api, uid) => {
    let match = null;
    const target = String(uid);
    api.forEachNode((node) => {
      if (node?.data && String(node.data.rowUid) === target) match = node;
    });
    return match;
  }, []);

  const snapshotSelectedNodeIds = useCallback(
    (api) => {
      previousSelectedNodeIdsRef.current = getSelectedRowUids(api);
    },
    [getSelectedRowUids]
  );

  const rememberSelectedPath = useCallback((uid, dimensionPath) => {
    if (
      uid == null ||
      !Array.isArray(dimensionPath) ||
      dimensionPath.length === 0
    ) {
      return;
    }
    selectedPathsByUidRef.current.set(String(uid), dimensionPath.map(String));
  }, []);

  const forgetSelectedPath = useCallback((uid) => {
    if (uid == null) return;
    selectedPathsByUidRef.current.delete(String(uid));
  }, []);

  const isGroupNode = useCallback(
    (node) => Boolean(node?.group) || node?.data?.isGroup === true,
    []
  );

  const isSelectionCapableNode = useCallback(
    (node) =>
      Boolean(node?.data) &&
      !node.rowPinned &&
      !node.data._hideSelection &&
      !node.data.checkbox_disabled,
    []
  );

  const forEachLoadedDescendant = useCallback((api, groupNode, callback) => {
    const groupPath = (groupNode?.data?.dimensionPath || []).map(String);
    if (!groupPath.length) return;
    api.forEachNode((node) => {
      if (node === groupNode) return;
      const path = node?.data?.dimensionPath;
      if (!Array.isArray(path) || path.length <= groupPath.length) return;
      const isDescendant = groupPath.every(
        (value, index) => String(path[index]) === value
      );
      if (isDescendant) callback(node);
    });
  }, []);

  const hasRemovedLoadedDescendant = useCallback(
    (api, groupNode, removedUidSet) => {
      let found = false;
      forEachLoadedDescendant(api, groupNode, (node) => {
        if (found) return;
        const uid = node?.data?.rowUid ?? node?.data?.leafId;
        if (uid != null && removedUidSet.has(String(uid))) found = true;
      });
      return found;
    },
    [forEachLoadedDescendant]
  );

  const cascadeDescendantSelection = useCallback(
    (api, groupNode, selected) => {
      if (!isGroupNode(groupNode)) return;
      forEachLoadedDescendant(api, groupNode, (node) => {
        if (!isSelectionCapableNode(node)) return;
        if (node.isSelected?.() !== selected) {
          node.setSelected(selected, false, true);
        }
      });
    },
    [forEachLoadedDescendant, isGroupNode, isSelectionCapableNode]
  );

  // The core wrapper's indeterminate pass locates rows via the row-id DOM
  // attribute, which its getRowId only emits for level-0 rows — so partial
  // ("-") state can never render below level 0. This feature-side pass maps
  // nodes to rows via row-index instead and marks every partially selected
  // group, at any depth, without touching core.
  const treeIndeterminateFrameRef = useRef(null);
  const refreshTreeIndeterminateStates = useCallback(
    (api) => {
      if (!api) return;
      if (treeIndeterminateFrameRef.current) {
        cancelAnimationFrame(treeIndeterminateFrameRef.current);
      }
      treeIndeterminateFrameRef.current = requestAnimationFrame(() => {
        treeIndeterminateFrameRef.current = null;
        if (api.isDestroyed?.()) return;
        const gridRoot = document
          .querySelector('.ag-body-viewport [role="row"]')
          ?.closest(".ag-root");
        if (!gridRoot) return;
        const wrapperSelector =
          ".ag-selection-checkbox .ag-checkbox-input-wrapper";
        // Clear first — recycled row DOM can carry a stale dash.
        gridRoot.querySelectorAll(wrapperSelector).forEach((wrapper) => {
          wrapper.classList.remove("ag-indeterminate");
          const input = wrapper.querySelector("input");
          if (input) input.indeterminate = false;
        });
        const stats = new Map();
        api.forEachNode((node) => {
          const parent = node?.parent;
          if (!parent || parent.level < 0) return;
          if (!isGroupNode(parent)) return;
          if (!isSelectionCapableNode(node)) return;
          const entry = stats.get(parent.id) || {
            total: 0,
            selected: 0,
            parent,
          };
          entry.total += 1;
          if (node.isSelected?.()) entry.selected += 1;
          stats.set(parent.id, entry);
        });
        stats.forEach(({ total, selected, parent }) => {
          const isPartial = total > 0 && selected > 0 && selected < total;
          const rowIndex = parent.rowIndex;
          if (!isPartial || rowIndex == null || rowIndex < 0) return;
          gridRoot
            .querySelectorAll(`[row-index="${rowIndex}"] ${wrapperSelector}`)
            .forEach((wrapper) => {
              wrapper.classList.add("ag-indeterminate");
              wrapper.classList.remove("ag-checked");
              const input = wrapper.querySelector("input");
              if (input) input.indeterminate = true;
            });
        });
      });
    },
    [isGroupNode, isSelectionCapableNode]
  );

  useEffect(
    () => () => {
      if (treeIndeterminateFrameRef.current) {
        cancelAnimationFrame(treeIndeterminateFrameRef.current);
      }
    },
    []
  );

  const handleBodyScroll = useCallback(
    (event) => {
      refreshTreeIndeterminateStates(event?.api);
    },
    [refreshTreeIndeterminateStates]
  );

  const dispatchSelectionKeysFromState = useCallback(
    (api) => {
      const pivotOrder = appliedPivotOrderRef.current;
      const selectionKeys = new Set();

      // Backfill from currently loaded grid selection so the persistent map
      // stays current for visible rows (forEachNode, not getSelectedNodes —
      // see getSelectedRowUids).
      api.forEachNode((node) => {
        if (node?.rowPinned || !node?.data) return;
        if (!node.isSelected?.()) return;
        rememberSelectedPath(node.data.rowUid, node.data.dimensionPath);
      });

      const candidatePaths = [];
      selectedPathsByUidRef.current.forEach((dimensionPath) => {
        if (!Array.isArray(dimensionPath) || dimensionPath.length === 0) return;
        candidatePaths.push(dimensionPath);
      });

      // Emit every remembered row's own trace — no ancestor-collapse gating.
      const seenTraceKeys = new Set();
      const selectionTraces = candidatePaths.filter((path) => {
        const traceKey = path.join("\0");
        if (seenTraceKeys.has(traceKey)) return false;
        seenTraceKeys.add(traceKey);
        return true;
      });

      selectionTraces.forEach((dimensionPath) => {
        const depth = Math.min(dimensionPath.length - 1, pivotOrder.length - 1);
        const dimensionId = pivotOrder[depth]?.id;
        if (dimensionId != null) {
          selectionKeys.add(`${dimensionId}::${dimensionPath[depth]}`);
        }
      });

      dispatch(setSelectedRowKeys(Array.from(selectionKeys)));
      dispatch(setSelectedRowTraces(selectionTraces));
    },
    [dispatch, rememberSelectedPath]
  );

  // Diff-and-sync pipeline shared by selectionChanged and modelUpdated. The
  // modelUpdated path matters because block-load auto-selects (children of a
  // checked parent) can land without a selectionChanged event when the grid's
  // id-keyed selection registry dedupes the null ids that the core wrapper's
  // getRowId emits for non-level-0 rows.
  const syncSelectionDiff = useCallback(
    (api) => {
      const previousIds = previousSelectedNodeIdsRef.current;
      const currentIds = getSelectedRowUids(api);
      const preAddedIds = [...currentIds].filter((id) => !previousIds.has(id));
      const preRemovedIds = [...previousIds].filter((id) => !currentIds.has(id));
      if (preAddedIds.length === 0 && preRemovedIds.length === 0) return;

      // Deep cascade runs before bookkeeping so traces reflect the final
      // checkbox state. Deselect is gated on "no removed loaded descendant in
      // this batch" to tell an explicit group uncheck apart from the core
      // roll-up deselect that fires when the user unchecks a single child —
      // roll-up must keep the still-selected sibling branches.
      const removedUidSet = new Set(preRemovedIds);
      preAddedIds.forEach((uid) => {
        const node = findNodeByUid(api, uid);
        if (isGroupNode(node)) cascadeDescendantSelection(api, node, true);
      });
      preRemovedIds.forEach((uid) => {
        const node = findNodeByUid(api, uid);
        if (
          node?.data &&
          isGroupNode(node) &&
          !hasRemovedLoadedDescendant(api, node, removedUidSet)
        ) {
          cascadeDescendantSelection(api, node, false);
        }
      });

      const finalIds = getSelectedRowUids(api);
      const addedIds = [...finalIds].filter((id) => !previousIds.has(id));
      const removedIds = [...previousIds].filter((id) => !finalIds.has(id));

      addedIds.forEach((uid) => {
        const node = findNodeByUid(api, uid);
        if (!node?.data) return;
        rememberSelectedPath(node.data.rowUid, node.data.dimensionPath);
      });
      removedIds.forEach((uid) => {
        // Only forget a row when it is still loaded AND AG Grid itself has
        // unchecked it (a genuine user/native deselect). A row that is merely
        // absent from currentIds because its SSRM block was scrolled out of
        // cache is NOT a deselection — keep its remembered path.
        const node = findNodeByUid(api, uid);
        if (node?.data && !node.isSelected()) {
          forgetSelectedPath(uid);
        }
      });

      snapshotSelectedNodeIds(api);
      dispatchSelectionKeysFromState(api);
    },
    [
      getSelectedRowUids,
      findNodeByUid,
      snapshotSelectedNodeIds,
      dispatchSelectionKeysFromState,
      forgetSelectedPath,
      rememberSelectedPath,
      isGroupNode,
      cascadeDescendantSelection,
      hasRemovedLoadedDescendant,
    ]
  );

  const handleSelectionChanged = useCallback(
    (event) => {
      const api = event?.api;
      if (!api) return;
      refreshTreeIndeterminateStates(api);
      if (api.isSelectAllRecords === true) {
        selectedPathsByUidRef.current.clear();
        dispatch(setSelectedRowKeys([]));
        dispatch(setSelectedRowTraces([]));
        Promise.resolve().then(() => dispatch(setIsSelectAll(true)));
        snapshotSelectedNodeIds(api);
        return;
      }

      // Explicit bulk deselect (e.g. post-approval deselectAll) — forget all.
      const currentIds = getSelectedRowUids(api);
      if (currentIds.size === 0) {
        if (selectedPathsByUidRef.current.size > 0) {
          selectedPathsByUidRef.current.clear();
          snapshotSelectedNodeIds(api);
          dispatchSelectionKeysFromState(api);
        } else {
          snapshotSelectedNodeIds(api);
        }
        return;
      }

      syncSelectionDiff(api);
    },
    [
      dispatch,
      getSelectedRowUids,
      snapshotSelectedNodeIds,
      dispatchSelectionKeysFromState,
      refreshTreeIndeterminateStates,
      syncSelectionDiff,
    ]
  );

  const getSelectedNodesData = useCallback(() => {
    const api = gridApi ?? liveApiRef.current;
    return (api?.getSelectedNodes?.() || [])
      .map((node) => node?.data)
      .filter(Boolean);
  }, [gridApi]);

  const reconcileSelectionFromState = useCallback(
    (event) => {
      const api = event?.api;
      if (!api) return;
      refreshTreeIndeterminateStates(api);
      // Catch selection changes that arrived silently (block-load auto-select
      // of children under a checked parent). Skips the bulk-deselect branch —
      // a purge-driven empty model is not a deselection.
      if (api.isSelectAllRecords !== true) syncSelectionDiff(api);
    },
    [refreshTreeIndeterminateStates, syncSelectionDiff]
  );

  const handleAfterMutation = useCallback(
    (options) => {
      // Bulk mutations (Approve Orders, Set All) change server-side values
      // that stored undo oldValue entries no longer match.
      dispatch(clearUndoStack());
      dispatch(clearRedoStack());
      dispatch(setUndoInProgress(false));
      setViewEditedOnly(false);
      viewEditedOnlyRef.current = false;

      const api = getGridApi();
      if (options?.clearSelection) api?.deselectAll?.();
      // Collapse to top level and refetch only the root block — preserving
      // expansion here would fire one /rows request per expanded group.
      refreshSsrmResettingExpansion(api, {
        expandedGroupKeys: expandedGroupKeysRef.current,
      });
    },
    [dispatch, getGridApi]
  );

  // Set All writes source-column quantities for every selected leaf server-side,
  // so undo/redo is invalidated the same way handleAfterMutation does — bulk
  // mutations make stored oldValue stale. The popup scopes the write to ONE
  // fiscal month, sent as frequency "1m" + week_list [YYYYMM].
  const handleApplySetAll = useCallback(
    async ({
      distributionMethod = null,
      timelinePeriodId = null,
      timelineLabel = null,
      timelineMembers = null,
    } = {}) => {
      setIsSetAllOpen(false);
      if (!distributionMethod || !timelinePeriodId) return;

      const currentView = viewRef.current;
      const pivotOrder = currentView.appliedPivotOrder || [];
      const drilldownSelection = buildSelectionTrace({
        traces: currentView.selectedRowTraces,
        pivotOrder,
      });

      // Without explicit row traces the BE would set the entire filtered
      // universe — never fire set-all on an empty selection.
      if (drilldownSelection.length === 0) {
        dispatch(
          addSnack({
            message: "Select at least one row before applying Set All",
            options: { variant: "info" },
          })
        );
        return;
      }

      const hlsCtx = currentView.hlsFilterContext || {};
      const weekList =
        Array.isArray(timelineMembers) && timelineMembers.length
          ? timelineMembers
          : [Number(timelinePeriodId)].filter((id) => Number.isFinite(id));
      if (weekList.length === 0) return;

      try {
        setSaveStatusIfMounted("saving");
        const result = await setAllOrderManagement({
          screen_id: screenId,
          global_filters: buildGlobalFilters(
            hlsCtx.selectedFilters || selectedFilters || []
          ),
          drilldown_selection: drilldownSelection,
          week_list: weekList,
          new_quantity: distributionMethod,
          target_column: "order_quantity",
          available_hierarchies: pivotOrder
            .map((dim) => (typeof dim === "string" ? dim : dim?.id))
            .filter(Boolean),
          timeline_selection: resolveTimelineSelection(
            currentView.selectedRoqDateTab
          ),
          // Same grain as the grid: week ids ↔ "1w", month codes ↔ "1m".
          frequency: currentView.fiscalView === "month" ? "1m" : "1w",
        });

        handleAfterMutation({ clearSelection: true });
        fetchGrandTotalRef.current?.();
        setSaveStatusIfMounted("idle");
        dispatch(
          addSnack({
            message: `Set All applied — ${
              result?.rows_affected ?? 0
            } row(s) updated (${timelineLabel || timelinePeriodId})`,
            options: { variant: "success" },
          })
        );
      } catch (error) {
        setSaveStatusIfMounted("idle");
        dispatch(
          addSnack({
            message: error?.message || "Set All failed",
            options: { variant: "error" },
          })
        );
      }
    },
    [
      dispatch,
      handleAfterMutation,
      screenId,
      selectedFilters,
      setSaveStatusIfMounted,
    ]
  );

  // ── OMS view management (screenId resolved above for page-owned bootstrap) ───

  const pivotHostValue = useMemo(
    () => ({
      screenId,
      selectedScreenViewName,
      syncPivotPayloadOnViewLoad: true,
      orderManagementFilters: selectedFilters ?? [],
      pivotDataService: {
        fetchKpiConfig: () => Promise.resolve(null),
        fetchPivotTableData: ({ payload }) => {
          dispatch(
            setPivotPayload({ ...payload, filters: selectedFilters ?? [] })
          );
          const freshTempViewDetails = selectTempViewDetails(store.getState());
          if (!freshTempViewDetails?.rowDimensions?.length) {
            return Promise.resolve({ data: { col_def: [], data: [] } });
          }
          // Preserve previous signature for soft-reload detection, then clear
          // both refs to force a dedup bypass on the next /columns call.
          prevColumnsSignatureRef.current = columnsRequestSignatureRef.current;
          columnsRequestSignatureRef.current = null;
          columnsRequestInFlightRef.current = null;
          const currentViewId =
            viewRef.current?.appliedViewDetails?.view_id ?? null;
          dispatch(
            applySavedViewDetails({
              viewDetails: freshTempViewDetails,
              viewId: currentViewId,
            })
          );
          return Promise.resolve({ data: { col_def: [], data: [] } });
        },
        applyPivotTableSuccess: () => {},
      },
    }),
    [dispatch, selectedFilters, screenId, selectedScreenViewName, store]
  );

  // Grid mounts as soon as isPivotApplied — shows skeleton until columns+rows arrive.
  // isTableReady controls when skeleton is hidden and interactions are enabled.
  const isPivotApplied = Boolean(view.appliedPivotOrder?.length);
  const isTableReady = isPivotApplied && Boolean(beColDefs?.length);
  const isColumnsLoadFailed =
    isPivotApplied && columnsLoadPhase === "error" && !beColDefs?.length;

  // Skeleton phase: pivot applied but columns/data not yet ready (not an error).
  // Re-activates on every filter re-apply as beColDefs clears → isTableReady goes false.
  const showSkeletonPhase =
    isPivotApplied && !isTableReady && !isColumnsLoadFailed;

  // Grid unmounts only when pivot itself is removed (not during skeleton phase).
  useEffect(() => {
    if (!isPivotApplied) {
      skipInitialSsrmRefreshRef.current = true;
      liveApiRef.current = null;
      tableRef.current.api = null;
      setGridApi(null);
    }
  }, [isPivotApplied]);

  // Drive AG Grid's native skeleton overlay via showLoadingOverlay / hideOverlay.
  useEffect(() => {
    const api = getGridApi();
    if (!api) return;
    deferGridApiCall(api, () => {
      if (api.isDestroyed?.()) return;
      if (showSkeletonPhase) {
        api.showLoadingOverlay?.();
      } else {
        api.hideOverlay?.();
      }
    });
  }, [showSkeletonPhase, gridApi, getGridApi]);
  const showGridLoader = isPivotApplied && (columnsLoading || isEditInFlight);
  const isWaitingForScreenId = !screenId;
  const isViewBootstrapLoading =
    Boolean(screenId) &&
    (viewBootstrapStatus === "idle" || viewBootstrapStatus === "loading");
  const isViewBootstrapFailed = viewBootstrapStatus === "error";

  const loaderText = useMemo(() => {
    if (isViewBootstrapFailed) {
      return viewBootstrapError || "Failed to load view";
    }
    if (isViewDetailsLoading) {
      return "Loading view details…";
    }
    if (isWaitingForScreenId || isViewBootstrapLoading) {
      return "Loading view…";
    }
    if (isColumnsLoadFailed) {
      return "Failed to load columns. Re-apply filters or change the time range to retry.";
    }
    if (showGridLoader) {
      return "Loading columns…";
    }
    if (isPivotApplied && !beColDefs?.length) {
      return "Loading columns…";
    }
    return "Loading…";
  }, [
    isViewBootstrapFailed,
    viewBootstrapError,
    isViewDetailsLoading,
    isWaitingForScreenId,
    isViewBootstrapLoading,
    isColumnsLoadFailed,
    showGridLoader,
    isPivotApplied,
    beColDefs?.length,
  ]);

  const getGrandTotalRowStyle = useCallback((params) => {
    if (params?.node?.rowPinned === "top") {
      return { backgroundColor: "#F4F1F9", fontWeight: 600 };
    }
    return null;
  }, []);

  // Bootstrap loader — full-page spinner only for genuine errors/bootstrap states.
  // Normal columns/rows loading uses the AG Grid skeleton overlay instead.
  const showBootstrapLoader =
    isWaitingForScreenId ||
    isViewBootstrapLoading ||
    isViewBootstrapFailed ||
    isViewDetailsLoading ||
    isColumnsLoadFailed;

  const showPageLoader =
    showBootstrapLoader ||
    showGridLoader ||
    (isPivotApplied && !beColDefs?.length);

  const handleViewModeChange = useCallback(
    (_event, nextValue) => {
      if (!nextValue || nextValue === viewModeRef.current) return;
      viewModeRef.current = nextValue;
      setViewMode(nextValue);
      dispatch(
        addSnack({
          message:
            nextValue === "view"
              ? "You are in View Mode now"
              : "You are in Edit Mode now",
          options: { variant: "info" },
        })
      );
    },
    [dispatch]
  );

  useEffect(() => {
    const api = getGridApi();
    if (!api || !columnDefs?.length) return;
    deferGridApiCall(api, () => {
      api.setGridOption?.("columnDefs", columnDefs);
      api.refreshCells?.({ force: true });
    });
  }, [viewMode, viewEditedOnly, columnDefs, gridApi, getGridApi]);

  const topLeftOptions = useMemo(
    () => (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ButtonGroup
          selectedOption={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="order-management-view-mode"
          options={VIEW_EDIT_MODE_OPTIONS}
        />
        {saveStatus !== "idle" && (
          <span
            className={`oms-save-status-chip${
              saveStatus === "saving" ? " oms-save-status-chip--saving" : ""
            }`}
          >
            {saveStatus === "saving" ? <SavingIcon /> : <AutoSavedIcon />}
            <span>{saveStatus === "saving" ? "Saving…" : "Auto-Saved"}</span>
          </span>
        )}
      </div>
    ),
    [viewMode, handleViewModeChange, saveStatus]
  );

  const undoStackLength = view.undoStack?.length || 0;
  const redoStackLength = view.redoStack?.length || 0;
  const hasEdits = undoStackLength > 0;

  // Toolbar visibility/order (Figma 4290:376094 / 4290:378195 / 4290:378200):
  //  • Edit mode, no selection, no edits yet  → Distribution method only.
  //  • Edit mode, no selection, has edits     → Distribution, View Edited
  //    Only, Set All, Undo, Redo, Reset All.
  //  • Any mode, row(s) selected              → Product Details + Approve
  //    Orders (Edit mode additionally gets Set All before those two).
  //  • View mode, no selection                → Current View + View
  //    Management (ActionContainer).
  const topRightOptions = useMemo(() => {
    if (hasSelection) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {viewMode === "edit" && (
            <Button variant="tertiary" onClick={() => setIsSetAllOpen(true)}>
              Set All
            </Button>
          )}
          <RowSelectionActionCluster
            onAfterMutation={handleAfterMutation}
            viewMode={viewMode}
            getSelectedNodesData={getSelectedNodesData}
            placementCalendarData={placementCalendarData}
            screenId={screenId}
          />
          <SetAllPopup
            isOpen={isSetAllOpen}
            distributionOptions={setAllDistributionOptions}
            timelineOptions={setAllTimelineOptions}
            timelinePlaceholder={
              view.fiscalView === "month" ? "Select Month" : "Select Week"
            }
            onCancel={() => setIsSetAllOpen(false)}
            onApply={handleApplySetAll}
          />
        </div>
      );
    }

    if (viewMode !== "edit") {
      return (
        <ActionContainer
          gridLoader={showPageLoader}
          screenId={screenId}
          viewDetailsApplyCallback={viewDetailsApplyCallback}
          isCellDirty={view.isCellDirty}
          isSaving={view.isSaving}
          onSave={handleSave}
          fetchTemplateDetails={fetchTemplateDetails}
          skipInitialBootstrap
        />
      );
    }

    // Edit mode, no selection — Distribution method always shows; the rest
    // of the cluster only reveals itself once the user has made an edit.
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showDistributionMethod && <DistributionMethodSelect />}
        {hasEdits && (
          <>
            <div className="divider-line" />
            <Switch
              value={viewEditedOnly}
              onChange={handleViewEditedOnlyToggle}
              leftLabel={`View Edited Only (${undoStackLength})`}
            />
            <div className="divider-line" />
            <CustomActionButton
              id="undoLastEditButton"
              icon={<UndoIcon />}
              tooltipText="Undo"
              onClick={handleUndo}
              disabled={undoStackLength === 0 || isEditInFlight}
              variant="tertiary"
            />
            <CustomActionButton
              id="redoLastUndoButton"
              icon={<RedoIcon />}
              tooltipText="Redo"
              onClick={handleRedo}
              disabled={redoStackLength === 0 || isEditInFlight}
              variant="tertiary"
            />
            <Button
              variant="tertiary"
              size="medium"
              onClick={handleResetAll}
              disabled={undoStackLength === 0 || isEditInFlight}
            >
              Reset
            </Button>
          </>
        )}
        <SetAllPopup
          isOpen={isSetAllOpen}
          distributionOptions={setAllDistributionOptions}
          timelineOptions={setAllTimelineOptions}
          timelinePlaceholder={
            view.fiscalView === "month" ? "Select Month" : "Select Week"
          }
          onCancel={() => setIsSetAllOpen(false)}
          onApply={handleApplySetAll}
        />
        <Prompt
          isOpen={isResetAllConfirmOpen}
          variant="warning"
          title="Revert All"
          primaryButtonLabel="Confirm"
          secondaryButtonLabel="Cancel"
          onPrimaryButtonClick={confirmResetAll}
          onSecondaryButtonClick={() => setIsResetAllConfirmOpen(false)}
          handleClose={() => setIsResetAllConfirmOpen(false)}
        >
          This will revert all your edits. Do you want to continue?
        </Prompt>
      </div>
    );
  }, [
    hasSelection,
    viewMode,
    handleAfterMutation,
    showDistributionMethod,
    hasEdits,
    handleUndo,
    undoStackLength,
    handleRedo,
    redoStackLength,
    isEditInFlight,
    handleResetAll,
    viewEditedOnly,
    handleViewEditedOnlyToggle,
    screenId,
    viewDetailsApplyCallback,
    view.isCellDirty,
    view.isSaving,
    view.selectedRowKeys.length,
    view.fiscalView,
    handleSave,
    fetchTemplateDetails,
    showPageLoader,
    isSetAllOpen,
    handleApplySetAll,
    setAllDistributionOptions,
    setAllTimelineOptions,
    isResetAllConfirmOpen,
    confirmResetAll,
  ]);

  return (
    <PivotHostProvider value={pivotHostValue}>
      <div
        className={
          isPivotPanelOpen
            ? "oms-pivot-layout oms-pivot-layout--panelOpen"
            : "oms-pivot-layout"
        }
      >
        {/* ── Main table pane ─────────────────────────────────────────────── */}
        <div className="oms-pivot-table-pane omsTablePane">
          {/* ── Placement / Receipt timeline toolbar ── */}
          {isPivotApplied && (
            <div style={hlsToolbarStyle}>
              <ButtonGroup
                selectedOption={selectedMonthTab}
                exclusive
                onChange={handleMonthTabChange}
                aria-label="order-management-time-range"
                options={tabListOptions}
              />
              <OrderManagementCalendarToolbar
                showWeekDateRange={showWeekDateRange}
                selectedMonthTab={selectedMonthTab}
                selectedRoqDateTab={view.selectedRoqDateTab}
                placementCalendarData={placementCalendarData}
                receiptCalendarData={receiptCalendarData}
                selectedPlacementDate={selectedPlacementDate}
                selectedReceiptDate={selectedReceiptDate}
                onPlacementDateChange={handlePlacementDateRangeChange}
                onReceiptDateChange={handleReceiptDateRangeChange}
                onPlacementApply={handlePlacementDateRangeApply}
                onReceiptApply={handleReceiptDateRangeApply}
                isPlacementDisabled={isDateRangeDisabledForPlacement}
                isReceiptDisabled={isDateRangeDisabledForReceipt}
                selectionRangeForPlacement={selectionRangeForPlacement}
                selectionRangeForReceipt={selectionRangeForReceipt}
                maxPlacementEndDate={getMaxPlacementEndDate()}
                isOutsidePlacementRange={isOutsidePlacementRange}
                isOutsideReceiptRange={isOutsideReceiptRange}
              />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {roqDateTabOptions.map((option) => (
                  <Chips
                    key={option.value}
                    isActive={view.selectedRoqDateTab === option.value}
                    label={option.label}
                    onClick={() => handleRoqDateTabChange(option.value)}
                    type="single"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grid mounts as soon as pivot is applied — shows AG Grid skeleton
              rows until /columns responds and first SSRM rows arrive. */}
          <LoadingOverlay
            loader={showBootstrapLoader}
            isCustomLoader
            text={loaderText}
            customZIndex={100}
            popUp={false}
            gridLoader={false}
            minHeight={null}
            size={null}
            showSkeleton={false}
            showingLoadingOnTop={true}
            applyDefaultCenterStyle={false}
          >
            <div
              ref={gridContainerRef}
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                // Matches legacy HighLevelSummaryTable's getTableContainerStyle()
                // 16px left/right inset — without it, impact-ui-v3's
                // .card-container box-shadow (cardContainer prop below) has no
                // room to render before the outer .oms-pivot-table-pane's
                // overflow:hidden clips it flush.
                padding: "0 1rem",
              }}
            >
              {isPivotApplied && (
                <AgGridComponent
                  height={GRID_HEIGHT_CAP}
                  columns={columnDefs}
                  manualCallBack={manualCallBack}
                  getSubRowsRequest={getSubRowsRequest}
                  loadTableInstance={loadTableInstance}
                  onBlur={handleCellBlur}
                  cellValueChanged={handleCellValueChanged}
                  // Lock feature parked for R&D — revisit once fully
                  // understood, then restore these two props (see the
                  // matching note on the lockHandlers destructure above).
                  // lockCellApi={lockCellApi}
                  // lockCellCustomConditionFn={lockCellCustomConditionFn}
                  customCellRenderer={renderOmsOrderQtyCell}
                  getRowStyle={getGrandTotalRowStyle}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  treeData={true}
                  checkParentGroupkey="isGroup"
                  groupDisplayType="custom"
                  uniqueRowId="rowUid"
                  cacheBlockSize={DEFAULT_SSRM_CACHE_BLOCK_SIZE}
                  pagination={false}
                  suppressClickEdit={true}
                  selectAllHeaderComponent={true}
                  customSelectCellStyle={customSelectCellStyle}
                  rowSelection="multiple"
                  onSelectionChanged={handleSelectionChanged}
                  onBodyScroll={handleBodyScroll}
                  callOnModelUpdated={reconcileSelectionFromState}
                  suppressAggFuncInHeader={true}
                  isServerSideGroupOpenByDefault={
                    isServerSideGroupOpenByDefault
                  }
                  pinnedTopRowData={pinnedTopRowData}
                  topLeftOptions={topLeftOptions}
                  topRightOptions={topRightOptions}
                  bottomLeftOptions={
                    <OrderManagementBottomLegend
                      isEditMode={viewMode === "edit"}
                    />
                  }
                  suppressPropertyNamesCheck={true}
                  domLayout="normal"
                  cardContainer={false}
                  disableSkeletonLoader={false}
                  enableChildRowSelection={true}
                  syncChildAndParentSelection={true}
                />
              )}
            </div>
          </LoadingOverlay>

          {packSheetState.open && (
            <PackConfigBottomSheet
              openPackConfigDetailSheet={packSheetState.open}
              setOpenPackConfigDetailSheet={closePackSheet}
              l1DisplayName="SKU"
              activeChildHierarchyKey={packSheetState.sku}
              // Reuses matrix_summary's Order Week Selection + fetchFiscalWeeks
              // flow as-is (no changes to the shared PackConfigBottomSheet) —
              // Order Management has no single "current" fiscal week when the
              // pack link is clicked from the hierarchy column, same as
              // matrix_summary. Revisit with a dedicated screen name once
              // BE/PackConfigBottomSheet formally support "order_management".
              screenName="matrix_summary"
            />
          )}

          {isBudgetInfoPopoverEnabled && (
            <OrderQtyBudgetInfoPopover
              anchorEl={budgetInfoPopover.anchorEl}
              onClose={handleCloseBudgetInfo}
              data={budgetInfoPopover.data}
              labels={budgetInfoPopoverLabels}
            />
          )}
        </div>

        {/* ── OMS view management panel (right pane) ──────────────────────── */}
        <div className="oms-pivot-column">
          <PivotPanel tableRef={tableRef} />
          <PivotFilters tableRef={tableRef} />
        </div>
      </div>
    </PivotHostProvider>
  );
}

OrderManagementTable.propTypes = {
  selectedFilters: PropTypes.array,
  selectedDcs: PropTypes.array,
};

export default OrderManagementTable;
