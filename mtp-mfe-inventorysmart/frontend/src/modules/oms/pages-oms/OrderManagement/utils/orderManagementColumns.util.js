import React from "react";
import moment from "moment";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  isRowLevelBelowEditableFrom,
  isHierarchyLevelEditable,
} from "./orderQtyEditability.util.js";
import {
  resolveEditMarkerCellStyle,
  resolveBeforeEditTooltipText,
} from "./cellEditMarkers.util.js";
import {
  approvalFlagBlocksEdit,
  approvalFlagCellStyle,
  resolvePeriodApprovalFlag,
} from "./periodApprovalFlag.util.js";

const EDITABLE_RECEIPT_DATE_PREFIX = "editable_expected_receipt_date";

/** Exported so `OrderQtyCellRenderer.jsx` can detect a "User Adjusted
 * Delivery Date" period column via the grid-wide `customCellRenderer` hook
 * (the same, already-proven mechanism Order Quantity uses for its own
 * null-period dash) without duplicating this prefix check. */
export function isEditableReceiptDateColumn(columnName) {
  return (
    typeof columnName === "string" &&
    (columnName === EDITABLE_RECEIPT_DATE_PREFIX ||
      columnName.startsWith(`${EDITABLE_RECEIPT_DATE_PREFIX}_`))
  );
}

/** BE flag plus OMS FE rules for matrix edit columns. */
function resolveBeColumnEditable(beCol) {
  if (Boolean(beCol?.is_editable)) return true;
  const columnName = beCol?.column_name;
  if (isOrderQtyColumnName(columnName)) return true;
  if (isEditableReceiptDateColumn(columnName)) return true;
  return false;
}

function buildOrderQtyPeriodCellStyle(editContext) {
  return (params) =>
    getOmsPeriodCellStyle(params, editContext.selectedKpi, editContext);
}

/** "Before Edit: X" for core InputCell's impact-ui Tooltip via
 * `colDef.extra.tooltipText(instance)`. Core wraps the editable TextField
 * itself — do not add an outer Tooltip here (that used to misalign cells). */
function buildOrderQtyBeforeEditTooltip(instance, columnName, editContext) {
  const data = instance?.data;
  if (!data) return null;
  const rowUid = data?.rowUid ?? data?.leafId ?? null;
  return resolveBeforeEditTooltipText(editContext, data, rowUid, columnName);
}

export const OMS_GRAND_TOTAL_ROW_BG = "#F4F1F9";

function normalizeEditableCellParams(params) {
  if (!params) return null;
  if (params.node != null || params.colDef != null || params.api != null) {
    return params;
  }
  return { data: params };
}

function isGrandTotalCell(params) {
  const normalized = normalizeEditableCellParams(params);
  const data = normalized?.data;
  return Boolean(
    data?.meta?.__isGrandTotal || normalized?.node?.rowPinned === "top"
  );
}

export function getApprovalCellStyle(params) {
  const data = params?.data;
  if (!data || isGrandTotalCell(params)) return null;
  const field = params?.colDef?.field || params?.colDef?.colId || "";
  if (!isOrderQtyPeriodField(params)) return null;
  return approvalFlagCellStyle(resolvePeriodApprovalFlag(data, field));
}

function isOrderQtyPeriodField(params) {
  const field = params?.colDef?.field || params?.colDef?.colId || "";
  return typeof field === "string" && field.startsWith("order_quantity_");
}

function isOrderQtyColumnName(columnName) {
  return (
    typeof columnName === "string" &&
    columnName.startsWith("order_quantity_") &&
    !columnName.includes("eaches")
  );
}

/**
 * `order_quantity_<periodId>` -> `order_quantity_eaches_<periodId>`.
 * Pack clients render a read-only eaches sibling next to the editable
 * order-qty column (BE `target_column` enum: `order_quantity` |
 * `order_quantity_eaches`); non-pack clients never have this column at all.
 * Returns `null` when `colId` isn't an editable order-qty column or is
 * already an eaches column itself.
 */
