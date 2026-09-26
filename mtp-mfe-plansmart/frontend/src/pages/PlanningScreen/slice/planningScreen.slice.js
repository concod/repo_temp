import { createSelector, createSlice } from "@reduxjs/toolkit";
import { cloneDeep, get } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { userRoleManagementServiceSelector } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { VIEW_SETTINGS } from "./../components/TableSettingsPopover/tableSettingsPopover.constant";
import undoable, { ActionCreators, includeAction } from "redux-undo";

const initialState = {
  viewSettings: [],
  userPrefViewSettingsPayload: [],
  budgetTableResp: {},
  budgetTableLoader: false,
  cellLoaderStatus: false,
  planDetails: {},
  planDetailsLoader: false,
  editMode: false,
  dashboardLoader: false,
  planKpiConfig: {},
  planKpiConfigV2: {},
  isRecalculatePanelOpen: false,
  recalculateTableLoader: false,
  recalculateTableConfig: [],
  trackBudgetTableChanges: [],
  updatePlanLoader: false,
  isDownloadPlanVisible: false,
  showHideMetricsData: [],
  matchWithKpiLoader: false,
  matchWithKpiList: {},
  matchWithKpiData: [],
  kpiConfigLoader: false,
  kpiConfigV2Loader: false,
  lockedCells: {},
  savePlanNameLoader: false,
  savePlanLoader: false,
  planActualizedWeeks: {},
  planActualizedWeeksLoader: false,
  isMatchWith: false,

  //Add Version state
  versionColDefLoader: false,
  versionColDefData: [],
  versionTableLoader: false,
  versionTableData: [],
  showHideMetricLoader: false,
  formulaLoader: false,
  formula: {},
  listCompareLoader: false,
  selectedRows: [],
  versionListData: [],
  prevSelectedPlans: [],
  isVersionChipVisible: false,

  // Reset Budget table
  initialBudgetTableResp: {},
  updateEohBohSyncLoader: false,
  syncEohBohLoader: false,
  openEohBohConfirmModal: false,
  checkBohSyncRequiredLoader: false,
  isBohSyncRequired: false,
  matchWithKpiUpdateLoader: false,

  //W2D
  deliveryData: {},
  writtenDeliveryLoader: false,

  isUpdatePlanEnabled: false,
  calculationUUID: null,
  isEditActionsEnabled: false,
  isAllColumnCollapse: false,
  isWrittenKpiEdited: false,
  isSnackDispatched: false
};

