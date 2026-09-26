import { get } from "lodash";

import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { setUserIsPlanner, setUserIsAdmin } from "../viewManagement.slice";

import { USER_ROLE_API_URL } from "../viewManagement.constant";
import { API_METHOD } from "constants/api.constant";

export const getUserRole = () => async (dispatch) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: USER_ROLE_API_URL,
        method: API_METHOD.GET
      },
      dispatch
    });
    if (response.status) {
      dispatch(setUserIsPlanner(get(response, "data.data.isPlanner", null)));
      dispatch(setUserIsAdmin(get(response, "data.data.isAdmin", null)));
    }
  } catch (error) {
    dispatch(setUserIsPlanner(false));
    dispatch(setUserIsAdmin(false));
  }
};
