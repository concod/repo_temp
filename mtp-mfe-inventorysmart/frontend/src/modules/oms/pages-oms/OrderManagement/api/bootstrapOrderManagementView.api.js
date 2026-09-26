import { getViewList } from "../../../shared/ViewManagement/api/viewsList.api";
import { getViewDetails } from "../../../shared/ViewManagement/api/viewDetails.api";
import { getTemplateDetails } from "../../../shared/ViewManagement/api/viewManagementTemplate.api";
import {
  setActiveView,
  selectListedViewList,
  selectIsUserPlanner,
  selectActiveViewDetail,
} from "../../../shared/ViewManagement/slices/viewManagement.slice";
import {
  viewBootstrapStarted,
  viewBootstrapSucceeded,
  viewBootstrapFailed,
} from "../slices/orderManagementView.slice";

function pickInitialViews(viewsList, isUserPlanner) {
  const globalViews = viewsList?.global_views || [];
  const personalViews = viewsList?.personal_views || [];
  // Match ListingViews: planners start on the personal tab.
  const currentViews = isUserPlanner
    ? personalViews
    : [...globalViews, ...personalViews];
  const defaultView = currentViews.find((view) => view.is_default) || null;
  return { currentViews, defaultView };
}

function hasRowDimensions(activeViewDetail) {
  return Boolean(activeViewDetail?.view_details?.rowDimensions?.length);
}

/**
 * Page-owned view bootstrap: list → default saved view OR template.
 * Populates viewManagement Redux before the grid mounts.
 */
export const bootstrapOrderManagementView = (screenId) => async (
  dispatch,
  getState
) => {
  if (!screenId) return;

  dispatch(viewBootstrapStarted({ screenId }));

  try {
    await dispatch(getViewList(screenId));

    const state = getState();
    const viewsList = selectListedViewList(state);
    const isUserPlanner = selectIsUserPlanner(state);
    const { currentViews, defaultView } = pickInitialViews(
      viewsList,
      isUserPlanner
    );

    if (defaultView?.view_id) {
      dispatch(
        setActiveView({
          view_id: defaultView.view_id,
          view_name: defaultView.view_name,
          view_type: defaultView.view_type,
          is_default: defaultView.is_default,
        })
      );
      await dispatch(getViewDetails(defaultView.view_id));
    } else if (
      currentViews.length === 0 ||
      (currentViews.length > 0 && !defaultView)
    ) {
      dispatch(
        setActiveView({
          view_id: -1,
          view_name: "Default Template",
          is_default: false,
        })
      );
      await dispatch(getTemplateDetails(screenId, []));
    }

    const activeViewDetail = selectActiveViewDetail(getState());
    if (!hasRowDimensions(activeViewDetail)) {
      dispatch(
        viewBootstrapFailed(
          "View configuration is missing row dimensions."
        )
      );
      return;
    }

    dispatch(viewBootstrapSucceeded());
  } catch (error) {
    console.error("[OMS] view bootstrap failed", error);
    dispatch(
      viewBootstrapFailed(error?.message || "View bootstrap failed")
    );
  }
};
