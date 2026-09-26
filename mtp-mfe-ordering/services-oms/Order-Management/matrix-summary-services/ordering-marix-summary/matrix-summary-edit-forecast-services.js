import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  default: {},
  IA: {},
  adjusted: {},
  scenario1: {},
  scenario2: {},
  historicLastYear: {},
};

export const matrixSummaryEditForecastService = createSlice({
  name: "matrixSummaryEditForecastService",
  initialState,
  reducers: {
    setComparisonData: (state, action) => {
      state[action.payload.key] = action.payload.value || {};
    },
    setDefaultData: (state, action) => {
      state.default = action.payload;
    },
    setHistoricLastYearData: (state, action) => {
      state.historicLastYear = action.payload;
    },
    setResetForecastData: (state) => {
      state.default = {};
      state.IA = {};
      state.adjusted = {};
      state.scenario1 = {};
      state.scenario2 = {};
      state.historicLastYear = {};
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setComparisonData,
  setDefaultData,
  setResetForecastData,
  setHistoricLastYearData,
} = matrixSummaryEditForecastService.actions;

export default matrixSummaryEditForecastService.reducer;
