import { createSlice } from "@reduxjs/toolkit";

const EMPTY_OBJ = Object.freeze({});
const EMPTY_ARR = Object.freeze([]);

const initialState = {
  orderManagementResp: {},
  orderManagementLoader: false,
  initialOrderManagementResp: {},
  trackChanges: [],
  updateLoader: false,
  showHideMetricsData: [],
  isAllColumnCollapse: false,
  expandAllInProgress: false,
};

const omsGridSlice = createSlice({
  name: "oms/grid",
  initialState,
  reducers: {
    setOrderManagementResp: (state, action) => {
      state.orderManagementResp = action.payload;
      state.initialOrderManagementResp = action.payload;
    },
    setOrderManagementRowData: (state, action) => {
      // Row data is now managed entirely by the SSRM datasource (getRows).
      // This reducer is kept as a no-op for backward compatibility only.
      void action;
    },
    resetOrderManagementResp: (state) => {
      state.orderManagementResp = {};
      state.initialOrderManagementResp = {};
    },
    setOrderManagementLoader: (state, action) => {
      state.orderManagementLoader = action.payload;
    },
    setTrackChanges: (state, action) => {
      state.trackChanges = action.payload;
    },
    resetTrackChanges: (state) => {
      state.trackChanges = [];
    },
    setUpdateLoader: (state, action) => {
      state.updateLoader = action.payload;
    },
    setShowHideMetricsData: (state, action) => {
      state.showHideMetricsData = action.payload;
    },
    setIsAllColumnCollapse: (state, action) => {
      state.isAllColumnCollapse = action.payload;
    },
    setExpandAllInProgress: (state, action) => {
      state.expandAllInProgress = action.payload;
    },
  },
});

const selectGridRoot = (state) =>
  state.omsReducer?.orderManagementTableService?.grid ?? initialState;

export const selectOrderManagementResp = (state) => selectGridRoot(state).orderManagementResp ?? EMPTY_OBJ;
// column_config is the Plansmart-format processed column list (raw, pre-agGridColumnFormatterV32).
export const selectOrderManagementColDef = (state) => selectGridRoot(state).orderManagementResp?.column_config ?? EMPTY_ARR;
export const selectOrderManagementRowData = (state) => selectGridRoot(state).orderManagementResp?.data?.groups?.[0]?.rows ?? EMPTY_ARR;
export const selectOrderManagementLoader = (state) => selectGridRoot(state).orderManagementLoader;
export const selectGroupTotals = (state) => selectGridRoot(state).orderManagementResp?.group_totals ?? EMPTY_OBJ;
export const selectRowDimensions = (state) => selectGridRoot(state).orderManagementResp?.rowDimensions ?? EMPTY_ARR;
export const selectColumnDimensions = (state) => selectGridRoot(state).orderManagementResp?.columnDimensions ?? EMPTY_ARR;
export const selectIsKPIWiseRows = (state) => selectGridRoot(state).orderManagementResp?.isKPIWiseRows ?? false;
export const selectExpandAllInProgress = (state) => selectGridRoot(state).expandAllInProgress;
export const selectVarianceVersionMapping = (state) => selectGridRoot(state).orderManagementResp?.variance_version_mapping ?? EMPTY_OBJ;
export const selectVarianceList = (state) => selectGridRoot(state).orderManagementResp?.variance_list ?? EMPTY_ARR;
export const selectShowHideMetricsData = (state) => selectGridRoot(state).showHideMetricsData ?? EMPTY_ARR;
export const selectIsAllColumnCollapse = (state) => selectGridRoot(state).isAllColumnCollapse ?? false;

export const {
  setOrderManagementResp,
  setOrderManagementRowData,
  resetOrderManagementResp,
  setOrderManagementLoader,
  setTrackChanges,
  resetTrackChanges,
  setUpdateLoader,
  setShowHideMetricsData,
  setIsAllColumnCollapse,
  setExpandAllInProgress,
} = omsGridSlice.actions;

export default omsGridSlice.reducer;
