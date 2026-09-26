import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { setActiveView, setActiveViewDetails } from "../slices/viewManagement.slice";
import { VIEW_MANAGEMENT_API_URLS } from "../viewManagement.constant";

export const getTemplateDetails = (screenId, metricData, callback) => async (dispatch) => {
  try {
    const response = await axiosInstance({
      url: `${VIEW_MANAGEMENT_API_URLS.TEMPLATE_DATA_API_URL}/${screenId}`,
      method: "GET",
      isV3: true,
    });
    const currentResp = response?.data?.data;
    // The template table stores pivot config under "template_config"; saved views
    // use "view_details".  Normalise to view_details so all downstream code
    // (deriveOmsDimensions, usePivotPanelViewSync, etc.) uses a single key.
    const templatePayload = currentResp?.template_config || currentResp?.view_details || {};
    const updatedResp = {
      ...currentResp,
      // Sentinel so usePivotPanelViewSync's shouldUpdateView gate passes:
      // Number.isFinite(-1) === true, and -1 !== null (activeViewId initial
      // value) so the hook fires handleApplyPivot exactly once, then tracks
      // activeViewId = -1 and won't re-apply unless a real view is loaded.
      view_id: -1,
      view_details: {
        ...templatePayload,
        // Prefer caller-provided metricData when non-empty (e.g. show/hide overrides).
        // Fall back to the BE-supplied show_hide_metrics so the template's KPI list
        // is not wiped out when ViewManagementController passes the default empty [].
        show_hide_metrics:
          metricData?.length > 0
            ? metricData
            : (templatePayload?.show_hide_metrics || []),
      },
    };
    dispatch(setActiveViewDetails(updatedResp));
    // Also populate s.activeView so usePivotPanelViewSync's 2nd useEffect
    // (which reads selectActiveView = s.activeView) sees a non-empty object
    // and does not reset isValidView back to false after the 1st effect sets it.
    dispatch(setActiveView({ view_id: -1, view_name: "Template View" }));
    if (typeof callback === "function") {
      callback(
        updatedResp?.view_details?.view_settings,
        updatedResp?.view_details?.show_hide_metrics
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: { variant: "error" },
      })
    );
  }
};
