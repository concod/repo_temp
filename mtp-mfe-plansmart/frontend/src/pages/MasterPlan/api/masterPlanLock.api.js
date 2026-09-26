import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

import { API_METHOD } from "../../../constants/api.constant";

import { addSnack } from "actions/snackbarActions";

import {
  selectedFiltersSelector,
  setMasterPlanLockLoader,
  setMasterPlanLockStatus,
  setMasterPlanApproveStatus,
  masterPlanLockStatusSelector,
  masterPlanApproveAccessSelector
} from "../masterPlan.slice";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { MASTER_PLAN_API_CONSTS } from "../masterplan.constant";

/**
 * Function to lock master plan
 */
export const masterPlanLockReq = () => async (dispatch, getStore) => {
  const store = getStore();

  const approveAccess = masterPlanApproveAccessSelector(store);
  const lockStatus = masterPlanLockStatusSelector(store);
  const selectedFilters = selectedFiltersSelector(store);

  try {
    dispatch(setMasterPlanLockLoader(true));
    const {
      data: {
        status,
        data: { approve_status, lock_status, message }
      }
    } = await axiosInstanceWrapper({
      axiosProps: {
        url: MASTER_PLAN_API_CONSTS.REQUEST_LOCK,
        method: API_METHOD.POST,
        data: {
          lock_status: !lockStatus,
          filters: selectedFilters
        }
      },
      dispatch: dispatch
    });

    if (status) {
      dispatch(setMasterPlanLockStatus(lock_status));
      dispatch(
        addSnack({
          message: message,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      if (approveAccess) {
        dispatch(setMasterPlanApproveStatus(approve_status));
      }
    } else {
      //TO-DO: Add snack message
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
    dispatch(setMasterPlanLockLoader(false));
  }
};
