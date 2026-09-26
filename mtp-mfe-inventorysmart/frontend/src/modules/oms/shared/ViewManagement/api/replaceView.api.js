import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";
import { REPLACE_VIEW } from "../viewManagement.constant";
import {
  resetExpansionStateWithoutPause,
  markViewAsSaved,
} from "../viewState.util";

export const replaceView = (payload, viewId, setIsModalOpen) => async (dispatch) => {
  try {
    await axiosInstance({
      url: `${REPLACE_VIEW.API_URL}/${viewId}`,
      method: "PUT",
      data: payload,
      isV3: true,
    });
    resetExpansionStateWithoutPause();
    markViewAsSaved();

    dispatch(getViewList(payload.screen_id));
    dispatch(
      addSnack({
        message: REPLACE_VIEW.SUCCESS_MSG,
        options: { variant: "success" },
      })
    );
  } catch (error) {
    dispatch(
      addSnack({
        message: error?.response?.data?.message || "Something went wrong",
        options: { variant: "error" },
      })
    );
  } finally {
    setIsModalOpen(false);
  }
};
