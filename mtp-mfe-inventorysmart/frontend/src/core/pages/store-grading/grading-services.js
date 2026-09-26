import axiosInstance from "core/Utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import {
  STORE_GRADE_ATTRIBUTES,
  STORE_GRADE_HIERARCHIES,
  STORE_GRADE_NOMENCLATURE,
  CREATE_STORE_GRADE,
  ADD_GRADING_MATRICES,
  GET_PERFORMANCE_MATRICES,
  GET_PERFORMANCE_ATRRIBUTES,
  STORE_GRADE_LIST,
  FINAL_GRADE_LIST,
  SAVE_GRADE_RESULTS,
  ACTIVE_STORE_GRADE_LIST,
} from "./grading-constants/api-constants";

export const fetchBasicDetialsAttributes = async (screen) => {
  return axiosInstance({
    url: `${STORE_GRADE_ATTRIBUTES}/${screen}`,
    method: "GET",
  });
};

export const fetchHierarchies = async (attribute) => {
  return axiosInstance({
    url: `${STORE_GRADE_HIERARCHIES}/${attribute}?only_hierarchies=true`,
    method: "GET",
  });
};

export const calculateAttributes = async (reqBody) => {
  return axiosInstance({
    url: `${GET_PERFORMANCE_MATRICES}`,
    data: reqBody,
    method: "POST",
  });
};

export const fetchPerformanceAttributes = async (storecode) => {
  return axiosInstance({
    url: `${GET_PERFORMANCE_ATRRIBUTES}/${storecode}`,
    method: "GET",
  });
};

export const fetchAttributes = async () => {
  return axiosInstance({
    url: `${STORE_GRADE_NOMENCLATURE}`,
    method: "GET",
  });
};

export const createNewGrade = async (reqBody) => {
  return axiosInstance({
    url: `${CREATE_STORE_GRADE}`,
    method: "POST",
    data: reqBody,
  });
};

export const addGradingMatrices = async (reqBody) => {
  return axiosInstance({
    url: `${ADD_GRADING_MATRICES}`,
    method: "POST",
    data: reqBody,
  });
};

/**
 * @func
 * @desc Fetch Header configuration
 * @returns {Object}
 */
export const fetchGradingHeaders = async () => {
  return axiosInstance({
    url: `${STORE_GRADE_LIST}`,
    method: "POST",
  });
};

/**
 * @func
 * @desc Fetch Column Data
 * @returns {Object}
 */
export const fetchGradingColumns = async () => {
  return axiosInstance({
    url: `${STORE_GRADE_LIST}`,
    method: "POST",
  });
};

export const fetchGradeList = async () => {
  return axiosInstance({
    url: `${ACTIVE_STORE_GRADE_LIST}`,
    method: "POST",
  });
};

export const setGradeResults = async (reqBody) => {
  return axiosInstance({
    url: `${SAVE_GRADE_RESULTS}`,
    method: "POST",
    data: reqBody,
  });
};

export const getFinalGradeList = async (reqBody) => {
  return axiosInstance({
    url: `${FINAL_GRADE_LIST}`,
    method: "POST",
    data: reqBody,
  });
};

// STORE GRADING STORE OPERATIONS
export const createGradeService = createSlice({
  name: "createGradeService",
  initialState: {
    createGradeStep: 0,
    classification: "",
    gradingDetails: {},
    channel: null,
  },
  reducers: {
    setCreateGradeStep: (state, action) => {
      state.createGradeStep = action.payload;
    },
    setCreateGradeClassification: (state, action) => {
      state.classification = action.payload;
    },
    setGradingDetails: (state, action) => {
      state.gradingDetails = action.payload;
    },
    setGradingChannel: (state, action) => {
      state.channel = action.payload;
    },
  },
});
// Action creators are generated for each case reducer function
export const {
  setCreateGradeStep,
  setCreateGradeClassification,
  setGradingDetails,
  setGradingChannel,
} = createGradeService.actions;

// Export Reducer
export default createGradeService.reducer;
