import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

import { addSnack } from "actions/snackbarActions";

import {
  setRecalculateTableConfig,
  setRecalculateTableLoader
} from "../../../slice/planningScreen.slice";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { API_METHOD } from "../../../../../constants/api.constant";
import {
  CORE_TABLE_CONFIG_API,
  RECALCULATE_TABLE_CONFIG_NAME
} from "../constants/recalculate.constants";

export const getRecalculateTableConfig = () => async (dispatch) => {
  dispatch(setRecalculateTableLoader(true));

  try {
    const {
      data: { data }
    } = await axiosInstanceWrapper({
      axiosProps: {
        url: `${CORE_TABLE_CONFIG_API}${RECALCULATE_TABLE_CONFIG_NAME}`,
        method: API_METHOD.GET
      },
      dispatch: dispatch
    });

    // TODO: Remove the map function once the API is fixed
    let columnData = agGridColumnFormatter(data).map((item) => {
      return {
        ...item,
        suppressSizeToFit: false
      };
    });
    dispatch(setRecalculateTableConfig(columnData));
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
