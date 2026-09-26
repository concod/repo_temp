import { get } from "lodash";

import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";

import { getFormattedData } from "../../PlanningScreen/planningScreen.util";

import { setActiveViewDetails, setActiveView } from "../viewManagement.slice";
import {
  setIsVersionChipVisible,
  setPrevSelectedPlans
} from "../../PlanningScreen/slice/planningScreen.slice";

import { API_METHOD } from "constants/api.constant";
import { VIEW_DETAIL_API_URL } from "../viewManagement.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";

export const getViewDetails = (viewId, callback) => async (dispatch) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        method: API_METHOD.GET,
        url: `${VIEW_DETAIL_API_URL}/${viewId}`
      },
      dispatch
    });
    if (response.status) {
      const currentResp = response?.data?.data?.view;
      const formattedData = getFormattedData(
        get(currentResp.view_details, "show_hide_metrics", [])
      );
      const updatedResp = {
        ...currentResp,
        show_hide_metrics: formattedData
      };

      // Update the current view details in the view management panel
      dispatch(setActiveViewDetails(updatedResp));

      // Set the selected view as the current view
      const currentView = {
        view_id: updatedResp?.view_id,
        view_name: updatedResp?.view_name,
        view_type: updatedResp?.view_type,
        is_default: updatedResp?.is_default
      };
      dispatch(setActiveView(currentView));
      callback(
        updatedResp?.view_details?.view_settings,
        updatedResp?.view_details?.show_hide_metrics
      );

      //remove version filter chip
      dispatch(setIsVersionChipVisible(false));
      dispatch(setPrevSelectedPlans([]));
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
