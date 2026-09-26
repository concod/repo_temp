import React from "react";
import { IconButton } from "@mui/material";
import BudgetStickyNoteIcon from "assets/oms/budgetPopover/sticky-note.svg";
import Skeleton from "@mui/material/Skeleton";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { isGrandTotalRow } from "../utils/orderQtyEditability.util.js";
import {
  isEmptyOmsOrderQtyValue,
  isNullishOmsNumeric,
  isEditableReceiptDateColumn,
} from "../utils/orderManagementColumns.util.js";
import {
  buildOrderManagementBudgetPayload,
  resolvePeriodOrderCost,
} from "../utils/buildOrderManagementBudgetPayload.util.js";
import { resolveEditDotStatus } from "../utils/cellEditMarkers.util.js";
import { ORDER_MANAGEMENT_EDIT_STATUS_LEGEND } from "modules/oms/constants-oms/stringConstants.js";

const grandTotalDashStyle = {
  display: "block",
  textAlign: "right",
  fontWeight: 600,
  width: "100%",
};

/** Same right-aligned dash, without the Grand Total row's bold weight —
 * used when a period is missing from the BE response for a normal row. */
const nullPeriodDashStyle = {
  display: "block",
  textAlign: "right",
  width: "100%",
};

/** Left-aligned dash for the (left-aligned) delivery-date column — mirrors
 * `nullPeriodDashStyle` but without the numeric right-alignment. */
const dateDashStyle = {
  display: "block",
  width: "100%",
};

function isOrderQtyPeriodField(field) {
  return typeof field === "string" && field.startsWith("order_quantity_");
}

/** Primary editable qty column only — excludes its read-only eaches sibling
 * (`order_quantity_eaches_<period>`, which also starts with
 * "order_quantity_"). See the Grand Total gate below for why this can't
 * just reuse `columnItem.is_lockable` anymore. */
function isPrimaryOrderQtyField(field) {
  return isOrderQtyPeriodField(field) && !field.includes("eaches");
}

const EDIT_DOT_COLOR_BY_STATUS = {
  ...Object.fromEntries(
    ORDER_MANAGEMENT_EDIT_STATUS_LEGEND.map((item) => [item.key, item.backgroundColor])
  ),
  // Reserved slot for editable cells that haven't been touched yet — fully
  // transparent (invisible), it only exists to keep the dot's 14px gutter
  // constant so a cell doesn't visually shift once a real edited/updated
  // dot appears next to it.
  placeholder: "transparent",
};

function isCellInFlight(editContext, rowUid, field) {
  if (rowUid == null || !field) return false;
  const cellKey = `${rowUid}::${field}`;
  if (editContext?.cellsInFlightRef?.current?.has?.(cellKey)) return true;
  if (editContext?.cellsInFlight?.has?.(cellKey)) return true;
  return false;
}

/**
 * Mirrors the exact `item.disabled(data, item)` convention core
 * `CellRenderers`/`isGridRowDisabled` already use (see cellRenderer.jsx) —
 * `columnItem.disabled` is the `resolveCellDisabled` resolver
 * `orderManagementColumns.util.js` attaches per column in edit mode. Only
 * present when the column was built as an edit-mode column at all; absent
 * (e.g. View mode) means never editable here.
 */
function isOrderQtyCellEditable(columnItem, data) {
  if (!columnItem) return false;
  if (typeof columnItem.disabled === "function") {
    return !columnItem.disabled(data, columnItem);
  }
  return !columnItem.disabled && Boolean(columnItem.orig_is_editable);
}

/**
 * "edited"/"updated" (BE's own two flag names — no third FE-invented label)
 * always win. Otherwise: the Grand Total row never gets a color-coded dot
 * (its own roll-up isn't a per-cell edit signal, but it's still usually
 * editable via a top-line edit, so it still gets the blank reservation).
 * Any other cell only gets the invisible "placeholder" reservation while
 * the grid is in edit mode AND that specific cell is actually editable — a
 * locked/approval-blocked/missing-period cell has no dot gutter at all,
 * same as it always had.
 */
