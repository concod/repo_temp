import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

import { addSnack } from "actions/snackbarActions";

import {
  setVersionTableData,
  setVersionTableLoader
} from "../../../slice/planningScreen.slice";

import { API_METHOD } from "../../../../../constants/api.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { VERSIONS_API_CONSTS } from "../constants";

/**
 * Function to fetch Add/Hide Version table data
 * @param {Number} planCode
 */
export const fetchVersionTableDataReq = (planCode) => async (dispatch) => {
  dispatch(setVersionTableLoader(true));
  try {
    const {
      data: { data }
    } = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        method: API_METHOD.GET,
        url: `${VERSIONS_API_CONSTS.REQUEST_BUDGET}${planCode}${VERSIONS_API_CONSTS.REQUEST_COMPATIBLE_PLANS}`
      },
      dispatch: dispatch
    });
    dispatch(setVersionTableData(data));
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
    dispatch(setVersionTableLoader(false));
  }
};
