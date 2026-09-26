/**
 * Lock helpers for Order Management (flat field + cellLocked map).
 *
 * ancestorLocks / unlockExceptions are the source of truth.
 * data.cellLocked is written for InputCell display only — never read back.
 */

import {
  ensureDimensionPath,
  ensureRowUid,
} from "./orderManagementRow.util.js";
import { isGrandTotalRow } from "./orderQtyEditability.util.js";
import { deferGridApiCall } from "./deferGridApi.util.js";

function isLockExcludedRow(data, node) {
  return isGrandTotalRow(data) || node?.rowPinned === "top";
}

export function lockOverlayKey(colId, dimensionPath = []) {
  const prefix = Array.isArray(dimensionPath) ? dimensionPath.join("/") : "";
  return `${colId}::${prefix}`;
}

export function createLockState() {
  return {
    ancestorLocks: new Map(),
    unlockExceptions: new Set(),
  };
}

function hasStrictAncestorLock(colId, path, ancestorLocks) {
  const segments = Array.isArray(path) ? path : [];
  for (let depth = 0; depth < segments.length; depth += 1) {
    const key = lockOverlayKey(colId, segments.slice(0, depth));
    if (ancestorLocks.get(key) === true) return true;
  }
  return false;
}

function collectDirectChildren(gridApi, ancestorPath) {
  const children = [];
  gridApi?.forEachNode((node) => {
    const path = node?.data?.dimensionPath;
    if (
      Array.isArray(path) &&
      path.length === ancestorPath.length + 1 &&
      ancestorPath.every((seg, i) => String(seg) === String(path[i]))
    ) {
      children.push(node);
    }
  });
  return children;
}

/** Loaded descendants for lock repaint — BFS by dimensionPath + tree walk from anchor. */
function collectDescendantNodes(gridApi, anchorNode, ancestorPath) {
  const byId = new Map();
  const add = (rowNode) => {
    if (rowNode?.id != null && !byId.has(rowNode.id)) {
      byId.set(rowNode.id, rowNode);
    }
  };

  const visitedPaths = new Set();
  const pathQueue = [ancestorPath];
  while (pathQueue.length > 0) {
    const path = pathQueue.shift();
    const pathKey = path.join("/");
    if (visitedPaths.has(pathKey)) continue;
    visitedPaths.add(pathKey);
    for (const child of collectDirectChildren(gridApi, path)) {
      add(child);
      const childPath = child.data?.dimensionPath;
      if (Array.isArray(childPath) && childPath.length > 0) {
        pathQueue.push(childPath);
      }
    }
  }

  const walkTree = (rowNode) => {
    const kids = rowNode?.childrenAfterGroup;
    if (!Array.isArray(kids)) return;
    for (const child of kids) {
      add(child);
      walkTree(child);
    }
  };
  walkTree(anchorNode);

  return [...byId.values()];
}

function findNodeByPath(gridApi, dimensionPath) {
  if (!gridApi || !Array.isArray(dimensionPath)) return null;
  let found = null;
  gridApi.forEachNode((node) => {
    const path = node?.data?.dimensionPath;
    if (
      Array.isArray(path) &&
      path.length === dimensionPath.length &&
      path.every((seg, i) => String(seg) === String(dimensionPath[i]))
    ) {
      found = node;
    }
  });
  return found;
}

/** Effective lock for display + InputCell. */
export function resolveEffectiveLock(
  colId,
  dimensionPath,
  lockState,
  data,
  gridApi = null
) {
  if (!colId || !lockState) return false;
  const path = Array.isArray(dimensionPath) ? dimensionPath : [];
  const fullKey = lockOverlayKey(colId, path);

  if (lockState.unlockExceptions?.has(fullKey)) {
    return false;
  }

  const selfLocked = lockState.ancestorLocks?.get(fullKey) === true;
  if (selfLocked) {
    if (gridApi) {
      const children = collectDirectChildren(gridApi, path);
      if (children.length > 0) {
        const allChildrenLocked = children.every((n) =>
          resolveEffectiveLock(
            colId,
            n.data?.dimensionPath,
            lockState,
            n.data,
            gridApi
          )
        );
        return allChildrenLocked;
      }
    }
    return true;
  }

  if (hasStrictAncestorLock(colId, path, lockState.ancestorLocks)) {
    return true;
  }

  if (gridApi) {
    const children = collectDirectChildren(gridApi, path);
    if (children.length > 0) {
      const allChildrenLocked = children.every((n) =>
        resolveEffectiveLock(
          colId,
          n.data?.dimensionPath,
          lockState,
          n.data,
          gridApi
        )
      );
      if (allChildrenLocked) {
        return true;
      }
    }
  }

  return false;
}

