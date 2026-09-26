import React from "react";
import { cloneDeep } from "lodash";
import { makeStyles } from "@mui/styles";
import ConstraintOverflowTooltip from "./ConstraintOverflowTooltip";
import { statusBadgeCellRenderer } from "../Rule-Group-Constraints/ruleGroupUtils";

/**
 * Column names treated as editable constraint columns across constraint grids.
 */
export const CONSTRAINT_COLUMN_NAMES = [
  "wos",
  "st",
  "min_stock",
  "max_stock",
  "category_minimum",
  "category_maximum",
  "start_date",
  "end_date",
];

/**
 * A column is a constraint column if it is in CONSTRAINT_COLUMN_NAMES or is
 * explicitly flagged via extra.isEditableConstraint.
 */
export const isConstraintColumn = (column) =>
  CONSTRAINT_COLUMN_NAMES.includes(column?.column_name) ||
  column?.extra?.isEditableConstraint;

/**
 * Detects a child (constraint) row in a server-side tree. SSRM tree rows can
 * report level 0 on expanded child rows, so fall back to the parent/data shape.
 */
export const isConstraintChildRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) return false;
  if (node.level > 0) return true;
  return Boolean(node.parent?.data?.data) && !node.data?.data;
};

/**
 * Right-aligns numeric (int/float) columns at the column-def level by setting
 * cellStyle textAlign and the ag-right-aligned-header header class. Mutates and
 * returns the colDef so it can be used inside a forEach.
 */
export const applyNumericColumnAlignment = (colDef) => {
  if (colDef?.type === "int" || colDef?.type === "float") {
    colDef.cellStyle = { ...colDef.cellStyle, textAlign: "right" };
    colDef.headerClass = `${colDef.headerClass || ""} ag-right-aligned-header`;
  }
  return colDef;
};

/**
 * Returns a "-" placeholder for parent-level (level 0) cells.
 * If the column type is numeric (int/float), the dash is right-aligned
 * to stay consistent with the data rows below it.
 */
export const renderParentDash = (column) => {
  const isNumeric = column?.type === "int" || column?.type === "float";
  return (
    <div style={isNumeric ? { textAlign: "right", width: "100%" } : {}}>
      {"-"}
    </div>
  );
};

/**
 * Ellipsis + tooltip only for long text-like read-only values (e.g. min_distribution).
 * Numbers and dates stay plain — they are short and do not truncate meaningfully.
 */
const shouldShowReadOnlyOverflowTooltip = (column) => {
  const colName = column?.column_name || column?.field;
  if (colName === "min_distribution") {
    return true;
  }
  if (
    ["int", "float", "percentage", "dollar", "euro"].includes(column?.type)
  ) {
    return false;
  }
  if (
    colName?.includes("date") ||
    ["date", "datetime", "DateTimeField"].includes(column?.type)
  ) {
    return false;
  }
  return column?.type === "str" || column?.type === "link";
};

/**
 * Read-only constraint cell. Text-like columns use ConstraintOverflowTooltip;
 * numbers/dates use a plain gray div (no tooltip).
 */
