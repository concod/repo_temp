/**
 * SSRM row normalisation for drilldown matrix responses.
 *
 * Required tree fields (BE does not send these):
 * - dimensionPath — hierarchy value chain; drives child fetch, locks, edits, labels
 * - rowUid — stable AG Grid row id (uniqueRowId)
 * - isGroup — AG Grid tree expand (checkParentGroupkey="isGroup")
 *
 * Omitted: hasChildren (unused in OM), leafId (same as rowUid — edit util uses rowUid)
 */

export function buildDimensionPathFromRow(row, pivotOrder = []) {
  if (!row || !pivotOrder?.length) return [];
  const path = [];
  for (const dim of pivotOrder) {
    const value = row[dim.id];
    if (value == null || value === "") break;
    path.push(String(value));
  }
  return path;
}

export function resolveDimensionPath(row, pivotOrder = [], parentPath = []) {
  const pathFromColumns = buildDimensionPathFromRow(row, pivotOrder);
  if (pathFromColumns.length > (parentPath?.length ?? 0)) {
    return pathFromColumns;
  }
  const depth = Array.isArray(parentPath) ? parentPath.length : 0;
  const field = pivotOrder[depth]?.id;
  if (!field) return parentPath;
  const value = row[field];
  if (value == null || value === "") return parentPath;
  return [...parentPath, String(value)];
}

export function buildRowUidFromDimensionPath(dimensionPath) {
  if (!Array.isArray(dimensionPath) || dimensionPath.length === 0) {
    return null;
  }
  const depth = dimensionPath.length - 1;
  return `group::${depth}::${dimensionPath.join("/")}`;
}

export function mapDrilldownRowToSsrmShape(
  row,
  { pivotOrder = [], parentPath = [] } = {}
) {
  if (!row) return row;
  const dimensionPath = resolveDimensionPath(row, pivotOrder, parentPath);
  const rowUid =
    buildRowUidFromDimensionPath(dimensionPath) ??
    row.rowUid ??
    `row::${Math.random().toString(36).slice(2)}`;

  return {
    ...row,
    dimensionPath,
    rowUid,
    isGroup: dimensionPath.length < pivotOrder.length,
  };
}

export function mapDrilldownRowsToSsrmShape(
  rows,
  { pivotOrder = [], parentPath = [] } = {}
) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) =>
    mapDrilldownRowToSsrmShape(row, { pivotOrder, parentPath })
  );
}

/** @deprecated Prefer mapDrilldownRowsToSsrmShape at fetch time. */
export function ensureDimensionPath(row, pivotOrder = [], parentPath = []) {
  if (!row) return [];
  if (Array.isArray(row.dimensionPath) && row.dimensionPath.length > 0) {
    return row.dimensionPath;
  }
  row.dimensionPath = resolveDimensionPath(row, pivotOrder, parentPath);
  return row.dimensionPath;
}

export function ensureRowUid(row) {
  if (!row || row.rowUid) return row;
  const path = row.dimensionPath;
  row.rowUid =
    buildRowUidFromDimensionPath(path) ??
    (Array.isArray(path) && path.length > 0
      ? `path::${path.join("/")}`
      : `row::${Math.random().toString(36).slice(2)}`);
  return row;
}

export function normalizeSsrmRows(rows, { pivotOrder = [], parentPath = [] } = {}) {
  return mapDrilldownRowsToSsrmShape(rows, { pivotOrder, parentPath });
}
