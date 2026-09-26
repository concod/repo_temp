import axiosInstance from "../Utils/axios";
import { SET_EVENTS } from "./types";
import {
  GET_EVENTS,
  GET_EVENT_TYPE,
  GET_APP_SCREENS,
  GET_APP_SCREENS_ACTIONS,
  GET_DEPARTMENTS_CHANNEL,
} from "../../config/api";

export const fetchEvents = (queryStr = "") => async (dispatch) => {
  const { data } = await axiosInstance({
    url: GET_EVENTS,
    method: "GET",
  });
  dispatch({
    type: SET_EVENTS,
    payload: data.data,
  });
};

export const fetchEventsType = (queryStr = "") => async () => {
  const { data } = await axiosInstance({
    url: GET_EVENT_TYPE + queryStr,
    method: "GET",
  });
  return data.data;
};
export const fetchAppScreens = (queryStr = "") => async () => {
  const { data } = await axiosInstance({
    url: GET_APP_SCREENS + queryStr,
    method: "GET",
  });
  return data.data;
};

export const fetchAppScreensActions = (queryStr = "") => async () => {
  const { data } = await axiosInstance({
    url: GET_APP_SCREENS_ACTIONS + queryStr,
    method: "GET",
  });
  return data.data;
};
export const fetchDepartmentsAndChannels = (
  reqBody,
  queryStr = ""
) => async () => {
  const { data } = await axiosInstance({
    url: GET_DEPARTMENTS_CHANNEL + queryStr,
    method: "POST",
    data: reqBody,
  });
  return data.data;
};

export const createEvents = async (reqBody = {}) => {
  await axiosInstance({
    url: GET_EVENTS,
    method: "POST",
    data: reqBody,
  });
};
export const updateEvents = async (eventCode, reqBody = {}) => {
  await axiosInstance({
    url: `${GET_EVENTS}/${eventCode}`,
    method: "PUT",
    data: reqBody,
  });
};
export const deleteEvent = async (event_id = "") => {
  await axiosInstance({
    url: GET_EVENTS + `/${event_id}`,
    method: "DELETE",
  });
};
