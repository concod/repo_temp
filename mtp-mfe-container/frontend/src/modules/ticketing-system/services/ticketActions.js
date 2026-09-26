import axiosInstance from "core/Utils/axios";
import {
  GET_TENANT_CONFIG,
  TICKETING_APPLY_FILTER_API,
  TICKETING_FILTER_API,
  TICKETING_RECENT_ACTIVITIES,
  TICKETING_TICKET_COMMENT_INFO,
} from "config/api";
import { SET_TICKETING_DATES } from "../constants";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";

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
  return tenantConfigApiCache(applicationCode, {
    attribute_name: "ticketing_client_view",
  })();
};

export const setTicketingDates = (data) => (dispatch) => {
  dispatch({
    type: SET_TICKETING_DATES,
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
