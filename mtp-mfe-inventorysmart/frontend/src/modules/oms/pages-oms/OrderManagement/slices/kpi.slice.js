import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  kpiConfig: {},
  kpiLoader: false,
};

const omsKpiSlice = createSlice({
  name: "oms/kpi",
  initialState,
  reducers: {
    setKpiConfig: (state, action) => {
      state.kpiConfig = action.payload;
    },
    setKpiLoader: (state, action) => {
      state.kpiLoader = action.payload;
    },
  },
});

const selectKpiRoot = (state) =>
  state.omsReducer?.orderManagementTableService?.kpi ?? initialState;

export const selectKpiConfig = (state) => selectKpiRoot(state).kpiConfig;
export const selectKpiLoader = (state) => selectKpiRoot(state).kpiLoader;

// Plansmart-compatible aliases
export const selectPlanKpiConfigV2 = selectKpiConfig;
export const selectShowHideMetricLoader = selectKpiLoader;
export const selectKpiConfigV2Loader = selectKpiLoader;

export const { setKpiConfig, setKpiLoader } = omsKpiSlice.actions;

export default omsKpiSlice.reducer;
