import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  PLANSMART_DOWNLOAD_PLAN_API_URL,
  DOWNLOAD_PLAN_SUCCESS_MESSAGE
} from "../download.constant";
import { API_METHOD } from "constants/api.constant";
import { get } from "lodash";

export const downloadPlanReq = (payload, callback) => async (dispatch) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: PLANSMART_DOWNLOAD_PLAN_API_URL,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });
    const responseStatus = get(response, "data.status");
    if (responseStatus) {
      dispatch(
        addSnack({
          message: DOWNLOAD_PLAN_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    }
    if (callback) {
      callback(responseStatus);
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
    if (callback) {
      callback(false);
    }
  }
};
