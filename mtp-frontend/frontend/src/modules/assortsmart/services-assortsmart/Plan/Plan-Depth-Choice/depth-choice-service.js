import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_APS_ST,
  UPDATE_L3_APS_ST,
  UPDATE_CLUSTER_APS_ST,
  GET_DEPTH_CHOICE,
  UPDATE_DEPTH_CHOICE,
  OPTIMIZE_APS_ST,
  OPTIMIZE_DEPTH_CHOICE,
} from "../../../constants-assortsmart/apiConstants";

export const depthChoiceService = createSlice({
  name: "depthChoiceService",
  initialState: {
    apsStData: [],
    loader_2_2: false,
    depthChoiceData: [],
    depthChoiceGraphData: {},
  },
  reducers: {
    setApsStData: (state, action) => {
      state.apsStData = action.payload;
    },
    set2_2_Loader: (state, action) => {
      state.loader_2_2 = action.payload;
    },
    setDepthChoiceData: (state, action) => {
      state.depthChoiceData = action.payload;
    },
    setDepthChoiceGraphData: (state, action) => {
      state.depthChoiceGraphData = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setApsStData,
  set2_2_Loader,
  setDepthChoiceData,
  setDepthChoiceGraphData,
} = depthChoiceService.actions;
export const optimizeApsSt = (postBody, endpoint, objID) => (dispatch) => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_APS_ST,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};
export const getApsStData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_APS_ST,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};
export const updateL3ApsStData = (postBody, endpoint, objID) => (dispatch) => {
  return axiosInstance({
    url: endpoint + UPDATE_L3_APS_ST,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};
export const updateClusterApsStData = (postBody, endpoint, objID) => (
  dispatch
) => {
  return axiosInstance({
    url: endpoint + UPDATE_CLUSTER_APS_ST,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};
export const optimizeDepthChoice = (postBody, endpoint, objID) => (
  dispatch
) => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_DEPTH_CHOICE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};
export const getDepthChoiceData = (postBody, endpoint, objID) => (dispatch) => {
  return axiosInstance({
    url: endpoint + GET_DEPTH_CHOICE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};
export const updateDepthChoiceData = (postBody, endpoint, objID) => (
  dispatch
) => {
  return axiosInstance({
    url: endpoint + UPDATE_DEPTH_CHOICE,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

// Selectors

export const planDepthChoiceServiceSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.planDepthChoieService
);

export const apsStDataSelector = createSelector(
  planDepthChoiceServiceSelector,
  (state) => state.apsStData
);

export const depthChoiceDataSelector = createSelector(
  planDepthChoiceServiceSelector,
  (state) => state.depthChoiceData
);

export const depthChoiceGraphDataSelector = createSelector(
  planDepthChoiceServiceSelector,
  (state) => state.depthChoiceGraphData
);

export const loader_2_2_Selector = createSelector(
  planDepthChoiceServiceSelector,
  (state) => state.loader_2_2
);

export default depthChoiceService.reducer;
