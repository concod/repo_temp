import axiosInstance from "core/Utils/axios";
import {
  CREATE_PARSER_REDUCER_STATE,
  CREATE_REDUCER_STATE,
  UPDATE_PARSER_REDUCER_STATE,
  UPDATE_REDUCER_STATE,
} from "./types";
import { addSnack } from "./snackbarActions";
import { GET_JSON_STRUCTURE } from "config/api";

export const invokeApi = (apiDetails) => async (dispatch) => {
  try {
    const {
      apiUrl,
      apiMethod,
      payload,
      headers,
      apiResponseAlerts,
    } = apiDetails;
    const { success, error } = apiResponseAlerts;
    let url = apiUrl;
    if (apiMethod === "GET") {
      let parameterString = getQueryParameter(payload);
      url = `${apiUrl}?${parameterString}`;
    }
    const resp = await axiosInstance({
      url: url,
      method: apiMethod,
      headers: headers,
      data: payload,
    });
    if (resp.status === 200) {
      if (apiResponseAlerts?.successResponseFromApi) {
        dispatch(
          addSnack({
            message: resp?.data?.message,
            options: {
              variant: "success",
            },
          })
        );
      } else if (apiResponseAlerts?.success) {
        dispatch(
          addSnack({
            message: success,
            options: {
              variant: "success",
            },
          })
        );
      }

      return resp?.data?.data;
    } else if (resp.status !== 200) {
      if (apiResponseAlerts?.errorResponseFromApi) {
        dispatch(
          addSnack({
            message: resp?.data?.message,
            options: {
              variant: "error",
            },
          })
        );
      } else if (apiResponseAlerts?.error) {
        dispatch(
          addSnack({
            message: error,
            options: {
              variant: "success",
            },
          })
        );
      }
      return false;
    }
  } catch (error) {
    const { apiResponseAlerts } = apiDetails;
    const { error: errorMsg } = apiResponseAlerts;
    dispatch(
      addSnack({
        message: errorMsg,
        options: {
          variant: "error",
        },
      })
    );
    console.error("invokeApi error", error);
    return false;
  }
};

export const getJsonData = (moduleCode, screenName, configName) => async () => {
  return axiosInstance({
    url: `${GET_JSON_STRUCTURE}?module_code=${moduleCode}&screen=${screenName}&configuration_name=${configName}`,
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
    type: CREATE_PARSER_REDUCER_STATE,
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
    type: UPDATE_PARSER_REDUCER_STATE,
    payload: { key, value },
  });
};

export const getQueryParameter = (payload) => {
  let parameterString = "";
  Object.keys(payload)?.forEach((key, i) => {
    if (i !== 0) {
      parameterString += "&";
    }
    parameterString += key + "=" + payload[key];
  });
  return parameterString;
};
