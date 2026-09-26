import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  PLANSMART_DOWNLOAD_PLAN_API_URL,
  DOWNLOAD_PLAN_INFO_MESSAGE
} from "./downloadPlanModal.constant";
import { get } from "lodash";
import { API_METHOD } from "constants/api.constant";
import { setDownloadPlanLoader } from "../../../pages/CommonDashboard/dashboard.slice";

export const downloadPlanReq = (
  payload,
  callback,
  setIsDownloadDisabled,
  setIsCancelButtonDisabled
) => async (dispatch) => {
  dispatch(setDownloadPlanLoader(true));
  setIsDownloadDisabled(true);
  setIsCancelButtonDisabled(true);
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
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
          message: DOWNLOAD_PLAN_INFO_MESSAGE,
          options: {
            variant: SNACK_VARIANT.INFO
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
  } finally {
    dispatch(setDownloadPlanLoader(false));
    setIsDownloadDisabled(false);
    setIsCancelButtonDisabled(false);
  }
};