const planningScreen = createSlice({
  name: "planningScreen",
  initialState: initialState,
  reducers: {
    setBudgetTableResp: (state, action) => {
      state.budgetTableResp = action.payload;
      state.initialBudgetTableResp = action.payload;
    },
    setBudgetTableRowData: (state, action) => {
      state.budgetTableResp = {
        ...state.budgetTableResp,
        data_row: action.payload
      };
      state.initialBudgetTableResp = {
        ...state.budgetTableResp,
        data_row: action.payload
      };
    },
    resetBudgetTableResp: (state) => {
      state.budgetTableResp = {};
      state.initialBudgetTableResp = {};
    },
    setBudgetTableLoader: (state, action) => {
      state.budgetTableLoader = action.payload;
    },
    setCellLoaderStatus: (state, action) => {
      state.cellLoaderStatus = action.payload;
    },
    setPlanDetails: (state, action) => {
      state.planDetails = action.payload;
    },
    setPlanDetailsLoader: (state, action) => {
      state.planDetailsLoader = action.payload;
    },
    setPlanningScreenEditMode: (state, action) => {
      state.editMode = action.payload;
    },
    setPlanKpiConfig: (state, action) => {
      state.planKpiConfig = action.payload;
    },
    setPlanKpiConfigV2: (state, action) => {
      state.planKpiConfigV2 = action.payload;
    },
    setIsRecalculatePanelOpen: (state, action) => {
      state.isRecalculatePanelOpen = action.payload;
    },
    setIsDownloadPlanVisible: (state, action) => {
      state.isDownloadPlanVisible = action.payload;
    },
    setRecalculateTableLoader: (state, action) => {
      state.recalculateTableLoader = action.payload;
    },
    setRecalculateTableConfig: (state, action) => {
      state.recalculateTableConfig = action.payload;
    },
    setBudgeTableRowData: (state, action) => {
      state.budgetTableResp = {
        ...state.budgetTableResp,
        data_row: action.payload
      };
    },
    setTrackBudgetTableChanges: (state, action) => {
      state.trackBudgetTableChanges = action.payload;
    },
    resetTrackBudgetTableChanges: (state) => {
      state.trackBudgetTableChanges = [];
    },
    setUpdatePlanLoader: (state, action) => {
      state.updatePlanLoader = action.payload;
    },
    setBudgetShowHideMetricsData: (state, action) => {
      state.showHideMetricsData = action.payload;
    },
    setMatchWithKpiLoader: (state, action) => {
      state.matchWithKpiLoader = action.payload;
    },
    setMatchWithKpiList: (state, action) => {
      state.matchWithKpiList = action.payload;
    },
    setMatchWithKpiData: (state, action) => {
      state.matchWithKpiData = action.payload;
    },
    setPlanKpiConfigLoader: (state, action) => {
      state.kpiConfigLoader = action.payload;
    },
    setPlanKpiConfigV2Loader: (state, action) => {
      state.kpiConfigV2Loader = action.payload;
    },
    setLockedCells: (state, action) => {
      state.lockedCells = action.payload;
    },
    resetLockedCells: (state) => {
      state.lockedCells = {};
    },
    setPlanName: (state, action) => {
      state.planDetails.plan_display_name = action.payload;
    },
    setSavePlanNameLoader: (state, action) => {
      state.savePlanNameLoader = action.payload;
    },
    setSavePlanLoader: (state, action) => {
      state.savePlanLoader = action.payload;
    },
    setTableViewSetting: (state, action) => {
      state.viewSettings = action.payload;
    },

    //Add version reducers
    setVersionColDefLoader: (state, action) => {
      state.versionColDefLoader = action.payload;
    },
    setVersionColDefData: (state, action) => {
      state.versionColDefData = action.payload;
    },
    setVersionTableLoader: (state, action) => {
      state.versionTableLoader = action.payload;
    },
    setVersionTableData: (state, action) => {
      state.versionTableData = action.payload;
    },
    setIsVersionChipVisible: (state, action) => {
      state.isVersionChipVisible = action.payload;
    },
    setShowHideMetricLoader: (state, action) => {
      state.showHideMetricLoader = action.payload;
    },
    setFormulaLoader: (state, action) => {
      state.formulaLoader = action.payload;
    },
    setFormula: (state, action) => {
      state.formula = action.payload;
    },
    setUpdateEohBohSyncLoader: (state, action) => {
      state.updateEohBohSyncLoader = action.payload;
    },
    setEohBohSyncValInPlanDetails: (state, action) => {
      state.planDetails = {
        ...state.planDetails,
        eoh_boh_sync: action.payload
      };
    },
    setListCompareLoader: (state, action) => {
      state.listCompareLoader = action.payload;
    },
    setSelectedRows: (state, action) => {
      state.selectedRows = action.payload;
    },
    setVersionListData: (state, action) => {
      state.versionListData = action.payload;
    },
    setPrevSelectedPlans: (state, action) => {
      state.prevSelectedPlans = action.payload;
    },
    setSyncEohBohLoader: (state, action) => {
      state.syncEohBohLoader = action.payload;
    },
    setOpenEohBohConfirmModal: (state, action) => {
      state.openEohBohConfirmModal = action.payload;
    },
    setCheckBohSyncRequiredLoader: (state, action) => {
      state.checkBohSyncRequiredLoader = action.payload;
    },
    setIsBohSyncRequired: (state, action) => {
      state.isBohSyncRequired = action.payload;
    },
    setMatchWithKpiUpdateLoader: (state, action) => {
      state.matchWithKpiUpdateLoader = action.payload;
    },
    resetPlanningScreen: (state) => {
      state = initialState;
    },

    setDeliveryData: (state, action) => {
      state.deliveryData = action.payload;
    },

    setUserPrefViewSettingsPayload: (state, action) => {
      state.userPrefViewSettingsPayload = action.payload;
    },
    setWrittenDeliveryLoader: (state, action) => {
      state.writtenDeliveryLoader = action.payload;
    },
    setPlanActualizedWeeks: (state, action) => {
      state.planActualizedWeeks = action.payload;
    },
    setPlanActualizedWeeksLoader: (state, action) => {
      state.planActualizedWeeksLoader = action.payload;
    },

    setIsUpdatePlanEnabled: (state, action) => {
      state.isUpdatePlanEnabled = action;
    },
    setIsEditActionsEnabled: (state, action) => {
      state.isEditActionsEnabled = action.payload;
    },
    setCalculationUUID: (state, action) => {
      state.calculationUUID = action.payload;
    },
    setIsMatchWith: (state, action) => {
      state.isMatchWith = action.payload;
    },
    setIsAllColumnCollapse: (state, action) => {
      state.isAllColumnCollapse = action.payload;
    },
    setIsWrittenKpiEdited: (state, action) => {
      state.isWrittenKpiEdited = action.payload;
    },
    setIsSnackDispatched: (state, action) => {
      state.isSnackDispatched = action.payload;
    }
  }
});

