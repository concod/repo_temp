import {
  LOADER,
  SET_PERMISSIONS,
  SET_GROUPS,
  SET_GRP_DATA_FETCH_STATUS,
  SET_ROLE_DATA_FETCH_STATUS,
  SET_USER_DATA_FETCH_STATUS,
  SET_USERS,
  SET_ROLES,
  SET_PERMISSION_DATA_STATUS,
} from "./types";
import axios from "../Utils/axios";
import {
  USER_DETAILS,
  USER_GROUPS,
  USER_PERMISSIONS,
  USER_ROLES,
  USER_ROLE_GROUP_MAP,
} from "../../config/api";

export const getusers = () => async () => {
  return axios({
    url: `${USER_DETAILS}?fields=id,first_name,email,groups,roles&no_pagination=1`,
    method: "GET",
  });
};
export const setUsers = (users) => (dispatch) => {
  dispatch({
    type: SET_USERS,
    payload: users,
  });
};

export const getroles = () => () => {
  return axios({ url: `${USER_ROLES}?no_pagination=1`, method: "GET" });
};

export const setRoles = (roles) => (dispatch) => {
  dispatch({
    type: SET_ROLES,
    payload: roles,
  });
};
export const getgroups = () => () => {
  return axios({ url: `${USER_GROUPS}?no_pagination=1`, method: "GET" });
};

export const setGroups = (groups) => (dispatch) => {
  dispatch({
    type: SET_GROUPS,
    payload: groups,
  });
};

export const creategroup = (grpData) => () => {
  return axios({ url: `${USER_GROUPS}`, method: "POST", data: grpData });
};

export const setPermissions = (permissions) => (dispatch) => {
  dispatch({
    type: SET_PERMISSIONS,
    payload: permissions,
  });
};
export const getpermissions = () => () => {
  return axios({ url: USER_PERMISSIONS, method: "GET" });
};

export const updateGrpPermissions = (reqData) => () => {
  return axios({
    url: `${USER_GROUPS}${reqData.id}/`,
    method: "PUT",
    data: reqData,
  });
};

export const ToggleLoader = (loadStatus) => (dispatch) => {
  dispatch({
    type: LOADER,
    payload: {
      status: loadStatus,
    },
  });
};

export const setGrpDataFetchStatus = () => (dispatch) => {
  dispatch({
    type: SET_GRP_DATA_FETCH_STATUS,
  });
};

export const setRoleDataFetchStatus = () => (dispatch) => {
  dispatch({
    type: SET_ROLE_DATA_FETCH_STATUS,
  });
};
export const setUserDataFetchStatus = () => (dispatch) => {
  dispatch({
    type: SET_USER_DATA_FETCH_STATUS,
  });
};
export const setPermissionDataFetchStatus = () => (dispatch) => {
  dispatch({
    type: SET_PERMISSION_DATA_STATUS,
  });
};

export const updateUsrRoleGrpData = (reqData) => () => {
  return axios({
    url: USER_ROLE_GROUP_MAP,
    method: "POST",
    data: reqData,
  });
};
