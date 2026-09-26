import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import {
  GET_USERS,
  SAVE_NEW_USER,
  DELETE_EXISTING_USER,
  DOWNLOAD_APP_DATA,
  SAVE_UPDATE_DELETE_USER_ROLE_MAPPING,
} from "config/api";

export const userManagementService = createSlice({
  name: "userManagementService",
  initialState: {
    listOfUserData: [],
    loaderUserMgmt: false,
    listOfUnassignedUserData: [],
    userNameDependency: "",
  },
  reducers: {
    setUserTableDetails: (state, action) => {
      state.listOfUserData = action.payload;
      state.loaderUserMgmt = false;
    },
    setUnAssignedUserData: (state, action) => {
      state.listOfUnassignedUserData = action.payload;
    },
    setUserMgmtLoader: (state, action) => {
      state.loaderUserMgmt = action.payload;
    },
    setUserNameDependency: (state, action) => {
      state.userNameDependency = action.payload;
    },
  },
});
export const {
  setUserTableDetails,
  setUserMgmtLoader,
  setUnAssignedUserData,
  setUserNameDependency,
} = userManagementService.actions;

export const getUserDetails = (postBody) => () => {
  return axiosInstance({
    url: GET_USERS,
    method: "POST",
    data: postBody,
  });
};

export const saveNewUser = (postBody) => async () => {
  return axiosInstance({
    url: `${SAVE_NEW_USER}`,
    method: "POST",
    data: postBody,
  });
};

export const deleteUser = (postBody) => async () => {
  return axiosInstance({
    url: `${DELETE_EXISTING_USER}`,
    method: "DELETE",
    data: postBody,
  });
};

export const deleteRole = async (hierarchy_id) => {
  return axiosInstance({
    url: `${SAVE_UPDATE_DELETE_USER_ROLE_MAPPING}/${hierarchy_id}`,
    method: "DELETE",
  });
};

export const downloadData = async (appCodes) => {
  return axiosInstance({
    url: DOWNLOAD_APP_DATA,
    data: appCodes,
    method: "POST",
  });
}

export default userManagementService.reducer;
