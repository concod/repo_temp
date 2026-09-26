import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import { getTruncatedViewName } from "../../viewManagement.util";
import { NO_DEFAULT_VIEW } from "./ListingViews.constant";
import StarFilledIcon from "assets/oms/viewManagement/starFilled.svg";
import "./listingViews.scss";

function DefaultAndActiveViewList({
  activeViewId,
  currentView,
  defaultView,
  hideGlobalDefault,
  onSelectView,
}) {
  const isDefaultActive =
    defaultView?.view_id &&
    String(activeViewId) === String(defaultView.view_id);

  const showActiveRow =
    currentView &&
    (!defaultView || defaultView.view_name !== currentView);

  const handleSelectDefault = () => {
    if (!defaultView?.view_id || isDefaultActive) return;
    onSelectView?.(defaultView);
  };

  return (
    <ul className="top-list-view">
      {!hideGlobalDefault ? (
        defaultView ? (
          <li
            key={`default-view-${defaultView.view_id}`}
            className={
              isDefaultActive ? "active-view" : "default-view-selectable"
            }
            onClick={isDefaultActive ? undefined : handleSelectDefault}
            onKeyDown={(event) => {
              if (isDefaultActive) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectDefault();
              }
            }}
            role={isDefaultActive ? undefined : "button"}
            tabIndex={isDefaultActive ? undefined : 0}
          >
            <Tooltip title={defaultView.view_name} placement="top">
              <span
                className={
                  isDefaultActive
                    ? "active-view-label"
                    : "truncated-view-name"
                }
              >
                {getTruncatedViewName(defaultView.view_name)}
              </span>
            </Tooltip>
            <StarFilledIcon />
          </li>
        ) : (
          <li key="default-view" className="default-view">
            <span>{NO_DEFAULT_VIEW}</span>
          </li>
        )
      ) : null}

      {showActiveRow ? (
        <li key={`active-view-${currentView}`} className="active-view">
          <Tooltip title={currentView} placement="top">
            <span className="active-view-label">
              {getTruncatedViewName(currentView)}
            </span>
          </Tooltip>
        </li>
      ) : null}
    </ul>
  );
}

DefaultAndActiveViewList.propTypes = {
  activeViewId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currentView: PropTypes.string,
  defaultView: PropTypes.shape({
    view_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    view_name: PropTypes.string,
    view_type: PropTypes.string,
    is_default: PropTypes.bool,
  }),
  hideGlobalDefault: PropTypes.bool,
  onSelectView: PropTypes.func,
};

export default DefaultAndActiveViewList;