//actions
export const {
  setBudgetTableResp,
  setBudgetTableRowData,
  setBudgetTableLoader,
  setCellLoaderStatus,
  setPlanDetails,
  setPlanDetailsLoader,
  setPlanningScreenEditMode,
  setPlanKpiConfig,
  setPlanKpiConfigV2,
  setIsRecalculatePanelOpen,
  setIsDownloadPlanVisible,
  setRecalculateTableLoader,
  setRecalculateTableConfig,
  setBudgeTableRowData,
  setTrackBudgetTableChanges,
  setUpdatePlanLoader,
  setBudgetShowHideMetricsData,
  setTableViewSetting,
  setMatchWithKpiLoader,
  setMatchWithKpiList,
  setMatchWithKpiData,
  setPlanKpiConfigLoader,
  setPlanKpiConfigV2Loader,
  setLockedCells,
  resetLockedCells,
  setPlanName,
  setSavePlanNameLoader,
  setVersionColDefLoader,
  setVersionColDefData,
  setVersionTableLoader,
  setVersionTableData,
  setShowHideMetricLoader,
  setFormulaLoader,
  setFormula,
  setSavePlanLoader,
  setUpdateEohBohSyncLoader,
  setEohBohSyncValInPlanDetails,
  setListCompareLoader,
  setSelectedRows,
  setVersionListData,
  setPrevSelectedPlans,
  setSyncEohBohLoader,
  setOpenEohBohConfirmModal,
  setCheckBohSyncRequiredLoader,
  setIsBohSyncRequired,
  setMatchWithKpiUpdateLoader,
  resetBudgetTableResp,
  resetTrackBudgetTableChanges,
  resetPlanningScreen,
  setDeliveryData,
  setUserPrefViewSettingsPayload,
  setIsVersionChipVisible,
  setWrittenDeliveryLoader,
  setPlanActualizedWeeks,
  setPlanActualizedWeeksLoader,
  setIsUpdatePlanEnabled,
  setIsEditActionsEnabled,
  setCalculationUUID,
  setIsMatchWith,
  setIsAllColumnCollapse,
  setIsWrittenKpiEdited,
  setIsSnackDispatched
} = planningScreen.actions;

// Selectors
export const planningScreenSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.planningScreen.present,
  (state) => state.plansmartReducer.planningScreen.present
);

export const budgetTableRespSelector = createSelector(
  planningScreenSelector,
  (state) => state?.budgetTableResp || {},
  (state) => state?.budgetTableResp || {}
);

export const budgetTableRespColDefSelector = createSelector(
  budgetTableRespSelector,
  (tableData) => get(tableData, "column_config", [])
);

export const budgetTableColDefSelector = createSelector(
  budgetTableRespColDefSelector,
  (colDef) => cloneDeep(colDef)
);

export const budgetTableMockColDefSelector = createSelector(
  budgetTableRespSelector,
  (state) => {
    const columnDef = get(state, "column_config", []);
    return agGridColumnFormatter(cloneDeep(columnDef));
  }
);

export const budgetTableRowDataSelector = createSelector(
  budgetTableRespSelector,
  (state) => get(state, "data_row", [])
);

