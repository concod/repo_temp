import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
  FETCH_PLAN_CONFIGURATION_INFO,
  SAVE_PLAN_CONFIGURATION_EDITS,
} from "../../constants-inventorysmart/apiConstants";

export const planConfigurationService = createSlice({
  name: "planConfigurationService",
  initialState: {
    planConfigurationLoader: false,
    planConfigurationData: [],
  },
  reducers: {
    setPlanConfigurationScreenLoader: (state, action) => {
      state.planConfigurationLoader = action.payload;
    },
    setPlanConfigurationData: (state, action) => {
      state.planConfigurationData = action.payload;
    },
    resetPlanConfiguration: (state) => {
      state.planConfigurationData = [];
      state.planConfigurationLoader = false;
    },
  },
});

export const {
  setPlanConfigurationScreenLoader,
  setPlanConfigurationData,
  resetPlanConfiguration
} = planConfigurationService.actions;

export const getPlanConfigurationInfo = (postbody) => () => {
  return axiosInstance({
    url: FETCH_PLAN_CONFIGURATION_INFO,
    method: "POST",
    data: postbody,
  });
};

export const updatePlanConfigurationInfo = (postbody) => () => {
  return axiosInstance({
    url: SAVE_PLAN_CONFIGURATION_EDITS,
    method: "POST",
    data: postbody,
  });
};

export default planConfigurationService.reducer;
