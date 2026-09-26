import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_STORE_DC_POLICY_NETWORK_RULES_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const dcStoreStrategyService = createSlice({
  name: "dcStoreStrategyService",
  initialState: {
    // Main table states
    dcStorePolicyFilterConfigs: [],
    dcStorePolicyTableData: [],
    dcStorePolicyTableDataLoader: false,

    // Pop up states
    mappingsPopUpLoader: false,
    // Set All states
    setAllModalLoader: false,
    savedEditedRules: [],
  },
  reducers: {
    setDcStorePolicyFilterConfig: (state, action) => {
      state.dcStorePolicyFilterConfigs = action.payload;
    },
    setDcStorePolicyDataLoader: (state, action) => {
      state.dcStorePolicyTableDataLoader = action.payload;
    },
    setDcStorePolicyData: (state, action) => {
      state.dcStorePolicyTableData = action.payload;
    },
    setMappingsPopUpLoader: (state, action) => {
      state.mappingsPopUpLoader = action.payload;
    },
    setSetAllModalLoader: (state, action) => {
      state.setAllModalLoader = action.payload;
    },
    setSavedEditedRules: (state, action) => {
      state.savedEditedRules = action.payload;
    },
  },
});

export const {
  setDcStorePolicyFilterConfig,
  setDcStorePolicyDataLoader,
  setDcStorePolicyData,
  setMappingsPopUpLoader,
  setSetAllModalLoader,
  setSavedEditedRules,
} = dcStoreStrategyService.actions;

export const getStoreDcPolicyNetworkRulesList = (postBody) => {
  return axiosInstance({
    url: GET_STORE_DC_POLICY_NETWORK_RULES_LIST,
    method: "POST",
    data: postBody,
  });
};

export default dcStoreStrategyService.reducer;
