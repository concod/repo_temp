import {
  FETCH_APPS_CONFIGURATOR_API,
  FETCH_CLIENT_SUBSCRIBED_APPS,
  SIDE_PANEL_DATA,
  FETCH_CONFIGURATOR_APP_MODULES_INFO,
} from "config/api";
import axiosInstance from "../Utils/axios";
import { CREATE_REDUCER_STATE, UPDATE_REDUCER_STATE } from "./types";

export const getSidePanelData = (screenName, moduleName) => async () => {
  return axiosInstance({
    url: `${SIDE_PANEL_DATA}?screen_name=${screenName}&module_name=${moduleName}`,
    method: "GET",
    headers: {
      "application-code": "3",
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
  });
};
