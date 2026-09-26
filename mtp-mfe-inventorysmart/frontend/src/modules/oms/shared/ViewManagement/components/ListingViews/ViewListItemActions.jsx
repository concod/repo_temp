import { useCallback } from "react";
import { useDispatch } from "react-redux";

import PropTypes from "prop-types";

import { Input } from "impact-ui-v3";
import Tooltip from "@mui/material/Tooltip";

import { getTruncatedViewName } from "../../viewManagement.util";
import { setActiveViewDetails } from "../../slices/viewManagement.slice";
import { saveViewStateToBackend } from "../../viewState.util";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TickMarkIcon from "assets/oms/viewManagement/doneViewIcon.svg";
import CloseIcon from "assets/oms/viewManagement/closeViewIcon.svg";

import {
  VIEW_NAME_CHARACTER_LIMIT,
  VIEW_NAME_HELPER_TEXT,
  VIEW_LIST_NAME_CHARACTER_LIMIT
} from "./ListingViews.constant";

const ViewListItemActions = ({
  editValue,
  editId,
  getViewDetails,
  handleClose,
  handleDeleteView,
  isEdit,
  isViewNameError,
  onSaveView,
  onCancelEdit,
  onEditView,
  setEditValue,
  setIsViewNameError,
  view,
  hideActions,
  viewDetailsApplyCallback
}) => {
  const dispatch = useDispatch();
  const applySelectedView = useCallback(async () => {
    if (!editId) {
      await saveViewStateToBackend(dispatch);
      dispatch(setActiveViewDetails({}));
      getViewDetails(view.view_id, viewDetailsApplyCallback);
      handleClose();
    }
  }, [view, editId, dispatch, getViewDetails, viewDetailsApplyCallback, handleClose]);

  const handleEditInput = useCallback((e) => {
    const value = e.target.value;
    if (value.length <= VIEW_NAME_CHARACTER_LIMIT) {
      setEditValue(value);
      setIsViewNameError(false);
    } else {
      setIsViewNameError(true);
    }
  }, [setEditValue, setIsViewNameError]);

  const isTruncated = view?.view_name?.length > VIEW_LIST_NAME_CHARACTER_LIMIT;
  const truncatedText = getTruncatedViewName(view?.view_name);

  return (
    <li key={view.view_id} onClick={applySelectedView}>
      {isEdit ? (
        <>
          <Input
            id=""
            inputProps={{}}
            label={""}
            onChange={handleEditInput}
            value={editValue}
            isError={isViewNameError}
            helperText={VIEW_NAME_HELPER_TEXT}
            isHelperText={isViewNameError}
          />
          <div className="view-save-actions">
            <TickMarkIcon
              onClick={(e) => {
                e.stopPropagation();
                onSaveView();
              }}
            />
            <CloseIcon
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit();
              }}
            />
          </div>
        </>
      ) : (
        <>
          {isTruncated ? (
            <Tooltip title={view.view_name} placement="top">
              <span className="truncated-view-name">{truncatedText}</span>
            </Tooltip>
          ) : (
            <span className="truncated-view-name">{truncatedText}</span>
          )}

          {!hideActions && (
            <div className={editId ? "disable-actions" : "view-actions"}>
              <EditIcon
                onClick={(e) => {
                  e.stopPropagation();
                  onEditView(view);
                }}
                className="viewListItemAction viewListItemEdit"
              />
              <DeleteIcon
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteView(view);
                }}
                className="viewListItemAction viewListItemDelete"
              />
            </div>
          )}
        </>
      )}
    </li>
  );
};

ViewListItemActions.propTypes = {
  view: PropTypes.object.isRequired,
  isEdit: PropTypes.bool.isRequired,
  editValue: PropTypes.string.isRequired,
  editId: PropTypes.number,
  setEditValue: PropTypes.func.isRequired,
  onSaveView: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onEditView: PropTypes.func.isRequired,
  handleDeleteView: PropTypes.func.isRequired,
  getViewDetails: PropTypes.func.isRequired,
  isViewNameError: PropTypes.bool.isRequired,
  setIsViewNameError: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  viewDetailsApplyCallback: PropTypes.func,
  hideActions: PropTypes.bool
};

export default ViewListItemActions;
