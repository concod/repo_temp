import { createSelector, createSlice } from "@reduxjs/toolkit";
import { get } from "lodash";

const commonDashboard = createSlice({
  name: "CommonDashboard",
  initialState: {
    dashboardPlanTableResp: {
      columnDef: [],
      rowData: []
    },
    dashboardPlanTableLoader: false,
    filterLoader: false,
    dashboardFilterConf: {},
    formFields: [],
    reports: [],
    isDownloadPlanVisible: false,
    statusFilter: {},
    currentSeason: "",
    downloadPlanLoader: false,
    actionButtonLoader: false,
    planListSourceToken: null,
    selectedRows: [],
    fieldsDefaultValues: {},
    callDropdownApi: false
  },
  reducers: {
    setFilterLoader: (state, action) => {
      state.filterLoader = action.payload;
    },
    setformFields: (state, action) => {
      state.formFields = action.payload;
    },
    setReportType: (state, action) => {
      state.reports = action.payload;
    },
    setDashboardPlanTableResp: (state, action) => {
      state.dashboardPlanTableResp = action.payload;
    },
    setDashboardPlanTableLoader: (state, action) => {
      state.dashboardPlanTableLoader = action.payload;
    },
    setDownloadPlanVisible: (state, action) => {
      state.isDownloadPlanVisible = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setCurrentSeason: (state, action) => {
      state.currentSeason = action.payload;
    },
    setDownloadPlanLoader: (state, action) => {
      state.downloadPlanLoader = action.payload;
    },
    setActionButtonLoader: (state, action) => {
      state.actionButtonLoader = action.payload;
    },
    setPlanListSourceToken: (state, action) => {
      state.planListSourceToken = action.payload;
    },

    setSelectedRows: (state, action) => {
      state.selectedRows = action.payload;
    },

    setFieldsDefaultValues: (state, action) => {
      state.fieldsDefaultValues = action.payload;
    },
    setCallDropdownApi: (state, action) => {
      state.callDropdownApi = action.payload;
    },
    resetDashboardTable: (state) => {
      state.dashboardPlanTableResp = {
        columnDef: [],
        rowData: []
      };
    }
  }
});

//actions
export const {
  setFilterLoader,
  setDashboardFilterConf,
  setformFields,
  setReportType,
  setDashboardPlanTableResp,
  setDashboardPlanTableLoader,
  setDownloadPlanVisible,
  setStatusFilter,
  setCurrentSeason,
  setDownloadPlanLoader,
  setActionButtonLoader,
  resetDashboardTable,
  setPlanListSourceToken,
  setSelectedRows,
  setFieldsDefaultValues,
  setCallDropdownApi
} = commonDashboard.actions;

// Selectors

export const dashboardSelector = createSelector(
  (state) => state,
  (state) => state?.plansmartReducer?.commonDashboard
);

export const formFieldsSelector = createSelector(
  dashboardSelector,
  (state) => state?.formFields
);
export const reportSelector = createSelector(
  dashboardSelector,
  (state) => state?.reports
);

export const filterOptionsSelector = createSelector(
  dashboardSelector,
  (state) => state?.formFields
);

export const filterLoaderSelector = createSelector(
  dashboardSelector,
  (state) => state?.filterLoader
);
export const dashboardPlanTableRespSelector = createSelector(
  dashboardSelector,
  (state) =>
    get(state, "dashboardPlanTableResp", { columnDef: [], rowData: [] })
);
export const dashboardPlanTableLoaderSelector = createSelector(
  dashboardSelector,
  (state) => get(state, "dashboardPlanTableLoader", false)
);

export const downloadPlanVisibleSelector = createSelector(
  dashboardSelector,
  (state) => get(state, "isDownloadPlanVisible", false)
);

export const downloadPlanLoaderSelector = createSelector(
  dashboardSelector,
  (state) => get(state, "downloadPlanLoader", false)
);

export const actionButtonLoaderSelector = createSelector(
  dashboardSelector,
  (state) => get(state, "actionButtonLoader", false)
);

export const dashboardPlanTableColDefSelector = createSelector(
  dashboardPlanTableRespSelector,
  (state) => get(state, "columnDef", [])
);

export const dashboardPlanTableRowDataSelector = createSelector(
  dashboardPlanTableRespSelector,
  (state) => get(state, "rowData", [])
);
export const statusFilterSelector = createSelector(
  dashboardSelector,
  (state) => state?.statusFilter
);
export const currentSeasonSelector = createSelector(
  dashboardSelector,
  (state) => state?.currentSeason
);

export const planListSourceTokenSelector = createSelector(
  dashboardSelector,
  (state) => state?.planListSourceToken
);

export const selectedRowsSelector = createSelector(
  dashboardSelector,
  (state) => state?.selectedRows
);

export const fieldsDefaultValuesSelector = createSelector(
  dashboardSelector,
  (state) => state?.fieldsDefaultValues
);

export const callDropdownApiSelector = createSelector(
  dashboardSelector,
  (state) => state?.callDropdownApi
);

export default commonDashboard.reducer;
