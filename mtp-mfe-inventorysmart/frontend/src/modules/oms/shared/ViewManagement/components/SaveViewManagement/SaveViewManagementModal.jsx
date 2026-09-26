import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";

import { Modal, Input, Checkbox, RadioButtonGroup, Select } from "impact-ui-v3";

import { saveView } from "../../api/saveView.api";
import { replaceView } from "../../api/replaceView.api";

import {
  selectCurrentViewsList,
  selectActiveViewDetail,
  selectIsUserPlanner
} from "../../slices/viewManagement.slice";
import { handleReplaceView, handleSaveView } from "../../viewManagement.util";

import {
  MODAL_TITLE,
  SAVE_BUTTON,
  REPLACE_VIEW_BUTTON,
  CANCEL_BUTTON,
  MODAL_SIZE,
  VIEW_INPUT_LABEL,
  VIEW_INPUT_TYPE,
  VIEW_INPUT_PLACEHOLDER,
  DEFAULT_VIEW_CHECKBOX_LABEL,
  CHECKBOX_VARIANT,
  REPLACE_VIEW_DIVIDER_LABEL,
  REPLACE_VIEW_SELECT_LABEL,
  REPLACE_VIEW_INPUT_PLACEHOLDER_POSITION,
  REPLACE_VIEW_INPUT_PLACEHOLDER,
  VIEW_NAME_CHARACTER_LIMIT,
  VIEW_NAME_HELPER_TEXT,
  VIEWS_TYPE_OPTIONS
} from "./saveViewManagement.constants";
import { MAX_VIEW_COUNT } from "../../viewManagement.constant";
import "./SaveViewManagement.scss";

