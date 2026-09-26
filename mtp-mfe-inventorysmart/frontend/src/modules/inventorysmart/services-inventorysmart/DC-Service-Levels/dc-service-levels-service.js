import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  DC_SERVICE_LEVELS_TABLE_DATA,
  DC_SERVICE_LEVELS_UPDATE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartDcServiceLevelsService = createSlice({
  name: "inventorySmartDcServiceLevelsService",
  initialState: {
    dcServiceLevelsFilterConfigs: [],
    dcServiceLevelsLoader: false,
  },
  reducers: {
    setDcServiceLevelsFilterConfig: (state, action) => {
      state.dcServiceLevelsFilterConfigs = action.payload;
    },
    setDcServiceLevelsLoader: (state, action) => {
      state.dcServiceLevelsLoader = action.payload;
    },
  },
});

export const getDcServiceLevelsData = (postBody) => () => {
  return axiosInstance({
    url: DC_SERVICE_LEVELS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateDCServiceLevels = (postBody) => () => {
  return axiosInstance({
    url: DC_SERVICE_LEVELS_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const {
  setDcServiceLevelsFilterConfig,
  setDcServiceLevelsLoader,
} = inventorySmartDcServiceLevelsService.actions;

export default inventorySmartDcServiceLevelsService.reducer;
