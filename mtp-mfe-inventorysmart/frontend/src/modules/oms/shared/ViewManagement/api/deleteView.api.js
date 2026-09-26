import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";
import { DELETE_VIEW_API } from "../components/DeleteView/deleteView.constant";

export const deleteViewApi = (viewId, setIsDeleteModalOpen, screenId) => async (dispatch) => {
  try {
    await axiosInstance({
      url: `${DELETE_VIEW_API.API_URL}/${viewId}`,
      method: "DELETE",
      isV3: true,
    });
    dispatch(
      addSnack({
        message: DELETE_VIEW_API.SUCCESS_MESSAGE,
        options: { variant: "success" },
      })
    );
    dispatch(getViewList(screenId));
  } catch (error) {
    dispatch(
      addSnack({
        message: DELETE_VIEW_API.ERROR_MESSAGE,
        options: { variant: "error" },
      })
    );
  } finally {
    setIsDeleteModalOpen(false);
  }
};