function clearUnlockExceptionsUnder(colId, ancestorPath, lockState) {
  const prefix = lockOverlayKey(colId, ancestorPath);
  for (const key of [...lockState.unlockExceptions]) {
    if (key === prefix || key.startsWith(`${prefix}/`)) {
      lockState.unlockExceptions.delete(key);
    }
  }
}

function clearAncestorLocksUnder(colId, ancestorPath, lockState) {
  const prefix = lockOverlayKey(colId, ancestorPath);
  for (const key of [...lockState.ancestorLocks.keys()]) {
    if (key === prefix || key.startsWith(`${prefix}/`)) {
      lockState.ancestorLocks.delete(key);
    }
  }
}

export function setRowCellLocked(data, colId, isLocked) {
  if (!data || !colId) return;
  if (!data.cellLocked || typeof data.cellLocked !== "object") {
    data.cellLocked = {};
  }
  if (isLocked) {
    data.cellLocked[colId] = true;
  } else {
    delete data.cellLocked[colId];
    if (Object.keys(data.cellLocked).length === 0) {
      delete data.cellLocked;
    }
  }
}

function applyResolvedLockToData(data, colId, lockState, gridApi = null) {
  const locked = resolveEffectiveLock(
    colId,
    data?.dimensionPath,
    lockState,
    data,
    gridApi
  );
  setRowCellLocked(data, colId, locked);
  return locked;
}

function applyLockToDescendants(
  gridApi,
  anchorNode,
  ancestorPath,
  colId,
  lockState,
  pivotOrder
) {
  const nodes = collectDescendantNodes(gridApi, anchorNode, ancestorPath);
  for (const rowNode of nodes) {
    if (rowNode?.data) {
      ensureDimensionPath(
        rowNode.data,
        pivotOrder,
        rowNode.parent?.data?.dimensionPath || ancestorPath
      );
      applyResolvedLockToData(rowNode.data, colId, lockState, gridApi);
    }
  }
  return nodes;
}

function refreshLockCells(gridApi, rowNodes, colId) {
  if (!gridApi || !rowNodes?.length || !colId) return;
  gridApi.refreshCells({
    rowNodes,
    columns: [colId],
    force: true,
  });
  deferGridApiCall(gridApi, () => {
    if (typeof gridApi.redrawRows === "function") {
      gridApi.redrawRows({ rowNodes });
    }
  });
}

export function applyLockOverlayToRows(
  rows,
  lockState,
  editableColIds = [],
  rowContext = {}
) {
  if (!Array.isArray(rows)) return rows;
  const { pivotOrder = [], parentPath = [] } = rowContext;
  return rows.map((row) => {
    if (!row) return row;
    ensureDimensionPath(row, pivotOrder, parentPath);
    ensureRowUid(row);
    if (isGrandTotalRow(row)) return row;
    for (const colId of editableColIds) {
      applyResolvedLockToData(row, colId, lockState);
    }
    return row;
  });
}

function propagateLockStateToAncestors(
  gridApi,
  colId,
  childPath,
  isLocked,
  lockState
) {
  if (!gridApi || !colId || !Array.isArray(childPath) || childPath.length === 0) {
    return [];
  }

  const refreshed = [];
  for (let depth = childPath.length - 1; depth >= 0; depth -= 1) {
    const ancestorPath = childPath.slice(0, depth);
    const ancestorNode = findNodeByPath(gridApi, ancestorPath);
    if (!ancestorNode?.data) continue;

    if (isLocked) {
      const siblings = collectDirectChildren(gridApi, ancestorPath);
      if (siblings.length === 0) continue;
      const allLocked = siblings.every((n) =>
        resolveEffectiveLock(
          colId,
          n.data?.dimensionPath,
          lockState,
          n.data,
          gridApi
        )
      );
      if (allLocked) {
        applyResolvedLockToData(
          ancestorNode.data,
          colId,
          lockState,
          gridApi
        );
        refreshed.push(ancestorNode);
      } else {
        break;
      }
    } else {
      applyResolvedLockToData(ancestorNode.data, colId, lockState, gridApi);
      refreshed.push(ancestorNode);
    }
  }
  return refreshed;
}

