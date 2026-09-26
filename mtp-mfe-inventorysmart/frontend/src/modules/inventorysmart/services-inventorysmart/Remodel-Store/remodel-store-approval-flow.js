import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {RESERVE_DEMAND_EDIT, APPROVE_NEW_STORE_PRODUCTS, APPROVAL_FLOW_RESERVE_LIST, APPROVAL_FLOW_STORE_LIST} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const remodelStoreApprovalFlowService = createSlice({ 
    name: "remodelStoreApprovalFlowService",
    initialState: {
        remodelStoreApprovalFlowLoader: false,
    },
    reducers: {
        setRemodelStoreApprovalFlowLoader: (state, action) => {
            state.remodelStoreApprovalFlowLoader = action.payload;
        },
    },
});

export const {
    setRemodelStoreApprovalFlowLoader,
} = remodelStoreApprovalFlowService.actions;

export const fetchRemodelStoreApprovalEligibleProductsList = (id) => () => {
    return axiosInstance({
      url: APPROVAL_FLOW_RESERVE_LIST + "/" + id,
      method: "GET",
    });
  };
  
  export const fetchRemodelStoreApprovalStoreList = (id) => () => {
    return axiosInstance({
      url: APPROVAL_FLOW_STORE_LIST + "/" + id,
      method: "GET",
    });
  };
  
  export const approveProducts = (body) => () => {
    return axiosInstance({
      url: APPROVE_NEW_STORE_PRODUCTS,
      method: "POST",
      data: body,
    });
  };
  
  export const updateEditedProductsDemand = (body) => () => {
    return axiosInstance({
      url: RESERVE_DEMAND_EDIT,
      method: "PATCH",
      data: body,
    });
  };

  export default remodelStoreApprovalFlowService.reducer;