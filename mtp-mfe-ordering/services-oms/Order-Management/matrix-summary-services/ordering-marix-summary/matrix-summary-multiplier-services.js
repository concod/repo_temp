import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  IA: {},
  adjusted: {},
  scenario1: {},
  scenario2: {},
  historicalActual: [],
  historicalColumns: [],
  forecastColumns: [],
  actuals: {},
  actualsDiscount: {},
  historicactualsDiscount: {},
  multiplierLoaderCount: 0,
  allChartData: {},
  historicAllChartData: {},
  saveOperationPerformedCounter: 0,
  counterToTriggerForecastCustomHook: 0,
  disableSaveButton: false,
};

export const matrixSummaryMultiplierService = createSlice({
  name: "matrixSummaryMultiplierService",
  initialState,
  reducers: {
    setMultiplierLoaderCount: (state, action) => {
      state.multiplierLoaderCount =
        state.multiplierLoaderCount + action.payload;
    },
    setSaveOperationPerformedCounter: (state, action) => {
      state.saveOperationPerformedCounter =
        state.saveOperationPerformedCounter + 1;
    },
    setCounterToTriggerForecastCustomHook: (state, action) => {
      state.counterToTriggerForecastCustomHook =
        state.counterToTriggerForecastCustomHook + 1;
    },
    setForecastMultiplierData: (state, action) => {
      state[action.payload.key] = {
        ...state[action.payload.key],
        ...action.payload.value,
      };
    },
    setAllForecastMultiplierData: (state, action) => {
      state[action.payload.key] = {
        ...state[action.payload.key],
        ...action.payload.value,
      };
    },

    setHistoricalActualData: (state, action) => {
      state.historicalActual = action.payload;
    },
    setForecastColumns: (state, action) => {
      state.forecastColumns = action.payload;
    },
    setHistoricalColumns: (state, action) => {
      state.historicalColumns = action.payload;
    },
    setActuals: (state, action) => {
      state.actuals = action.payload;
    },
    setActualsDiscount: (state, action) => {
      state.actualsDiscount = action.payload;
    },
    sethistoricActualsDiscount: (state, action) => {
      state.historicactualsDiscount = {
        ...state[action.payload.key],
        ...action.payload,
      };
    },
    setAllChartData: (state, action) => {
      state.allChartData = action.payload;
    },
    setHistoricAllChartData: (state, action) => {
      state.historicAllChartData = action.payload;
    },
    setResetHistoricalActualData: (state, action) => {
      state.historicalActual = [];
      state.historicalColumns = [];
      state.forecastColumns = [];
      state.actuals = [];
      state.historicAllChartData = {};
    },
    setResetScenario1: (state) => {
      state.scenario1 = {};
    },
    setResetScenario2: (state) => {
      state.scenario2 = {};
    },
    setDisableSaveBtn: (state, action) => {
      state.disableSaveButton = action.payload;
    },

    setResetForecastMultiplierData: (state) => {
      state.IA = {};
      state.adjusted = {};
      state.scenario1 = {};
      state.scenario2 = {};
      state.actuals = {};
      state.historicalActual = [];
      state.actualsDiscount = {};
      state.historicactualsDiscount = {};
      state.allChartData = {};
      state.disableSaveButton = false;
    },
    setResetForecastMultiplierTabData: (state, action) => {
      state[action.payload.key] = {};
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setMultiplierLoaderCount,
  setHistoricalColumns,
  setForecastColumns,
  setActuals,
  setActualsDiscount,
  sethistoricActualsDiscount,
  setForecastMultiplierData,
  setAllForecastMultiplierData,
  setResetForecastMultiplierData,
  setResetForecastMultiplierTabData,
  setResetScenario1,
  setResetScenario2,
  setHistoricalActualData,
  setResetHistoricalActualData,
  setAllChartData,
  setHistoricAllChartData,
  setSaveOperationPerformedCounter,
  setCounterToTriggerForecastCustomHook,
  setDisableSaveBtn,
} = matrixSummaryMultiplierService.actions;

export default matrixSummaryMultiplierService.reducer;
