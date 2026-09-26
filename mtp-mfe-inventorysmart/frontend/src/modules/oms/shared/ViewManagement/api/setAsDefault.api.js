import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { getViewList } from "./viewsList.api";
import { setListedViewList, setActiveView } from "../slices/viewManagement.slice";
import {
  SET_AS_DEFAULT,
  UNSET_AS_DEFAULT_SUCCESS_MESSAGE,
} from "../viewManagement.constant";
import { saveViewStateToBackend } from "../viewState.util";

export const setAsDefault = (activeView, screenId, viewsList, viewType) => async (dispatch) => {
  const payload = { screen_id: screenId, status: !activeView?.is_default };
  await saveViewStateToBackend(dispatch);
  try {
    await axiosInstance({
      url: `${SET_AS_DEFAULT.API_URL}/${activeView?.view_id}/set-default`,
      method: "PUT",
      data: payload,
      isV3: true,
    });
    dispatch(
      addSnack({
        message: activeView?.is_default
          ? UNSET_AS_DEFAULT_SUCCESS_MESSAGE
          : SET_AS_DEFAULT.SUCCESS_MSG,
        options: { variant: "success" },
      })
    );
    const currentViews = viewsList[`${viewType}_views`] || [];
    const updatedViews = currentViews.map((view) => {
      if (view.is_default && view.view_id !== activeView.view_id) {
        return { ...view, is_default: false };
      } else if (view.view_id === activeView.view_id) {
        return { ...view, is_default: !activeView.is_default };
      }
      return view;
    });
    const updatedViewList = {
      ...viewsList,
      [`${viewType}_views`]: updatedViews,
    };
    dispatch(setListedViewList(updatedViewList));
    dispatch(setActiveView({ ...activeView, is_default: !activeView.is_default }));
  } catch (error) {
    dispatch(
      addSnack({
        message: SET_AS_DEFAULT.ERROR_MSG,
        options: { variant: "error" },
      })
    );
  }
};
