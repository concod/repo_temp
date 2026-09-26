import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import { SISTER_STORE_TABLE_VALIDATION_CHECK , CONFIGURATION_ADD_NEW_REMODEL_STORE, CONFIGURATION_UPDATE_NEW_REMODEL_STORE} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const remodelStoreManageDemandService = createSlice({
  name: "remodelStoreManageDemandService",
  initialState: {
    remodelStoreManageDemandLoader: false,
  },
  reducers: {
    setRemodelStoreManageDemandLoader: (state, action) => {
      state.remodelStoreManageDemandLoader = action.payload;
    },
  },
});

export const {
  setRemodelStoreManageDemandLoader,
} = remodelStoreManageDemandService.actions;

export const remodelStoreSisterStoreTableValidation = (postbody) => () => {
  return axiosInstance({
    url: SISTER_STORE_TABLE_VALIDATION_CHECK,
    method: "POST",
    data: postbody,
  });
};

export const saveNewRemodelStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: CONFIGURATION_ADD_NEW_REMODEL_STORE,
    method: "POST",
    data: postbody,
  });
};

export const updateRemodelStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: CONFIGURATION_UPDATE_NEW_REMODEL_STORE,
    method: "POST",
    data: postbody,
  });
};

export default remodelStoreManageDemandService.reducer;
