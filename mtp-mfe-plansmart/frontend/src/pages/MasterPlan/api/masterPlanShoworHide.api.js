import { get } from "lodash";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { API_METHOD } from "../../../constants/api.constant";
import {
  setMasterShowHideMetricsData,
  setShowHideMetricLoader
} from "../masterPlan.slice";

import { getFormattedData } from "../components/MasterPlanTable/masterPlanTable.util";
import { addSnack } from "../../../core/actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "../../../constants/toast.constant";

import { MASTER_PLAN_SHOW_HIDE_API } from "constants/modalApi.constant";
export const fetchShowHideData = (currentScreen) => async (dispatch) => {
  dispatch(setShowHideMetricLoader(true));
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${MASTER_PLAN_SHOW_HIDE_API}${currentScreen}`,
        method: API_METHOD.GET
      },
      dispatch: dispatch
    });

    const formattedData = getFormattedData(get(response, "data.data", []));

    dispatch(setMasterShowHideMetricsData(formattedData));
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
    dispatch(setShowHideMetricLoader(false));
  }
};
