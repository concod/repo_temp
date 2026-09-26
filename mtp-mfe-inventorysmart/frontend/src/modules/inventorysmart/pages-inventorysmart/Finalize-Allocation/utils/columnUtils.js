import { Badge } from "impact-ui-v3";
import "./columnUtils.css";

const BADGE_COLUMNS = new Set(["allocation_type", "constrained_allocation"]);

const BADGE_COLORS = {
  "New Launch": "info",
  "Replenishment": "warning",
  "Constrained": "error",
  "Unconstrained": "info",
};

const badgeCellRenderer = (params) => {
  const values = String(params?.value || "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!values.length) return null;
  return (
    <div className="badge-cell-container">
      {values.map((val, idx) => (
        <Badge
          key={idx}
          label={val}
          variant="subtle"
          color={BADGE_COLORS[val] || "default"}
          size="default"
        />
      ))}
    </div>
  );
};

export const applyBadgeColumns = (columns) => {
  if (!columns) return;
  columns.forEach((col) => {
    if (col.sub_headers?.length) {
      applyBadgeColumns(col.sub_headers);
      return;
    }
    if (BADGE_COLUMNS.has(col.column_name)) {
      col.cellRenderer = badgeCellRenderer;
      col.minWidth = 260;
      col.cellClass = `${col.cellClass || ""} cell-vertical-center-align`;
    }
  });
};

export const applyAbsentKeyHyphen = (columns) => {
  columns.forEach((col) => {
    if (col.sub_headers?.length) {
      applyAbsentKeyHyphen(col.sub_headers);
      return;
    }
    if (!col.column_name) return;

    const colName = col.column_name;
    const originalValueGetter = col.valueGetter;
    const originalCellRenderer = col.cellRenderer;

    col.valueGetter = (params) => {
      if (
        params.data &&
        !Object.prototype.hasOwnProperty.call(params.data, colName)
      ) {
        return "-";
      }
      return originalValueGetter
        ? originalValueGetter(params)
        : params.data?.[colName];
    };

    if (typeof originalCellRenderer === "function") {
      col.cellRenderer = (params, extraProps) => {
        if (
          params.data &&
          !Object.prototype.hasOwnProperty.call(params.data, colName)
        ) {
          return "-";
        }
        return originalCellRenderer(params, extraProps);
      };
    }
  });
};