function resolveVisualDotStatus(status, { isGrandTotal, isEditMode, isEditableCell }) {
  if (status === "edited" || status === "updated") {
    return isGrandTotal ? "placeholder" : status;
  }
  return isEditMode && isEditableCell ? "placeholder" : null;
}

function buildEditDotAdornment(status) {
  const color = EDIT_DOT_COLOR_BY_STATUS[status];
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className={`oms-order-qty-edit-dot oms-order-qty-edit-dot--${status}`}
      title={
        status === "edited"
          ? "Edited"
          : status === "updated"
            ? "Updated"
            : undefined
      }
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        boxSizing: "border-box",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

const skeletonBarSx = {
  width: "78%",
  height: "60%",
  maxHeight: 19,
  borderRadius: "4px",
};

/**
 * Cell-level "in flight" overlay — matches Figma's loading cell state
 * (4290:365774): lavender cell background + white rounded input pill + a
 * bar. The bar is an MUI <Skeleton> ("wave") rather than a hand-rolled CSS
 * keyframe — same fixed box/layout as before (nothing else moves), it just
 * gets Skeleton's built-in shimmer instead of a static gradient. Not
 * impact-ui's <Loader/>: that component is sized for panel/page-level
 * loading (size="large" + text) and would clip inside a ~28-36px AG-Grid
 * cell.
 */
function withCellLoadingOverlay(node, isLoading) {
  if (!isLoading) return node;
  return (
    <span className="oms-cell-loading-overlay" aria-hidden="true">
      <span className="oms-cell-loading-overlay__pill">
        <Skeleton variant="rounded" animation="wave" sx={skeletonBarSx} />
      </span>
    </span>
  );
}

function withEditDot(node, status) {
  const dot = buildEditDotAdornment(status);
  if (!dot) return node;
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        paddingRight: 14,
      }}
    >
      {node}
      <span
        style={{
          position: "absolute",
          top: "50%",
          right: 4,
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        {dot}
      </span>
    </span>
  );
}

function resolveOrderQtyRaw(cellProps, field) {
  const data = cellProps?.data;
  if (field && data && Object.prototype.hasOwnProperty.call(data, field)) {
    return data[field];
  }
  const fromValue = cellProps?.value;
  return fromValue === "-" ? null : fromValue;
}

/**
 * AG-Grid invokes `customCellRenderer` off `gridOptions`, which isn't
 * re-subscribed on every React render the way a normal prop would be — a
 * renderer closure captured early (e.g. before the user ever switches off
 * the default Placement tab) can keep reading whatever `budgetContext`
 * looked like at that point forever. `budgetContextRef` (see
 * `OrderManagement.jsx`) mirrors the latest context after every commit, so
 * always prefer it over the possibly-stale closed-over `budgetContext`
 * object itself.
 */
function resolveLiveBudgetContext(budgetContext) {
  return budgetContext?.budgetContextRef?.current || budgetContext;
}

function shouldShowBudgetInfoIcon({ budgetContext, raw }) {
  const liveContext = resolveLiveBudgetContext(budgetContext);
  if (!liveContext?.enabled) return false;
  if (liveContext.selectedRoqDateTab !== "roq_receipt_date") return false;
  return !isNullishOmsNumeric(raw);
}

