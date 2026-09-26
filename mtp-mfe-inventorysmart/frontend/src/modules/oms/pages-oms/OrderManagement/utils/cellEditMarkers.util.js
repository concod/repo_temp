import { deferGridApiCall } from "./deferGridApi.util.js";

export const OMS_EDITED_CELL_BG = "#DBEFF0";

export function resolveOrderQtyColId(column, cellData) {
  return (
    cellData?.colDef?.colId ||
    cellData?.colDef?.field ||
    cellData?.column?.colId ||
    column?.colId ||
    column?.field ||
    column?.column_name ||
    null
  );
}

/**
 * Edit-status dots and the "edited cell" background tint are an Order
 * Quantity-only concept — User Adjusted Delivery Date has no edited/updated
 * visual tracking by explicit product decision, so this stays scoped to
 * `order_quantity_` fields (never generalised to other measure columns).
 */
export function resolveEditMarkerCellStyle(params, editContext) {
  const field = params?.colDef?.field || params?.colDef?.colId || "";
  if (typeof field !== "string" || !field.startsWith("order_quantity_")) {
    return null;
  }
  const rowUid = params?.data?.rowUid ?? params?.data?.leafId ?? null;
  if (rowUid == null) return null;
  const markers =
    editContext?.cellEditMarkersRef?.current ??
    editContext?.cellEditMarkers ??
    {};
  if (markers[`${rowUid}::${field}`] === "edited") {
    return { backgroundColor: OMS_EDITED_CELL_BG };
  }
  return null;
}

export function resolveCellEditMarkersMap(editContext) {
  if (editContext?.cellEditMarkersRef?.current) {
    return editContext.cellEditMarkersRef.current;
  }
  return editContext?.cellEditMarkers || {};
}

function resolveEditDotStatusFromMarkers(editContext, rowUid, field) {
  const markers = resolveCellEditMarkersMap(editContext);
  if (!markers || rowUid == null || !field) return null;
  return markers[`${rowUid}::${field}`] || null;
}

/**
 * Resolve a cell's dot status — one of exactly BE's two raw booleans per
 * column, `edited_<colId>` and `updated_<colId>` (the FULL column id, e.g.
 * `edited_order_quantity_july_2026` — confirmed with BE; an earlier version
 * of this function stripped the colId down to a bare fiscal period because
 * BE was briefly sending bare-period-keyed flags, but that was a BE bug
 * that's now fixed), read on both the initial row payload (GET /rows) and
 * every edit-drilldown response's patched cells (see `applyUpdatedCells`).
 * No third label is invented here — the returned string is always one of
 * BE's own field names:
 *   - edited_<colId> && updated_<colId>  -> "edited"  (purple — the cell
 *     the user typed into)
 *   - updated_<colId> && !edited_<colId> -> "updated" (blue — an
 *     ancestor/sibling whose rolled-up value changed as a result)
 *   - neither                            -> null       (no dot)
 * BE guarantees edited implies updated, so the `edited` check alone would
 * suffice, but the explicit `&&` is kept here as the single source of truth
 * for the rule in case that guarantee ever loosens.
 * The read-only `order_quantity_eaches_<period>` sibling is never itself an
 * edit target, so BE never sends `edited_order_quantity_eaches_<period>` /
 * `updated_order_quantity_eaches_<period>` flags for it — it simply never
 * gets a dot (no attempt is made here to mirror its paired qty column's
 * status onto it).
 * Prefers these BE row flags since they persist across refresh; falls back
 * to the FE-only markers kept for the current in-memory session (e.g. the
 * brief window before a fresh row patch lands) — that fallback map is also
 * keyed by the full colId (see `mergeCellEditMarkers`).
 */
export function resolveEditDotStatus(editContext, data, rowUid, field) {
  if (field && data) {
    const isEdited = Boolean(data[`edited_${field}`]);
    const isUpdated = Boolean(data[`updated_${field}`]);
    if (isEdited && isUpdated) return "edited";
    if (isUpdated) return "updated";
  }
  return resolveEditDotStatusFromMarkers(editContext, rowUid, field);
}

/**
 * "Before Edit: <value>" text for cells that are either edited or affected —
 * `null` for every other cell so callers never render an empty tooltip. The
 * pre-edit baseline lives on the row under `roq_constrained_<period>` (bare
 * fiscal period, not the full colId) — this baseline concept only exists
 * for Order Quantity today (no equivalent "before edit" baseline field for
 * User Adjusted Delivery Date), so this stays scoped to `order_quantity_`
 * fields.
 */
export function resolveBeforeEditTooltipText(editContext, data, rowUid, field) {
  if (!field || !data) return null;
  if (typeof field !== "string" || !field.startsWith("order_quantity_")) {
    return null;
  }
  const status = resolveEditDotStatus(editContext, data, rowUid, field);
  if (status !== "edited" && status !== "updated") return null;
  const period = field.replace(/^order_quantity_/, "");
  const beforeEditValue = data[`roq_constrained_${period}`];
  if (beforeEditValue == null || beforeEditValue === "") return null;
  return `Before Edit: ${beforeEditValue}`;
}

