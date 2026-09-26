import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  PLANSMART_COMPARE_PLAN_COL_DEF,
  PLANSMART_COMPARE_PLAN_FILTER_CONFIG,
  PLANSMART_GET_PLANS_TO_COMPARE,
} from "../../constants-plansmart/apiConstants";
export const planSmartComparePlan = createSlice({
  name: "comparePlan",
  initialState: {
    planSmartComparePlanColRefLoader: false,
    planSmartComparePlanFilterLoader: false,
    planSmartGetPlansToCompareLoader: false,
  },
  reducers: {
    setPlanSmartComparePlanColRefLoader: (state, action) => {
      state.planSmartComparePlanColRefLoader = action.payload;
    },
    setPlanSmartComparePlanFilterLoader: (state, action) => {
      state.planSmartComparePlanFilterLoader = action.payload;
    },
    setPlanSmartGetPlansToCompareLoader: (state, action) => {
      state.planSmartGetPlansToCompareLoader = action.payload;
    },
  },
});

export const {
  setPlanSmartComparePlanColRefLoader,
  setPlanSmartComparePlanFilterLoader,
  setPlanSmartGetPlansToCompareLoader,
} = planSmartComparePlan.actions;

// Selectors

export const planSmartComparePlanSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.comparePlanReducer
);

export const planSmartComparePlanColDefLoaderSelector = createSelector(
  planSmartComparePlanSelector,
  (state) => state.planSmartComparePlanColRefLoader
);

export const planSmartComparePlanFilterLoaderSelector = createSelector(
  planSmartComparePlanSelector,
  (state) => state.planSmartComparePlanFilterLoader
);

export const planSmartGetPlansToCompareLoaderSelector = createSelector(
  planSmartComparePlanSelector,
  (state) => state.planSmartGetPlansToCompareLoader
);

// Actions

export const getComparePlanFilters = (id) => () => {
  return axiosInstance({
    url: `${PLANSMART_COMPARE_PLAN_FILTER_CONFIG}${id}`,
    method: "GET",
  });
};

export const getComparePlanColDef = () => () => {
  return axiosInstance({
    url: PLANSMART_COMPARE_PLAN_COL_DEF,
    method: "GET",
  });
};

export const getPlansToCompare = (payload) => () => {
  return axiosInstance({
    url: PLANSMART_GET_PLANS_TO_COMPARE,
    method: "POST",
    data: payload,
    isV3:true
  });
};

export default planSmartComparePlan.reducer;
