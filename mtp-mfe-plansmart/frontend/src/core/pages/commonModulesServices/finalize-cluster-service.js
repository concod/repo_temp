import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../Utils/axios";
import {
  GET_CLUSTER_BREAKDOWN_DATA,
  GET_ATTRIBUTE_GRAPH_DATA,
  GET_PERFORMANCE_GRAPH_DATA,
  FINAL_CLUSTER_BUCKET_SAVE,
  GET_CLUSTER_STORE_LIST_DATA,
  GET_STORE_DATA_FROM_CLUSTER,
  UPDATE_SWAP_STORE_DATA,
} from "../../Utils/apiConstants/assortSmartapiConstants";

export const finalizeClusterService = createSlice({
  name: "finalizeClusterService",
  initialState: {
    loader_1_2: false,
    clusterBreakdownData: [],
    attributeGraphData: {},
    performanceGraphData: {},
  },
  reducers: {
    setClusterBreakdownData: (state, action) => {
      state.clusterBreakdownData = action.payload;
    },
    set1_2_Loader: (state, action) => {
      state.loader_1_2 = action.payload;
    },
    setAttributeGraphData: (state, action) => {
      state.attributeGraphData = action.payload?.data;
    },
    clearAttributeGraphData: (state) => {
      state.attributeGraphData = {};
    },
    clearPerformanceGraphData: (state) => {
      state.performanceGraphData = {};
    },
    setPerformanceGraphData: (state, action) => {
      state.performanceGraphData = action.payload?.data;
    },
    clearFinalizeClusterStates: (state) => {
      state.clusterBreakdownData = [];
      state.attributeGraphData = {};
      state.performanceGraphData = {};
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setClusterBreakdownData,
  set1_2_Loader,
  setAttributeGraphData,
  setPerformanceGraphData,
  clearAttributeGraphData,
  clearPerformanceGraphData,
  clearFinalizeClusterStates,
} = finalizeClusterService.actions;

export const getClusterBreakdownData = (postBody) => () => {
  return axiosInstance({
    url: GET_CLUSTER_BREAKDOWN_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getAttributeGraphData = (postBody) => () => {
  return axiosInstance({
    url: GET_ATTRIBUTE_GRAPH_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getPerformanceGraphData = (postBody) => () => {
  return axiosInstance({
    url: GET_PERFORMANCE_GRAPH_DATA,
    method: "POST",
    data: postBody,
  });
};

export const fetchClusterStoreListData = (postBody) => () => {
  return axiosInstance({
    url: GET_CLUSTER_STORE_LIST_DATA,
    method: "POST",
    data: postBody,
  });
};

export const fetchStoreListDataFromCluster = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_DATA_FROM_CLUSTER,
    method: "POST",
    data: postBody,
  });
};

export const updateSwapStoreData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_SWAP_STORE_DATA,
    method: "PUT",
    data: postBody,
  });
};

export const finalClusterBucketSave = (postBody) => () => {
  return axiosInstance({
    url: FINAL_CLUSTER_BUCKET_SAVE,
    method: "POST",
    data: postBody,
  });
};


export default finalizeClusterService.reducer;
