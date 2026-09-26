import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  OPTIMIZE_SIZE_REVIEW,
  OPTIMIZE_ATTRIBUTE_REVIEW,
  GET_SIZE_REVIEW_CONFIGURATION,
  GET_FINALISE_PLAN_METRICS,
  GET_FINALIZE_CLUSTER_GRADE_DATA,
  GET_FINALIZE_ATTRIBUTE_GRADE_DATA,
  FINALIZE_PLAN,
  DOWNLOAD_PO_SHEET,
  NON_LINEAR_EDIT,
  NON_LINEAR_CHANGES_REPLACE_DATA,
} from "../../../constants-assortsmart/apiConstants";

export const planFinalizeService = createSlice({
  name: "planFinalizeService",
  initialState: {
    loader_2_4: false,
    finalisePlanMetricsData: [],
    reviewBySizeData: {},
    reviewByAttributeGrade: {},
  },
  reducers: {
    set2_4_Loader: (state, action) => {
      state.loader_2_4 = action.payload;
    },
    setFinalisePlanMetricsData: (state, action) => {
      state.finalisePlanMetricsData = action.payload;
    },
    setReviewBySizeData: (state, action) => {
      state.reviewBySizeData = action.payload;
    },
    setReviewByClusterGradeData: (state, action) => {
      state.reviewByAttributeGrade = action.payload;
    },
    clearFinalizeData: (state, action) => {
      state.reviewByAttributeGrade = {};
      state.reviewBySizeData = {};
      state.finalisePlanMetricsData = [];
    },
  },
});

export const {
  set2_4_Loader,
  setFinalisePlanMetricsData,
  setReviewBySizeData,
  setReviewByClusterGradeData,
  clearFinalizeData,
} = planFinalizeService.actions;

export const getFinalisePlanMetricsData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALISE_PLAN_METRICS,
    method: "POST",
    data: postBody,
  });
};

export const optimizeReviewSize = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_SIZE_REVIEW,
    method: "POST",
    data: postBody,
  });
};

export const optimizeReviewByAttribute = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_ATTRIBUTE_REVIEW,
    method: "POST",
    data: postBody,
  });
};

export const getReviewBySizeData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_SIZE_REVIEW_CONFIGURATION,
    method: "POST",
    data: postBody,
  });
};

export const getReviewByClusterGradeData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALIZE_CLUSTER_GRADE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getReviewByAttributeGradeData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALIZE_ATTRIBUTE_GRADE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const finalizePlan = (planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + `${FINALIZE_PLAN}` + planCode,
    method: "PATCH",
  });
};

export const getDownloadPOSheetData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + DOWNLOAD_PO_SHEET,
    method: "POST",
    data: postBody,
  });
};

export const nonLinearEdit = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + NON_LINEAR_EDIT,
    method: "POST",
    data: postBody,
  });
};

export const nonLinearReplaceData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + NON_LINEAR_CHANGES_REPLACE_DATA,
    method: "POST",
    data: postBody,
  });
};

// Selectors

export const planFinalizeReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.planFinalizeReducer
);

export const set2_4_LoaderSelector = createSelector(
  planFinalizeReducerSelector,
  (state) => state.loader_2_4
);

export const reviewBySizeDataSelector = createSelector(
  planFinalizeReducerSelector,
  (state) => state.reviewBySizeData
);

export const reviewByAttributeGradeSelector = createSelector(
  planFinalizeReducerSelector,
  (state) => state.reviewByAttributeGrade
);

export const finalisePlanMetricsDataSelector = createSelector(
  planFinalizeReducerSelector,
  (state) => state.finalisePlanMetricsData
);


export default planFinalizeService.reducer;