export function createOrderManagementLockHandlers({
  gridApiRef,
  lockStateRef,
  editableColIdsRef,
  pivotOrderRef,
  onLockChanged,
}) {
  const lockCellCustomConditionFn = (instance) => {
    if (isLockExcludedRow(instance?.data, instance?.node)) {
      return false;
    }
    const colId =
      instance?.column?.colId ||
      instance?.colDef?.column_name ||
      instance?.colDef?.field;
    const gridApi = gridApiRef.current?.api ?? gridApiRef.current ?? null;
    const path = instance?.data?.dimensionPath || [];
    return resolveEffectiveLock(
      colId,
      path,
      lockStateRef.current,
      instance?.data,
      gridApi
    );
  };

  const lockCellApi = (rawProps, isLocked) => {
    const cellProps = rawProps?.cellData ?? rawProps;
    const gridApi = gridApiRef.current?.api ?? gridApiRef.current ?? null;
    const colId =
      cellProps?.column?.colId ||
      cellProps?.column?.column_name ||
      cellProps?.column?.field ||
      rawProps?.column?.column_name;
    const node = cellProps?.node;
    const data = node?.data;

    if (!colId || !data || !gridApi) {
      return;
    }

    if (isLockExcludedRow(data, node)) {
      return;
    }

    const pivotOrder = pivotOrderRef?.current || [];
    ensureDimensionPath(data, pivotOrder);
    const dimensionPath = data.dimensionPath || [];
    const selfKey = lockOverlayKey(colId, dimensionPath);
    const lockState = lockStateRef.current;

    onLockChanged?.();

    const nodesToRefresh = [node];

    if (isLocked) {
      lockState.ancestorLocks.set(selfKey, true);
      clearUnlockExceptionsUnder(colId, dimensionPath, lockState);
      applyResolvedLockToData(data, colId, lockState, gridApi);
      const descendants = applyLockToDescendants(
        gridApi,
        node,
        dimensionPath,
        colId,
        lockState,
        pivotOrder
      );
      nodesToRefresh.push(...descendants);
    } else if (
      hasStrictAncestorLock(colId, dimensionPath, lockState.ancestorLocks)
    ) {
      lockState.unlockExceptions.add(selfKey);
      applyResolvedLockToData(data, colId, lockState, gridApi);
    } else {
      lockState.ancestorLocks.delete(selfKey);
      clearUnlockExceptionsUnder(colId, dimensionPath, lockState);
      clearAncestorLocksUnder(colId, dimensionPath, lockState);
      applyResolvedLockToData(data, colId, lockState, gridApi);
      const descendants = applyLockToDescendants(
        gridApi,
        node,
        dimensionPath,
        colId,
        lockState,
        pivotOrder
      );
      nodesToRefresh.push(...descendants);
    }

    const ancestorNodes = propagateLockStateToAncestors(
      gridApi,
      colId,
      dimensionPath,
      isLocked,
      lockState
    );
    nodesToRefresh.push(...ancestorNodes);

    const uniqueNodes = [
      ...new Map(nodesToRefresh.map((n) => [n.id, n])).values(),
    ];
    refreshLockCells(gridApi, uniqueNodes, colId);
  };

  const stampRows = (rows, rowContext = {}) => {
    const lockState = lockStateRef.current;
    const colIds = editableColIdsRef.current;
    const pivotOrder = rowContext.pivotOrder || pivotOrderRef?.current || [];
    return applyLockOverlayToRows(rows, lockState, colIds, {
      ...rowContext,
      pivotOrder,
    });
  };

  return { lockCellApi, lockCellCustomConditionFn, stampRows };
}