export function deriveEachesColId(colId) {
  if (!isOrderQtyColumnName(colId)) return null;
  return colId.replace(/^order_quantity_/, "order_quantity_eaches_");
}

/**
 * `order_quantity_<periodId>` -> `order_cost_<periodId>`.
 * Edit-drilldown may return `newValueCost` for the same period as the edited
 * qty cell; map it onto the period-scoped cost field (also used by budget
 * info). Returns `null` when `colId` isn't an editable order-qty column.
 */
export function deriveCostColId(colId) {
  if (!isOrderQtyColumnName(colId)) return null;
  return colId.replace(/^order_quantity_/, "order_cost_");
}

export function isNullishOmsNumeric(value) {
  return value == null;
}

/** True when hide-empty-periods should treat a grand-total qty as absent. */
export function isEmptyOmsOrderQtyValue(value) {
  if (value == null) return true;
  if (value === "" || value === "-") return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric === 0;
}

function resolveCellNumericRaw(params, field) {
  const fromValue = params?.value;
  if (fromValue === "-") {
    if (
      field &&
      params?.data &&
      Object.prototype.hasOwnProperty.call(params.data, field)
    ) {
      return params.data[field];
    }
    return null;
  }
  if (!isNullishOmsNumeric(fromValue)) {
    return fromValue;
  }
  if (
    field &&
    params?.data &&
    Object.prototype.hasOwnProperty.call(params.data, field)
  ) {
    return params.data[field];
  }
  return fromValue;
}

/** Period order-qty cells: grand-total band, approval, MOQ breach, edited fill. */
export function getOmsPeriodCellStyle(params, selectedKpi, editContext) {
  const field = params?.colDef?.field || params?.colDef?.colId || "";
  const raw = resolveCellNumericRaw(params, field);

  if (isOrderQtyPeriodField(params) && isEmptyOmsOrderQtyValue(raw)) {
    return resolveEditMarkerCellStyle(params, editContext);
  }

  let style = null;

  if (isGrandTotalCell(params)) {
    style = { fontWeight: 600, backgroundColor: OMS_GRAND_TOTAL_ROW_BG };
  } else if (isOrderQtyPeriodField(params)) {
    const approvalStyle = getApprovalCellStyle(params);
    if (approvalStyle) {
      style = approvalStyle;
    } else if (
      selectedKpi === "min_order_quantity_style" &&
      typeof field === "string" &&
      field.startsWith("order_quantity_")
    ) {
      const adjusted = Number(raw);
      const moq = Number(params.data?.min_order_quantity_style);
      if (
        Number.isFinite(adjusted) &&
        Number.isFinite(moq) &&
        moq > 0 &&
        adjusted < moq
      ) {
        style = { backgroundColor: "#FFCDD2" };
      }
    }
  }

  const editStyle = resolveEditMarkerCellStyle(params, editContext);
  if (editStyle) {
    return style ? { ...style, ...editStyle } : editStyle;
  }
  return style;
}

function isOmsEditMode(editContext) {
  if (
    editContext?.viewEditedOnly ||
    editContext?.viewEditedOnlyRef?.current
  ) {
    return false;
  }
  const mode = editContext?.viewModeRef?.current ?? editContext?.viewMode;
  return mode === "edit";
}

function passesHierarchyLevelGate(params, editContext) {
  return isRowLevelBelowEditableFrom({
    node: params?.node,
    data: params?.data,
    pivotOrder: editContext?.pivotOrder || [],
    editableFromLevel: editContext?.editableFromLevel,
  });
}

/**
 * Grand Total editability for a given measure column family is driven
 * entirely by that column's own dedicated flag on the `/grand-total` API
 * response — `is_order_quantity_editable` for Order Quantity,
 * `is_user_adjusted_delivery_date_editable` for User Adjusted Delivery Date
 * (`editable_expected_receipt_date_<period>`). An unrecognised measure
 * column has no such flag and fails closed (non-editable) on the topline
 * row rather than guessing.
 */
