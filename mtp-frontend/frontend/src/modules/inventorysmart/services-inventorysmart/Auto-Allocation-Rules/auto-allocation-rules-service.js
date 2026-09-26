import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { AUTO_ALLOCATION_RULES, DELETE_STORE_EXCEPTIONS, DOWNLOAD_USER_MAINTAINED_DATES, GET_ALLOCATION_RULES_STORE_LIST, GET_AUTO_ALLOCATION_RULES_LIST, GET_STORE_EXCEPTIONS, GET_STORE_GROUP_DETAILS, PRIORITY_CODE_LIST, PRIORITY_CODE_UPDATE, SET_STORE_GROUP_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const autoAllocationRules = createSlice({
  name: "inventorySmartApplicationAutoAllocationRules",
  initialState: {
    autoAllocationRulesData: [],
  },
  reducers: {
    setAutoAllocationRulesData: (state, action) => {
      state.autoAllocationRulesData = action.payload;
    },
  },
});

export const {
  setAutoAllocationRulesData,
} = autoAllocationRules.actions;

export const getAllocationRules = (body) => () => {
  return axiosInstance({
    url: GET_AUTO_ALLOCATION_RULES_LIST,
    method: "POST",
    data: body,
  });
};

export const deleteAllocationRule = (ruleId) => () => {
  return axiosInstance({
    url: `${AUTO_ALLOCATION_RULES}/${ruleId}`,
    method: "DELETE",
  });
};

export const fetchRuleDetails = (ruleId) => () => {
  return axiosInstance({
    url: `${AUTO_ALLOCATION_RULES}/${ruleId}`,
    method: "GET",
  });
};

export const getStoreExceptions = (body) => () => {
  return axiosInstance({
    url: `${GET_STORE_EXCEPTIONS}`,
    method: "POST",
    data: body,
  });
};

export const createAllocationRule = (body) => () => {
  return axiosInstance({
    url: AUTO_ALLOCATION_RULES,
    method: "POST",
    data: body,
  });
};

export const removeStoreException = (body) => () => {
  return axiosInstance({
    url: DELETE_STORE_EXCEPTIONS,
    method: "POST",
    data: body,
  });
};

export const getStoreGroupDetails = (ruleId) => () => {
  return axiosInstance({
    url: `${GET_STORE_GROUP_DETAILS}/${ruleId}`,
    method: "GET",
  });
};

export const addStoreException = (body) => () => {
  return axiosInstance({
    url: SET_STORE_GROUP_DETAILS,
    method: "POST",
    data: body,
  });
};

export const updateAllocationRule = (body) => () => {
  return axiosInstance({
    url: AUTO_ALLOCATION_RULES,
    method: "PUT",
    data: body,
  });
};

export const getStoreList = (body) => () => {
  return axiosInstance({
    url: GET_ALLOCATION_RULES_STORE_LIST,
    method: "POST",
    data: body,
  });
};

export default autoAllocationRules.reducer;
