import axiosInstance from "../Utils/axios";
import {
  GET_TENANT_CONFIG,
  TICKETING_APPLY_FILTER_API,
  TICKETING_FILTER_API,
  TICKETING_RECENT_ACTIVITIES,
  TICKETING_TICKET_COMMENT_INFO,
} from "../../config/api";
import { SET_DETAILED_VIEW_TICKETING_DATES, SET_IS_WEEK_TO_DATE_ROW_MAXIMIZED, SET_TICKETING_DATES } from "./types";

export const getTicketingFiltersData = (postBody) => async () => {
  return axiosInstance({
    url: TICKETING_FILTER_API,
    method: "POST",
    data: postBody,
  });
};

export const approveFiltersData = (payload) => async () => {
  return axiosInstance({
    url: TICKETING_APPLY_FILTER_API,
    method: "POST",
    data: payload,
  });
};

export const getRecentActivitiesData = (payload) => async () => {
  return axiosInstance({
    url: TICKETING_RECENT_ACTIVITIES,
    method: "POST",
    data: payload,
  });
};

export const getTicketCommentInfo = (payload) => async () => {
  return axiosInstance({
    url: TICKETING_TICKET_COMMENT_INFO,
    method: "POST",
    data: payload,
  });
};

export const getCheckboxInfo = (applicationCode = 3) => async () => {
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=ticketing_client_view"}`,
    method: "GET",
  });
};

export const setTicketingDates = (data) => (dispatch) => {
  dispatch({
    type: SET_TICKETING_DATES,
    payload: data,
  });
};

export const setDetailedViewTicketingDates = (data) => (dispatch) => {
  dispatch({
    type: SET_DETAILED_VIEW_TICKETING_DATES,
    payload: data,
  });
};

export const setIsWeekToDateRowMaximized = (data) => (dispatch) => {
  dispatch({
    type: SET_IS_WEEK_TO_DATE_ROW_MAXIMIZED,
    payload: data,
  });
};

export const downloadReport = (payload) => {
  return axiosInstance({
    url: `core/table/download-table`,
    method: "POST",
    data: payload,
  });
};