function resolveGrandTotalEditableFlag(field) {
  if (isOrderQtyColumnName(field)) return "is_order_quantity_editable";
  if (isEditableReceiptDateColumn(field)) {
    return "is_user_adjusted_delivery_date_editable";
  }
  return null;
}

function isOmsCellEditable(params, editContext, columnName) {
  const cellParams = normalizeEditableCellParams(params);
  if (!cellParams?.data) return false;
  const isGrandTotal = isGrandTotalCell(cellParams);

  const field =
    cellParams?.colDef?.field ||
    cellParams?.colDef?.colId ||
    columnName ||
    "";

  // Grand Total supports "top-line" edits that redistribute the delta across
  // every visible child (see buildEditIntent.util.js `isTopLineEdit` +
  // purgeEditedSubtreeCache). `editableFromLevel` only governs which CHILD
  // hierarchy depths are editable, so it must not gate the Grand Total row —
  // see resolveGrandTotalEditableFlag for the per-column flag used instead.
  if (isGrandTotal) {
    const grandTotalFlag = resolveGrandTotalEditableFlag(field);
    if (!grandTotalFlag || cellParams.data[grandTotalFlag] !== true) {
      return false;
    }
  } else if (!passesHierarchyLevelGate(cellParams, editContext)) {
    return false;
  }

  // Row-level gate from /columns `row_dimensions[].is_hierarchy_editable`
  // (keyed by dimension id, e.g. `l0_name` — BE never puts this flag on the
  // order-qty columns themselves, only on the row axis).
  if (
    !isHierarchyLevelEditable({
      node: cellParams?.node,
      data: cellParams?.data,
      pivotOrder: editContext?.pivotOrder || [],
      rowDimensionsEditableMap: editContext?.rowDimensionsEditableMap,
    })
  ) {
    return false;
  }

  if (isOrderQtyColumnName(field)) {
    if (
      approvalFlagBlocksEdit(
        resolvePeriodApprovalFlag(cellParams.data, field)
      )
    ) {
      return false;
    }
  }

  return true;
}

function mapBeColumnType(beType) {
  const normalized = String(beType || "int").toLowerCase();
  if (normalized === "numeric" || normalized === "number") return "int";
  if (normalized === "text" || normalized === "status") return "str";
  if (normalized === "float") return "float";
  if (normalized === "list") return "list";
  if (normalized === "datetime" || normalized === "date") return "datetime";
  return normalized;
}

function resolveColumnFormatter(beCol, colType) {
  if (colType === "datetime") {
    return beCol.formatter || "MM-DD-YYYY";
  }
  if (colType === "int" || colType === "float") {
    if (beCol.formatter === "roundOfftoTwoDecimals") {
      return "roundOfftoTwoDecimals";
    }
    return "roundOff";
  }
  return beCol.formatter || undefined;
}

