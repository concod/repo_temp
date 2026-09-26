import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { setListedViewList } from "../slices/viewManagement.slice";
import { VIEW_MANAGEMENT_API_URLS } from "../viewManagement.constant";

export const getViewList = (screenId) => async (dispatch) => {
  try {
    const response = await axiosInstance({
      url: `${VIEW_MANAGEMENT_API_URLS.VIEW_LIST_API_URL}/${screenId}`,
      method: "GET",
      isV3: true,
    });
    dispatch(
      setListedViewList({
        global_views: get(response, "data.data.global_views", []),
        personal_views: get(response, "data.data.personal_views", []),
      })
    );
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: { variant: "error" },
      })
    );
  }
};
