import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";

import {getViewList} from './viewsList.api';

import { API_METHOD } from "constants/api.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { DELETE_VIEW_API } from "../components/DeleteView/deleteView.constant";

export const deleteViewApi = (viewId, setIsDeleteModalOpen,screenId) => async (
  dispatch
) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${DELETE_VIEW_API.API_URL}/${viewId}`,
        method: API_METHOD.DELETE
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(
        addSnack({
          message: DELETE_VIEW_API.SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(getViewList(screenId))
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: DELETE_VIEW_API.ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    setIsDeleteModalOpen(false);
  }
};
