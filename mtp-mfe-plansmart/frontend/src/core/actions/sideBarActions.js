import axiosInstance from "../Utils/axios";
import { GET_USER_SCREENS } from "config/api";
import {
  SET_USER_PLATFORM_SCREENS,
  SET_USER_SCREENS,
  SET_ACTIVE_APP_NAME,
  SET_ACTIVE_SIDEBAR_DATA,
  SET_PLANSMART_UNSAVED_STATUS,
  SET_PLANSMART_LOGOUT_STATUS,
} from "./types";

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

export const sideBarData = (app) => {
  return axiosInstance({
    url: `${GET_USER_SCREENS}?apps=${app}`,
    method: "GET",
  });
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
