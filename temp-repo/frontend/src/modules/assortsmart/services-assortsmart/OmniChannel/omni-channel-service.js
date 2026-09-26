import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  ADD_REFRESH_PLAN,
  GET_OMNI_WEDGE_MAPPING_DATA,
  GET_OMNI_WEDGE_METRICS_DATA,
  MERGE_OMNI_PLAN,
  UPDATE_OMNI_DATA,
  UPLOAD_OMNI_MAPPING_FILE,
  OMNI_DELETE,
  OMNI_DELETE_ROW,
  OMNI_CREATE_PLACEHOLDER_AND_CHOICE_ID,
  OMNI_CALL_PLACEHOLDER_OID,
  GET_CARRYOVER_COLORWAY,
  OMNI_CALL_COLORWAY_SEASON_FINALIZED,
} from "modules/assortsmart/constants-assortsmart/apiConstants";

export const omniChannelService = createSlice({
  name: "omniChannelService",
  initialState: {
    omniLoader: false,
    omniMappingData: {},
    omniMappingMetrics: [],
    updatedOmniMappingData: [],
    planNameToCodeData: {},
  },
  reducers: {
    setOmniLoader: (state, action) => {
      state.omniLoader = action.payload;
    },
    setOmniMappingData: (state, action) => {
      state.omniMappingData = action.payload;
    },
    setOmniMappingMetrics: (state, action) => {
      state.omniMappingMetrics = action.payload;
    },
    setUpdatedOmniMappingData: (state, action) => {
      state.updatedOmniMappingData = action.payload;
    },
    setPlanNameToCodeMapping: (state, action) => {
      state.planNameToCodeData = action.payload;
    },
  },
});
export const {
  setOmniLoader,
  setOmniMappingData,
  setOmniMappingMetrics,
  setUpdatedOmniMappingData,
  setPlanNameToCodeMapping,
} = omniChannelService.actions;

//API to fetch omni mapping table columns & data
export const fetchOmniMappingData = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_OMNI_WEDGE_MAPPING_DATA,
    method: "POST",
    data: reqBody,
  });
};

//API to fetch omni mapping metrics data
export const fetchOmniMappingMetrics = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_OMNI_WEDGE_METRICS_DATA,
    method: "POST",
    data: reqBody,
  });
};

//API to upload file
export const uploadOmniMappingFile = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPLOAD_OMNI_MAPPING_FILE,
    method: "POST",
    data: reqBody,
  });
};

//API to add/refresh plan
export const refreshPlans = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + ADD_REFRESH_PLAN,
    method: "POST",
    data: reqBody,
  });
};

//API to merge omni plan
export const mergeOmniPlan = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + MERGE_OMNI_PLAN,
    method: "POST",
    data: reqBody,
  });
};

//Create/update omni table data
export const updateOmniTableData = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_OMNI_DATA,
    method: "POST",
    data: reqBody,
  });
};

//Delete Omni plan
export const deleteOmniPlan = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OMNI_DELETE,
    method: "POST",
    data: reqBody,
  });
};

//Delete omni table row
export const deleteOmnitableRow = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OMNI_DELETE_ROW,
    method: "POST",
    data: reqBody,
  });
};

//Create placeholder & choice id
export const createPlaceholderAndChoiceId = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OMNI_CREATE_PLACEHOLDER_AND_CHOICE_ID,
    method: "POST",
    data: reqBody,
  });
};

//Call placeholder odi
export const callPlaceholderOid = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OMNI_CALL_PLACEHOLDER_OID,
    method: "POST",
    data: reqBody,
  });
};

//API to fetch carryover colorway details
export const fetchCarryOverColorway = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_CARRYOVER_COLORWAY,
    method: "POST",
    data: reqBody,
  });
};

// Call Colorway Season Finalized
export const callColorwaySeasonFinalized = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + OMNI_CALL_COLORWAY_SEASON_FINALIZED,
    method: "POST",
    data: reqBody,
  });
};

export default omniChannelService.reducer;