export const valueByColumnValueKeySelector = createSelector(
  budgetTableRespSelector,
  (state) => get(state, "value_by_column_value_key", [])
);

export const planDetailsSelector = createSelector(
  planningScreenSelector,
  (state) => get(state, "planDetails", {})
);

export const productHierarchySelector = createSelector(
  userRoleManagementServiceSelector,
  (state) => get(state, "planningLevelHierarchy", [])
);

export const budgetTableLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.budgetTableLoader
);

export const cellLoaderStatusSelector = createSelector(
  planningScreenSelector,
  (state) => state.cellLoaderStatus
);

export const planDetailsLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.planDetailsLoader
);

export const planningScreenEditModeSelector = createSelector(
  planningScreenSelector,
  (state) => state.editMode
);
export const planKpiConfigSelector = createSelector(
  planningScreenSelector,
  (state) => state.planKpiConfig
);
export const planKpiConfigV2Selector = createSelector(
  planningScreenSelector,
  (state) => state.planKpiConfigV2
);
export const isRecalculatePanelOpenSelector = createSelector(
  planningScreenSelector,
  (state) => state.isRecalculatePanelOpen
);
export const downloadPlanVisibleSelector = createSelector(
  planningScreenSelector,
  (state) => state.isDownloadPlanVisible
);
export const recalculateTableLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.recalculateTableLoader
);
export const recalculateTableConfigSelector = createSelector(
  planningScreenSelector,
  (state) => state.recalculateTableConfig
);

export const trackBudgetTableChangesSelector = createSelector(
  planningScreenSelector,
  (state) => state.trackBudgetTableChanges
);

export const updatePlanLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.updatePlanLoader
);

export const showHideMetricsDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.showHideMetricsData
);

export const matchWithKpiLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.matchWithKpiLoader
);

export const setMatchWithKpiListSelector = createSelector(
  planningScreenSelector,
  (state) => state.matchWithKpiList
);

export const setMatchWithKpiDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.matchWithKpiData
);

export const kpiConfigLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.kpiConfigLoader
);
export const kpiConfigV2LoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.kpiConfigV2Loader
);

export const lockedCellsSelector = createSelector(
  planningScreenSelector,
  (state) => state.lockedCells
);

export const savePlanNameLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.savePlanNameLoader
);
export const savePlanLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.savePlanLoader
);

//Add version Selectors
export const versionColDefLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.versionColDefLoader
);
export const versionColDefDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.versionColDefData
);
export const versionTableLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.versionTableLoader
);
export const versionTableDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.versionTableData
);

export const rowDataInxMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => get(state, "row_data_inx_mapping", {})
);

export const currentVersionSelector = createSelector(
  budgetTableRespSelector,
  (state) => get(state, "version_variance_config.current_version", "")
);

export const varianceVersionMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state?.version_variance_config?.variance_version_mapping || {}
);

export const varianceListSelector = createSelector(
  varianceVersionMappingSelector,
  (varianceMapping) => Object.keys(varianceMapping)
);

export const showHideMetricLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.showHideMetricLoader
);

export const timeRollUpMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.timeline_roll_up_mapping || {}
);

export const timeRollDownMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.timelien_roll_down_mapping || {}
);

export const channelRollUpMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.channel_roll_up_mapping || {}
);

export const channelRollDownMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.channel_roll_down_mapping || {}
);

export const previousTimelineMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.previous_timeline_mapping || {}
);

export const viewSettingsSelector = createSelector(
  planningScreenSelector,
  (state) => state?.viewSettings || []
);

export const userPrefViewSettingsPayloadSelector = createSelector(
  planningScreenSelector,
  (state) => state?.userPrefViewSettingsPayload || []
);

export const formulaLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.formulaLoader
);

export const formulaSelector = createSelector(
  planningScreenSelector,
  (state) => state.formula
);

export const initialBudgetTableRespSelector = createSelector(
  planningScreenSelector,
  (state) => state.initialBudgetTableResp
);

export const initialBudgetTableRowDataSelector = createSelector(
  initialBudgetTableRespSelector,
  (state) => state?.data_row || []
);

export const eohBohSyncSelector = createSelector(
  planDetailsSelector,
  (state) => state.eoh_boh_sync
);

export const updateEohBohSyncLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.updateEohBohSyncLoader
);

