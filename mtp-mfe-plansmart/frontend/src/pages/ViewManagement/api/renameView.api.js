import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";

import { API_METHOD } from "constants/api.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { RENAME_VIEW } from "../viewManagement.constant";

export const renameView = (viewId, viewName, screenId) => async (dispatch) => {
  const payload = {
    new_view_name: viewName
  };
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${RENAME_VIEW.API_URL}/${viewId}/rename`,
        method: API_METHOD.PUT,
        data: payload
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(
        addSnack({
          message: RENAME_VIEW.SUCCESS_MSG,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(getViewList(screenId));
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: RENAME_VIEW.ERROR_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
};
