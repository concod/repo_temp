import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

import { addSnack } from "actions/snackbarActions";

import {
  setMasterPlanHistoryColDef,
  setMasterPlanHistoryColDefLoader,
  setMasterPlanHistoryData,
  setMasterPlanHistoryDataLoader
} from "../masterPlan.slice";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";

import { API_METHOD } from "../../../constants/api.constant";
import { MASTER_PLAN_API_CONSTS } from "../masterplan.constant";

/**
 * Function to fetch history table column definitions
 */
export const fetchMasterPlanHistoryColDefReq = () => async (dispatch) => {
  dispatch(setMasterPlanHistoryColDef([]));

  try {
    dispatch(setMasterPlanHistoryColDefLoader(true));
    const {
      status,
      data: { data }
    } = await axiosInstanceWrapper({
      axiosProps: {
        url: MASTER_PLAN_API_CONSTS.REQUEST_HISTORY_COL_DEF,
        method: API_METHOD.GET
      },
      dispatch: dispatch
    });

    if (status) {
      const colConfig = agGridColumnFormatter(data);
      dispatch(setMasterPlanHistoryColDef(colConfig));
    } else {
      //TO-DO: Add success snack message
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
    dispatch(setMasterPlanHistoryColDefLoader(false));
  }
};

/**
 * Function to fetch history table data
 */
export const fetchMasterPlanHistoryDataReq = (selectedScreenName) => async (
  dispatch
) => {
  dispatch(setMasterPlanHistoryData([]));

  try {
    dispatch(setMasterPlanHistoryDataLoader(true));
    const {
      data: { status, data }
    } = await axiosInstanceWrapper({
      axiosProps: {
        url: MASTER_PLAN_API_CONSTS.REQUEST_HISTORY_DATA,
        method: API_METHOD.GET,
        params: { season_type: selectedScreenName }
      }
    });
    if (status) {
      dispatch(setMasterPlanHistoryData(data));
    } else {
      //TO-DO: Add success snack message
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
    dispatch(setMasterPlanHistoryDataLoader(false));
  }
};
