import { useSelector } from "react-redux";
import { selectScreenIdMapping } from "./slices/viewManagement.slice";
import { VIEW_LIST_NAME_CHARACTER_LIMIT } from "./components/ListingViews/ListingViews.constant";

/**
 * Returns the numeric screen ID for view-management save calls.
 * Reads `screenIdMapping` from Redux (populated by `getScreensMapping` which
 * `ViewManagementController` dispatches on mount). Returns null until the
 * mapping is loaded or until the key for `selectedScreenViewName` is present.
 */
export const useScreenId = ({ selectedScreenViewName } = {}) => {
  const screenIdMapping = useSelector(selectScreenIdMapping);

  if (!screenIdMapping || Object.keys(screenIdMapping).length === 0) {
    return null;
  }

  return screenIdMapping[selectedScreenViewName] ?? null;
};

export const getTruncatedViewName = (viewName = "") => {
  if (viewName.length > VIEW_LIST_NAME_CHARACTER_LIMIT) {
    return `${viewName.slice(0, VIEW_LIST_NAME_CHARACTER_LIMIT)}...`;
  }
  return viewName;
};

export function mergeListedViews(viewsList) {
  return [
    ...(viewsList?.global_views || []),
    ...(viewsList?.personal_views || []),
  ];
}

/** Exactly one default across global + personal; first wins if data is corrupt. */
export function findDefaultView(viewsList) {
  return mergeListedViews(viewsList).find((view) => view.is_default) || null;
}

export function filterRecentViewsList(views, { defaultViewId, activeViewId }) {
  return (views || []).filter(
    (view) =>
      view.view_id !== defaultViewId && view.view_id !== activeViewId
  );
}

export const handleReplaceView = ({
  activeViewDetails,
  isDefaultView,
  viewName,
  viewType,
  replaceView,
  screenId,
  setIsModalOpen,
  replaceSelectSelectedOptions,
  currentViewList,
  isGrandtotalEnabled,
}) => {
  const replaceViewDetails = currentViewList.find(
    (view) => view.view_name === replaceSelectSelectedOptions?.label
  );

  const replaceViewPayload = {
    is_default: isDefaultView || replaceViewDetails?.is_default,
    view_type:
      replaceViewDetails?.view_type !== viewType
        ? viewType
        : replaceViewDetails?.view_type,
    screen_id: screenId,
    new_view_name: viewName,
    view_name: replaceSelectSelectedOptions?.label,
    view_details: { ...activeViewDetails?.view_details, isGrandtotalEnabled } || {},
  };
  replaceView(replaceViewPayload, replaceViewDetails.view_id, setIsModalOpen);
};

export const handleSaveView = ({
  isDefaultView,
  viewName,
  viewType,
  activeViewDetails,
  screenId,
  saveView,
  setIsModalOpen,
  isGrandtotalEnabled,
}) => {
  const saveViewPayload = {
    screen_id: screenId,
    view_name: viewName,
    view_type: viewType,
    view_details: { ...activeViewDetails?.view_details, isGrandtotalEnabled } || {},
    is_pivot: false,
    is_default: isDefaultView,
  };
  saveView(saveViewPayload, setIsModalOpen);
};
