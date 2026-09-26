import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { CREATE_AUTO_ALLOCATION_RULE, CREATE_DC_STORE_STRATEGY_RULE, GET_ALLOCATION_RULES_LIST, GET_ALLOCATION_RULES_SET, GET_DC_STORE_STRATEGY_RULES_SET, GET_SELECTED_DC_STORE_STRATEGY_RULE_DETAILS, SAVE_EDIT_AUTO_ALLOCATION_RULE_CHANGES, SAVE_EDIT_DC_STORE_STRATEGY_RULE_CHANGES } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_SELECTED_AUTO_ALLOCATION_RULE_DETAILS } from "../../constants-inventorysmart/apiConstants";

export const createDCStoreStrategyRulesService = createSlice({
  name: "createDCStoreStrategyRulesService",
  initialState: {
    formData: {},
    rulesLoader: false,
    editId: "",
    editName: "",
    isCreateViewActive: false,
    disableEditDetail: {}
  },
  reducers: {
    setCreateRulesFormData: (state, action) => {
      state.formData = action.payload;
    },
    setRulesLoader: (state, action) => {
      state.rulesLoader = action.payload;
    },
    setEditId: (state, action) => {
      state.editId = action.payload;
    },
    setDisableEditDetail: (state, action) => {
      state.disableEditDetail = action.payload;
    },
    setEditRuleName: (state,action) => {
      state.editName = action.payload;
    },
    setCreateViewActive: (state, action) => {
      state.isCreateViewActive = action.payload;
    },
  },
});

export const getDCStoreStrategyRulesSet = () => () => {
  return axiosInstance({
    url: GET_DC_STORE_STRATEGY_RULES_SET,
    method: "GET",
    
  });
};

export const createNewDCStoreStrategyRule = (postbody) => () => {
  return axiosInstance({
    url: CREATE_DC_STORE_STRATEGY_RULE,
    method: "POST",
    data: postbody,
  });
};
export const saveEditDCStoreStrategyChanges = (postbody) => () => {
  return axiosInstance({
    url: SAVE_EDIT_DC_STORE_STRATEGY_RULE_CHANGES,
    method: "POST",
    data: postbody,
  });
};
export const getSelectedStrategyRuleDetails = (postbody) => () => {
  return axiosInstance({
    url: GET_SELECTED_DC_STORE_STRATEGY_RULE_DETAILS,
    method: "POST",
    data: postbody,
  });
}

export const {
  setCreateRulesFormData,
  setRulesLoader,
  setEditId,
  setDisableEditDetail,
  setEditRuleName,
  setCreateViewActive,
} = createDCStoreStrategyRulesService.actions;

export default createDCStoreStrategyRulesService.reducer;
