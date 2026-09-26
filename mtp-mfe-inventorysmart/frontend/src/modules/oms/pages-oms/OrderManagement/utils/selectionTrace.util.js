/**
 * Selection-trace helpers for Product Details / Set All / Approve payloads.
 *
 * The matrix cascade already collapses a parent once every loaded child is
 * selected, so `selectedRowTraces` holds the shallowest fully-selected nodes.
 *
 * Intentionally simple for now (BE only reads `global_filters` /
 * `dynamic_hierarchy` today, `selected_hierarchies` is forward-compatible and
 * currently ignored):
 *   - `selected_hierarchies`: every selected row's own ancestor trace, sent
 *     as separate entities — no common-prefix collapsing, no attempt to
 *     detect "all selected" beyond the explicit Select All flag.
 *   - `dynamic_hierarchy`: always `{}` — not computed from the selection.
 *     Revisit once the BE model actually consumes `selected_hierarchies`.
 *   - `global_filters`: panel filters only.
 */

import { buildGlobalFilters } from "./drilldownMatrixPayload.util.js";

function resolveDimId(pivotOrder, index) {
  const dim = pivotOrder?.[index];
  if (dim == null) return null;
  return typeof dim === "string" ? dim : dim?.id ?? null;
}

/**
 * Convert dimensionPath arrays into hierarchy-only dicts keyed by pivot
 * column ids — same shape as edit-drilldown `current_open_items` (minus rowUid).
 *
 * Ex: path ["Children", "Apparel"] + pivot [l0_name, l1_name]
 *  -> { l0_name: "Children", l1_name: "Apparel" }
 *
 * Every selected row produces its own entry — a mixed-depth selection (e.g.
 * one full l1 plus a couple of l2's under a different l1) comes out as
 * separate dicts, one per row, rather than being merged/collapsed.
 */
export function buildSelectionTrace({ traces, pivotOrder } = {}) {
  if (!Array.isArray(traces) || !Array.isArray(pivotOrder)) return [];
  return traces
    .filter((path) => Array.isArray(path) && path.length > 0)
    .map((path) => {
      const entry = {};
      for (let level = 0; level < path.length && level < pivotOrder.length; level += 1) {
        const dimId = resolveDimId(pivotOrder, level);
        if (!dimId) continue;
        entry[dimId] = path[level];
      }
      return entry;
    })
    .filter((entry) => Object.keys(entry).length > 0);
}

/**
 * Build the Product Details / Set All / Approve selection payload.
 */
export function buildHierarchySelectionPayload({
  traces,
  pivotOrder,
  selectedFilters,
  isSelectAll = false,
} = {}) {
  const availableHierarchies = (pivotOrder || [])
    .map((dim, index) => resolveDimId(pivotOrder, index) || (typeof dim === "string" ? dim : dim?.id))
    .filter(Boolean);

  const selectedHierarchies = isSelectAll
    ? []
    : buildSelectionTrace({ traces, pivotOrder });

  return {
    available_hierarchies: availableHierarchies,
    selected_hierarchies: selectedHierarchies,
    global_filters: buildGlobalFilters(selectedFilters),
    dynamic_hierarchy: {},
  };
}
