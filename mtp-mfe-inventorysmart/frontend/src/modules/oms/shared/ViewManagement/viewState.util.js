import { getToken } from "core/Utils/functions/helpers/authentication-helpers";
import { VIEW_MANAGEMENT_API_URLS } from "./viewManagement.constant";
import { config } from "config";

const viewStateStore = {
  currentViewState: null,
  currentViewId: null,
  currentFilters: null,
  fetchedStateSnapshot: null,
  columnStateRestorable: false,
  trackingPaused: false,
  expandedRowRoutes: {},
  viewJustSaved: false,
  persistenceEnabled: false,
  cachedAuthToken: null,
  beforeUnloadHandler: null
};

/**
 * Returns a shallow snapshot of internal persistence state for debugging.
 * Does not clone nested objects.
 */
export function getSnapshot() {
  return {
    currentViewState: viewStateStore.currentViewState,
    currentViewId: viewStateStore.currentViewId,
    currentFilters: viewStateStore.currentFilters,
    fetchedStateSnapshot: viewStateStore.fetchedStateSnapshot,
    columnStateRestorable: viewStateStore.columnStateRestorable,
    trackingPaused: viewStateStore.trackingPaused,
    expandedRowRoutes: { ...viewStateStore.expandedRowRoutes },
    viewJustSaved: viewStateStore.viewJustSaved,
    persistenceEnabled: viewStateStore.persistenceEnabled,
    hasBeforeUnloadHandler: Boolean(viewStateStore.beforeUnloadHandler)
  };
}

export function enableViewStatePersistence(enabled) {
  viewStateStore.persistenceEnabled = !!enabled;
}

export function isPersistenceEnabled() {
  return viewStateStore.persistenceEnabled;
}

export function setViewState(viewId, state, filters) {
  if (!viewStateStore.persistenceEnabled) return;

  viewStateStore.currentViewId = viewId || null;
  viewStateStore.currentFilters = filters || null;

  if (state && typeof state === "object") {
    viewStateStore.currentViewState = {
      expanded_rows: state.expanded_rows || {},
      expanded_columns: state.expanded_columns || {}
    };
    viewStateStore.expandedRowRoutes = state.expanded_row_routes || {};
    viewStateStore.columnStateRestorable =
      !!state.expanded_columns &&
      Object.keys(state.expanded_columns).length > 0;
  } else {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
    viewStateStore.expandedRowRoutes = {};
    viewStateStore.columnStateRestorable = false;
  }

  viewStateStore.fetchedStateSnapshot = JSON.stringify(viewStateStore.currentViewState);
  viewStateStore.trackingPaused = false;
}

export function getExpandedRows() {
  if (!viewStateStore.persistenceEnabled || !viewStateStore.currentViewState)
    return null;
  return viewStateStore.currentViewState.expanded_rows;
}

export function getExpandedRowRoutes() {
  if (!viewStateStore.persistenceEnabled) return {};
  return viewStateStore.expandedRowRoutes;
}

export function updateExpandedRow(flatKey, isExpanded, route) {
  if (!viewStateStore.persistenceEnabled || viewStateStore.trackingPaused) return;

  if (!viewStateStore.currentViewState) {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
  }

  if (isExpanded) {
    viewStateStore.currentViewState.expanded_rows[flatKey] = true;
    if (route) {
      viewStateStore.expandedRowRoutes[flatKey] = route;
    }
  } else {
    delete viewStateStore.currentViewState.expanded_rows[flatKey];
    delete viewStateStore.expandedRowRoutes[flatKey];

    const prefix = flatKey + "__";
    Object.keys(viewStateStore.currentViewState.expanded_rows).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete viewStateStore.currentViewState.expanded_rows[key];
        delete viewStateStore.expandedRowRoutes[key];
      }
    });
  }
}

