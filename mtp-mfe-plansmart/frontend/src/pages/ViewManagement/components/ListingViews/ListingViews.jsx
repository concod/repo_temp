import { useState, useEffect, useCallback } from "react";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { useLocation } from "react-router-dom-v5-compat";
import PropTypes from "prop-types";

import { RadioButtonGroup } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import Popover from "@mui/material/Popover";

import CustomActionButton from "components/Impact/CustomActionButton/CustomActionButton";
import DeleteView from "../DeleteView/DeleteView";
import ViewListItemActions from "./ViewListItemActions";
import DefaultAndActiveViewList from "./DefaultAndActiveViewList";
import { getScreenId, getTruncatedViewName } from "../../viewManagement.util";

import { planStatusSelector } from "../../../PlanningScreen/slice/planningScreen.slice";
import { resetViewStates } from "../../viewManagement.slice";
import * as actions from "../../viewManagement.slice";

import * as viewListApi from "../../api/viewsList.api";
import * as renameApi from "../../api/renameView.api";
import * as viewDetailApis from "../../api/viewDetails.api";
import * as defaultViewApis from "../../api/setAsDefault.api";
import * as userRoleApis from "../../api/userRole.api";

import ChevronDown from "assets/viewManagement/chevron_down.svg";
import StarIcon from "assets/viewManagement/star_icon.svg";
import StarIconFilled from "assets/viewManagement/star_filled.svg";

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

const useStyles = makeStyles((theme) => ({
  notificationModel: {
    "& .MuiPaper-root.MuiPaper-elevation": {
      transform: "translateY(10px) !important"
    },
    "& .MuiPopover-paper": {
      minWidth: "256px",
      width: "256px",
      padding: "10px 0px"
    }
  }
}));

const ListingViews = ({
  label = VIEW_LABEL,
  getViewList,
  viewsList,
  getViewDetails,
  activeView,
  setActiveView,
  setAsDefault,
  screenIdMapping,
  planStatus,
  renameView,
  isUserPlanner,
  viewDetailsApplyCallback
}) => {
  const classes = useStyles();
  const location = useLocation();
  const dispatch = useDispatch();

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
  const [screenId, setScreenId] = useState(null);

  const [isViewNameError, setIsViewNameError] = useState(false);

  const selectedScreenName = location?.pathname?.split("/").slice(2).join("/");

  useEffect(() => {
    if (planStatus !== undefined && planStatus !== null) {
      const newScreenId = getScreenId(
        screenIdMapping,
        planStatus
      );

      setScreenId(newScreenId);
    }
  }, [selectedScreenName, planStatus]);

  // Fetch view list
  useEffect(() => {
    if (screenId) {
      getViewList(screenId);
    }
    return () => {
      // Reset the view states when the component unmounts so that the view API's are again called for the new screen
      dispatch(resetViewStates());
    };
  }, [screenId, dispatch]);

  // Update viewList based on the selected view type or isViewAll toggle
  useEffect(() => {
    const currentViews = viewsList[`${viewType}_views`] || [];

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
        setActiveView(initialActiveView);
        getViewDetails(initialActiveView.view_id, viewDetailsApplyCallback);
      } else if (
        activeView &&
        Object.keys(activeView).length !== 0 &&
        isActiveViewInList
      ) {
        getViewDetails(activeView.view_id, viewDetailsApplyCallback);
      }
    }
  }, [viewsList]);

  useEffect(() => {
    const currentViews = viewsList[`${viewType}_views`] || [];

    if (currentViews?.length > 0) {
      setViewList(
        isViewAll
          ? currentViews
          : currentViews?.slice(0, CURRENT_VIEW_LIST_SIZE)
      );
    } else {
      setViewList([]);
    }
  }, [viewType, isViewAll, viewsList]);

  const handleClick = (event) => setAnchorEl(event.currentTarget);

  const handleClose = () => setAnchorEl(null);

  const handleViewClick = useCallback(() => setIsViewAll((prev) => !prev), []);

  const handleListTypeChange = (e) => setViewType(e.target.value);

  const handleDefaultView = (activeView, screenId) => {
    if (activeView?.view_id) {
      setAsDefault(activeView, screenId, viewsList, viewType);
    }
  };

  const onEditView = (view) => {
    setEditId(view.view_id);
    setEditValue(view.view_name);
  };

  // Event handler for deleting a view
  const handleDeleteView = (view) => {
    setViewIdToDelete(view.view_id);
    setShowDeleteViewModal(true);
  };

  const onSaveView = (view, editValue) => {
    if (editValue !== view.view_name) {
      renameView(view.view_id, editValue, screenId);
    }
    setEditId(null); // Reset the edit index after save
  };

  const onCancelEdit = () => {
    setEditId(null); // Reset the edit index if cancel is clicked
    setIsViewNameError(false);
  };

  const listItemComponent = (view) => {
    const isEdit = editId === view.view_id;
    return (
      <ViewListItemActions
        editValue={editValue}
        editId={editId}
        getViewDetails={getViewDetails}
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
      <div className="current_view" onClick={handleClick}>
        <span className="truncated-view-name">
          {getTruncatedViewName(activeView?.view_name)}
        </span>
        <ChevronDown className="current_view_icon" />
      </div>
      <CustomActionButton
        className={
          activeView?.is_default
            ? "custom-action-button filled"
            : "custom-action-button"
        }
        icon={() =>
          activeView?.is_default ? <StarIconFilled /> : <StarIcon />
        }
        onClick={() => {
          handleDefaultView(activeView, screenId);
        }}
        placement="bottom"
        tooltipText={"Set as default"}
      />
      <Popover
        id="listing_views_popover"
        anchorEl={anchorEl}
        placement="bottom"
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
            <RadioButtonGroup
              name="listing_views_type"
              onChange={handleListTypeChange}
              options={
                isUserPlanner
                  ? VIEWS_TYPE
                  : VIEWS_TYPE.filter(
                      (type) => type.value === VIEWS_TYPE_GLOBAL
                    )
              }
              orientation="row"
              value={viewType}
              selectedOption={viewType}
            />
          </div>
          <DefaultAndActiveViewList
            viewList={(viewsList && viewsList[`${viewType}_views`]) || []}
            currentView={activeView?.view_name}
            hideGlobalDefault={isUserPlanner && viewType === VIEWS_TYPE_GLOBAL}
          />
          <div className="divider" />
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
          {viewsList[`${viewType}_views`]?.length > CURRENT_VIEW_LIST_SIZE ? (
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
  activeView: PropTypes.object,
  getViewDetails: PropTypes.func,
  getViewList: PropTypes.func,
  label: PropTypes.string,
  planStatus: PropTypes.number,
  renameView: PropTypes.func,
  screenIdMapping: PropTypes.object,
  setActiveViewDetails: PropTypes.func,
  setAsDefault: PropTypes.func,
  viewsList: PropTypes.object
};

const mapState = (state) => ({
  viewsList: actions.listedViewListSelector(state),
  activeView: actions.activeViewDetailsSelector(state),
  screenIdMapping: actions.screenIdMappingSelector(state),
  planStatus: planStatusSelector(state),
  isUserPlanner: actions.isUserPlannerSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...actions,
        ...viewListApi,
        ...viewDetailApis,
        ...defaultViewApis,
        ...renameApi,
        ...userRoleApis
      },
      dispatch
    )
  };
};

export default connect(mapState, mapDispatch)(ListingViews);
