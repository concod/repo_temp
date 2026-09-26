import axiosInstance from "../Utils/axios";
import { cloneDeep } from "lodash";
import { GET_COLUMNS, SET_ALL_DATA } from "../../config/api";
import {
  SAVE_TABLE_STATE,
  SAVE_LAST_SEARCH_TAB,
  SAVE_TABLE_SEARCH_CONFIG,
  SAVE_TABLE_RECENT_CONFIG,
  RESET_TABLE_RECENT_CONFIG,
  SET_COLUMN_SEARCHED,
  KEYBOARD_SHORTCUT_TABLE_ACTION,
  TOGGLE_CELL_COMMENT_PANEL,
  PAGE_LIMIT,
  PAGE_NUMBER,
} from "./types";

// ag grid formatter
export const getColumnsAg = (
  queryParams,
  levelsJson = {},
  actions = {},
  formatSetAllLabel = false,
  isView = false,
  enableCellComment = false,
  enableCellChat = false,
) => async () => {
  const { default: agGridColumnFormatter } = await import("core/Utils/agGrid/column-formatter");
  const { data } = await axiosInstance({
    url: `${GET_COLUMNS}?${queryParams}`,
    method: "GET",
  });
  return agGridColumnFormatter(
    cloneDeep(data.data),
    levelsJson,
    actions,
    formatSetAllLabel,
    null,
    isView,
    enableCellComment,
    false,
    enableCellChat
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

export const setKeyboardTableAction = (key, payload, tableKey) => (
  dispatch
) => {
  dispatch({
    type: KEYBOARD_SHORTCUT_TABLE_ACTION,
    key: key,
    payload: payload,
    tableKey: tableKey,
  });
};

// action to toggle cellCommentPanel's visibility 
export const setCellCommentPanel = (payload) => (dispatch) => {
  dispatch({
    type: TOGGLE_CELL_COMMENT_PANEL,
    payload: payload
  })
}

export const setPageLimit = (payload) => (dispatch) => {
  dispatch({
    type: PAGE_LIMIT,
    payload: payload
  })
};

export const setPageNumber = (payload) => (dispatch) => {
  dispatch({
    type: PAGE_NUMBER,
    payload: payload
  })
}