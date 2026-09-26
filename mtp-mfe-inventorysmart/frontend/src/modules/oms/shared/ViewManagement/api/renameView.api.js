import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";
import { RENAME_VIEW } from "../viewManagement.constant";

export const renameView = (viewId, viewName, screenId, view_type) => async (dispatch) => {
  const payload = {
    new_view_name: viewName,
    screen_id: screenId,
    view_type: view_type,
  };
  try {
    await axiosInstance({
      url: `${RENAME_VIEW.API_URL}/${viewId}/rename`,
      method: "PUT",
      data: payload,
      isV3: true,
    });
    dispatch(
      addSnack({
        message: RENAME_VIEW.SUCCESS_MSG,
        options: { variant: "success" },
      })
    );
    dispatch(getViewList(screenId));
  } catch (error) {
    dispatch(
      addSnack({
        message: RENAME_VIEW.ERROR_MSG,
        options: { variant: "error" },
      })
    );
  }
};
