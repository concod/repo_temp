import { deferGridApiCall } from "./deferGridApi.util.js";
import { isPeriodFlagRowKey } from "./periodApprovalFlag.util.js";
import { PACK_SIZE_DIMENSION_IDS } from "./orderManagementPack.util.js";

function getRowStableId(data) {
  return data?.rowUid ?? data?.leafId ?? null;
}
// Collect every loaded (non-pinned) row's rowUid so the caller can tell the
// edit endpoint exactly which rows are currently visible (the blast-radius
// scope). SSRM `forEachNode` walks only loaded nodes.
export function collectLoadedLeafIds(api) {
  if (!api) return [];
  const leafIds = [];
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    const rowId = getRowStableId(node.data);
    if (rowId) leafIds.push(rowId);
  });
  return leafIds;
}

/** Measure fields for visible rows — used by edit API for ancestor SQL+delta rollups. */
export function collectLoadedRowMeasures(api) {
  if (!api) return [];
  const rows = [];
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    const rowId = getRowStableId(node.data);
    if (!rowId) return;
    const measures = { leafId: rowId };
    for (const [key, value] of Object.entries(node.data || {})) {
      if (
        key.startsWith("order_quantity_") ||
        isPeriodFlagRowKey(key) ||
        key === "min_order_quantity_style"
      ) {
        measures[key] = value;
      }
    }
    rows.push(measures);
  });
  return rows;
}

function mergeRowData(existingData, changedRow) {
  const existingMeta = existingData?.meta || {};
  const changedMeta = changedRow?.meta || {};
  return {
    ...existingData,
    ...changedRow,
    // Preserve identity-only meta (e.g. __isGrandTotal, childCount overrides)
    // and only overwrite the rollup-derived ones the endpoint recomputed.
    meta: {
      ...existingMeta,
      ...changedMeta,
    },
  };
}

export function applyEditDelta({ api, changedRows }) {
  if (!api || !Array.isArray(changedRows) || changedRows.length === 0) {
    return [];
  }

  const changedByRowId = new Map();
  for (const changedRow of changedRows) {
    const rowId = changedRow?.rowUid ?? changedRow?.leafId;
    if (rowId) changedByRowId.set(rowId, changedRow);
  }
  if (changedByRowId.size === 0) return [];

  const touchedNodes = [];
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    const rowId = getRowStableId(node.data);
    if (!rowId) return;
    const changedRow = changedByRowId.get(rowId);
    if (!changedRow) return;
    const nextData = mergeRowData(node.data, changedRow);
    if (typeof node.setData === "function") {
      node.setData(nextData);
    }
    node.data = nextData;
    touchedNodes.push(node);
  });

  if (touchedNodes.length > 0) {
    api.refreshCells({ rowNodes: touchedNodes, force: true });
    deferGridApiCall(api, () => {
      if (typeof api.redrawRows === "function") {
        api.redrawRows({ rowNodes: touchedNodes });
      }
    });
  }
  return touchedNodes;
}

/**
 * Apply `{ updated_cells: [{ rowUid, newValue, newValueDate, newValueEaches, newValueCost, updated, edited }] }`
 * by patching loaded row data (values + `edited_*` / `updated_*` flags) then
 * refreshCells. Preferred path for the simplified edit-cell contract.
 *
 * BE only ever sends exactly two booleans per cell — `edited` (this is the
 * cell the user actually typed into) and `updated` (this cell's value
 * changed as a result of the edit, directly or via rollup). The FE dot
 * status uses these same two names, no third invented label: `edited &&
 * updated` -> "edited" (purple dot), `updated && !edited` -> "updated"
 * (blue dot), neither -> no dot (see `resolveEditDotStatus` in
 * cellEditMarkers.util.js, the single place that derives the dot colour
 * from these two raw flags).
 *
 * Both booleans are written EXPLICITLY (true or false) for every cell that
 * carries a primary value (`newValue` / `newValueDate`) or sibling
 * `newValueEaches` — never only conditionally on truthy — so an
 * Undo/Redo/re-edit response that reports a cell as no longer
 * edited/updated actually clears the stale flag instead of leaving a
 * previous `true` sitting in row data forever (the object-spread merge
 * onto `node.data` only overwrites keys the patch explicitly sets).
 *
 * BE never sends a `colId` on each cell (it already knows which column was
 * edited from the request) — the caller must pass `editedColId` (the column
 * the user actually edited) so the primary value lands on the right field.
 * Date edits (`drilldown_date`) return the primary value as `newValueDate`
 * (not `newValue`); quantity edits keep `newValue`. When both are present,
 * `newValueDate` wins for the edited column so a mixed/legacy payload still
 * paints the date correctly.
 * `newValueEaches` is the read-only eaches sibling column's value (pack
 * clients only, e.g. `order_quantity_eaches_<period>` next to
 * `order_quantity_<period>`) — pass its colId as `eachesColId`
 * (see `deriveEachesColId`). `newValueCost` is the same-period order-cost
 * sibling (`order_cost_<period>`) — pass its colId as `costColId`
 * (see `deriveCostColId`). `eachesColId` / `costColId` and each cell's
 * `newValueEaches` / `newValueCost` are optional — never invent values when
 * missing.
 * `cell.colId` (legacy shape) still wins over `editedColId` when present.
 *
 * `edited_<colId>` / `updated_<colId>` flags are written keyed by the FULL
 * edited column id (e.g. `edited_order_quantity_july_2026`, confirmed with
 * BE — an earlier bare-fiscal-period key format was a BE bug, now fixed) —
 * never mirrored onto the read-only eaches/cost siblings: those are never
 * themselves edit targets, so they never get their own dots (see
 * `resolveEditDotStatus` in cellEditMarkers.util.js).
 */