function buildBudgetInfoIcon({
  cellProps,
  columnItem,
  field,
  budgetContext,
}) {
  const liveContext = resolveLiveBudgetContext(budgetContext);
  if (!liveContext?.onOpenBudgetInfo) return null;

  const budgetRequestPayload = buildOrderManagementBudgetPayload({
    rowData: cellProps?.data,
    pivotOrder: liveContext.pivotOrder,
    orderQtyField: field,
    // Same sources edit blur uses for week_list — leaf/extra.fiscal_buckets.
    column: columnItem,
    colDef: cellProps?.colDef,
    fiscalView: liveContext.fiscalView,
    periodDescriptors: liveContext.periodDescriptors,
    fiscalCalendar: liveContext.fiscalCalendar,
    selectedRoqDateTab: liveContext.selectedRoqDateTab,
    selectedHierarchyL0: liveContext.selectedHierarchyL0,
    highLevelSummaryState: liveContext.highLevelSummaryState,
    filters: liveContext.filters,
  });

  return (
    <IconButton
      size="small"
      // Mirrors LockCell/UnlockCell in core InputCell (cellsToBeRendered/
      // inputCell.jsx): a disabled MUI TextField's InputBase marks its whole
      // subtree `Mui-disabled`, which flips ButtonBase's `pointer-events:
      // none`/cursor styling onto any adornment button nested inside it —
      // even though this button itself was never given `disabled`. Without
      // this explicit override, the icon renders (matching the "not
      // missing") but silently swallows every click on a disabled/locked
      // order-qty cell.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        liveContext.onOpenBudgetInfo(event.currentTarget, {
          cellData: {
            order_cost: resolvePeriodOrderCost(cellProps?.data, field),
          },
          budgetRequestPayload,
        });
      }}
      sx={{ p: 0, flexShrink: 0, pointerEvents: "auto" }}
      aria-label="View budget info"
    >
      <BudgetStickyNoteIcon width={16} height={16} />
    </IconButton>
  );
}

function renderOrderQtyCellContent(
  cellProps,
  columnItem,
  { field, raw, budgetContext, lockFreeColumn = false, endAdornment = null }
) {
  const showBudgetIcon = shouldShowBudgetInfoIcon({ budgetContext, raw });
  const columnForRenderer = lockFreeColumn
    ? { ...columnItem, is_lockable: false }
    : columnItem;
  const budgetIcon = showBudgetIcon
    ? buildBudgetInfoIcon({
        cellProps,
        columnItem,
        field,
        budgetContext,
      })
    : null;

  return (
    <CellRenderers
      cellData={cellProps}
      column={columnForRenderer}
      actions={{}}
      customPrefixAdornment={budgetIcon}
      customEndAdornment={endAdornment}
    />
  );
}

/**
 * User Adjusted Delivery Date gets ONLY the "-" for null/empty treatment —
 * no edit-status dots, no loading overlay, no budget icon (all explicitly
 * out of scope for this column by product decision). Routed through the
 * grid-wide `customCellRenderer` hook (same mechanism as Order Quantity's
 * own null-period dash below) because that is the one place proven to run
 * before the column falls back to its default cell content (the inline
 * DatePicker) — a colDef-level `cellRenderer` override was tried first and
 * didn't reliably take effect.
 */
function renderDeliveryDateMeasureCell(cellProps, field) {
  const raw = resolveOrderQtyRaw(cellProps, field);
  const isEmpty = raw == null || raw === "" || raw === "-";
  if (!isEmpty) return false;
  const isGrandTotal =
    isGrandTotalRow(cellProps?.data) || cellProps?.node?.rowPinned === "top";
  return (
    <span style={isGrandTotal ? { ...dateDashStyle, fontWeight: 600 } : dateDashStyle}>
      -
    </span>
  );
}

/**
 * Factory for grid `customCellRenderer` so Order Management can pass budget
 * context, in-flight loaders, and edited/updated dots.
 */
