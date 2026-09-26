import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { CREATE_AUTO_ALLOCATION_RULE, GET_ALLOCATION_RULES_LIST, GET_ALLOCATION_RULES_SET, SAVE_EDIT_AUTO_ALLOCATION_RULE_CHANGES } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_SELECTED_AUTO_ALLOCATION_RULE_DETAILS } from "../../constants-inventorysmart/apiConstants";

export const createAutoAllocationRulesService = createSlice({
  name: "createAutoAllocationRulesService",
  initialState: {
    formData: {},
    rulesLoader: false,
    editId: "",
    editName: "",
    isCreateViewActive: false,
    disableEditDetail: {},
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

export const getAutoAllocationRulesSet = () => () => {
  return axiosInstance({
    url: GET_ALLOCATION_RULES_SET,
    method: "GET",
    
  });
};

export const createNewAutoAllocationRule = (postbody) => () => {
  return axiosInstance({
    url: CREATE_AUTO_ALLOCATION_RULE,
    method: "POST",
    data: postbody,
  });
};
export const saveEditAutoAllocationChanges = (postbody) => () => {
  return axiosInstance({
    url: SAVE_EDIT_AUTO_ALLOCATION_RULE_CHANGES,
    method: "POST",
    data: postbody,
  });
};
export const getSelectedRuleDetails = (postbody) => () => {
  return axiosInstance({
    url: GET_SELECTED_AUTO_ALLOCATION_RULE_DETAILS,
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
} = createAutoAllocationRulesService.actions;

export default createAutoAllocationRulesService.reducer;