/**
 * Replaces the entire `expanded_rows` and `expanded_row_routes` maps in one
 * shot. Used by the Expand-all flow so we don't issue per-node updates while
 * AG Grid is still expanding nodes.
 *
 * `routesByFlatKey` shape: { [flatKey]: route[] }.
 */
export function setExpandedRowsBulk(routesByFlatKey) {
  if (!viewStateStore.persistenceEnabled || viewStateStore.trackingPaused) return;

  if (!viewStateStore.currentViewState) {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
  }

  const safeRoutes =
    routesByFlatKey && typeof routesByFlatKey === "object"
      ? routesByFlatKey
      : {};

  const expandedRows = {};
  const expandedRoutes = {};

  Object.keys(safeRoutes).forEach((flatKey) => {
    expandedRows[flatKey] = true;
    if (Array.isArray(safeRoutes[flatKey])) {
      expandedRoutes[flatKey] = safeRoutes[flatKey];
    }
  });

  viewStateStore.currentViewState.expanded_rows = expandedRows;
  viewStateStore.expandedRowRoutes = expandedRoutes;
}

/**
 * Empties the persisted expanded-rows tracking. Used by the Collapse-all
 * flow.
 */
export function clearExpandedRows() {
  if (!viewStateStore.persistenceEnabled || viewStateStore.trackingPaused) return;

  if (!viewStateStore.currentViewState) {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
  }

  viewStateStore.currentViewState.expanded_rows = {};
  viewStateStore.expandedRowRoutes = {};
}

export function captureColumnState(tableRef) {
  if (!viewStateStore.persistenceEnabled || viewStateStore.trackingPaused) return;
  if (!tableRef?.current?.api) return;

  try {
    const columnState = tableRef.current.api.getColumnState();
    if (!columnState) return;

    const filteredState = columnState
      .filter((col) => !col.rowGroup)
      .map(({ colId, width, pinned, sort, sortIndex }) => ({
        colId,
        width,
        pinned,
        sort,
        sortIndex
      }));

    const columnGroupState = tableRef.current.api.getColumnGroupState() || [];

    if (!viewStateStore.currentViewState) {
      viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
    }

    viewStateStore.currentViewState.expanded_columns = {
      columns: filteredState,
      columnGroups: columnGroupState
    };
  } catch (e) {
    console.warn("captureColumnState failed:", e);
  }
}

export function restoreColumnStateFromMemory(tableRef) {
  if (!viewStateStore.persistenceEnabled || !viewStateStore.columnStateRestorable)
    return false;
  if (!tableRef?.current?.api || !viewStateStore.currentViewState?.expanded_columns)
    return false;

  try {
    const { columns, columnGroups } = viewStateStore.currentViewState.expanded_columns;

    if (columns && columns.length > 0) {
      tableRef.current.api.applyColumnState({
        state: columns,
        applyOrder: false
      });
    }

    if (columnGroups && columnGroups.length > 0) {
      columnGroups.forEach((group) => {
        tableRef.current.api.setColumnGroupState([
          { groupId: group.groupId, open: group.open }
        ]);
      });
    }

    return true;
  } catch (e) {
    console.warn("restoreColumnStateFromMemory failed:", e);
    return false;
  }
}

export function getExpandedColumns() {
  if (!viewStateStore.persistenceEnabled || !viewStateStore.currentViewState)
    return null;
  return viewStateStore.currentViewState.expanded_columns;
}

function buildSaveableState() {
  if (!viewStateStore.currentViewState) return null;
  return {
    expanded_rows: viewStateStore.currentViewState.expanded_rows || {},
    expanded_columns: viewStateStore.currentViewState.expanded_columns || {},
    expanded_row_routes: viewStateStore.expandedRowRoutes || {}
  };
}

function isStateDirty() {
  if (!viewStateStore.currentViewState || !viewStateStore.fetchedStateSnapshot)
    return false;
  return JSON.stringify(viewStateStore.currentViewState) !== viewStateStore.fetchedStateSnapshot;
}

