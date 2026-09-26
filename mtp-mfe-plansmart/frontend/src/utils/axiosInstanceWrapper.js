import { addSnack } from "actions/snackbarActions";
import axiosInstance from "core/Utils/axios";
import { get } from "lodash";
import { SNACK_VARIANT } from "constants/toast.constant";
import { ERROR_MESSAGE_502 } from "./constants";

import { setIsSnackDispatched } from "../pages/PlanningScreen/slice/planningScreen.slice";

const axiosInstanceWrapper = async ({
  axiosProps,
  dispatch,
  isSnackDispatched = false
}) => {
  try {
    const response = await axiosInstance(axiosProps);

    return response;
  } catch (error) {
    const responseObject = get(error, "response.data");
    const responseMessage = get(responseObject, "message");

    if (error?.response && !isSnackDispatched) {
      if (error?.response?.status === 502) {
        dispatch(
          addSnack({
            message: ERROR_MESSAGE_502,
            options: {
              variant: SNACK_VARIANT.ERROR
            }
          })
        );
      }
    }
    if (responseObject?.show_message && !isSnackDispatched) {
      dispatch(setIsSnackDispatched(true));
      dispatch(
        addSnack({
          message: responseMessage,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );

      return null;
    }

    return Promise.reject({ ...error });
  }
};

export default axiosInstanceWrapper;