function beColToMtpConfig(beCol, editContext) {
  const columnName = beCol.column_name;
  const label = beCol.label || beCol.header_name || columnName;
  const isOrderQtyName = isOrderQtyColumnName(columnName);
  // Edit-status dots/background are an Order Quantity-only concept — User
  // Adjusted Delivery Date intentionally has no edited/updated visual
  // tracking (per explicit product decision), so it never gets
  // `periodCellStyle`. It still gets the plain Grand Total bold/background
  // styling via the fallback branch in `cellStyle` below.
  const periodCellStyle = isOrderQtyName
    ? buildOrderQtyPeriodCellStyle(editContext)
    : null;

  if (beCol.sub_headers?.length) {
    // BE puts the fiscal week/month ids a bucket aggregates on the GROUP
    // column's own `extra.fiscal_buckets` (see `_bucket_columns` in
    // read_drilldown_columns_order_management_service.py) — never on the
    // leaf sub-header (order_quantity_<bucket>) itself. Stamp it onto every
    // leaf here so `resolveColumnFiscalMembers` can find it from either the
    // AG-Grid colDef or the raw BE column while walking sub_headers.
    const groupFiscalMembers = resolveColumnFiscalMembers(beCol);
    return {
      column_name: columnName,
      label,
      openByDefault: false,
      marryChildren: true,
      sub_headers: beCol.sub_headers.map((sub) =>
        beColToMtpConfig(
          groupFiscalMembers
            ? {
                ...sub,
                extra: { ...(sub.extra || {}), fiscal_buckets: groupFiscalMembers },
              }
            : sub,
          editContext
        )
      ),
    };
  }

  const beIsEditable = resolveBeColumnEditable(beCol);
  const colType = mapBeColumnType(beCol.type);
  const isNumeric = colType === "int" || colType === "float";
  const isEditableReceiptDate = isEditableReceiptDateColumn(columnName);
  const useEditColumnDef = beIsEditable && isOmsEditMode(editContext);

  const resolveCellDisabled = (cellParams) =>
    !isOmsCellEditable(cellParams, editContext, columnName);

  // Match Style Order Summary subclass date cell: disable past days. Cap at
  // max editable receipt date when the toolbar has fetched one (same bound
  // as receipt timeline picker).
  const maxEditableReceiptDate = editContext?.maxEditableReceiptDate;
  const receiptDateShouldDisable = isEditableReceiptDate
    ? (day) => {
        if (!maxEditableReceiptDate) return false;
        return moment(day).isAfter(
          moment(maxEditableReceiptDate).endOf("day"),
          "day"
        );
      }
    : null;

  return {
    column_name: columnName,
    label,
    type: colType,
    // View mode: plain read-only cells (no disabled InputCell / lock chrome).
    is_editable: useEditColumnDef
      ? (params) => isOmsCellEditable(params, editContext, columnName)
      : false,
    ...(useEditColumnDef && {
      orig_is_editable: true,
      // Lock feature parked for R&D — revisit once fully understood, then
      // restore this to re-enable the padlock icon (core InputCell reads
      // this as `isCellLockable`).
      // is_lockable: isOrderQtyName,
      is_lockable: false,
      // Core CellRenderers (datetime/list) honour `disabled`, not `colDef.editable`.
      disabled: resolveCellDisabled,
    }),
    ...(isEditableReceiptDate &&
      receiptDateShouldDisable && {
        shouldDisableDate: receiptDateShouldDisable,
      }),
    is_sortable: false,
    is_searchable: false,
    formatter: resolveColumnFormatter(beCol, colType),
    extra: {
      // BE never sends `is_hierarchy_editable` on the column itself — it
      // lives on `row_dimensions[]` (per hierarchy LEVEL, keyed by dimension
      // id) and is gated via isHierarchyLevelEditable() above using
      // editContext.rowDimensionsEditableMap. `fiscal_year_weeks` /
      // `fiscal_year_months` come through verbatim from `beCol.extra` below.
      ...(beCol.extra || {}),
      fiscal_weeks: beCol?.fiscal_weeks ?? beCol?.extra?.fiscal_weeks ?? null,
      ...(isNumeric && {
        roundOffTo: colType === "float" ? 2 : 0,
        isHyphenDisplayedForEmpty: true,
      }),
      ...(isEditableReceiptDate && {
        isHyphenDisplayedForEmpty: true,
        // Core column-formatter maps extra.disablePast → item.disablePast
        // for impact-ui DatePicker isOutsideRange.
        disablePast: true,
      }),
      ...(!beIsEditable && isNumeric && { ignoreValueGetter: false }),
      // Core InputCell reads this for its impact-ui Tooltip (see
      // cellsToBeRendered/inputCell.jsx). Must win over any BE extra key.
      ...(isOrderQtyName && {
        tooltipText: (instance) =>
          buildOrderQtyBeforeEditTooltip(instance, columnName, editContext),
      }),
    },
    cellStyle: (params) => {
      if (periodCellStyle) return periodCellStyle(params);
      return isGrandTotalCell(params)
        ? { fontWeight: 600, backgroundColor: OMS_GRAND_TOTAL_ROW_BG }
        : null;
    },
  };
}

