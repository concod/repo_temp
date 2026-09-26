import { get } from "lodash";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { setScreenIdMapping } from "../viewManagement.slice";
import { API_METHOD } from "constants/api.constant";
import { SCREEN_NAME_ID_MAPPING_URL } from "../viewManagement.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";

export const getScreensMapping = () => async (dispatch) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: SCREEN_NAME_ID_MAPPING_URL,
        method: API_METHOD.GET
      },
      dispatch
    });
    if (response.status) {
      dispatch(setScreenIdMapping(get(response, "data.data", {})));
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
  }
};
