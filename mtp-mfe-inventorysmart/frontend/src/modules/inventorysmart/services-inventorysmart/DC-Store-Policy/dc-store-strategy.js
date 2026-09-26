import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { DOWNLOAD_DC_NETWORKSTORE_STRATEGY } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import {
  GET_STORE_DC_POLICY_RULES_LIST,
  GET_RCL_STORE_GROUP_MAPPINGS,
  GET_RCL_PRODUCT_PROFILE_MAPPINGS,
  GET_RCL_STORE_STRATEGY,
  GET_RCL_ALLOCATIONS,
  GET_RCL_AUTO_SCHEDULER,
  SAVE_DC_STORE_DATA,
  MANAGE_RCL_SAVE_DC_STORE_DATA,
  SAVE_RULE_NAME_DC,
  DOWNLOAD_DC_STORE_STRATEGY,
  DELETE_RULES_DC,
  PARTIAL_SAVE_DC_STORE_DATA,
  SAVE_NETWORK_RULE_NAME_DC,
  MANAGE_RCL_NETWORK_SAVE_DC_STORE_DATA,
  DELETE_NEWTORK_RULES_DC,
  GET_RCL_AUTO_STORE_SCHEDULER,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

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

export const getStoreDcPolicyRulesList = (postBody) => {
  const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
  const store_strategy_type = is_po_strategy_flow ? 'po_store_strategy' : 'dc_store_strategy';
  return axiosInstance({
    url: `${GET_STORE_DC_POLICY_RULES_LIST}/${store_strategy_type}`,
    method: "POST",
    data: postBody,
  });
};

// Pop Up
export const saveMappings = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: "",
    method: "PUT",
    data: postBody,
  });
  return data;
};

export const getRclStoreGroupMappings = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_RCL_STORE_GROUP_MAPPINGS,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getRclProductProfileMappings = (postBody) => async () => {
  const { type } = postBody;
  delete postBody["type"];
  const { data } = await axiosInstance({
    url: `${GET_RCL_PRODUCT_PROFILE_MAPPINGS}/${type}`,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getRclStoreStrategy = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_RCL_STORE_STRATEGY,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getAllocations = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_RCL_ALLOCATIONS,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getAutoAllocationScheduler = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_RCL_AUTO_SCHEDULER,
    method: "POST",
    data: postBody,
  });
  return data;
};
export const getStoreList = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_RCL_AUTO_STORE_SCHEDULER,
    method: "POST",
    data: postBody,
  });
  return data;
};
export const saveDcStoreData = (
  postBody,
  isManageRclFlow,
  isDCNetworkFlow
) => async () => {
  let url = SAVE_DC_STORE_DATA;
  if (isManageRclFlow) {
    url = MANAGE_RCL_SAVE_DC_STORE_DATA;
  }
  if (isDCNetworkFlow) {
    url = MANAGE_RCL_NETWORK_SAVE_DC_STORE_DATA;
  }
  
  let payload = postBody;
  if (url === SAVE_DC_STORE_DATA) {
    const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
    payload = {
      ...postBody,
      is_po_strategy_flow: is_po_strategy_flow
    };
  }
  
  const { data } = await axiosInstance({
    url,
    method: "POST",
    data: payload,
  });
  return data;
};

export const partialSaveDcStoreData = (postBody) => async () => {
  let url = PARTIAL_SAVE_DC_STORE_DATA;
  const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
  const payload = {
    ...postBody,
    is_po_strategy_flow: is_po_strategy_flow
  };
  const { data } = await axiosInstance({
    url,
    method: "POST",
    data: payload,
  });
  return data;
};

export const saveRuleName = (postBody) => async () => {
  const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
  const payload = {
    ...postBody,
    is_po_strategy_flow: is_po_strategy_flow
  };
  const { data } = await axiosInstance({
    url: SAVE_RULE_NAME_DC,
    method: "POST",
    data: payload,
  });
  return data;
};
export const saveNetworkRuleName = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: SAVE_NETWORK_RULE_NAME_DC,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const downloadDcStoreStrategy = (postBody) => async () => {
  const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
  const store_strategy_type = is_po_strategy_flow ? 'po_store_strategy' : 'dc_store_strategy';
  return axiosInstance({
    url: `${GET_STORE_DC_POLICY_RULES_LIST}/${store_strategy_type}/download`,
    method: "POST",
    data: postBody,
  });
};
export const downloadDcNetworkStoreStrategy = (postBody) => async () => {
  return axiosInstance({
    url: DOWNLOAD_DC_NETWORKSTORE_STRATEGY,
    method: "POST",
    data: postBody,
  });
};

export const deleteRulesDc = (postBody) => async () => {
  const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
  const payload = {
    ...postBody,
    is_po_strategy_flow: is_po_strategy_flow
  };
  const { data } = await axiosInstance({
    url: DELETE_RULES_DC,
    method: "POST",
    data: payload,
  });
  return data;
};
export const deleteNetworkRulesDc = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: DELETE_NEWTORK_RULES_DC,
    method: "DELETE",
    data: postBody,
  });
  return data;
};

export default dcStoreStrategyService.reducer;
