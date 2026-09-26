import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

import { addSnack } from "actions/snackbarActions";

import { setRecalculateTableLoader } from "../../../slice/planningScreen.slice";

import { API_METHOD } from "../../../../../constants/api.constant";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  RECALCULATE_CONSTRAINT_API,
  RECALCULATE_INITIATED_MESSAGE,
  RECALCULATE_SUCCESS_MESSAGE
} from "../constants/recalculate.constants";

export const recalculateConstraintReq = ({ planCode, req }) => async (
  dispatch
) => {
  dispatch(setRecalculateTableLoader(true));
  try {
    const {
      data: { status }
    } = await axiosInstanceWrapper({
      axiosProps: {
        data: {
          filters: req
        },
        isV3: true,
        method: API_METHOD.POST,
        url: `${RECALCULATE_CONSTRAINT_API}/${planCode}`
      },
      dispatch: dispatch
    });
    if (status) {
      dispatch(
        addSnack({
          message: RECALCULATE_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    } else {
      dispatch(
        addSnack({
          message: RECALCULATE_INITIATED_MESSAGE,
          options: {
            variant: SNACK_VARIANT.INFO
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
    dispatch(setRecalculateTableLoader(false));
  }
};
