import axiosInstance from "../Utils/axios";
import { GET_USER_SCREENS } from "config/api";
import {
  SET_USER_PLATFORM_SCREENS,
  SET_USER_SCREENS,
  SET_ACTIVE_APP_NAME,
  SET_ACTIVE_SIDEBAR_DATA,
  SET_PLANSMART_UNSAVED_STATUS,
  SET_PLANSMART_LOGOUT_STATUS,
  GET_USER_MANAGEMENT_SCREENS,
} from "./types";
import store from "store";
import { cloneDeep } from "lodash";
import { filterApiResponseByApp } from "core/Utils/functions/utils";

export const sideBarActions = (app) => async (dispatch) => {
  let data = await axiosInstance({
    url: `${GET_USER_SCREENS}?apps=${app}`,
    method: "GET",
  });
  const screenData = data.data.data.map((e) => e.users.screen.name);
  dispatch({
    type: SET_USER_SCREENS,
    payload: { [app]: screenData, screenName: screenData },
  });
};

export const sideBarDataDispatch = (payload) => (dispatch) => {
  dispatch({
    type: SET_USER_SCREENS,
    payload: payload,
  });
};

export const activeSideBarData = (payload) => (dispatch) => {
  dispatch({
    type: SET_ACTIVE_SIDEBAR_DATA,
    payload: payload,
  });
};

const sideBarDataCache = {};

export const sideBarData = (app) => {
  if (!sideBarDataCache[app]) {
    sideBarDataCache[app] = axiosInstance({
      url: `${GET_USER_SCREENS}?apps=${app}`,
      method: "GET",
    }).catch((error) => {
      delete sideBarDataCache[app];
      throw error;
    });
  }
  return sideBarDataCache[app];
};

export const userConfigurationScreenData = (app) => async () => {
  try {
    const state = store.getState();
    const cache = cloneDeep(state.sideBarReducer?.userManagementCache);
    // If cached data is available, use it
    if (cache && cache?.allAppsData) {
      const filteredCacheResponse = filterApiResponseByApp(
        cache?.allAppsData,
        app
      );
      if (filteredCacheResponse) {
        return filteredCacheResponse;
      }
    }

    // If no cache or no relevant cached data, make the API call
    try {
      const resp = await axiosInstance({
        url: GET_USER_SCREENS,
        method: "GET",
      });
      // Store the API response in Redux
      store.dispatch({
        type: GET_USER_MANAGEMENT_SCREENS,
        payload: { allAppsData: resp },
      });
      // Filter the API response by the specific app
      const filteredAPIResponse = filterApiResponseByApp(resp, app);
      return filteredAPIResponse;
    } catch (error) {
      console.error("userConfigurationScreenData api error:", error);
      return null;
    }
  } catch (error) {
    console.error("userConfigurationScreenData error:", error);
  }
};

export const setUserPlatformScreen = (payload) => (dispatch) => {
  dispatch({
    type: SET_USER_PLATFORM_SCREENS,
    payload: payload,
  });
};

export const setActiveUserApp = (payload) => (dispatch) => {
  dispatch({
    type: SET_ACTIVE_APP_NAME,
    payload: payload,
  });
};

/**
 * Action to update budget table unsaved alert status for Logout.
 */
export const setPlanSmartAlertModal = (payload) => (dispatch) => {
  dispatch({
    type: SET_PLANSMART_UNSAVED_STATUS,
    payload: payload,
  });
};

/**
 * Action to update logout as callback for
 * budget table unsaved alert navigation.
 */
export const setPlanSmartLogoutStatus = (payload) => (dispatch) => {
  dispatch({
    type: SET_PLANSMART_LOGOUT_STATUS,
    payload: payload,
  });
};
