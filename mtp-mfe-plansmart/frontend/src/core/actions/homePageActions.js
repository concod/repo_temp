import axiosInstance from "../Utils/axios";
import { GET_HOME_APPLICATION } from "config/api";
import { SET_USER_APPS } from "./types";

export const homePageActions = () => async (dispatch) => {
  try {
    let data = await axiosInstance({
      url: `${GET_HOME_APPLICATION}`,
      method: "GET",
    });
    const userApps = data.data.data.map((e) => e.application);
    dispatch({
      type: SET_USER_APPS,
      payload: userApps,
    });
  } catch (err) {
    dispatch({
      type: SET_USER_APPS,
      payload: [],
    });
  }
};

