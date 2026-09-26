import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

import { addSnack } from "actions/snackbarActions";

import {
  masterPlanLockAccessSelector,
  selectedFiltersSelector,
  setMasterPlanApproveLoader,
  setMasterPlanApproveStatus,
  setMasterPlanLockStatus
} from "../masterPlan.slice";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { API_METHOD } from "../../../constants/api.constant";
import { MASTER_PLAN_API_CONSTS } from "../masterplan.constant";

/**
 * Function to approve master plan
 */
export const masterPlanApproveReq = () => async (dispatch, getStore) => {
  const store = getStore();
  const lockAccess = masterPlanLockAccessSelector(store);
  const selectedFilters = selectedFiltersSelector(store);

  try {
    dispatch(setMasterPlanApproveLoader(true));
    const {
      data: {
        status,
        data: { lock_status, approve_status }
      }
    } = await axiosInstanceWrapper({
      axiosProps: {
        data: {
          filters: selectedFilters
        },
        isV3: true,
        method: API_METHOD.POST,
        url: MASTER_PLAN_API_CONSTS.REQUEST_APPROVE
      },
      dispatch: dispatch
    });
    if (status) {
      dispatch(setMasterPlanApproveStatus(approve_status));
      dispatch(
        addSnack({
          message: MASTER_PLAN_API_CONSTS.APPROVE_API_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      if (lockAccess) {
        dispatch(setMasterPlanLockStatus(lock_status));
      } else {
        //No action here
      }
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
    dispatch(setMasterPlanApproveLoader(false));
  }
};
