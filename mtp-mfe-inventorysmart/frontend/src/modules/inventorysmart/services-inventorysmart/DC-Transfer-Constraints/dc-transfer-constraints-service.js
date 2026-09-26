import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  DC_TRANSFER_CONSTRAINTS_TABLE_DATA,
  DC_TRANSFER_CONSTRAINTS_SET_ALL_UPDATE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartDcTransferConstraintsService = createSlice({
  name: "inventorySmartDcTransferConstraintsService",
  initialState: {
    dcTransferConstraintsFilterConfigs: [],
    dcTransferConstraintsTableDataLoader: false,
    savedEditedData: [],
  },
  reducers: {
    setDcTransferConstraintsFilterConfig: (state, action) => {
      state.dcTransferConstraintsFilterConfigs = action.payload;
    },
    setDcTransferConstraintsDataLoader: (state, action) => {
      state.dcTransferConstraintsTableDataLoader = action.payload;
    },
  },
});

export const getDcTransferConstraintsData = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONSTRAINTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateDCTransferConstraints = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONSTRAINTS_SET_ALL_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const {
  setDcTransferConstraintsFilterConfig,
  setDcTransferConstraintsDataLoader,
} = inventorySmartDcTransferConstraintsService.actions;

export default inventorySmartDcTransferConstraintsService.reducer;