export async function saveViewStateToBackend(dispatch) {
  if (!viewStateStore.persistenceEnabled || !viewStateStore.currentViewId) return;
  if (!isStateDirty()) return;

  const state = buildSaveableState();
  if (!state) return;

  const payload = {
    view_id: viewStateStore.currentViewId,
    state
  };

  if (viewStateStore.currentFilters) {
    payload.filters = viewStateStore.currentFilters;
  }

  try {
    const token =
      viewStateStore.cachedAuthToken || (await getToken());
    const url = `${config.baseUrlV3}${VIEW_MANAGEMENT_API_URLS.SAVE_VIEW_STATE_API_URL}`;

    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`
      },
      body: JSON.stringify(payload)
    });

    viewStateStore.fetchedStateSnapshot = JSON.stringify(viewStateStore.currentViewState);
  } catch (e) {
    console.warn("saveViewStateToBackend failed:", e);
  }
}

export function fireAndForgetSaveViewState() {
  if (!viewStateStore.persistenceEnabled || !viewStateStore.currentViewId) return;
  if (!isStateDirty()) return;

  const state = buildSaveableState();
  if (!state) return;

  const payload = {
    view_id: viewStateStore.currentViewId,
    state
  };

  if (viewStateStore.currentFilters) {
    payload.filters = viewStateStore.currentFilters;
  }

  try {
    const token = viewStateStore.cachedAuthToken;
    if (!token) return;

    const url = `${config.baseUrlV3}${VIEW_MANAGEMENT_API_URLS.SAVE_VIEW_STATE_API_URL}`;
    const body = JSON.stringify(payload);

    fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`
      },
      body,
      keepalive: true
    });
  } catch (e) {
    console.warn("fireAndForgetSaveViewState failed:", e);
  }
}

export function resetExpansionState() {
  if (!viewStateStore.persistenceEnabled) return;
  if (!viewStateStore.currentViewState) {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
  }
  viewStateStore.currentViewState.expanded_rows = {};
  viewStateStore.expandedRowRoutes = {};
  viewStateStore.trackingPaused = true;
}

export function resetExpansionStateWithoutPause() {
  if (!viewStateStore.persistenceEnabled) return;
  if (!viewStateStore.currentViewState) {
    viewStateStore.currentViewState = { expanded_rows: {}, expanded_columns: {} };
  }
  viewStateStore.currentViewState.expanded_rows = {};
  viewStateStore.expandedRowRoutes = {};
}

export function markViewAsSaved() {
  viewStateStore.viewJustSaved = true;
}

export function consumeViewSavedFlag() {
  if (viewStateStore.viewJustSaved) {
    viewStateStore.viewJustSaved = false;
    return true;
  }
  return false;
}

export function clearViewState() {
  viewStateStore.currentViewState = null;
  viewStateStore.currentViewId = null;
  viewStateStore.currentFilters = null;
  viewStateStore.fetchedStateSnapshot = null;
  viewStateStore.columnStateRestorable = false;
  viewStateStore.trackingPaused = false;
  viewStateStore.expandedRowRoutes = {};
  viewStateStore.viewJustSaved = false;
}

export function resumeTracking() {
  viewStateStore.trackingPaused = false;
}

function handleBeforeUnload() {
  fireAndForgetSaveViewState();
}

export function registerBeforeUnloadSave() {
  if (viewStateStore.beforeUnloadHandler) return;
  viewStateStore.beforeUnloadHandler = handleBeforeUnload;
  window.addEventListener("beforeunload", viewStateStore.beforeUnloadHandler);
}

export function unregisterBeforeUnloadSave() {
  if (viewStateStore.beforeUnloadHandler) {
    window.removeEventListener("beforeunload", viewStateStore.beforeUnloadHandler);
    viewStateStore.beforeUnloadHandler = null;
  }
}

export async function refreshCachedToken() {
  try {
    viewStateStore.cachedAuthToken = await getToken();
  } catch (e) {
    console.warn("refreshCachedToken failed:", e);
  }
}
