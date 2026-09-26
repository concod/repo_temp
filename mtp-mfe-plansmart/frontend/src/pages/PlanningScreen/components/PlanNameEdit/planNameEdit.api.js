import { get } from "lodash";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import {
  setPlanName,
  setSavePlanNameLoader
} from "../../slice/planningScreen.slice";
import { API_METHOD } from "../../../../constants/api.constant";
import {
  SAVE_PLAN_ERROR_MESSAGE,
  SAVE_PLAN_NAME_API_URL,
  SAVE_PLAN_SUCCESS_MESSAGE
} from "./planNameEdit.constant";

export const savePlanName = (payload) => async (dispatch) => {
  try {
    dispatch(setSavePlanNameLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: SAVE_PLAN_NAME_API_URL,
        method: API_METHOD.POST,
        data: {
          plan_display_name: payload.planName,
          plan_code: payload.planCode
        }
      },
      dispatch: dispatch
    });

    if (get(response, "status", false)) {
      dispatch(
        addSnack({
          message:
            get(response, "data.message", null) || SAVE_PLAN_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(setPlanName(payload.planName));
      payload.callback();
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: SAVE_PLAN_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setSavePlanNameLoader(false));
  }
};
