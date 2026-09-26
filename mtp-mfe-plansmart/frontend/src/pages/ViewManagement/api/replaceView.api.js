import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";

import { getViewList } from "./viewsList.api";

import { API_METHOD } from "constants/api.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { REPLACE_VIEW } from "../viewManagement.constant";

export const replaceView = (Payload, viewId, setIsModalOpen) => async (
  dispatch
) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        method: API_METHOD.PUT,
        url: `${REPLACE_VIEW.API_URL}/${viewId}`,
        data: Payload
      },
      dispatch
    });
    if (response.status) {
      dispatch(getViewList(Payload.screen_id));
      dispatch(
        addSnack({
          message: REPLACE_VIEW.SUCCESS_MSG,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    setIsModalOpen(false);
  }
};