export function mergeCellEditMarkers(
  existing,
  { editedRowUid, colId, affectedRowUids }
) {
  const next = { ...(existing || {}) };
  if (editedRowUid == null || !colId) return next;
  next[`${editedRowUid}::${colId}`] = "edited";
  // `affectedRowUids` is just the list of rows this edit touched — the
  // marker value stored for each is "updated" (matching BE's own field
  // name), never a third made-up label.
  (affectedRowUids || []).forEach((rowUid) => {
    if (rowUid == null || String(rowUid) === String(editedRowUid)) return;
    const key = `${rowUid}::${colId}`;
    if (next[key] !== "edited") next[key] = "updated";
  });
  return next;
}

export function findRowNodesByUid(api, rowUids) {
  const uidSet = new Set((rowUids || []).map((id) => String(id)));
  const nodes = [];
  if (!api || uidSet.size === 0) return nodes;
  api.forEachNode((node) => {
    if (!node) return;
    const id = node.data?.rowUid ?? node.data?.leafId;
    if (id != null && uidSet.has(String(id))) {
      nodes.push(node);
    }
  });
  // `forEachNode` never walks pinned rows — Grand Total lives outside the
  // normal SSRM node tree, so it needs its own pinned-row lookup (mirrors
  // the pattern in `applyUpdatedCells`) or it never gets its loading
  // overlay / cell refresh alongside the rest of an edit's blast radius.
  if (typeof api?.getPinnedTopRow === "function") {
    let idx = 0;
    let pinned = api.getPinnedTopRow(idx);
    while (pinned) {
      const id = pinned.data?.rowUid ?? pinned.data?.leafId;
      if (id != null && uidSet.has(String(id))) {
        nodes.push(pinned);
      }
      idx += 1;
      pinned = api.getPinnedTopRow(idx);
    }
  }
  return nodes;
}

/**
 * Loading-state controller for an edit/undo/redo's blast radius, split so
 * hierarchy rows and the Grand Total row can be released independently.
 * Grand Total is refreshed via its own follow-up API call after every
 * edit/undo/redo (see `refreshGrandTotalAfterEdit` in OrderManagement.jsx —
 * it's never derived from a client-side delta), which takes an extra
 * network round-trip on top of the edit-drilldown call itself. Hierarchy
 * rows' values are already final as soon as the edit-drilldown response is
 * applied — they must not stay in the loading state for that extra Grand
 * Total round-trip, or every edit visually blocks the entire visible
 * hierarchy for longer than necessary.
 */
export function createBlastRadiusLoadingController({
  api,
  cellsInFlightRef,
  setCellsInFlight,
  cellKey,
  colId,
  editedRowUid,
  blastRadiusRowUids,
  grandTotalRowId,
}) {
  const allRowUids = blastRadiusRowUids || [];
  const hierarchyRowUids = allRowUids.filter(
    (id) => String(id) !== String(grandTotalRowId)
  );
  const hasGrandTotal = allRowUids.some(
    (id) => String(id) === String(grandTotalRowId)
  );

  const hierarchyKeys = (
    colId
      ? [cellKey, ...hierarchyRowUids.map((id) => `${id}::${colId}`)]
      : [cellKey]
  ).filter(Boolean);
  const grandTotalKeys =
    colId && hasGrandTotal ? [`${grandTotalRowId}::${colId}`] : [];

  const applyKeys = (keys, loading, affectedRowUids) => {
    if (!keys || keys.length === 0) return;
    if (loading) {
      keys.forEach((key) => cellsInFlightRef.current.add(key));
    } else {
      keys.forEach((key) => cellsInFlightRef.current.delete(key));
    }
    setCellsInFlight(new Set(cellsInFlightRef.current));
    if (editedRowUid != null) {
      deferGridApiCall(api, () => {
        refreshOrderQtyEditMarkerCells(api, { editedRowUid, affectedRowUids });
      });
    }
  };

  return {
    /** Everything in the blast radius, including Grand Total. */
    markAll: (loading) =>
      applyKeys([...hierarchyKeys, ...grandTotalKeys], loading, allRowUids),
    /** Hierarchy rows only — call once the edit-drilldown response lands. */
    markHierarchy: (loading) =>
      applyKeys(hierarchyKeys, loading, hierarchyRowUids),
    /** Grand Total only — call once its own follow-up fetch resolves. */
    markGrandTotal: (loading) =>
      applyKeys(
        grandTotalKeys,
        loading,
        hasGrandTotal ? [grandTotalRowId] : []
      ),
  };
}

export function refreshOrderQtyEditMarkerCells(
  api,
  { editedRowUid, affectedRowUids }
) {
  const rowUids = [editedRowUid, ...(affectedRowUids || [])].filter(
    (id) => id != null
  );
  const nodes = findRowNodesByUid(api, rowUids);
  if (nodes.length === 0) return nodes;
  if (typeof api?.refreshCells === "function") {
    api.refreshCells({ rowNodes: nodes, force: true });
  }
  deferGridApiCall(api, () => {
    if (typeof api?.redrawRows === "function") {
      api.redrawRows({ rowNodes: nodes });
    }
  });
  return nodes;
}
