import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  GET_CLUSTER_PLAN_DETAILS,
  CREATE_CLUSTER_PLAN,
  GET_CREATED_CLUSTER_PLANS,
  GET_MAPVIEW_DATA,
} from "modules/clusterSmart/constants-clustersmart/apiConstants";

export const clusterPlanService = createSlice({
  name: "clusterPlanService",
  initialState: {
    clusterPlanDetails: [],
    clusterMapViewData: {},
    clusterBreakDownLoader: false,
    mapViewLoader: false,
  },
  reducers: {
    setClusterPlanDetails: (state, action) => {
      state.clusterPlanDetails = action.payload;
    },
    setMapViewLoader: (state, action) => {
      state.mapViewLoader = action.payload;
    },
    setClusterMapViewData: (state, action) => {
      state.clusterMapViewData = action.payload;
    },
    setClusterBreakDownLoader: (state, action) => {
      state.clusterBreakDownLoader = action.payload;
    },
  },
});

export const {
  setClusterPlanDetails,
  setMapViewLoader,
  setClusterBreakDownLoader,
  setClusterMapViewData,
} = clusterPlanService.actions;

export const getClusterPlanDetails = (planCode) => () => {
  return axiosInstance({
    url: `${GET_CLUSTER_PLAN_DETAILS}/` + planCode,
    method: "GET",
    object_id: planCode,
  });
};

export const createClusterPlan = (reqBody) => () => {
  return axiosInstance({
    url: CREATE_CLUSTER_PLAN,
    method: "POST",
    data: reqBody,
  });
};

export const fetchClusterDashboardTableData = (
  body,
  page = 0,
  limit = 10
) => () => {
  return axiosInstance({
    url: `${GET_CREATED_CLUSTER_PLANS}?page=${page + 1}&limit=${limit}`,
    method: "POST",
    data: body,
  });
};

export const updateClusterPlan = (body, planCode) => () => {
  return axiosInstance({
    url: `${GET_CLUSTER_PLAN_DETAILS}/${planCode}`,
    method: "PUT",
    data: body,
    object_id: planCode,
  });
};

export const getClusterMapViewData = (body, objID) => () => {
  return axiosInstance({
    url: GET_MAPVIEW_DATA,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

export const clusterPlanServiceSelector = createSelector(
  (state) => state,
  (state) => state.clustersmartReducer.ClusteringReducer
);

export const clusterPlanDetailsSelector = createSelector(
  clusterPlanServiceSelector,
  (state) => state.clusterPlanDetails
);

export const clusterMapViewDataSelector = createSelector(
  clusterPlanServiceSelector,
  (state) => state.clusterMapViewData
);
export const mapViewLoaderSelector = createSelector(
  clusterPlanServiceSelector,
  (state) => state.mapViewLoader
);
export const clusterBreakDownLoaderSelector = createSelector(
  clusterPlanServiceSelector,
  (state) => state.clusterBreakDownLoader
);

export default clusterPlanService.reducer;
