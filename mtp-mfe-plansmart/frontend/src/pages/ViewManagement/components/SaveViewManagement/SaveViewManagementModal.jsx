import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
// import { useLocation } from "react-router-dom-v5-compat";
import { bindActionCreators } from "redux";

import { Modal, Input, Checkbox, Select } from "impact-ui-v3";
import { handleReplaceView, handleSaveView } from "../../viewManagement.util";

import * as saveApis from "../../api/saveView.api";
import * as replaceApi from "../../api/replaceView.api";

import {
  screenIdMappingSelector,
  currentViewsListSelector,
  activeViewDetailSelector
} from "../../viewManagement.slice";
import { planStatusSelector } from "../../../PlanningScreen/slice/planningScreen.slice";

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
  VIEW_NAME_HELPER_TEXT
} from "./saveViewManagement.constants";
import { MAX_VIEW_COUNT } from "../../viewManagement.constant";
import "./SaveViewManagement.scss";

const SaveViewManagementModal = (props) => {
  const {
    isModalOpen,
    setIsModalOpen,
    saveView,
    screenIdMapping,
    planStatus,
    currentViewList,
    replaceView,
    activeViewDetails
  } = props;
  // const location = useLocation();
  // const selectedScreenName = location?.pathname?.split("/").slice(2).join("/");

  const [viewName, setViewName] = useState("");
  const [isViewNameError, setIsViewNameError] = useState(false);
  const [isDefaultView, setIsDefaultView] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [
    replaceSelectCurrentOptions,
    setReplaceSelectCurrentOptions
  ] = useState([]);
  const [
    replaceSelectSelectedOptions,
    setReplaceSelectSelectedOptions
  ] = useState(null);

  useEffect(() => {
    const currentView = currentViewList.map((view, index) => ({
      label: view.view_name,
      value: `opt${index + 1}`
    }));
    setReplaceSelectCurrentOptions(currentView);
  }, [currentViewList]);

  const isAnyReplaceValueSelected =
    replaceSelectSelectedOptions &&
    Object.keys(replaceSelectSelectedOptions).length == 2;

  const remainingViewCount = MAX_VIEW_COUNT - currentViewList?.length;

  const onPrimaryButtonClick = () => {
    isAnyReplaceValueSelected
      ? handleReplaceView({
          activeViewDetails,
          isDefaultView,
          viewName,
          screenIdMapping,
          planStatus,
          replaceView,
          setIsModalOpen,
          replaceSelectSelectedOptions,
          currentViewList
        })
      : handleSaveView({
          isDefaultView,
          viewName,
          activeViewDetails,
          screenIdMapping,
          planStatus,
          saveView,
          setIsModalOpen
        });
    setViewName("");
    setReplaceSelectSelectedOptions(null);
    setIsDefaultView(false)
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setViewName("");
    setReplaceSelectSelectedOptions(null);
    setIsDefaultView(false)
  };

  const handleViewNameChange = (e) => {
    const value = e.target.value;
    if (value.length <= VIEW_NAME_CHARACTER_LIMIT) {
      setViewName(value);
      setIsViewNameError(false);
    } else {
      setIsViewNameError(true);
    }
  };

  const handleEmptyViewName = () => {
    if (viewName.trim() === "") {
      setViewName("");
    }
  };

  return (
    <Modal
      onClose={handleClose}
      onPrimaryButtonClick={onPrimaryButtonClick}
      primaryButtonProps={{
        disabled:
          (!viewName || viewName.trim().length < 1) &&
          !replaceSelectSelectedOptions
      }}
      onSecondaryButtonClick={handleClose}
      primaryButtonLabel={
        isAnyReplaceValueSelected ? REPLACE_VIEW_BUTTON : SAVE_BUTTON
      }
      secondaryButtonLabel={CANCEL_BUTTON}
      size={MODAL_SIZE}
      title={MODAL_TITLE}
      open={isModalOpen}
    >
      <div className="modal-body-container">
        <div className="view-count">
          {remainingViewCount}/{MAX_VIEW_COUNT} views remaining
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
        <Checkbox
          checked={isDefaultView}
          label={DEFAULT_VIEW_CHECKBOX_LABEL}
          onChange={() => setIsDefaultView(!isDefaultView)}
          variant={CHECKBOX_VARIANT}
        />
        <div className="divider-text">
          <span>{REPLACE_VIEW_DIVIDER_LABEL}</span>
        </div>
        <Select
          currentOptions={replaceSelectCurrentOptions}
          setCurrentOptions={setReplaceSelectCurrentOptions}
          initialOptions={replaceSelectCurrentOptions}
          label={REPLACE_VIEW_SELECT_LABEL}
          labelOrientation={REPLACE_VIEW_INPUT_PLACEHOLDER_POSITION}
          dropDownPortalClassName="modal-top"
          withPortal
          isWithSearch
          placeholder={REPLACE_VIEW_INPUT_PLACEHOLDER}
          selectedOptions={replaceSelectSelectedOptions}
          setSelectedOptions={setReplaceSelectSelectedOptions}
          isOpen={isReplaceOpen}
          setIsOpen={setIsReplaceOpen}
          classNamePrefix="view-management-select"
        />
      </div>
    </Modal>
  );
};

SaveViewManagementModal.propTypes = {
  activeViewDetails: PropTypes.object,
  currentViewList: PropTypes.shape({
    length: PropTypes.number,
    map: PropTypes.func
  }),
  isModalOpen: PropTypes.bool,
  planStatus: PropTypes.number,
  replaceView: PropTypes.func,
  saveView: PropTypes.func,
  screenIdMapping: PropTypes.object,
  setIsModalOpen: PropTypes.func
};

const mapStateToProps = (state) => ({
  screenIdMapping: screenIdMappingSelector(state),
  planStatus: planStatusSelector(state),
  currentViewList: currentViewsListSelector(state),
  activeViewDetails: activeViewDetailSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...saveApis, ...replaceApi }, dispatch)
  };
};

export default connect(mapStateToProps, mapDispatch)(SaveViewManagementModal);
