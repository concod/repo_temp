import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  pivotPayload: {
    pivot_rows: [],
    pivot_columns: [],
    kpi_wise_rows: true,
    kpis: [],
    pivot_filters: [],
  },
  isPivotPanelOpen: false,
  isPivotFilterOpen: false,
  pivotDescriptionData: {},
  pivotDescriptionDataLoader: false,
  pivotDescriptionCancelToken: null,
  pivotHideAttributes: {},
  pivotAttributeValue: [],
  persistentPivotHideAttributes: {},
  addedVersionDetails: [],
  calculatedFieldsSelection: {
    variance: [],
    contribution: [],
  },
  variance: [],
  kpiMeasures: [],
  selectedIds: [],
  tempViewDetails: {},
  pivotGroupKeys: [],
};

const omsPivotSlice = createSlice({
  name: "oms/pivot",
  initialState,
  reducers: {
    setIsPivotPanelOpen: (state, action) => { state.isPivotPanelOpen = action.payload; },
    setIsPivotFilterOpen: (state, action) => { state.isPivotFilterOpen = action.payload; },
    setPivotDescriptionData: (state, action) => { state.pivotDescriptionData = action.payload; },
    setPivotDescriptionDataLoader: (state, action) => { state.pivotDescriptionDataLoader = action.payload; },
    setPivotDescriptionCancelToken: (state, action) => { state.pivotDescriptionCancelToken = action.payload; },
    setPivotHideAttributes: (state, action) => { state.pivotHideAttributes = action.payload; },
    setPivotAttributeValue: (state, action) => { state.pivotAttributeValue = action.payload; },
    setPersistentPivotHideAttributes: (state, action) => { state.persistentPivotHideAttributes = action.payload; },
    setPivotPayload: (state, action) => { state.pivotPayload = action.payload; },
    setAddedVersionDetails: (state, action) => { state.addedVersionDetails = action.payload; },
    setCalculatedFieldsSelection: (state, action) => { state.calculatedFieldsSelection = action.payload; },
    setVariance: (state, action) => { state.variance = action.payload; },
    setKpiMeasures: (state, action) => { state.kpiMeasures = action.payload; },
    setSelectedIds: (state, action) => { state.selectedIds = action.payload; },
    setTempViewDetails: (state, action) => { state.tempViewDetails = action.payload; },
    setPivotGroupKeys: (state, action) => { state.pivotGroupKeys = action.payload; },
  },
});

const selectPivotRoot = (state) =>
  state.omsReducer?.orderManagementTableService?.pivot ?? initialState;

export const selectIsPivotPanelOpen = (state) => selectPivotRoot(state).isPivotPanelOpen;
export const selectIsPivotFilterOpen = (state) => selectPivotRoot(state).isPivotFilterOpen;
export const selectPivotDescriptionData = (state) => selectPivotRoot(state).pivotDescriptionData;
export const selectPivotDescriptionDataLoader = (state) => selectPivotRoot(state).pivotDescriptionDataLoader;
export const selectPivotDescriptionCancelToken = (state) => selectPivotRoot(state).pivotDescriptionCancelToken;
export const selectPivotPayload = (state) => selectPivotRoot(state).pivotPayload;
export const selectPivotGroupKeys = (state) => selectPivotRoot(state).pivotGroupKeys;
export const selectPivotHideAttributes = (state) => selectPivotRoot(state).pivotHideAttributes;
export const selectPivotAttributeValue = (state) => selectPivotRoot(state).pivotAttributeValue;
export const selectPersistentPivotHideAttributes = (state) => selectPivotRoot(state).persistentPivotHideAttributes;
export const selectAddedVersionDetails = (state) => selectPivotRoot(state).addedVersionDetails;
export const selectCalculatedFieldsSelection = (state) => selectPivotRoot(state).calculatedFieldsSelection;
export const selectVariance = (state) => selectPivotRoot(state).variance;
export const selectKpiMeasures = (state) => selectPivotRoot(state).kpiMeasures;
export const selectSelectedIds = (state) => selectPivotRoot(state).selectedIds;
export const selectTempViewDetails = (state) => selectPivotRoot(state).tempViewDetails;

export const {
  setIsPivotPanelOpen,
  setIsPivotFilterOpen,
  setPivotDescriptionData,
  setPivotDescriptionDataLoader,
  setPivotDescriptionCancelToken,
  setPivotHideAttributes,
  setPivotAttributeValue,
  setPersistentPivotHideAttributes,
  setPivotPayload,
  setAddedVersionDetails,
  setCalculatedFieldsSelection,
  setVariance,
  setKpiMeasures,
  setSelectedIds,
  setTempViewDetails,
  setPivotGroupKeys,
} = omsPivotSlice.actions;

export default omsPivotSlice.reducer;
