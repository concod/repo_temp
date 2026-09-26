import axiosInstance from "../Utils/axios";
import { GET_COLUMNS, SET_ALL_DATA } from "../../config/api";
import {
  SAVE_TABLE_STATE,
  SAVE_LAST_SEARCH_TAB,
  SAVE_TABLE_SEARCH_CONFIG,
  SAVE_TABLE_RECENT_CONFIG,
  RESET_TABLE_RECENT_CONFIG,
  SET_FONT_SIZE,
  SET_NUMERIC_FORMAT,
  SET_COLUMN_SEARCHED,
} from "./types";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

// ag grid formatter
export const getColumnsAg = (
  queryParams,
  levelsJson = {},
  actions = {},
  formatSetAllLabel = false,
  isView = false
) => async () => {
  const { data } = await axiosInstance({
    url: `${GET_COLUMNS}?${queryParams}`,
    method: "GET",
  });
  return agGridColumnFormatter(
    data.data,
    levelsJson,
    actions,
    formatSetAllLabel,
    null,
    isView
  );
};

export const setColumns = (queryParams, dataObj) => async () => {
  return axiosInstance({
    url: `${GET_COLUMNS}/?tableName=${queryParams}`,
    method: "PUT",
    data: dataObj,
  });
};
export const setAllData = (dataObj) => async () => {
  return axiosInstance({
    url: SET_ALL_DATA,
    method: "POST",
    data: dataObj,
  });
};

export const setTableState = (payload) => (dispatch) => {
  dispatch({
    type: SAVE_TABLE_STATE,
    payload: payload,
  });
};

export const setTableSearchConfig = (payload) => (dispatch) => {
  dispatch({
    type: SAVE_TABLE_SEARCH_CONFIG,
    payload: payload,
  });
};

export const setTableRecentChanges = (key, payload) => (dispatch) => {
  dispatch({
    type: SAVE_TABLE_RECENT_CONFIG,
    key: key,
    payload: payload,
  });
};

export const resetTableRecentChanges = () => (dispatch) => {
  dispatch({
    type: RESET_TABLE_RECENT_CONFIG,
  });
};

export const setColumnSearched = (payload) => (dispatch) => {
  dispatch({
    type: SET_COLUMN_SEARCHED,
    payload: payload,
  });
};

export const setColumnsConfiguration = (dataObj) => async () => {
  return axiosInstance({
    url: `${GET_COLUMNS}/user-preference`,
    method: "POST",
    data: dataObj,
  });
};

export const setSaveSearchConfig = async (dataObj) => {
  return axiosInstance({
    url: "core/table-fields/user-search-preference",
    method: "POST",
    data: dataObj,
  });
};

export const setLastSearchType = (payload) => (dispatch) => {
  dispatch({
    type: SAVE_LAST_SEARCH_TAB,
    payload: payload,
  });
};
