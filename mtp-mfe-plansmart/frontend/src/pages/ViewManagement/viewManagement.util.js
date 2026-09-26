import { STATUS_SCREEN_MAPPING } from "./viewManagement.constant";
import { VIEW_LIST_NAME_CHARACTER_LIMIT } from "./components/ListingViews/ListingViews.constant";

export const getScreenId = (
  screenIdMapping,
  // selectedScreenName,
  planStatus
) => {

  return screenIdMapping[STATUS_SCREEN_MAPPING[planStatus]];
};

export const getTruncatedViewName = (viewName = "") => {
  if (viewName.length > VIEW_LIST_NAME_CHARACTER_LIMIT) {
    return `${viewName.slice(0, VIEW_LIST_NAME_CHARACTER_LIMIT)}...`;
  }

  return viewName;
};

export const handleReplaceView = ({
  activeViewDetails,
  isDefaultView,
  viewName,
  screenIdMapping,
  planStatus,
  replaceView,
  setIsModalOpen,
  replaceSelectSelectedOptions,
  currentViewList
}) => {
  const replaceViewDetails = currentViewList.find(
    (view) => view.view_name === replaceSelectSelectedOptions?.label
  );
  
  const replaceViewPayload = {
    is_default: isDefaultView ? isDefaultView : replaceViewDetails?.is_default,
    view_type: replaceViewDetails?.view_type,
    screen_id: getScreenId(screenIdMapping, planStatus),
    new_view_name: viewName,
    view_name: replaceSelectSelectedOptions?.label,
    view_details: activeViewDetails?.view_details || {}
  };
  replaceView(replaceViewPayload, replaceViewDetails.view_id, setIsModalOpen);
};

export const handleSaveView = ({
  isDefaultView,
  viewName,
  activeViewDetails,
  screenIdMapping,
  planStatus,
  saveView,
  setIsModalOpen
}) => {
  const saveViewPayload = {
    screen_id: getScreenId(screenIdMapping, planStatus),
    view_name: viewName,
    view_details: activeViewDetails?.view_details || {},
    is_pivot: false,
    is_default: isDefaultView
  };
  saveView(saveViewPayload,setIsModalOpen);
};
