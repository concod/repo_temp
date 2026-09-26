import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  UAM_LIST_ROLES,
  UAM_CREATE_ROLE,
  UAM_UPDATE_ROLE,
  UAM_UPDATE_MODULE_ACCESS,
  UAM_DELETE_ROLE,
  UAM_MODULE_ACCESS_MATRIX,
} from "../../constants-inventorysmart/apiConstants";

const APPLICATION_CODE = 1;

// Shared headers sent with every UAM Configurator request.
// 'application-code' matches the key the axios interceptor reads (core/Utils/axios/index.js line 217).
// Setting it explicitly here ensures the correct value (1) is always sent, regardless of
// what getCurrentApplicationDetails() returns for this page.
const UAM_HEADERS = { 'application-code': APPLICATION_CODE };

export const uamConfiguratorService = createSlice({
  name: "uamConfiguratorService",
  initialState: {
    uamLoader: false,
  },
  reducers: {
    setUamLoader: (state, action) => {
      state.uamLoader = action.payload;
    },
  },
});

export const { setUamLoader } = uamConfiguratorService.actions;

/**
 * POST /uam-configurator/roles/list
 * Headers: { application-code }
 * Response: { data: [{ role_code, name, status, action_code }] }
 */
export const getRoles = () => () => {
  return axiosInstance({
    url: UAM_LIST_ROLES,
    method: "POST",
    headers: UAM_HEADERS,
    data: {},
  });
};

/**
 * POST /uam-configurator/roles/create
 * Headers: { application-code }
 * Payload : { name: string }
 * Response: { data: { role_code: number, name: string }, message: string }
 */
export const createRole = (payload) => () => {
  return axiosInstance({
    url: UAM_CREATE_ROLE,
    method: "POST",
    headers: UAM_HEADERS,
    data: { name: payload.name },
  });
};

/**
 * PUT /uam-configurator/roles/update
 * Headers: { application_code }
 * Payload : { role_code: number, name: string }
 * Response: { message: string }
 */
export const updateRole = (payload) => () => {
  return axiosInstance({
    url: UAM_UPDATE_ROLE,
    method: "PUT",
    headers: UAM_HEADERS,
    data: payload,
  });
};

// Access level value mapping: internal UI value → API value (matches backend UAM_ACCESS_LEVEL_ACTION_MAP)
const ACCESS_LEVEL_MAP = {
  full: "full_access",
  view: "view_only",
  none: "no_access",
};

/**
 * PUT /uam-configurator/module-access/update
 * Headers: { application_code }
 * Payload : { updates: [{ role_code, screen_code, access_level }] }
 * Access is granted at screen level; the backend cascades the level to every
 * module/section under that screen.
 * Response: { message: string }
 */
export const updateModuleAccess = (updates) => () => {
  return axiosInstance({
    url: UAM_UPDATE_MODULE_ACCESS,
    method: "PUT",
    headers: UAM_HEADERS,
    data: {
      updates: updates.map(({ role_code, screen_code, access_level }) => ({
        role_code,
        screen_code,
        access_level: ACCESS_LEVEL_MAP[access_level] || access_level,
      })),
    },
  });
};

/**
 * DELETE /uam-configurator/roles/{role_code}
 * Headers: { application_code }
 * Response: { message: string }
 */
export const deleteRole = (role_code) => () => {
  return axiosInstance({
    url: `${UAM_DELETE_ROLE}/${role_code}`,
    method: "DELETE",
    headers: UAM_HEADERS,
  });
};

/**
 * GET /uam-configurator/module-access-matrix
 * Headers: { application_code }
 * Response: { data: { roles: [{ role_code, name }], screens: [{ screen_code, screen_name,
 *             access: { "<role_code>": "<level>" }, sections: [{ module_code, module_name }] }] } }
 *
 * Access is aggregated per screen; sections list the modules under that screen (display only).
 * Access level values from API: full_access | limited_access | view_only | no_access | mixed
 */
export const getModuleAccessMatrix = () => () => {
  return axiosInstance({
    url: UAM_MODULE_ACCESS_MATRIX,
    method: "GET",
    headers: UAM_HEADERS,
  });
};

export default uamConfiguratorService.reducer;
