import axiosInstance from "core/Utils/axios";
import { SET_USER_MANAGEMENT_LIST } from "./types";
import {
  GET_SCREEN_LEVEL_ACCESS,
  GET_MODULE_LEVEL_ACCESS,
  GET_USER_APP_ACCESS_HIERARCHY,
} from "config/api";
import { convertAccessHierarchyToOldFormat } from "core/Utils/functions/utils";

export const getHierarchyAccessDetails = (app, screen) => {
  return axiosInstance({
    url: `${GET_SCREEN_LEVEL_ACCESS}?app=${app}&screen=${screen}`,
    method: "GET",
  });
};

export const setUserManagementList = (data) => async (dispatch) => {
  dispatch({
    type: SET_USER_MANAGEMENT_LIST,
    payload: data,
  });
};

const getUserAccessHierarchy = (app) => {
  return axiosInstance({
    url: GET_USER_APP_ACCESS_HIERARCHY,
    method: "GET",
    params: { app },
  });
};
const getModuleLevelAccessHelper = (app, modules) => {
  let queryParam;
  let body = {};
  if (Array.isArray(modules)) {
    body = {
      applications: {
        [app]: modules,
      },
    };
  } else {
    queryParam = {
      app,
      module,
    };
  }
  return axiosInstance({
    url: `${GET_MODULE_LEVEL_ACCESS}`,
    data: body,
    method: "POST",
    params: !Array.isArray(modules) && queryParam,
  });
};
export const getModuleLevelAccessUtility = ({ app, module }) => async () => {
  let accessTasks = [];
  accessTasks.push(getUserAccessHierarchy(app));
  accessTasks.push(getModuleLevelAccessHelper(app, module));
  const response = await Promise.all(accessTasks);
  return convertAccessHierarchyToOldFormat(
    response[1]?.data?.data[app],
    response[0]?.data?.data
  );
};
