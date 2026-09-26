import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  GET_PLAN_DETAILS,
  GET_STRATEGY_KPI_VIEW,
} from "modules/assortsmart/constants-assortsmart/apiConstants";

export const dashboardService = createSlice({
  name: "dashboardService",
  initialState: {
    work_strategy_loader: false
  },
  reducers: {
    setWorkStrategyLoader: (state, action) => {
      state.work_strategy_loader = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setWorkStrategyLoader
} = dashboardService.actions;


//API to view KPI
export const getStrategyKPIView = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_STRATEGY_KPI_VIEW,
    method: "POST",
    data: body,
  });
};

// Selectors

export const strategyReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.strategyReducer
);

export const workStrategyLoaderSelector = createSelector(
  strategyReducerSelector,
  (state) => state.work_strategy_loader
);

export default dashboardService.reducer;
