import { createSlice } from "@reduxjs/toolkit";

/**
 * Persists matrix → Product Details navigation context. The matrix view slice
 * resets on unmount, so selection / frequency / date range would otherwise be
 * lost when navigating to Product Details.
 */
const initialState = {
  isReady: false,
  selectedHierarchies: [],
  availableHierarchies: [],
  globalFilters: [],
  dynamicHierarchy: {},
  frequency: null,
  fiscalView: "week",
  selectedDateRange: null,
  fiscalCalendarRows: [],
  selectedFilters: [],
  selectedDcs: [],
  isPackEnabled: false,
  selectedRoqDateTab: null,
  isSelectAll: false,
  sourcePath: null,
  /** Body `is_v3` for CH schema: V3 → true, V4 → false. */
  isV3Schema: false,
};

const matrixHandoffSlice = createSlice({
  name: "matrixHandoff",
  initialState,
  reducers: {
    setMatrixHandoff(state, action) {
      const payload = action.payload || {};
      state.isReady = true;
      state.selectedHierarchies = Array.isArray(payload.selectedHierarchies)
        ? payload.selectedHierarchies
        : [];
      state.availableHierarchies = Array.isArray(payload.availableHierarchies)
        ? payload.availableHierarchies
        : [];
      state.globalFilters = Array.isArray(payload.globalFilters)
        ? payload.globalFilters
        : [];
      state.dynamicHierarchy =
        payload.dynamicHierarchy && typeof payload.dynamicHierarchy === "object"
          ? payload.dynamicHierarchy
          : {};
      state.frequency = payload.frequency ?? null;
      state.fiscalView = payload.fiscalView || "week";
      state.selectedDateRange = payload.selectedDateRange || null;
      state.fiscalCalendarRows = Array.isArray(payload.fiscalCalendarRows)
        ? payload.fiscalCalendarRows
        : [];
      state.selectedFilters = Array.isArray(payload.selectedFilters)
        ? payload.selectedFilters
        : [];
      state.selectedDcs = Array.isArray(payload.selectedDcs)
        ? payload.selectedDcs
        : [];
      state.isPackEnabled = Boolean(payload.isPackEnabled);
      state.selectedRoqDateTab = payload.selectedRoqDateTab || null;
      state.isSelectAll = Boolean(payload.isSelectAll);
      state.sourcePath = payload.sourcePath || null;
      state.isV3Schema =
        typeof payload.isV3Schema === "boolean" ? payload.isV3Schema : false;
    },
    clearMatrixHandoff() {
      return { ...initialState };
    },
  },
});

export const { setMatrixHandoff, clearMatrixHandoff } =
  matrixHandoffSlice.actions;

export const selectMatrixHandoff = (store) =>
  store?.omsReducer?.orderManagementTableService?.matrixHandoff || initialState;

export default matrixHandoffSlice.reducer;
