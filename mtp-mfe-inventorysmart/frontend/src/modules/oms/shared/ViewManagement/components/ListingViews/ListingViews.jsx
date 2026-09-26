import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Tooltip from "@mui/material/Tooltip";
import PropTypes from "prop-types";

import { RadioButtonGroup } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import Popover from "@mui/material/Popover";

import DeleteView from "../DeleteView/DeleteView";
import ViewListItemActions from "./ViewListItemActions";
import DefaultAndActiveViewList from "./DefaultAndActiveViewList";
import ListingViewStarButton from "./ListingViewStarButton";
import {
  getTruncatedViewName,
  findDefaultView,
  filterRecentViewsList,
} from "../../viewManagement.util";

import {
  resetActiveView,
  resetViewStates,
  setViewUpdated,
  setActiveView,
  setActiveViewDetails,
  selectListedViewList,
  selectActiveView,
  selectIsUserPlanner,
  selectViewUpdated,
  selectLastUpdatedViewId
} from "../../slices/viewManagement.slice";

import { getViewList } from "../../api/viewsList.api";
import { renameView } from "../../api/renameView.api";
import { getViewDetails } from "../../api/viewDetails.api";
import { setAsDefault } from "../../api/setAsDefault.api";
import { saveViewStateToBackend } from "../../viewState.util";

import ChevronDown from "assets/oms/viewManagement/chevron_down.svg";
import StarFilledIcon from "assets/oms/viewManagement/starFilled.svg";
import { isEmpty } from "lodash";

import {
  CURRENT_VIEW_LIST_SIZE,
  VIEWS_TYPE,
  VIEW_LABEL,
  DIVIDER_LABEL,
  SHOW_LESS_LABEL,
  VIEW_ALL_LABEL,
  NO_VIEWS_AVAILABLE,
  VIEWS_TYPE_GLOBAL,
  VIEWS_TYPE_PERSONAL
} from "./ListingViews.constant";

import "./listingViews.scss";

const useStyles = makeStyles(() => ({
  notificationModel: "listing_views_popover"
}));