export function applyUpdatedCells({
  api,
  updatedCells,
  editedColId = null,
  eachesColId = null,
  costColId = null,
}) {
  if (!api || !Array.isArray(updatedCells) || updatedCells.length === 0) {
    return [];
  }

  const patchesByRowId = new Map();
  for (const cell of updatedCells) {
    const rowId = cell?.rowUid ?? cell?.leafId;
    if (rowId == null) continue;
    const qtyColId = cell?.colId || editedColId;
    if (!qtyColId && !eachesColId && !costColId) continue;

    const key = String(rowId);
    const patch = patchesByRowId.get(key) || {};

    const newValueDate = cell.newValueDate ?? cell.new_value_date;
    const primaryValue =
      newValueDate !== undefined
        ? newValueDate
        : cell.newValue !== undefined
          ? cell.newValue
          : undefined;

    if (qtyColId && primaryValue !== undefined) {
      patch[qtyColId] = primaryValue;
      // Keyed by the full edited colId — never written for the eaches
      // sibling, which is read-only and never itself an edit target.
      patch[`edited_${qtyColId}`] = Boolean(cell.edited);
      patch[`updated_${qtyColId}`] = Boolean(cell.updated);
    }

    if (eachesColId && cell.newValueEaches !== undefined) {
      patch[eachesColId] = cell.newValueEaches;
    }

    const newValueCost = cell.newValueCost ?? cell.new_value_cost;
    if (costColId && newValueCost !== undefined) {
      patch[costColId] = newValueCost;
    }

    if (Object.keys(patch).length) patchesByRowId.set(key, patch);
  }
  if (patchesByRowId.size === 0) return [];

  const touchedNodes = [];
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    const rowId = getRowStableId(node.data);
    if (rowId == null) return;
    const patch = patchesByRowId.get(String(rowId));
    if (!patch) return;
    const nextData = { ...node.data, ...patch };
    if (typeof node.setData === "function") {
      node.setData(nextData);
    }
    node.data = nextData;
    touchedNodes.push(node);
  });

  // Also patch pinned grand-total if present in the update set.
  if (typeof api.getPinnedTopRow === "function") {
    let idx = 0;
    let pinned = api.getPinnedTopRow(idx);
    while (pinned) {
      const rowId = getRowStableId(pinned.data);
      if (rowId != null) {
        const patch = patchesByRowId.get(String(rowId));
        if (patch) {
          const nextData = { ...pinned.data, ...patch };
          if (typeof pinned.setData === "function") {
            pinned.setData(nextData);
          }
          pinned.data = nextData;
          touchedNodes.push(pinned);
        }
      }
      idx += 1;
      pinned = api.getPinnedTopRow(idx);
    }
  }

  if (touchedNodes.length > 0) {
    api.refreshCells({ rowNodes: touchedNodes, force: true });
    deferGridApiCall(api, () => {
      if (typeof api.redrawRows === "function") {
        api.redrawRows({ rowNodes: touchedNodes });
      }
    });
  }
  return touchedNodes;
}

function pathIsSameOrDescendant(candidatePath, scopePath) {
  if (!Array.isArray(candidatePath) || !Array.isArray(scopePath)) return false;
  if (candidatePath.length < scopePath.length) return false;
  for (let depth = 0; depth < scopePath.length; depth += 1) {
    if (String(candidatePath[depth]) !== String(scopePath[depth])) {
      return false;
    }
  }
  return true;
}