export const renderReadOnlyConstraintValue = (cellProps, column) => {
  const isNumeric = column?.type === "int" || column?.type === "float";
  const displayValue = cellProps?.value ?? "";
  const textValue =
    displayValue === null || displayValue === undefined
      ? ""
      : String(displayValue);

  const wrapperStyle = isNumeric
    ? { textAlign: "right", width: "100%", color: "#60697D" }
    : { color: "#60697D" };

  if (!shouldShowReadOnlyOverflowTooltip(column)) {
    return <div style={wrapperStyle}>{textValue}</div>;
  }

  const tooltipCellProps = { ...cellProps, value: textValue };

  return (
    <div
      style={{
        ...wrapperStyle,
        minWidth: 0,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <ConstraintOverflowTooltip {...tooltipCellProps} />
    </div>
  );
};

/**
 * Renders a "-" placeholder for non-editable cells with no data.
 * Right-aligned for int/float columns, left-aligned otherwise.
 * Returns null if the cell has data or is editable (so default rendering applies).
 */
export const renderEmptyCell = (params, column) => {
  const colName = column?.column_name || column?.field;
  if (colName === "action") return null;

  const value = params?.value;
  const hasData = value !== null && value !== undefined && value !== "";
  if (hasData || column?.is_editable) return null;

  const isNumeric = column?.type === "int" || column?.type === "float";
  return (
    <div style={isNumeric ? { textAlign: "right", width: "100%" } : {}}>
      {"-"}
    </div>
  );
};

/**
 * Wraps cellRenderer on each column so that non-editable empty cells
 * show a "-" placeholder (right-aligned for int/float).
 * Skips columns whose cellRenderer is a string (e.g. "agGroupCellRenderer")
 * or a React component, only wrapping plain functions.
 * Columns with no cellRenderer get a default renderer that shows "-" when empty.
 * Recurses into children arrays for grouped columns.
 */
export const wrapColumnsWithEmptyCell = (columns) => {
  columns?.forEach((col) => {
    const nestedColumns = col.children?.length
      ? col.children
      : col.sub_headers;
    if (nestedColumns?.length) {
      wrapColumnsWithEmptyCell(nestedColumns);
    }
    if (typeof col.cellRenderer === "function") {
      const originalRenderer = col.cellRenderer;
      col.cellRenderer = (params, extraProps) => {
        const placeholder = renderEmptyCell(params, col);
        if (placeholder) return placeholder;
        return originalRenderer(params, extraProps);
      };
      return;
    }
    if (col.cellRenderer) return;
    col.cellRenderer = (params) => {
      const placeholder = renderEmptyCell(params, col);
      if (placeholder) return placeholder;
      return params.valueFormatted ?? params.value;
    };
  });
};

/**
 * Injects a "Status" column into the columns array if not already present.
 * Derives tc_code from the first existing column for consistency,
 * and uses a large tc_mapping_code to avoid collisions.
 */
export const injectStatusColumn = (columns) => {
  const hasStatus = columns.some((col) => col.column_name === "status");
  if (hasStatus) return columns;

  const tc_code = columns?.[0]?.tc_code || 0;

  const statusCol = {
    aggregate_type: null,
    column_name: "status",
    dimension: "custom",
    extra: {},
    footer: null,
    formatter: null,
    is_aggregated: false,
    is_deleted: false,
    is_editable: false,
    is_frozen: false,
    is_hidden: null,
    is_master_group: false,
    is_required: false,
    is_row_span: false,
    is_searchable: false,
    is_sortable: false,
    label: "Status",
    order_of_display: 7,
    sub_headers: [],
    tc_code: tc_code,
    tc_mapping_code: "999901",
    type: "custom",
    width: 200,
    cellRenderer: statusBadgeCellRenderer,
    // AG Grid properties (formatter skips "custom" type)
    originalLabel: "Status",
    headerClass: "Status",
    field: "status",
    accessor: "status",
    id: "status",
    sortable: false,
    headerName: "Status",
    pinned: null,
    required: false,
    resizable: true,
    showRangeFilter: false,
    filter: false,
    floatingFilter: false,
    isSearchable: false,
    advanceSearchEnabled: false,
    floatingFilterComponentParams: {
      suppressFilterButton: true,
    },
    headerComponent: null,
  };

  return [...cloneDeep(columns), statusCol];
};

/**
 * Deep-copies the column configs and formats the action column
 * (pinned right, narrow width, centered icon, no header label).
 * Sets AG Grid properties directly on the column object.
 * Width is 56px so the pinned-right pane matches the icon and does not clip.
 *
 * AG Grid still sizes `.ag-pinned-right-header` as column + scrollbar (~73px)
 * even when the colDef is 56px. Pass `useConstraintsActionColumnStyles().grid`
 * as AgGrid `customClass` so header, body, and spacer stay aligned at 56px.
 */
export const ACTION_COLUMN_WIDTH = 56;

export const useConstraintsActionColumnStyles = makeStyles({
  grid: {
    "& .ag-pinned-right-header, & .ag-pinned-right-cols-container": {
      width: `${ACTION_COLUMN_WIDTH}px !important`,
      minWidth: `${ACTION_COLUMN_WIDTH}px !important`,
      maxWidth: `${ACTION_COLUMN_WIDTH}px !important`,
    },
    "& .ag-horizontal-right-spacer": {
      width: "0px !important",
      minWidth: "0px !important",
      maxWidth: "0px !important",
      overflow: "hidden",
    },
    "& .ag-pinned-right-header .ag-header-cell": {
      paddingLeft: "0 !important",
      paddingRight: "0 !important",
    },
    "& .ag-pinned-right-cols-container .ag-cell": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: "0 !important",
      paddingRight: "0 !important",
      overflow: "visible",
    },
  },
});

export const applyActionColumnLayout = (column) => {
  if (!column) return column;
  column.suppressMenu = true;
  column.pinned = column.extra?.pinned || "right";
  column.width = ACTION_COLUMN_WIDTH;
  column.minWidth = ACTION_COLUMN_WIDTH;
  column.maxWidth = ACTION_COLUMN_WIDTH;
  column.suppressSizeToFit = true;
  column.resizable = false;
  column.label = "";
  column.headerName = "";
  column.cellStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };
  return column;
};

export const formatActionColumn = (columns) => {
  const cols = cloneDeep(columns);
  cols.forEach((column) => {
    if (column.column_name === "action") {
      applyActionColumnLayout(column);
    }
  });
  return cols;
};