const ListingViews = ({
  label = VIEW_LABEL,
  fetchTemplateDetails,
  screenId,
  viewDetailsApplyCallback,
  disabled = false,
  skipInitialBootstrap = false,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const viewsList = useSelector(selectListedViewList);
  const activeView = useSelector(selectActiveView);
  const isUserPlanner = useSelector(selectIsUserPlanner);
  const viewUpdated = useSelector(selectViewUpdated);
  const lastUpdatedViewId = useSelector(selectLastUpdatedViewId);

  const dispatchGetViewList = useCallback(
    (id) => dispatch(getViewList(id)),
    [dispatch]
  );
  const dispatchGetViewDetails = useCallback(
    (viewId, cb) => dispatch(getViewDetails(viewId, cb)),
    [dispatch]
  );
  const dispatchSetAsDefault = useCallback(
    (av, sid, vList, vType) =>
      dispatch(setAsDefault(av, sid, vList, vType)),
    [dispatch]
  );
  const dispatchRenameView = useCallback(
    (viewId, viewName, sid, viewType) =>
      dispatch(renameView(viewId, viewName, sid, viewType)),
    [dispatch]
  );

  const [anchorEl, setAnchorEl] = useState(null);
  const [isViewAll, setIsViewAll] = useState(false);
  const [viewType, setViewType] = useState(
    isUserPlanner ? VIEWS_TYPE_PERSONAL : VIEWS_TYPE_GLOBAL
  );
  const [viewList, setViewList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleteViewModal, setShowDeleteViewModal] = useState(false);
  const [viewIdToDelete, setViewIdToDelete] = useState(null);
  const lastRequestedUpdatedViewIdRef = useRef(null);
  // Prevents the template GET from firing more than once per screenId.
  // viewType (radio toggle) and other bootstrap deps re-run the effect; without
  // this guard the template endpoint is re-fetched on every tab/role resolution.
  const hasFetchedTemplateRef = useRef(false);
  // Tracks the last view ID for which we triggered a full table reload so that
  // toggling the Global/Personal radio (which only changes viewType, not the
  // active view) does not purge the SSRM cache unnecessarily.
  const lastReloadedViewIdRef = useRef(null);

  const [isViewNameError, setIsViewNameError] = useState(false);

  const currentTabViews = viewsList[`${viewType}_views`] || [];
  const defaultViewAcrossTabs = useMemo(
    () => findDefaultView(viewsList),
    [viewsList]
  );

  const recentViewsAll = useMemo(() => {
    const activeInTab = currentTabViews.find(
      (view) => view.view_id === activeView?.view_id
    );
    return filterRecentViewsList(currentTabViews, {
      defaultViewId: defaultViewAcrossTabs?.view_id,
      activeViewId: activeInTab?.view_id,
    });
  }, [activeView, currentTabViews, defaultViewAcrossTabs]);

  useEffect(() => {
    // Reset guards whenever the screen changes so a new screen gets its own
    // bootstrap. When skipInitialBootstrap, the page owns list + initial load.
    hasFetchedTemplateRef.current = skipInitialBootstrap;
    lastReloadedViewIdRef.current = skipInitialBootstrap
      ? activeView?.view_id ?? null
      : null;
    if (screenId && !skipInitialBootstrap) {
      dispatchGetViewList(screenId);
    }
    return () => {
      if (!skipInitialBootstrap) {
        dispatch(resetViewStates());
      }
    };
  }, [screenId, skipInitialBootstrap, dispatch, dispatchGetViewList]);

  useEffect(() => {
    if (viewUpdated && lastUpdatedViewId) {
      const isUpdatedViewActive =
        String(activeView?.view_id ?? "") === String(lastUpdatedViewId);

      if (isUpdatedViewActive) {
        lastRequestedUpdatedViewIdRef.current = null;
        dispatch(setViewUpdated(false));
        return;
      }

      if (
        String(lastRequestedUpdatedViewIdRef.current ?? "") !==
        String(lastUpdatedViewId)
      ) {
        lastRequestedUpdatedViewIdRef.current = lastUpdatedViewId;
        dispatchGetViewDetails(lastUpdatedViewId, viewDetailsApplyCallback);
      }
      return;
    }

    // Page-owned bootstrap (Order Management) already loaded list + active view.
    if (skipInitialBootstrap) return;

    let currentViews;
    if (isUserPlanner) {
      currentViews = viewsList[`${viewType}_views`] || [];
    } else {
      const globalViews = viewsList[`${VIEWS_TYPE_GLOBAL}_views`] || [];
      const personalViews = viewsList[`${VIEWS_TYPE_PERSONAL}_views`] || [];
      currentViews = [...globalViews, ...personalViews];
    }

    const hideGlobalDefault = isUserPlanner && viewType === VIEWS_TYPE_GLOBAL;

    if (!hideGlobalDefault) {
      const initialActiveView = currentViews.find((view) => view.is_default);

      const isActiveViewInList = currentViews.some(
        (view) => view.view_id === activeView?.view_id
      );

      if (
        initialActiveView &&
        (!activeView ||
          Object.keys(activeView).length === 0 ||
          !isActiveViewInList)
      ) {
        dispatch(setActiveView(initialActiveView));
        lastReloadedViewIdRef.current = initialActiveView.view_id;
        dispatchGetViewDetails(initialActiveView.view_id, viewDetailsApplyCallback);
      } else if (
        activeView &&
        Object.keys(activeView).length !== 0 &&
        isActiveViewInList
      ) {
        const viewId = activeView.view_id;
        // Only trigger a full table reload (via viewDetailsApplyCallback) when
        // the active view has actually changed. Tab toggles (Global/Personal)
        // and list refreshes re-run this effect without changing the view, so
        // we fetch the details silently (null callback) to keep Redux in sync.
        const hasViewChanged = viewId !== lastReloadedViewIdRef.current;
        if (hasViewChanged) {
          lastReloadedViewIdRef.current = viewId;
        }
        dispatchGetViewDetails(viewId, hasViewChanged ? viewDetailsApplyCallback : null);
      } else if (
        currentViews.length === 0 ||
        (currentViews.length !== 0 && !initialActiveView)
      ) {
        // Guard: skip if screenId hasn't resolved yet (views/screens race)
        // and skip if we already fetched for this screenId (viewType radio re-runs the effect).
        if (screenId && !hasFetchedTemplateRef.current) {
          hasFetchedTemplateRef.current = true;
          // Set a synthetic placeholder so the "Current View" dropdown shows
          // "Default Template" instead of "Select" when no saved views exist.
          dispatch(setActiveView({ view_id: -1, view_name: "Default Template", is_default: false }));
          fetchTemplateDetails(screenId, viewDetailsApplyCallback);
        } else if (!screenId || currentViews.length !== 0) {
          dispatch(resetActiveView());
        }
      }
    }
    // activeView is intentionally excluded to prevent infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewsList,
    viewUpdated,
    lastUpdatedViewId,
    isUserPlanner,
    viewType,
    screenId,
    dispatch,
    dispatchGetViewDetails,
    viewDetailsApplyCallback,
    fetchTemplateDetails,
    skipInitialBootstrap,
  ]);

  useEffect(() => {
    if (recentViewsAll.length > 0) {
      setViewList(
        isViewAll ? recentViewsAll : recentViewsAll.slice(0, CURRENT_VIEW_LIST_SIZE)
      );
    } else {
      setViewList([]);
    }
  }, [isViewAll, recentViewsAll]);

  const handleClick = (event) => {
    const target = event?.currentTarget ?? event?.target ?? null;
    if (!disabled && target) {
      setAnchorEl(target);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const applyListedView = useCallback(
    async (view) => {
      if (!view?.view_id || disabled) return;
      await saveViewStateToBackend(dispatch);
      // Grid reload is driven by OrderManagement's activeViewDetail effect after
      // GET /views/details — do not pass viewDetailsApplyCallback (duplicate /columns).
      await dispatchGetViewDetails(view.view_id, null);
      lastReloadedViewIdRef.current = view.view_id;
      setAnchorEl(null);
    },
    [
      disabled,
      dispatch,
      dispatchGetViewDetails,
    ]
  );

  const handleViewClick = useCallback(() => setIsViewAll((prev) => !prev), []);

  const handleListTypeChange = (e) => setViewType(e.target.value);

  const handleDefaultView = (av, sid) => {
    if (av?.view_id) {
      dispatchSetAsDefault(av, sid, viewsList, viewType);
    }
  };

  const onEditView = (view) => {
    setEditId(view.view_id);
    setEditValue(view.view_name);
  };

  const handleDeleteView = (view) => {
    // Close the Popover before opening the delete Prompt to avoid two MUI
    // FocusTrap instances competing (Maximum call stack size exceeded).
    setAnchorEl(null);
    setViewIdToDelete(view.view_id);
    setShowDeleteViewModal(true);
  };

  const onSaveView = (view, ev) => {
    if (ev !== view.view_name) {
      dispatchRenameView(view?.view_id, ev, screenId, view?.view_type);
    }
    setEditId(null);
  };

  const onCancelEdit = () => {
    setEditId(null);
    setIsViewNameError(false);
  };

  const listItemComponent = (view) => {
    const isEdit = editId === view.view_id;
    return (
      <ViewListItemActions
        editValue={editValue}
        editId={editId}
        getViewDetails={dispatchGetViewDetails}
        handleClose={handleClose}
        handleDeleteView={() => handleDeleteView(view)}
        isEdit={isEdit}
        isViewNameError={isViewNameError}
        onCancelEdit={onCancelEdit}
        onEditView={() => onEditView(view)}
        onSaveView={() => onSaveView(view, editValue)}
        setEditValue={setEditValue}
        setIsViewNameError={setIsViewNameError}
        view={view}
        hideActions={isUserPlanner && viewType === VIEWS_TYPE_GLOBAL}
        viewDetailsApplyCallback={viewDetailsApplyCallback}
      />
    );
  };

  return (
    <div className="listing_views">
      <span className="view_label">{label}</span>
      <div
        className={disabled ? "current_view_container disabled" : "current_view_container"}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e);
          }
        }}
      >
        <div className="current_view">
          {getTruncatedViewName(activeView?.view_name) ? (
            <span className="truncated-view-name">
              <Tooltip title={activeView?.view_name} placement="bottom">
                <span>{getTruncatedViewName(activeView?.view_name)}</span>
              </Tooltip>
            </span>
          ) : hasFetchedTemplateRef.current ? (
            <span className="truncated-view-name">Default Template</span>
          ) : (
            <span className="view_placeholder"> Select </span>
          )}

          <ChevronDown className="current_view_icon" />
        </div>
      </div>
      <ListingViewStarButton
        isDefault={Boolean(activeView?.is_default)}
        disabled={isEmpty(activeView) || disabled}
        onClick={() => handleDefaultView(activeView, screenId)}
      />

      <Popover
        id="listing_views_popover"
        anchorEl={anchorEl}
        className={classes.notificationModel}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <div
          className={`listing_views_container ${isViewAll ? "expanded" : ""}`}
        >
          <div className="listing_views_preference">
            <div className="header-row">
              <span className="saved-views-title">Saved views</span>

              <div className="default-badge">
                <StarFilledIcon />
                <span>Default</span>
              </div>
            </div>
            <RadioButtonGroup
              className="matrix-listing-views-type"
              name="listing_views_type"
              id="listing_views_type"
              row
              orientation="row"
              onChange={handleListTypeChange}
              options={VIEWS_TYPE}
              selectedOption={viewType}
              aria-label="Saved view type"
            />
          </div>
          <DefaultAndActiveViewList
            activeViewId={activeView?.view_id}
            currentView={activeView?.view_name}
            defaultView={defaultViewAcrossTabs}
            hideGlobalDefault={isUserPlanner && viewType === VIEWS_TYPE_GLOBAL}
            onSelectView={applyListedView}
          />
          <hr className="viewHorizontalDivider" />
          <ul className="bottom-list-view">
            <li key="recently-used-text" className="recently-used-label">
              {DIVIDER_LABEL}
            </li>
            {viewList.length > 0 ? (
              viewList.map((view) => listItemComponent(view))
            ) : (
              <li className="empty-list">{NO_VIEWS_AVAILABLE}</li>
            )}
          </ul>
          {recentViewsAll.length > CURRENT_VIEW_LIST_SIZE ? (
            <div className="toggle-lists-cta" onClick={handleViewClick}>
              {isViewAll ? SHOW_LESS_LABEL : VIEW_ALL_LABEL}
            </div>
          ) : null}
        </div>
      </Popover>
      <DeleteView
        isDeleteModalOpen={showDeleteViewModal}
        setIsDeleteModalOpen={setShowDeleteViewModal}
        viewId={viewIdToDelete}
        screenId={screenId}
      />
    </div>
  );
};

ListingViews.propTypes = {
  fetchTemplateDetails: PropTypes.func,
  label: PropTypes.string,
  screenId: PropTypes.number,
  viewDetailsApplyCallback: PropTypes.func,
  disabled: PropTypes.bool,
  skipInitialBootstrap: PropTypes.bool,
};

export default ListingViews;
