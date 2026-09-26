import { createSlice, current } from "@reduxjs/toolkit";
import { cloneDeep } from "lodash";

const initialState = {
  IA: {},
  adjusted: {},
  scenario1: {},
  scenario2: {},
  originalPredictedIA: null,
  predictedActuals: null,
  predictedHistoricalActuals: null,
  historicalActual: [],
  historicalColumns: [],
  forecastColumns: [],
  actuals: {},
  actualsDiscount: {},
  historicactualsDiscount: [],
  historicActualsDiscountLastYear: [],
  multiplierLoaderCount: 0,
  allChartData: {
    ia_forecast_data: [],
    actuals_data: [],
    historical_actuals_data: [],
    ia_default_forecast_data: [],
  },
  historicAllChartData: {
    ia_forecast_data: [],
    actuals_data: [],
    historical_actuals_data: [],
    ia_default_forecast_data: [],
  },
  saveOperationPerformedCounter: 0,
  counterToTriggerForecastCustomHook: 0,
  disableSaveButton: false,
  isMultiplierChanged: 0,
  fiscalWeekEdited: null,
};

export const adaForecastMultiplierService = createSlice({
  name: "adaForecastMultiplierService",
  initialState,
  reducers: {
    setMultiplierLoaderCount: (state, action) => {
      state.multiplierLoaderCount =
        state.multiplierLoaderCount + action.payload >= 0
          ? state.multiplierLoaderCount + action.payload
          : 0;
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
    setOriginalPredictedIA: (state, action) => {
      state.originalPredictedIA = action.payload;
    },
    setPredictedActuals: (state, action) => {
      state.predictedActuals = action.payload;
    },
    setPredictedHistoricalActuals: (state, action) => {
      state.predictedHistoricalActuals = action.payload;
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
      state.actuals = { ...state.actuals, ...action.payload };
    },
    setActualsDiscount: (state, action) => {
      state.actualsDiscount = action.payload;
    },
    setHistoricActualsDiscount: (state, action) => {
      state.historicactualsDiscount = action.payload;
    },
    setHistoricActualsDiscountLastYear: (state, action) => {
      state.historicActualsDiscountLastYear = action.payload;
    },
    setAllChartData: (state, action) => {
      state.allChartData = action.payload;
    },
    setAllPredictedChartData: (state, action) => {
      state.allChartData.ia_default_forecast_data =
        action.payload.ia_default_forecast_data;
      state.allChartData.ia_forecast_data = action.payload.ia_forecast_data;
    },
    setAllActualsChartData: (state, action) => {
      state.allChartData.actuals_data = action.payload.actuals_data;
      state.allChartData.historical_actuals_data =
        action.payload.historical_actuals_data;
    },

    setAllHistoricPredictedChartData: (state, action) => {
      state.historicAllChartData.ia_default_forecast_data =
        action.payload.ia_default_forecast_data;
      state.historicAllChartData.ia_forecast_data =
        action.payload.ia_forecast_data;
    },
    setAllHistoricActualsChartData: (state, action) => {
      state.historicAllChartData.actuals_data = action.payload.actuals_data;
      state.historicAllChartData.historical_actuals_data =
        action.payload.historical_actuals_data;
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
      // Reset all state to initial values
      Object.assign(state, initialState);
      console.log("Reset state to initial state", current(state));
    },
    setResetForecastMultiplierTabData: (state, action) => {
      state[action.payload.key] = {};
    },
    setIsMultiplierChanged: (state, action) => {
      state.isMultiplierChanged += 1;
      state.fiscalWeekEdited = action.payload;
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
  setHistoricActualsDiscount,
  setHistoricActualsDiscountLastYear,
  setForecastMultiplierData,
  setAllForecastMultiplierData,
  setResetForecastMultiplierData,
  setResetForecastMultiplierTabData,
  setResetScenario1,
  setResetScenario2,
  setHistoricalActualData,
  setResetHistoricalActualData,
  setAllChartData,
  setAllPredictedChartData,
  setAllActualsChartData,
  setAllHistoricPredictedChartData,
  setAllHistoricActualsChartData,
  setHistoricAllChartData,
  setSaveOperationPerformedCounter,
  setCounterToTriggerForecastCustomHook,
  setDisableSaveBtn,
  setOriginalPredictedIA,
  setPredictedActuals,
  setPredictedHistoricalActuals,
  setIsMultiplierChanged,
} = adaForecastMultiplierService.actions;

export default adaForecastMultiplierService.reducer;
