/**
 * Detects whether two /columns signatures differ only in the measures/KPI
 * dimension — i.e. the user added or removed a KPI from the Measures axis.
 *
 * A "soft" (measures-only) change satisfies ALL of:
 *   - Same pivot order
 *   - Same dates (start_fw, end_fw, date_filter, roqTab, fiscalView)
 *   - Same filters
 *   - Same view_id
 *   - columnDimensions.measures may differ
 *   - viewDetails.measures may differ
 *   - All other viewDetails fields are identical
 */
export function isMeasuresOnlyChange(prevSignatureJson, nextSignatureJson) {
  if (!prevSignatureJson || !nextSignatureJson) return false;
  if (prevSignatureJson === nextSignatureJson) return false;

  let prev, next;
  try {
    prev = JSON.parse(prevSignatureJson);
    next = JSON.parse(nextSignatureJson);
  } catch {
    return false;
  }

  // Structural fields that must be identical for a soft reload
  if (prev.start_fw !== next.start_fw) return false;
  if (prev.end_fw !== next.end_fw) return false;
  if (prev.date_filter !== next.date_filter) return false;
  if (prev.roqTab !== next.roqTab) return false;
  if (prev.fiscalView !== next.fiscalView) return false;
  if (prev.view_id !== next.view_id) return false;
  if (prev.filters !== next.filters) return false;
  if (JSON.stringify(prev.pivot) !== JSON.stringify(next.pivot)) return false;

  // viewDetails serialization: parse and compare everything except `m` (measures)
  // and the measures entry inside `c` (columnDimensions).
  let prevVD, nextVD;
  try {
    prevVD = JSON.parse(prev.viewDetails || "{}");
    nextVD = JSON.parse(next.viewDetails || "{}");
  } catch {
    return false;
  }

  // `r` (rowDimensions) must be identical
  if (JSON.stringify(prevVD.r) !== JSON.stringify(nextVD.r)) return false;

  // `k` (kpiWiseRows), `cf` (calculatedFields), `g` (grandTotal), `vs`, `sh`
  if (prevVD.k !== nextVD.k) return false;
  if (JSON.stringify(prevVD.cf) !== JSON.stringify(nextVD.cf)) return false;
  if (prevVD.g !== nextVD.g) return false;
  if (JSON.stringify(prevVD.vs) !== JSON.stringify(nextVD.vs)) return false;
  if (JSON.stringify(prevVD.sh) !== JSON.stringify(nextVD.sh)) return false;

  // `c` (columnDimensions): non-measures entries must be identical
  const stripMeasures = (dims) =>
    (dims || []).filter((d) => d?.v !== "measures");
  if (
    JSON.stringify(stripMeasures(prevVD.c)) !==
    JSON.stringify(stripMeasures(nextVD.c))
  )
    return false;

  // At this point only `m` and the measures entry in `c` may differ — that's
  // exactly what qualifies as a soft/KPI-only reload.
  return true;
}

/**
 * Given the previous beColDefs array and a new one, returns the set of
 * column_name values that are present in `nextCols` but absent in `prevCols`.
 * Used to identify which columns need a shimmer while rows re-fetch.
 */
export function getNewMeasureColNames(prevCols, nextCols) {
  const prevNames = new Set((prevCols || []).map((c) => c?.column_name).filter(Boolean));
  return new Set(
    (nextCols || [])
      .map((c) => c?.column_name)
      .filter((name) => name && !prevNames.has(name))
  );
}
