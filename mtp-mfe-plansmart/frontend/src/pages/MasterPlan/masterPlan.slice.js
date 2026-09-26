import { createSelector, createSlice } from "@reduxjs/toolkit";
import { get } from "lodash";

const masterPlan = createSlice({
  name: "masterPlan",
  initialState: {
    filterLoader: false,
    formFields: [],
    selectedFilters: [],
    selectedFiltersChips: [],

    historyColDefLoader: false,
    historyColDef: [],
    historyDataLoader: false,
    historyData: [],

    masterPlanTableLoader: false,
    masterPlanTableResp: {
      columnDef: [],
      rowData: [],
      masterPlanVarianceVersionList: []
    },

    masterPlanLockAccess: false,
    masterPlanLockLoader: false,
    masterPlanLockStatus: false,

    masterPlanApproveAccess: false,
    masterPlanApproveLoader: false,
    masterPlanApproveStatus: false,

    masterPlanShowHideMetricsData: [],
    showHideMetricLoader: false,

    masterPlanKpiConfig: {},
    masterPlanKpiConfigLoader: false
  },
  reducers: {
    setFilterLoader: (state, action) => {
      state.filterLoader = action.payload;
    },
    setformFields: (state, action) => {
      state.formFields = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setSelectedFiltersChips: (state, action) => {
      state.selectedFiltersChips = action.payload;
    },

    setMasterPlanHistoryColDefLoader: (state, action) => {
      state.historyColDefLoader = action.payload;
    },
    setMasterPlanHistoryColDef: (state, action) => {
      state.historyColDef = action.payload;
    },
    setMasterPlanHistoryDataLoader: (state, action) => {
      state.historyDataLoader = action.payload;
    },
    setMasterPlanHistoryData: (state, action) => {
      state.historyData = action.payload;
    },

    setMasterPlanTableLoader: (state, action) => {
      state.masterPlanTableLoader = action.payload;
    },
    setMasterPlanTableResp: (state, action) => {
      state.masterPlanTableResp = action.payload;
    },

    setMasterPlanLockAccess: (state, action) => {
      state.masterPlanLockAccess = action.payload;
    },
    setMasterPlanLockLoader: (state, action) => {
      state.masterPlanLockLoader = action.payload;
    },
    setMasterPlanLockStatus: (state, action) => {
      state.masterPlanLockStatus = action.payload;
    },

    setMasterPlanApproveAccess: (state, action) => {
      state.masterPlanApproveAccess = action.payload;
    },
    setMasterPlanApproveLoader: (state, action) => {
      state.masterPlanApproveLoader = action.payload;
    },
    setMasterPlanApproveStatus: (state, action) => {
      state.masterPlanApproveStatus = action.payload;
    },

    resetMasterPlan: (state) => {
      state.selectedFilters = [];
      state.selectedFiltersChips = [];
      state.masterPlanLockAccess = false;
      state.masterPlanApproveAccess = false;
      state.masterPlanTableResp = {
        columnDef: [],
        rowData: [],
        masterPlanVarianceVersionList: []
      };
    },

    setMasterShowHideMetricsData: (state, action) => {
      state.masterPlanShowHideMetricsData = action.payload;
    },
    setShowHideMetricLoader: (state, action) => {
      state.showHideMetricLoader = action.payload;
    },

    setMasterPlanKpiConfig: (state, action) => {
      state.masterPlanKpiConfig = action.payload;
    },
    setMasterPlanKpiConfigLoader: (state, action) => {
      state.masterPlanKpiConfigLoader = action.payload;
    }
  }
});

//actions
export const {
  resetMasterPlan,
  setformFields,
  setFilterLoader,
  setSelectedFilters,
  setSelectedFiltersChips,
  setMasterPlanHistoryColDefLoader,
  setMasterPlanHistoryColDef,
  setMasterPlanHistoryDataLoader,
  setMasterPlanHistoryData,
  setMasterPlanTableLoader,
  setMasterPlanTableResp,
  setMasterPlanApproveAccess,
  setMasterPlanApproveLoader,
  setMasterPlanApproveStatus,
  setMasterPlanLockAccess,
  setMasterPlanLockLoader,
  setMasterPlanLockStatus,
  setMasterShowHideMetricsData,
  setShowHideMetricLoader,
  setMasterPlanKpiConfig,
  setMasterPlanKpiConfigLoader
} = masterPlan.actions;

export const masterPlanSelector = createSelector(
  (state) => state,
  (state) => state?.plansmartReducer?.masterPlan
);

/**
 * Filter Selectors
 */
export const filterLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => state?.filterLoader
);

export const formFieldsSelector = createSelector(
  masterPlanSelector,
  (state) => state?.formFields
);

export const selectedFiltersSelector = createSelector(
  masterPlanSelector,
  (state) => state?.selectedFilters
);

export const selectedFiltersChipsSelector = createSelector(
  masterPlanSelector,
  (state) => state?.selectedFiltersChips
);

/**
 * History selectors
 */
export const masterPlanHistoryColDefLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyColDefLoader", false)
);

export const masterPlanHistoryColDefSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyColDef", [])
);

export const masterPlanHistoryDataLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyDataLoader", false)
);

export const masterPlanHistoryDataSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyData", [])
);

/**
 * MasterPlan table selectors
 */
export const masterPlanPlanTableLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanTableLoader", false)
);

export const masterPlanTableRespSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanTableResp", { columnDef: [], rowData: [] })
);

export const masterPlanTableColDefSelector = createSelector(
  masterPlanTableRespSelector,
  (state) => get(state, "columnDef", [])
);

export const masterPlanTableRowDataSelector = createSelector(
  masterPlanTableRespSelector,
  (state) => get(state, "rowData", [])
);

export const masterPlanVarianceVersionListSelector = createSelector(
  masterPlanTableRespSelector,
  (state) => get(state, "masterPlanVarianceVersionList", [])
);

/**
 * Master Plan Lock Selectors
 */
export const masterPlanLockAccessSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanLockAccess", false)
);

export const masterPlanLockLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanLockLoader", false)
);

export const masterPlanLockStatusSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanLockStatus", false)
);

/**
 * Master Plan Access Selectors
 */
export const masterPlanApproveAccessSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanApproveAccess", false)
);

export const masterPlanApproveLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanApproveLoader", false)
);

export const masterPlanApproveStatusSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanApproveStatus", false)
);

export const showHideMetricsDataSelector = createSelector(
  masterPlanSelector,
  (state) => state.masterPlanShowHideMetricsData
);

export const showHideMetricLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => state.showHideMetricLoader
);

export const masterPlanKpiConfigSelector = createSelector(
  masterPlanSelector,
  (state) => state?.masterPlanKpiConfig
);

export const masterPlanKpiConfigLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanKpiConfigLoader", false)
);

export default masterPlan.reducer;
