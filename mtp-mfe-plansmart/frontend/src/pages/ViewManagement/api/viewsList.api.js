import { get } from "lodash";

import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";

import { setListedViewList } from "../viewManagement.slice";

import { API_METHOD } from "constants/api.constant";
import { VIEW_LIST_API_URL } from "../viewManagement.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";


export const getViewList = (screenId) => async (dispatch) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${VIEW_LIST_API_URL}/${screenId}`,
        method: API_METHOD.GET
      },
      dispatch
    });
    if (response.status) {
      dispatch(
        setListedViewList({
          global_views: get(response, "data.data.global_views", []),
          personal_views: get(response, "data.data.personal_views", [])
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
  }
};
