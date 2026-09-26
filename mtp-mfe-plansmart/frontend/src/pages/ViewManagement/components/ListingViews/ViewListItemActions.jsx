import { useCallback } from "react";

import PropTypes from "prop-types";

import { Input, Tooltip } from "impact-ui-v3";

import { getTruncatedViewName } from "../../viewManagement.util";

import EditIcon from "assets/viewManagement/editViewIcon.svg";
import DeleteIcon from "assets/viewManagement/deleteViewIcon.svg";
import TickMarkIcon from "assets/viewManagement/doneViewIcon.svg";
import CloseIcon from "assets/viewManagement/closeViewIcon.svg";

import {
  VIEW_NAME_CHARACTER_LIMIT,
  VIEW_NAME_HELPER_TEXT
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
  const applySelectedView = useCallback(() => {
    if (!editId) {
      // Write View Selection logic here
      getViewDetails(view.view_id, viewDetailsApplyCallback);
      handleClose();
    }
  }, [view, editId]);

  const handleEditInput = useCallback((e) => {
    const value = e.target.value;
    if (value.length <= VIEW_NAME_CHARACTER_LIMIT) {
      setEditValue(value);
      setIsViewNameError(false);
    } else {
      setIsViewNameError(true);
    }
  }, []);

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
          <Tooltip title={view.view_name} orientation="top" variant="tertiary">
            <span className="truncated-view-name">
              {getTruncatedViewName(view?.view_name)}
            </span>
          </Tooltip>
          {!hideActions && (
            <div className={editId ? "disable-actions" : "view-actions"}>
              <EditIcon
                onClick={(e) => {
                  e.stopPropagation();
                  onEditView(view);
                }}
              />
              <DeleteIcon
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteView(view);
                }}
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
  setIsViewNameError: PropTypes.func.isRequired
};

export default ViewListItemActions;