export const listCompareLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.listCompareLoader
);

export const selectedRowsSelector = createSelector(
  planningScreenSelector,
  (state) => state.selectedRows
);

export const versionListDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.versionListData
);

export const prevSelectedPlansSelector = createSelector(
  planningScreenSelector,
  (state) => state.prevSelectedPlans
);

export const versionDataMergeSelector = createSelector(
  budgetTableRowDataSelector,
  versionListDataSelector,
  (budgetTableRowData, versionListData) => {
    const mergedData = budgetTableRowData.concat(
      ...Object.values(versionListData).flatMap(
        (addedVersion) => addedVersion.rowData
      )
    );

    // return mergedData.sort(
    //   (first, second) => parseInt(first.order, 16) - parseInt(second.order, 16)
    // );
    return mergedData;
  }
);

export const isVersionChipVisibleSelector = createSelector(
  planningScreenSelector,
  (state) => state.isVersionChipVisible
);

export const productContributionMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.product_contribution_mapping || {}
);

export const channelContributionMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.channel_contribution_mapping || {}
);

export const productContributionParentMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.product_contribution_parent_mapping || {}
);

export const channelContributionParentMappingSelector = createSelector(
  budgetTableRespSelector,
  (state) => state.channel_contribution_parent_mapping || {}
);

export const syncEohBohLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.syncEohBohLoader
);

export const openEohBohConfirmModalSelector = createSelector(
  planningScreenSelector,
  (state) => state.openEohBohConfirmModal
);

export const checkBohSyncRequiredLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.checkBohSyncRequiredLoader
);

export const isBohSyncRequiredSelector = createSelector(
  planningScreenSelector,
  (state) => state.isBohSyncRequired
);

export const planCodeSelector = createSelector(
  planningScreenSelector,
  (state) => state.planDetails.plan_code
);

export const planStatusSelector = createSelector(
  planningScreenSelector,
  (state) => state.planDetails.status
);

export const matchWithKpiUpdateLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.matchWithKpiUpdateLoader
);

export const deliveryDataSelector = createSelector(
  planningScreenSelector,
  (state) => state.deliveryData
);

export const writtenDeliveryLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.writtenDeliveryLoader
);
export const planActualizedWeeksSelector = createSelector(
  planningScreenSelector,
  (state) => state.planActualizedWeeks
);
export const planActualizedWeeksLoaderSelector = createSelector(
  planningScreenSelector,
  (state) => state.planActualizedWeeksLoader
);

export const isUpdatePlanEnabledSelector = createSelector(
  planningScreenSelector,
  (state) => state.isUpdatePlanEnabled
);

export const isEditActionsEnabledSelector = createSelector(
  planningScreenSelector,
  (state) => state.isEditActionsEnabled
);

export const calculationUUIDSelector = createSelector(
  planningScreenSelector,
  (state) => state.calculationUUID
);

export const isMatchWithSelector = createSelector(
  planningScreenSelector,
  (state) => state.isMatchWith
);

export const isAllColumnCollapseSelector = createSelector(
  planningScreenSelector,
  (state) => state.isAllColumnCollapse
);

export const isWrittenKpiEditedSelector = createSelector(
  planningScreenSelector,
  (state) => state.isWrittenKpiEdited
);

export const isSnackDispatchedSelector = createSelector(
  planningScreenSelector,
  (state) => state.isSnackDispatched
);

const undoableFilter = includeAction([
  planningScreen.actions.setPlanDetailsLoader.type,
  planningScreen.actions.setBudgeTableRowData.type,
  planningScreen.actions.setTrackBudgetTableChanges.type,
  planningScreen.actions.setLockedCells.type,
  planningScreen.actions.setFormulaLoader.type,
  planningScreen.actions.setFormula.type,
  planningScreen.actions.setBudgetTableLoader.type,
  planningScreen.actions.setCellLoaderStatus.type,
  planningScreen.actions.setBudgetShowHideMetricsData.type,
  planningScreen.actions.setShowHideMetricLoader.type
]);

export const planningScreenReducer = undoable(planningScreen.reducer, {
  filter: undoableFilter
});

export const undoAction = ActionCreators.undo;

// reducer
export default planningScreen.reducer;
