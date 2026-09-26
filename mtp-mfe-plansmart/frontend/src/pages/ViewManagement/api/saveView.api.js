import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { API_METHOD } from "constants/api.constant";
import {
  SAVE_VIEW_API_URL,
  VIEW_SAVE_SUCCESS_MSG
} from "../viewManagement.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { getViewList } from "./viewsList.api";
import { addSnack } from "actions/snackbarActions";

export const saveView = (viewDataPayload, setIsModalOpen) => async (
  dispatch
) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        method: API_METHOD.POST,
        url: SAVE_VIEW_API_URL,
        data: viewDataPayload
      },
      dispatch
    });
    if (response.status) {
      dispatch(getViewList(viewDataPayload.screen_id));
      dispatch(
        addSnack({
          message: VIEW_SAVE_SUCCESS_MSG,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      setIsModalOpen(false);
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: error?.response?.data?.message || SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
};