export function createRenderOmsOrderQtyCell(budgetContext = null) {
  return function renderOmsOrderQtyCell(cellProps, columnItem) {
    const data = cellProps?.data;
    const field =
      cellProps?.colDef?.field ||
      cellProps?.colDef?.colId ||
      columnItem?.field ||
      columnItem?.column_name;

    if (isEditableReceiptDateColumn(field)) {
      return renderDeliveryDateMeasureCell(cellProps, field);
    }

    if (!isOrderQtyPeriodField(field)) {
      return false;
    }

    const isGrandTotal =
      isGrandTotalRow(data) || cellProps?.node?.rowPinned === "top";
    const raw = resolveOrderQtyRaw(cellProps, field);
    const rowUid = data?.rowUid ?? data?.leafId ?? null;
    const isLoading = isCellInFlight(budgetContext, rowUid, field);
    const liveBudgetContext = resolveLiveBudgetContext(budgetContext);
    const isEditMode =
      liveBudgetContext?.viewModeRef?.current === "edit" &&
      !liveBudgetContext?.viewEditedOnlyRef?.current;
    // A missing period is always forced to a plain dash below regardless of
    // what the disabled-resolver would say — never reserve the dot gutter
    // for a cell that never renders as an input in the first place.
    const isEditableCell =
      !isGrandTotal && raw == null
        ? false
        : isOrderQtyCellEditable(columnItem, data);
    const rawDotStatus = resolveEditDotStatus(budgetContext, data, rowUid, field);
    const dotStatus = resolveVisualDotStatus(rawDotStatus, {
      isGrandTotal,
      isEditMode,
      isEditableCell,
    });
    const endAdornment = buildEditDotAdornment(dotStatus);
    // Budget access must never depend on the cell's disabled/editable state
    // — a locked/disabled cell can still have real order_cost data worth
    // viewing. Compute this once up front and fold it into takeOverForOverlay
    // so neither the null-period dash nor the empty/zero-value dash below
    // can silently swallow the icon (that was the earlier bug: those two
    // branches used to return early without ever checking this).
    const needsBudgetIcon = shouldShowBudgetInfoIcon({ budgetContext, raw });
    // Take over rendering whenever there's something extra to paint on top
    // of the default cell (edit dot, budget icon, or the in-flight loading
    // overlay).
    const takeOverForOverlay =
      isLoading || Boolean(endAdornment) || needsBudgetIcon;

    // Period genuinely missing from the BE response (null/undefined) — show
    // a plain dash, never the editable input, so users can't type into a
    // period that doesn't exist for this row. A real 0/"" stays editable
    // (see isEmptyOmsOrderQtyValue below), only the null/absent case dashes.
    // (needsBudgetIcon is inherently false here — shouldShowBudgetInfoIcon
    // requires a non-null raw — so there's never a budget icon to lose.)
    if (!isGrandTotal && raw == null) {
      return withCellLoadingOverlay(
        withEditDot(<span style={nullPeriodDashStyle}>-</span>, dotStatus),
        isLoading
      );
    }

    if (isEmptyOmsOrderQtyValue(raw)) {
      if (!isGrandTotal) {
        if (takeOverForOverlay) {
          return withCellLoadingOverlay(
            renderOrderQtyCellContent(cellProps, columnItem, {
              field,
              raw,
              budgetContext,
              endAdornment,
            }),
            isLoading
          );
        }
        // Defer to core CellRenderers / InputCell so empty editable cells stay editable.
        return false;
      }
      return withCellLoadingOverlay(
        withEditDot(<span style={grandTotalDashStyle}>-</span>, dotStatus),
        isLoading
      );
    }

    if (!isGrandTotal) {
      if (!needsBudgetIcon && !takeOverForOverlay) {
        return false;
      }
      return withCellLoadingOverlay(
        renderOrderQtyCellContent(cellProps, columnItem, {
          field,
          raw,
          budgetContext,
          endAdornment,
        }),
        isLoading
      );
    }

    // Grand Total only takes over custom rendering (loading overlay + edit
    // dot) for the PRIMARY editable order_quantity_<period> column, never
    // its read-only order_quantity_eaches_<period> sibling — this used to
    // be signalled by `columnItem.is_lockable` (only the primary column got
    // `is_lockable: isOrderQtyName`), but lock is now force-disabled repo-
    // wide (`is_lockable: false` for every order-qty column, see
    // orderManagementColumns.util.js), so that signal is gone. Check the
    // field name directly instead — decoupled from the lock feature's
    // on/off state, so re-enabling lock later can't silently re-break this.
    if (columnItem?.type !== "int" || !isPrimaryOrderQtyField(field)) {
      return false;
    }

    return withCellLoadingOverlay(
      renderOrderQtyCellContent(cellProps, columnItem, {
        field,
        raw,
        budgetContext,
        lockFreeColumn: true,
        endAdornment,
      }),
      isLoading
    );
  };
}

/** Default renderer without budget adornment (tests / fallback). */
export const renderOmsOrderQtyCell = createRenderOmsOrderQtyCell();

/** @deprecated use createRenderOmsOrderQtyCell */
export const renderGrandTotalOrderQtyCell = renderOmsOrderQtyCell;
