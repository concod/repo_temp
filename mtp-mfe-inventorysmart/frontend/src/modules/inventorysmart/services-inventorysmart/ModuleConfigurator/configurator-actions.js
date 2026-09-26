import {
  FETCH_APPS_CONFIGURATOR_API,
  FETCH_CLIENT_SUBSCRIBED_APPS,
  SIDE_PANEL_DATA,
  FETCH_CONFIGURATOR_APP_MODULES_INFO,
} from "config/api";
import { FETCH_DIMENSION_HIERARCHIES } from "core/constants/apiConstants";
import axiosInstance from "core/Utils/axios";
import { CREATE_REDUCER_STATE, UPDATE_REDUCER_STATE } from "core/actions/types";

export const getSidePanelData = (screenName, moduleName, screenCode, moduleCode) => async () => {
  // Build query parameters - include all available parameters
  const params = new URLSearchParams();

  // Add screen_code and module_code if available
  if (screenCode) {
    params.append("screen_code", String(screenCode));
  }
  if (moduleCode) {
    params.append("module_code", String(moduleCode));
  }

  // Add screen_name and module_name if available
  if (screenName) {
    params.append("screen_name", screenName);
  }
  if (moduleName) {
    params.append("module_name", moduleName);
  }

  return axiosInstance({
    url: `${SIDE_PANEL_DATA}?${params.toString()}`,
    method: "GET",
    headers: {
      "application-code": "1",
    },
  });
};

/**
 * createReducerState is an action
 * which will add dynamic key to the
 * configurator reducer
 * @param {string} key will be the dynamic key to be created
 * @returns
 */
export const createReducerState = (key, value) => async (dispatch) => {
  dispatch({
    type: CREATE_REDUCER_STATE,
    payload: { key, value: value },
  });
};

/**
 * updateReducerState is an action
 * which will update the dynamic
 * state which was created through createReducerState
 * @param {string} key is the dynamic key whose values need to be updated
 * @param {object} value updated value for the key
 * @returns
 */
export const updateReducerState = (key, value) => async (dispatch) => {
  dispatch({
    type: UPDATE_REDUCER_STATE,
    payload: { key, value },
  });
};

export const getConfiguratorAppsConfig = () => async () => {
  return axiosInstance({
    url: FETCH_APPS_CONFIGURATOR_API,
    method: "GET",
    headers: {
      "application-code": "3",
    },
  });
};

export const getClientSubscribedApps = () => async () => {
  return axiosInstance({
    url: FETCH_CLIENT_SUBSCRIBED_APPS,
    method: "GET",
    headers: {
      "application-code": "3",
    },
  });
};

export const getModulesForConfigurator = (app) => async () => {
  let queryParam = { app };
  return axiosInstance({
    url: FETCH_CONFIGURATOR_APP_MODULES_INFO,
    method: "GET",
    params: queryParam,
    headers: {
      "is-configurator": true,
    },
  });
};

/**
 * Fetches side layout configuration without any query params.
 * Used to get the base side layout config on first load.
 */
export const getSideLayoutConfig = () => async () => {
  return axiosInstance({
    url: SIDE_PANEL_DATA,
    method: "GET",
    headers: {
      "application-code": "1",
    },
  });
};

export const getDimensionHierarchies = (screen) => async () => {
  let queryParam = { screen };
  return axiosInstance({
    url: FETCH_DIMENSION_HIERARCHIES,
    method: "GET",
    params: queryParam,
    headers: {
      "application-code": "1",
    },
  });
};