const SaveViewManagementModal = ({
  isModalOpen,
  setIsModalOpen,
  screenId,
  isGrandtotalEnabled
}) => {
  const dispatch = useDispatch();
  const currentViewList = useSelector(selectCurrentViewsList);
  const activeViewDetails = useSelector(selectActiveViewDetail);
  const isUserPlanner = useSelector(selectIsUserPlanner);

  const [viewName, setViewName] = useState("");
  const [isViewNameError, setIsViewNameError] = useState(false);
  const [isDefaultView, setIsDefaultView] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [viewType, setViewType] = useState(
    isUserPlanner ? VIEWS_TYPE_OPTIONS.Personal : VIEWS_TYPE_OPTIONS.Global
  );
  const [
    replaceSelectSelectedOptions,
    setReplaceSelectSelectedOptions
  ] = useState(null);

  const currentOptions = useMemo(
    () =>
      currentViewList.map((view, index) => ({
        label: view.view_name,
        value: `opt${index + 1}`
      })),
    [currentViewList]
  );

  const [replaceSelectCurrentOptions, setReplaceSelectCurrentOptions] = useState([]);

  useEffect(() => {
    setReplaceSelectCurrentOptions(currentOptions);
  }, [currentOptions]);

  const isAnyReplaceValueSelected =
    replaceSelectSelectedOptions &&
    Object.keys(replaceSelectSelectedOptions).length === 2;

  const dispatchSaveView = (payload, setModal) =>
    dispatch(saveView(payload, setModal));
  const dispatchReplaceView = (payload, viewId, setModal) =>
    dispatch(replaceView(payload, viewId, setModal));

  const onPrimaryButtonClick = () => {
    const updatedViewDetails = {
      ...activeViewDetails,
      view_details: {
        ...activeViewDetails?.view_details
      }
    };

    isAnyReplaceValueSelected
      ? handleReplaceView({
          activeViewDetails: updatedViewDetails,
          isDefaultView,
          viewName,
          viewType,
          screenId,
          replaceView: dispatchReplaceView,
          setIsModalOpen,
          replaceSelectSelectedOptions,
          currentViewList,
          isGrandtotalEnabled
        })
      : handleSaveView({
          isDefaultView,
          viewName,
          viewType,
          activeViewDetails: updatedViewDetails,
          screenId,
          saveView: dispatchSaveView,
          setIsModalOpen,
          isGrandtotalEnabled
        });
    setViewName("");
    setReplaceSelectSelectedOptions(null);
    setIsDefaultView(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setViewName("");
    setReplaceSelectSelectedOptions(null);
    setIsDefaultView(false);
  };

  const handleViewNameChange = (e) => {
    const value = e.target.value;
    if (value.length <= VIEW_NAME_CHARACTER_LIMIT) {
      setViewName(value);
      setIsViewNameError(false);
      setReplaceSelectSelectedOptions(null);
    } else {
      setIsViewNameError(true);
    }
  };

  const handleReplaceSelectChange = (next) => {
    const selected = Array.isArray(next) ? next[0] : next;
    setReplaceSelectSelectedOptions(selected ?? null);
    setViewName("");
    setIsViewNameError(false);
  };

  const handleEmptyViewName = () => {
    if (viewName.trim() === "") {
      setViewName("");
    }
  };

  const getRemainingViewCount = () => {
    return (
      MAX_VIEW_COUNT -
      (viewType === VIEWS_TYPE_OPTIONS.Global
        ? currentViewList?.filter(
            (view) => view.view_type === VIEWS_TYPE_OPTIONS.Global
          )?.length
        : currentViewList?.filter(
            (view) => view.view_type === VIEWS_TYPE_OPTIONS.Personal
          )?.length)
    );
  };

  const isPrimaryDisabled =
    (!viewName || viewName.trim().length < 1) && !replaceSelectSelectedOptions;

  return (
    <Modal
      title={MODAL_TITLE}
      open={isModalOpen}
      onClose={handleClose}
      size={MODAL_SIZE}
      onPrimaryButtonClick={onPrimaryButtonClick}
      primaryButtonLabel={isAnyReplaceValueSelected ? REPLACE_VIEW_BUTTON : SAVE_BUTTON}
      primaryButtonProps={{ disabled: isPrimaryDisabled, id: "viewSaveButton" }}
      secondaryButtonLabel={CANCEL_BUTTON}
      onSecondaryButtonClick={handleClose}
      height="500px"
      width="390px"
    >
      <div className="modal-body-container">
        <div className="view-count">
          {getRemainingViewCount()}/{MAX_VIEW_COUNT} views remaining
        </div>
        <Input
          id=""
          inputProps={{}}
          isRequired
          label={VIEW_INPUT_LABEL}
          onChange={handleViewNameChange}
          onBlur={handleEmptyViewName}
          placeholder={VIEW_INPUT_PLACEHOLDER}
          type={VIEW_INPUT_TYPE}
          value={viewName}
          isError={isViewNameError}
          helperText={VIEW_NAME_HELPER_TEXT}
          isHelperText={isViewNameError}
        />
        {!isUserPlanner && (
          <div className="view-type">
            View type
            <RadioButtonGroup
              name="view-type"
              onChange={(e) => setViewType(e.target.value)}
              options={[
                { label: "Global", value: "global" },
                { label: "Personal", value: "personal" }
              ]}
              orientation="row"
              row
              selectedOption={viewType}
            />
          </div>
        )}
        <Checkbox
          checked={isDefaultView}
          label={DEFAULT_VIEW_CHECKBOX_LABEL}
          onChange={() => setIsDefaultView(!isDefaultView)}
          variant={CHECKBOX_VARIANT}
        />
        <div className="divider-text">
          <span>{REPLACE_VIEW_DIVIDER_LABEL}</span>
        </div>
        <div className="replace-view-select">
          <Select
            currentOptions={replaceSelectCurrentOptions}
            handleChange={handleReplaceSelectChange}
            setSelectedOptions={handleReplaceSelectChange}
            initialOptions={currentOptions}
            isCloseWhenClickOutside
            isSelectAll={isSelectAll}
            setIsSelectAll={setIsSelectAll}
            label={REPLACE_VIEW_SELECT_LABEL}
            labelOrientation={REPLACE_VIEW_INPUT_PLACEHOLDER_POSITION}
            placeholder={REPLACE_VIEW_INPUT_PLACEHOLDER}
            selectedOptions={replaceSelectSelectedOptions ?? {}}
            setCurrentOptions={setReplaceSelectCurrentOptions}
            isOpen={isReplaceOpen}
            setIsOpen={setIsReplaceOpen}
            isWithSearch
            maxWidth="358px"
            width="358px"
          />
        </div>
      </div>
    </Modal>
  );
};

SaveViewManagementModal.propTypes = {
  isModalOpen: PropTypes.bool,
  setIsModalOpen: PropTypes.func,
  screenId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isGrandtotalEnabled: PropTypes.bool
};

export default SaveViewManagementModal;
