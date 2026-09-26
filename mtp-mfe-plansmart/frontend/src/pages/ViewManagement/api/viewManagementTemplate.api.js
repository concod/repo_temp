import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { API_METHOD } from "constants/api.constant";
import { TEMPLATE_DATA_API_URL } from "../viewManagement.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  setActiveViewDetails,
  setTemplateDetails
} from "../viewManagement.slice";
import { addSnack } from "actions/snackbarActions";
import { getFormattedData } from "../../PlanningScreen/planningScreen.util";
import { get } from "lodash";

export const getTemplateDetails = (screenId, metricData) => async (
  dispatch
) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        method: API_METHOD.GET,
        url: `${TEMPLATE_DATA_API_URL}/${screenId}`
      },
      dispatch
    });
    if (response.status) {
      const currentResp = response?.data?.data;
      // Format the `show_hide_metrics` property inside `view_details`
      // const formattedData = getFormattedData(
      //   get(currentResp.view_details, "show_hide_metrics", [])
      // );
      const updatedResp = {
        ...currentResp,
        view_details: {
          ...currentResp.view_details, // Retain other properties of `view_details`
          show_hide_metrics: metricData // Update only the `show_hide_metrics` property
        }
      };
      dispatch(setTemplateDetails(updatedResp));
      dispatch(setActiveViewDetails(updatedResp));
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
