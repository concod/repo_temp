import PropTypes from "prop-types";
import {
  DEFAULT_VIEW_LABEL,
  ACTIVE_VIEW_LABEL,
  NO_DEFAULT_VIEW
} from "./ListingViews.constant";
import { getTruncatedViewName } from "../../viewManagement.util";
import "./listingViews.scss";
import { Tooltip } from "impact-ui-v3";

const DefaultAndActiveViewList = ({
  currentView,
  hideGlobalDefault,
  viewList
}) => {
  const getDefaultView = () => {
    if (viewList.some((view) => view.is_default)) {
      return viewList
        .filter((view) => view.is_default)
        .map((view) => (
          <li key={`default-view-${view.view_id}`}>
            <Tooltip
              title={view?.view_name}
              orientation="top"
              variant="tertiary"
            >
              <span className="truncated-view-name">
                {getTruncatedViewName(view?.view_name)}
              </span>
            </Tooltip>
            <span className="default-view-label">{DEFAULT_VIEW_LABEL}</span>
          </li>
        ));
    }
    return (
      <li key="default-view">
        <span>{NO_DEFAULT_VIEW}</span>
      </li>
    );
  };

  return (
    <ul className="top-list-view">
      {/* Render the default view */}
      {!hideGlobalDefault && getDefaultView()}

      {currentView && (
        <li key={`active-view-${currentView}`}>
          <Tooltip title={currentView} orientation="top" variant="tertiary">
            <span className="truncated-view-name">
              {getTruncatedViewName(currentView)}
            </span>
          </Tooltip>
          <span className="active-view-label">{ACTIVE_VIEW_LABEL}</span>
        </li>
      )}
    </ul>
  );
};

DefaultAndActiveViewList.propTypes = {
  viewList: PropTypes.arrayOf(
    PropTypes.shape({
      view_id: PropTypes.number.isRequired,
      view_name: PropTypes.string.isRequired,
      is_default: PropTypes.bool.isRequired
    })
  ).isRequired,
  currentView: PropTypes.string
};

export default DefaultAndActiveViewList;
