/** Pivot dimension ids that represent the size-or-pack terminal product level. */
export const PACK_SIZE_DIMENSION_IDS = new Set(["size", "pack_id", "pack"]);

/** Pivot depth for a row (0-based index into pivotOrder). */
export function getRowPivotDepth(dimensionPath) {
  if (!Array.isArray(dimensionPath) || dimensionPath.length === 0) return -1;
  return dimensionPath.length - 1;
}

/** Dimension id (e.g. `article`, `l2_name`) for this hierarchy row. */
export function getRowDimensionId(pivotOrder, dimensionPath) {
  const depth = getRowPivotDepth(dimensionPath);
  if (depth < 0 || !Array.isArray(pivotOrder) || depth >= pivotOrder.length) {
    return null;
  }
  return pivotOrder[depth]?.id ?? null;
}

export function isPackSizeDimensionId(dimensionId) {
  return PACK_SIZE_DIMENSION_IDS.has(dimensionId);
}

/** Article value from dimensionPath when article appears anywhere in the pivot. */
export function getArticleFromDimensionPath(pivotOrder, dimensionPath) {
  if (!Array.isArray(pivotOrder) || !Array.isArray(dimensionPath)) return null;
  const articleIndex = pivotOrder.findIndex((dimension) => dimension.id === "article");
  if (articleIndex < 0 || articleIndex >= dimensionPath.length) return null;
  const article = dimensionPath[articleIndex];
  return article == null || article === "" ? null : String(article);
}

/** Pack id shown at the size/pack hierarchy row (the row's own dimension value). */
export function getPackIdFromDimensionPath(pivotOrder, dimensionPath) {
  if (!Array.isArray(pivotOrder) || !Array.isArray(dimensionPath)) return null;
  const depth = getRowPivotDepth(dimensionPath);
  if (depth < 0 || depth >= pivotOrder.length) return null;
  const dimensionId = pivotOrder[depth]?.id;
  if (!isPackSizeDimensionId(dimensionId)) return null;
  const packId = dimensionPath[depth];
  return packId == null || packId === "" ? null : String(packId);
}

/**
 * Pack hyperlink applies on the size/pack hierarchy row when the row is a pack-id
 * bucket (is_pack_enabled from BE). Pack-enabled articles must not show S/M/L
 * sizes — only pack id rows are returned and linked.
 */
export function isPackSizeHierarchyRow(pivotOrder, rowData) {
  if (!rowData || rowData?.meta?.__isGrandTotal) return false;
  if (rowData.is_pack_enabled !== true) return false;
  return isPackSizeDimensionId(
    getRowDimensionId(pivotOrder, rowData.dimensionPath)
  );
}
