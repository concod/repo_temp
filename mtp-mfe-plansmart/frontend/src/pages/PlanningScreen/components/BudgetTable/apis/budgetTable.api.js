import { get } from "lodash";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { API_METHOD } from "../../../../../constants/api.constant";
import axiosInstanceWrapper from "../../../../../utils/axiosInstanceWrapper";
import {
  setBudgetTableLoader,
  setBudgetTableResp,
  setTableViewSetting,
  setCalculationUUID,
  planDetailsSelector,
  setIsWrittenKpiEdited
} from "../../../slice/planningScreen.slice";
import { handleApiResponse } from "../budgetTable.util";
import {
  PLAN_UNDO_API_URL,
  PLAN_RESET_API_URL
} from "../../../planningScreen.constant";
import flattenColDefFunc from "../../../../../utils/getPlanningScreenFlattenColDef";

export const budgetTableCalculateApi = async (
  payload,
  dispatch,
  tableRows,
  tableRef
) => {
  try {
    dispatch(setBudgetTableLoader(true));
    const result = await axiosInstanceWrapper({
      axiosProps: {
        url: `plan-smart/plan/${payload.planCode}/calculate`,
        method: API_METHOD.POST,
        data: payload,
        isV3: true
      },
      dispatch: dispatch
    });

    handleApiResponse({
      result,
      tableRows,
      tableRef,
      dispatch
    });
  } catch (error) {
    console.log(error);
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );

    //update with empty data to reset data
    handleApiResponse({
      result: {},
      tableRows,
      tableRef,
      dispatch
    });
  } finally {
    dispatch(setBudgetTableLoader(false));
  }
};

export const budgetTableCopyPasteApi = async (
  payload,
  { tableRef, dispatch, tableRows }
) => {
  try {
    dispatch(setBudgetTableLoader(true));
    const result = await axiosInstanceWrapper({
      axiosProps: {
        url: `/plan-smart/plan/${payload.planCode}/multi-cell-calculate`,
        method: API_METHOD.POST,
        data: payload.pastePayload,
        isV3: true
      },
      dispatch: dispatch
    });

    handleApiResponse({
      result,
      tableRows,
      tableRef,
      dispatch
    });
  } catch (error) {
    console.log(error);
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );

    //update with empty data to reset data
    handleApiResponse({
      result: {},
      tableRows,
      tableRef,
      dispatch
    });
  } finally {
    dispatch(setBudgetTableLoader(false));
  }
};

export const budgetTableUndoApi = async (
  payload,
  dispatch,
  tableRows,
  tableRef
) => {
  dispatch(setBudgetTableLoader(true));
  try {
    const result = await axiosInstanceWrapper({
      axiosProps: {
        url: PLAN_UNDO_API_URL,
        method: API_METHOD.POST,
        data: payload,
        isV3: true
      }
    });

    handleApiResponse({ result, tableRows, tableRef, dispatch });
  } catch (error) {
    console.log(error);
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        option: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setBudgetTableLoader(false));
  }
};

export const budgetTableResetApi = async (
  payload,
  dispatch,
  tableRows,
  tableRef,
  handleResetCallback
) => {
  dispatch(setBudgetTableLoader(true));
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: PLAN_RESET_API_URL,
        method: API_METHOD.POST,
        data: payload,
        isV3: true
      }
    });

    const responseData = get(response, "data.data", {
      data_row: [],
      column_config: [],
      viewsettings: [],
      levels: 0
    });

    dispatch(
      setBudgetTableResp({
        ...responseData,
        column_config: flattenColDefFunc(
          responseData.column_config,
          responseData.levels
        )
      })
    );
    if (handleResetCallback) {
      handleResetCallback();
    }
    dispatch(setCalculationUUID(null));
  } catch (error) {
    console.log(error);
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        option: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setBudgetTableLoader(false));
  }
};

export const EohBohSyncAction = (payload, tableRef, tableRows) => async (
  dispatch,
  getStore
) => {
  const store = getStore();
  const planDetails = planDetailsSelector(store);

  try {
    dispatch(setBudgetTableLoader(true));
    const result = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `/plan-smart/plan/${planDetails?.plan_code}/sequence-flow`,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });

    handleApiResponse({
      result,
      tableRows,
      tableRef,
      dispatch
    });
    dispatch(setIsWrittenKpiEdited(false));
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
    dispatch(setBudgetTableLoader(false));
  }
};
