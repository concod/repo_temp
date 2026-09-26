import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { API_METHOD } from "constants/api.constant";
import { get } from "lodash";
import { SAVE_PLAN_URL, API_SUCCESS_MESSAGE } from "../savePlan.constant";
import { setSavePlanLoader } from "../../../slice/planningScreen.slice";
import { getDashBoardUrl } from "../savePlan.util";

export const savePlanApiReq = (planCode, planStatus, navigate) => async (
  dispatch
) => {
  dispatch(setSavePlanLoader(true));
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${SAVE_PLAN_URL}/${planCode}`,
        method: API_METHOD.GET
      },
      dispatch: dispatch
    });

    const responseStatus = get(response, "data.status", false);
    const responseMessage = get(response, "data.message", API_SUCCESS_MESSAGE);

    if (responseStatus) {
      dispatch(
        addSnack({
          message: responseMessage,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      setTimeout(() => {
        navigate(getDashBoardUrl(planStatus));
      }, 1000);
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
    dispatch(setSavePlanLoader(false));
  }
};
