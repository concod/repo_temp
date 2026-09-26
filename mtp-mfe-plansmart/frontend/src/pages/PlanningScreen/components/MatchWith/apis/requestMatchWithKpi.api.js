import { API_METHOD } from "../../../../../constants/api.constant";
import { UPDATE_BUDGET_TABLE_MATCH_WITH } from "../../../../../constants/modalApi.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { SUCCESS_MESSAGE } from "../matchWith.constants";
import { getBudgetTableData } from "../../../apis/planningScreen.api";
import {
  setMatchWithKpiUpdateLoader,
  setCalculationUUID,
  setIsMatchWith,
  setIsEditActionsEnabled,
  setBudgetTableResp,
  setTableViewSetting
} from "../../../slice/planningScreen.slice";
import { get } from "lodash";
import flattenColDefFunc from "../../../../../utils/getPlanningScreenFlattenColDef";

export const requestMatchWithKpi = (payload, callback) => async (dispatch) => {
  try {
    dispatch(setMatchWithKpiUpdateLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: UPDATE_BUDGET_TABLE_MATCH_WITH,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });

    if (response?.data?.status) {
      dispatch(
        addSnack({
          message: SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );

      const calculationUUID = get(
        response,
        `data.data.listing_data.session_id`,
        null
      );
      dispatch(setCalculationUUID(calculationUUID));
      const listingData = get(response, "data.data.listing_data", {
        data_row: [],
        column_config: [],
        viewsettings: [],
        levels: 0
      });

      dispatch(
        setBudgetTableResp({
          ...listingData,
          column_config: flattenColDefFunc(
            listingData.column_config,
            listingData.levels
          )
        })
      );
      callback();

      dispatch(setIsMatchWith(true));
      dispatch(setIsEditActionsEnabled(false));
    }

    return response;
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
    dispatch(setMatchWithKpiUpdateLoader(false));
  }
};