/** True when `candidatePath` is a strict prefix of `targetPath` — i.e. an
 * ancestor group row sitting above the edited row in the tree. */
function pathIsAncestor(candidatePath, targetPath) {
  if (!Array.isArray(candidatePath) || !Array.isArray(targetPath)) return false;
  if (candidatePath.length >= targetPath.length) return false;
  for (let depth = 0; depth < candidatePath.length; depth += 1) {
    if (String(candidatePath[depth]) !== String(targetPath[depth])) {
      return false;
    }
  }
  return true;
}

/**
 * Full row objects for the edit payload's `current_open_items` — scoped to
 * every row already LOADED in the SSRM cache under the cell being edited,
 * never the entire tree of every branch the user has ever touched. A row
 * qualifies when it is either:
 *   (a) the edited row itself or one of its descendants, or
 *   (b) an ANCESTOR group row of the edited row — those rows show rolled-up
 *       totals that change as a direct result of the edit, so BE needs them
 *       in scope to return `updated` flags for the parent-hierarchy color
 *       dots. Sibling branches that share neither relationship stay out of
 *       scope.
 * Deliberately NOT filtered by `node.displayed` (i.e. currently visible /
 * not hidden inside a collapsed ancestor) — a descendant the user expanded
 * once and then collapsed is still sitting in the SSRM cache with its old
 * value/edited/updated flags. AG Grid's SSRM never refetches an
 * already-cached block just because it's re-expanded, so if we only sent
 * currently *visible* rows, that collapsed row's status would go stale
 * forever (or until `purgeEditedSubtreeCache` happens to purge that exact
 * block, which it only does for the edited row's own ancestor chain). The
 * ancestor/descendant path check above is what keeps this bounded to rows
 * actually affected by this edit — it can't balloon into "every branch ever
 * expanded in this session" the way dropping that check too would.
 * Top-line (grand total) edits redistribute across every branch, so those
 * fall back to the whole loaded tree (still cache-bounded, not the tree of
 * every row that could theoretically exist).
 */
export function collectLoadedRowsUnderEditedCell(
  api,
  dimensionPath,
  { isTopLineEdit = false } = {}
) {
  if (!api) return [];
  const scopePath = Array.isArray(dimensionPath) ? dimensionPath : [];
  const scopeToWholeTree = isTopLineEdit || scopePath.length === 0;
  const rows = [];
  api.forEachNode((node) => {
    if (!node || node.rowPinned) return;
    if (!scopeToWholeTree) {
      const candidatePath = node.data?.dimensionPath;
      const inScope =
        pathIsSameOrDescendant(candidatePath, scopePath) ||
        pathIsAncestor(candidatePath, scopePath);
      if (!inScope) return;
    }
    if (node.data) rows.push({ ...node.data });
  });
  return rows;
}

/**
 * Trim full row objects (as returned by collectLoadedRowsUnderEditedCell)
 * down to just the hierarchy dimension key/values a row actually carries
 * (per its own dimensionPath depth) plus `rowUid` — the minimal shape BE
 * needs to identify each open item. Never send measures / meta / flags over
 * the wire; those are internal FE state.
 *
 * Pack-enabled rows remap the size/pack terminal dim key to `pack_id`
 * (same contract as `buildDynamicHierarchy`) so BE filters on `m.pack_id`
 * instead of `m.size`. The value still comes from the pivot dim field
 * (rows API aliases pack buckets as `size`).
 *
 * Ex: { l0_name: "Men", rowUid: "group::0::Men" }
 * Pack size row: { article: "A1", pack_id: "P-100", rowUid: "..." }
 */
export function buildHierarchyOnlyOpenItems(rows, pivotOrder = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const depth = Array.isArray(row?.dimensionPath)
      ? row.dimensionPath.length
      : 0;
    const isPackEnabled = row?.is_pack_enabled === true;
    const trimmed = {};
    for (let level = 0; level < depth && level < pivotOrder.length; level += 1) {
      const dimId =
        typeof pivotOrder[level] === "string"
          ? pivotOrder[level]
          : pivotOrder[level]?.id;
      if (!dimId) continue;
      const resolvedId =
        isPackEnabled && PACK_SIZE_DIMENSION_IDS.has(dimId) ? "pack_id" : dimId;
      trimmed[resolvedId] = row[dimId] ?? row[resolvedId];
    }
    trimmed.rowUid = row?.rowUid ?? row?.leafId ?? null;
    return trimmed;
  });
}
