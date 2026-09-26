import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_CLUSTER_BREAKDOWN_DATA,
  GET_ATTRIBUTE_GRAPH_DATA,
  GET_PERFORMANCE_GRAPH_DATA,
  FINAL_CLUSTER_BUCKET_SAVE,
  GET_CLUSTER_STORE_LIST_DATA,
  GET_STORE_DATA_FROM_CLUSTER,
  UPDATE_SWAP_STORE_DATA,
  CLUSTERSMART_ROLLUP_DOWNLOAD,
} from "../../../constants-assortsmart/apiConstants";

export const finalizeClusterService = createSlice({
  name: "finalizeClusterService",
  initialState: {
    loader_1_2: false,
    disable_save_btn_1_2: false,
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
    setDisable_Save_btn_1_2: (state, action) => {
      state.disable_save_btn_1_2 = action.payload;
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
  setDisable_Save_btn_1_2,
  setAttributeGraphData,
  setPerformanceGraphData,
  clearAttributeGraphData,
  clearPerformanceGraphData,
  clearFinalizeClusterStates,
} = finalizeClusterService.actions;

export const getClusterBreakdownData = (postBody, objID) => () => {
  return axiosInstance({
    url: GET_CLUSTER_BREAKDOWN_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getAttributeGraphData = (postBody, objID) => () => {
  return axiosInstance({
    url: GET_ATTRIBUTE_GRAPH_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getPerformanceGraphData = (postBody, objID) => () => {
  return axiosInstance({
    url: GET_PERFORMANCE_GRAPH_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const fetchClusterStoreListData = (postBody, objID) => () => {
  return axiosInstance({
    url: GET_CLUSTER_STORE_LIST_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const fetchStoreListDataFromCluster = (postBody, objID) => () => {
  return axiosInstance({
    url: GET_STORE_DATA_FROM_CLUSTER,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateSwapStoreData = (postBody, objID) => () => {
  return axiosInstance({
    url: UPDATE_SWAP_STORE_DATA,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

export const finalClusterBucketSave = (postBody, objID) => () => {
  return axiosInstance({
    url: FINAL_CLUSTER_BUCKET_SAVE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const clusterSmartRollupDownload = (body, objID) => () => {
  return axiosInstance({
    url: CLUSTERSMART_ROLLUP_DOWNLOAD,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

export const finalizeClusterReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.finalizeClusterReducer
);

export const loader_1_2Selector = createSelector(
  finalizeClusterReducerSelector,
  (state) => state.loader_1_2
);

export const disable_1_2_Save_BtnSelector = createSelector(
  finalizeClusterReducerSelector,
  (state) => state.disable_save_btn_1_2
);

export const attributeGraphDataSelector = createSelector(
  finalizeClusterReducerSelector,
  (state) => state.attributeGraphData
);

export const performanceGraphDataSelector = createSelector(
  finalizeClusterReducerSelector,
  (state) => state.performanceGraphData
);

export const clusterBreakdownDataSelector = createSelector(
  finalizeClusterReducerSelector,
  (state) => state.clusterBreakdownData
);

export default finalizeClusterService.reducer;
