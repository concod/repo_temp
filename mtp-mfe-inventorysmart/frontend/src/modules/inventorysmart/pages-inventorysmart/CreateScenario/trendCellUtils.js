import { nonEditableCell } from "core/Utils/agGrid/table-functions";

export const isTrendShapedValue = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("previous" in value || "current" in value)
  );

/**
 * AgGrid gridOptions.customCellRenderer / noEditableCustomCellRender hook.
 * Returns trend JSX for { previous, current } values, otherwise false.
 */
export const renderTrendSafeCell = (cellProps, item) => {
  const colDef = item || cellProps?.colDef || {};
  const field =
    cellProps?.colDef?.field ||
    cellProps?.colDef?.column_name ||
    colDef.field ||
    colDef.column_name;
  const value =
    cellProps?.value ??
    (field ? cellProps?.data?.[field] : undefined);

  if (colDef.type === "trend" || isTrendShapedValue(value)) {
    return nonEditableCell({ ...colDef, type: "trend" }, null, true)(
      cellProps
    );
  }

  return false;
};

/**
 * Force leaf trend / {previous,current} columns off the editable CellRenderers path.
 */
export const ensureTrendSafeColumns = (columns, sampleRow) => {
  if (!Array.isArray(columns)) return columns;

  return columns.map((column) => {
    const next = { ...column };

    if (Array.isArray(next.children) && next.children.length) {
      next.children = ensureTrendSafeColumns(next.children, sampleRow);
      return next;
    }

    if (Array.isArray(next.sub_headers) && next.sub_headers.length) {
      next.sub_headers = ensureTrendSafeColumns(next.sub_headers, sampleRow);
    }

    if (next.cellRenderer === "agGroupCellRenderer") {
      return next;
    }

    const field = next.field || next.column_name || next.colId;
    const shouldUseTrendRenderer =
      next.type === "trend" || isTrendShapedValue(sampleRow?.[field]);

    if (!shouldUseTrendRenderer) {
      return next;
    }

    const trendColDef = { ...next, type: "trend" };
    next.type = "trend";
    next.is_editable = false;
    next.editable = false;
    next.cellRenderer = (cellProps) =>
      nonEditableCell(trendColDef, null, true)(cellProps);

    return next;
  });
};
