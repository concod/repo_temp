import React from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import ViewManagementIcon from "assets/viewManagement.svg";
import CircularProgress from "@mui/material/CircularProgress";

import CustomActionButton from "../../../shared/components/CustomActionButton/CustomActionButton.jsx";
import ViewManagementController from "../../../shared/ViewManagement/ViewManagementController.jsx";
import {
  selectIsPivotPanelOpen,
  setIsPivotPanelOpen,
} from "../slices/pivot.slice";
import "./ActionContainer.css";

const ActionContainer = ({
  gridLoader,
  screenId,
  viewDetailsApplyCallback,
  isCellDirty,
  isSaving,
  onSave,
  fetchTemplateDetails,
  skipInitialBootstrap = false,
}) => {
  const dispatch = useDispatch();
  const isPivotPanelOpen = useSelector(selectIsPivotPanelOpen);

  const handleViewManagement = () => {
    dispatch(setIsPivotPanelOpen(!isPivotPanelOpen));
  };

  return (
    <div className="oms-action-container">
      {/* Current View dropdown — bootstrap APIs owned by parent OrderManagement */}
      <ViewManagementController
        screenId={screenId}
        viewDetailsApplyCallback={viewDetailsApplyCallback}
        disabled={gridLoader}
        skipBootstrap={!!fetchTemplateDetails}
        skipInitialBootstrap={skipInitialBootstrap}
        externalFetchTemplate={fetchTemplateDetails ?? undefined}
      />

      <div className="divider-line" />

      <CustomActionButton
        icon={<ViewManagementIcon />}
        tooltipText="View Management"
        onClick={handleViewManagement}
        variant="tertiary"
        id="viewManagementButton"
        disabled={gridLoader}
      />

      {/* <div className="divider-line" />

      <CustomActionButton
        icon={
          isSaving ? (
            <CircularProgress size={14} />
          ) : (
            <SaveOutlinedIcon fontSize="small" />
          )
        }
        tooltipText={
          isCellDirty ? "Save pending changes" : "No pending changes"
        }
        variant="primary"
        onClick={onSave}
        disabled={!isCellDirty || gridLoader || isSaving || !onSave}
        id="saveButton"
      /> */}
    </div>
  );
};

ActionContainer.propTypes = {
  gridLoader: PropTypes.bool,
  screenId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  viewDetailsApplyCallback: PropTypes.func,
  isCellDirty: PropTypes.bool,
  isSaving: PropTypes.bool,
  onSave: PropTypes.func,
  fetchTemplateDetails: PropTypes.func,
  skipInitialBootstrap: PropTypes.bool,
};

export default ActionContainer;
