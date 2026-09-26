import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

export const dcStatusService = createSlice({
  name: "dcStatusService",
  initialState: {
    dcStatus: [],
    dcStatusCount: 0,
  },
  reducers: {
    setDCstatus: (state, action) => {
      state.dcStatus = action.payload.data;
      state.dcStatusCount = action.payload.count;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setDCstatus } = dcStatusService.actions;

// API calls
export const fetchFilterAttributes = (dimension) => (dispatch) => {
  return axiosInstance({
    url: "/core/filter?dimension=" + dimension,
    method: "GET",
  });
};

export const fetchDCstatus = (body, dc_type, pageNum = 1) => (dispatch) => {
  return axiosInstance({
    url: `/master/dc_status/` + dc_type,
    method: "POST",
    data: body,
  });
};

export const setStatusData = (screen, reqBody) => async (dispatch) => {
  return axiosInstance({
    url: `/master/dc_status/` + screen,
    method: "PATCH",
    data: reqBody,
  });
};

export const createNewDC = (screen, reqBody) => async (dispatch) => {
  return axiosInstance({
    url: `/master/dc_status/create/` + screen,
    method: "POST",
    data: reqBody,
  });
};

export default dcStatusService.reducer;
