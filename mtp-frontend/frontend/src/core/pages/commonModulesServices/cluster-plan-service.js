import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../Utils/axios";
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
    mapViewLoader: false
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
    }
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
  });
};

export const getClusterMapViewData = (body) => () => {
  return axiosInstance({
    url: GET_MAPVIEW_DATA,
    method: "POST",
    data: body,
  });
};

export default clusterPlanService.reducer;
