import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  STORE_TRANSFER_RULES_LIST,
  CREATE_STORE_TRANSFER_RULE,
  CREATE_STORE_TRANSFER_RULE_V2,
  PREVIEW_STORE_TRANSFER_RULE,
  VIEW_PREVIEW_STORE_TRANSFER_RULE,
  STORE_TRANSFER_RULES_INFO,
  STORE_TRANSFER_OPTIONS,
  LOGISTIC_STORE_GROUP_VALUES,
  COPY_STORE_TRANSFER_RULE,
} from "../../constants-inventorysmart/apiConstants";

export const storeTransferRuleService = createSlice({
  name: "storeTransferRuleService",
  initialState: {
    storeTransferRuleLoader: false,
    storeTransferRuleData: [],
    storeTransferRuleDetail: null,
    storeTransferRuleError: null,
    crossChannelFilterConfigs: null,
    withinChannelFilterConfigs: null,
    formState: null,
    isFromReview: false,
    newRuleDetails: null,
  },
  reducers: {
    setStoreTransferRuleData: (state, action) => {
      state.storeTransferRuleData = action.payload;
    },
    setStoreTransferRuleDetail: (state, action) => {
      state.storeTransferRuleDetail = action.payload;
    },
    setStoreTransferRuleError: (state, action) => {
      state.storeTransferRuleError = action.payload;
    },
    setCrossChannelFilterConfigs: (state, action) => {
      state.crossChannelFilterConfigs = action.payload;
    },
    setWithinChannelFilterConfigs: (state, action) => {
      state.withinChannelFilterConfigs = action.payload;
    },
    setFormState: (state, action) => {
      state.formState = action.payload;
    },
    setIsFromReview: (state, action) => {
      state.isFromReview = action.payload;
    },
    setNewRuleDetails: (state, action) => {
      state.newRuleDetails = action.payload;
    },
    clearStoreTransferRuleState: (state) => {
      state.storeTransferRuleLoader = false;
      state.storeTransferRuleData = [];
      state.storeTransferRuleDetail = null;
      state.storeTransferRuleError = null;
      state.crossChannelFilterConfigs = null;
      state.withinChannelFilterConfigs = null;
      state.formState = null;
      state.isFromReview = false;
      state.newRuleDetails = null;
    },
    clearFormState: (state) => {
      state.formState = null;
      state.isFromReview = false;
      state.newRuleDetails = null;
    },
  },
});

export const {
  setStoreTransferRuleLoader,
  setStoreTransferRuleData,
  setStoreTransferRuleDetail,
  setStoreTransferRuleError,
  setCrossChannelFilterConfigs,
  setWithinChannelFilterConfigs,
  setFormState,
  setIsFromReview,
  setNewRuleDetails,
  clearStoreTransferRuleState,
  clearFormState,
} = storeTransferRuleService.actions;

// Thunk actions for API calls
export const fetchStoreTransferRules = () => () => {
  return axiosInstance({
    url: STORE_TRANSFER_RULES_LIST,
    method: "GET",
  });
};

export const fetchStoreTransferRuleDetail = (data) => () => {
  return axiosInstance({
    url: `${STORE_TRANSFER_RULES_INFO}`,
    method: "POST",
    data
  });
};

export const fetchStoreTransferRuleById = (ruleId) => () => {
  return axiosInstance({
    url: `${STORE_TRANSFER_RULES_LIST}/${ruleId}`,
    method: "GET",
  });
};

export const createStoreTransferRule = (data) => () => {
  return axiosInstance({
    url: CREATE_STORE_TRANSFER_RULE,
    method: "POST",
    data,
  });
};

export const createStoreTransferRuleV2 = (data) => () => {
  return axiosInstance({
    url: CREATE_STORE_TRANSFER_RULE_V2,
    method: "POST",
    data,
  });
};

export const updateStoreTransferRuleV2 = (ruleId, data) => () => {
  return axiosInstance({
    url: `${STORE_TRANSFER_RULES_LIST}/${ruleId}`,
    method: "PUT",
    data,
  });
};

export const copyStoreTransferRule = (ruleId) => () => {
  return axiosInstance({
    url: COPY_STORE_TRANSFER_RULE,
    method: "POST",
    data: { rule_id: ruleId },
  });
};

export const deleteStoreTransferRules = (ruleIds) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_RULES_LIST,
    method: "DELETE",
    data: { rule_ids: ruleIds },
  });
};

export const previewStoreTransferRule = (data) => () => {
  return axiosInstance({
    url: PREVIEW_STORE_TRANSFER_RULE,
    method: "POST",
    data,
  });
};

export const viewPreviewStoreTransferRule = (data) => () => {
  return axiosInstance({
    url: VIEW_PREVIEW_STORE_TRANSFER_RULE,
    method: "POST",
    data,
  });
};

export const fetchStoreTransferOptions = () => () => {
  return axiosInstance({
    url: STORE_TRANSFER_OPTIONS,
    method: "GET",
  });
};

export const fetchStoreTransferFilterValues = (payload) => () => {
  return axiosInstance({
    url: LOGISTIC_STORE_GROUP_VALUES,
    method: "POST",
    data: payload,
  });
};

export default storeTransferRuleService.reducer;
