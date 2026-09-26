import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";
import { markViewSaved } from "../slices/viewManagement.slice";
import {
  VIEW_MANAGEMENT_API_URLS,
  VIEW_SAVE_SUCCESS_MSG,
} from "../viewManagement.constant";
import {
  resetExpansionStateWithoutPause,
  markViewAsSaved,
} from "../viewState.util";

export const saveView = (viewDataPayload, setIsModalOpen) => async (dispatch) => {
  try {
    const response = await axiosInstance({
      url: VIEW_MANAGEMENT_API_URLS.SAVE_VIEW_API_URL,
      method: "POST",
      data: viewDataPayload,
      isV3: true,
    });
    resetExpansionStateWithoutPause();
    markViewAsSaved();

    dispatch(getViewList(viewDataPayload.screen_id));
    dispatch(
      addSnack({
        message: VIEW_SAVE_SUCCESS_MSG,
        options: { variant: "success" },
      })
    );
    dispatch(markViewSaved(response?.data?.data?.view_id));
    setIsModalOpen(false);
  } catch (error) {
    dispatch(
      addSnack({
        message: error?.response?.data?.message || "Something went wrong",
        options: { variant: "error" },
      })
    );
  }
};
