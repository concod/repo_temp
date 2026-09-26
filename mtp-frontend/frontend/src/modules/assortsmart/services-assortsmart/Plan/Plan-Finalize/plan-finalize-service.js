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
  GET_ASSORTMENT_SUMMARY,
  GET_CORE_REPLEN_CHOICE,
  OPTIMIZE_CORE_REPLEN_CHOICE,
  UPDATE_SIZE_DATA,
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

export const getFinalisePlanMetricsData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALISE_PLAN_METRICS,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const optimizeReviewSize = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_SIZE_REVIEW,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const optimizeReviewByAttribute = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_ATTRIBUTE_REVIEW,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getReviewBySizeData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_SIZE_REVIEW_CONFIGURATION,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getReviewByClusterGradeData = (
  postBody,
  endpoint,
  objID
) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALIZE_CLUSTER_GRADE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getReviewByAttributeGradeData = (
  postBody,
  endpoint,
  objID
) => () => {
  return axiosInstance({
    url: endpoint + GET_FINALIZE_ATTRIBUTE_GRADE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const finalizePlan = (planCode, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + `${FINALIZE_PLAN}` + planCode,
    method: "PATCH",
    object_id: objID,
  });
};

export const getDownloadPOSheetData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + DOWNLOAD_PO_SHEET,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const nonLinearEdit = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + NON_LINEAR_EDIT,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const nonLinearReplaceData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + NON_LINEAR_CHANGES_REPLACE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const optimizeCoreReplenChoice = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_CORE_REPLEN_CHOICE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getCoreReplenChoice = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_CORE_REPLEN_CHOICE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getAssortmentSummaryData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_ASSORTMENT_SUMMARY,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateSizeReviewData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_SIZE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
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
