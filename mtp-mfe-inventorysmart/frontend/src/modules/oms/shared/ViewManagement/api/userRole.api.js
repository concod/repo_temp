import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { setUserIsPlanner, setUserIsAdmin } from "../slices/viewManagement.slice";
import { VIEW_MANAGEMENT_API_URLS } from "../viewManagement.constant";

export const getUserRole = () => async (dispatch) => {
  try {
    const response = await axiosInstance({
      url: VIEW_MANAGEMENT_API_URLS.USER_ROLE_API_URL,
      method: "GET",
      isV3: true,
    });
    dispatch(setUserIsPlanner(get(response, "data.data.isPlanner", null)));
    dispatch(setUserIsAdmin(get(response, "data.data.isAdmin", null)));
  } catch (error) {
    dispatch(setUserIsPlanner(false));
    dispatch(setUserIsAdmin(false));
  }
};
