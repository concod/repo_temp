import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import {
  setActiveViewDetails,
  setActiveView,
  viewDetailsFetchStarted,
  viewDetailsFetchFinished,
} from "../slices/viewManagement.slice";
import { setTempViewDetails } from "../../../pages-oms/OrderManagement/slices/pivot.slice";
import { VIEW_MANAGEMENT_API_URLS } from "../viewManagement.constant";
import { setViewState } from "../viewState.util";

export const getViewDetails = (viewId, callback) => async (dispatch) => {
  dispatch(viewDetailsFetchStarted());
  try {
    const response = await axiosInstance({
      url: `${VIEW_MANAGEMENT_API_URLS.VIEW_DETAIL_API_URL}/${viewId}`,
      method: "GET",
      isV3: true,
    });
    const currentResp = get(response, "data.data.view", null);
    if (currentResp) {
      const viewState = get(response, "data.data.view_state", null);
      setViewState(currentResp.view_id, viewState, null);

      dispatch(setActiveViewDetails(currentResp));

      const currentView = {
        view_id: currentResp?.view_id,
        view_name: currentResp?.view_name,
        view_type: currentResp?.view_type,
        is_default: currentResp?.is_default,
      };
      dispatch(setActiveView(currentView));
      dispatch(setTempViewDetails(null));

      if (typeof callback === "function") {
        callback(currentResp);
      }
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: { variant: "error" },
      })
    );
  } finally {
    dispatch(viewDetailsFetchFinished());
  }
};