/**
 * BE /columns (drilldown_matrix_v4) sends the granular fiscal week/month ids
 * a bucket column aggregates as `extra.fiscal_buckets` — see `_bucket_columns`
 * in read_drilldown_columns_order_management_service.py — and only on the
 * GROUP (bucket wrapper) column, never on the leaf order_quantity_<bucket>
 * sub-header itself (`beColToMtpConfig` copies it down onto each leaf's
 * `extra` above so lookups against the leaf still work). Older/legacy
 * callers used `extra.fiscal_year_weeks` (week view) / `extra.fiscal_year_months`
 * (month view) / `extra.fiscal_weeks` — check every known key so the edit
 * payload's `week_list` is populated regardless of which BE shape responds.
 */
export function resolveColumnFiscalMembers(...columnLikeSources) {
  for (const source of columnLikeSources) {
    if (!source) continue;
    for (const key of [
      "fiscal_buckets",
      "fiscal_year_weeks",
      "fiscal_year_months",
      "fiscal_weeks",
    ]) {
      const value = source[key] ?? source.extra?.[key];
      if (Array.isArray(value) && value.length) return value;
    }
  }
  return null;
}

export function collectEditableColIds(beCols = []) {
  const ids = [];
  const walk = (cols) => {
    for (const col of cols || []) {
      if (col.sub_headers?.length) {
        walk(col.sub_headers);
      } else if (col.column_name && resolveBeColumnEditable(col)) {
        ids.push(col.column_name);
      }
    }
  };
  walk(beCols);
  return ids;
}

/** Preserve OMS valueGetter overrides after core column-formatter runs. */
function patchOmsColumnDefOverrides(colDefs = [], editContext) {
  const isEditMode = isOmsEditMode(editContext);

  return (colDefs || []).map((col) => {
    if (col.children?.length) {
      return {
        ...col,
        children: patchOmsColumnDefOverrides(col.children, editContext),
      };
    }

    const field = col.field || col.column_name || col.colId;
    if (!isEditableReceiptDateColumn(field)) {
      return col;
    }

    const previousGetter = col.valueGetter;
    const priorRenderer = col.cellRenderer;

    const valueGetter = (params) => {
      const raw =
        params?.data?.[field] ??
        (typeof previousGetter === "function" ? previousGetter(params) : null);
      if (raw == null || raw === "") return "-";
      return raw;
    };

    if (!isEditMode) {
      return { ...col, valueGetter };
    }

    return {
      ...col,
      valueGetter,
      cellRenderer: (params) => {
        const isEmpty =
          params?.value == null || params?.value === "" || params?.value === "-";

        // Same "-" treatment as Order Quantity's missing-period cells —
        // always shown for a null/empty date, regardless of whether the
        // cell is otherwise editable, never gated behind `isDisabled` alone
        // (previously only the disabled+empty combination rendered the
        // dash; an editable-but-empty cell fell through to the interactive
        // DatePicker's "Select Date" placeholder instead of "-").
        if (isEmpty) {
          return React.createElement(
            "span",
            { style: { display: "block", width: "100%" } },
            "-"
          );
        }

        const cellParams =
          params?.value === "-" ? { ...params, value: null } : params;
        return typeof priorRenderer === "function"
          ? priorRenderer(cellParams)
          : undefined;
      },
    };
  });
}

/**
 * BE /columns → AG-Grid columnDefs via core column-formatter (InputCell, date,
 * list dropdown, lock). Grouping comes from BE sub_header.extra.
 */
export function formatBeColumnsForAgGrid(beCols, editContext) {
  const mtpColumns = (beCols || []).map((col) =>
    beColToMtpConfig(col, editContext)
  );
  const formatted = agGridColumnFormatter(
    mtpColumns,
    null,
    null,
    null,
    null,
    null,
    null,
    true
  );
  return patchOmsColumnDefOverrides(formatted, editContext);
}
