/**
 * Map BE `/rows` pagination to AG-Grid SSRM `totalCount` (successCallback rowCount).
 *
 * BE contract:
 *   has_more === true  → more blocks exist (return undefined so AG Grid loads next)
 *   has_more === false → exhausted (return absolute row count)
 *
 * Fallback when has_more is absent: rows.length < pageSize → exhausted.
 */
export function resolveSsrmTotalCount({
  rows = [],
  startRow = 0,
  endRow = 0,
  hasMore,
  rowLimit,
}) {
  const pageSize = Math.max(
    endRow - startRow,
    rowLimit > 0 ? rowLimit : 1
  );

  if (hasMore === true) {
    return undefined;
  }

  if (hasMore === false) {
    return startRow + rows.length;
  }

  if (rows.length < pageSize) {
    return startRow + rows.length;
  }

  return undefined;
}
