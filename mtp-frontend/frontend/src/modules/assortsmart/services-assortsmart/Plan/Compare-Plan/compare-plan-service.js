import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_COMPARE_PLAN_DATA,
  VALIDATE_COMPARE_PLAN,
  GET_COMPARE_PLAN_CLUSTER_DATA,
} from "modules/assortsmart/constants-assortsmart/apiConstants";

export const comparePlanService = createSlice({
  name: "comparePlanService",
  initialState: {
    comparePlan_loader: false,
    clusterPlan_loader: false,
    comparePlanTableData: [],
    comparePlanTableCols: [],
    comparePlanClusterTableData: [],
    comparePlanClusterTableCols: [],
    planMetricsData: [],
  },
  reducers: {
    setLoader: (state, action) => {
      state.comparePlan_loader = action.payload;
    },
    setClusterLoader: (state, action) => {
      state.clusterPlan_loader = action.payload;
    },
    setComparePlanTableData: (state, action) => {
      state.comparePlanTableData = action.payload;
    },
    setComparePlanTableCols: (state, action) => {
      state.comparePlanTableCols = action.payload;
    },
    setComparePlanClusterTableData: (state, action) => {
      state.comparePlanClusterTableData = action.payload;
    },
    setComparePlanClusterTableCols: (state, action) => {
      state.comparePlanClusterTableCols = action.payload;
    },
    setPlanMetricsData: (state, action) => {
      state.planMetricsData = action.payload;
    },
  },
});
// Action creators are generated for each case reducer function
export const {
  setLoader,
  setClusterLoader,
  setComparePlanTableData,
  setComparePlanTableCols,
  setComparePlanClusterTableData,
  setComparePlanClusterTableCols,
  setPlanMetricsData,
} = comparePlanService.actions;

//API to fetch compare plan l3 level table data
export const getComparePlanTableData = (body, endpoint, objID) => {
  return axiosInstance({
    url: endpoint + GET_COMPARE_PLAN_DATA,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

//API to validate compare plan
export const validateComparePlan = (body, endpoint, objID) => {
  return axiosInstance({
    url: endpoint + VALIDATE_COMPARE_PLAN,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

//API to fetch compare plan cluster level data
export const getComparePlanClusterData = (body, endpoint, objID) => {
  return axiosInstance({
    url: endpoint + GET_COMPARE_PLAN_CLUSTER_DATA,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

export default comparePlanService.reducer;
