import { createSlice, createSelector } from "@reduxjs/toolkit";

export const commonAssortService = createSlice({
  name: "commonClusterPlanService",
  initialState: {
    planStepNames: {},
    intelligent_cluster_stepper_loader: false,
    activeScreenName: null,
    screenConfiguration: {},
  },
  reducers: {
    setIntelligentClusterLoader: (state, action) => {
      state.intelligent_cluster_stepper_loader = action.payload;
    },
    setActiveScreenName: (state, action) => {
      state.activeScreenName = action.payload;
    },
    setScreenConfiguration: (state, action) => {
      state.planStepNames =
        action.payload?.common?.plan_step_names_assort || {};
      state.screenConfiguration = action.payload;
    },
  },
});
export const {
  setIntelligentClusterLoader,
  setActiveScreenName,
  setScreenConfiguration,
} = commonAssortService.actions;

export const commonAssortReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.commonAssortReducer
);

export const screenConfigurationSelector = createSelector(
  commonAssortReducerSelector,
  (state) => state.screenConfiguration
);

export const planStepNamesSelector = createSelector(
  commonAssortReducerSelector,
  (state) => state.planStepNames
);

export const intelligent_cluster_stepper_loaderSelector = createSelector(
  commonAssortReducerSelector,
  (state) => state.intelligent_cluster_stepper_loader
);

export default commonAssortService.reducer;
