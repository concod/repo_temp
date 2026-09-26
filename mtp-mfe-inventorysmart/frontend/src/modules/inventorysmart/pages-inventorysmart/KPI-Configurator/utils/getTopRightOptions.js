import React from "react";
import { Button, Tooltip } from "impact-ui-v3";
// TODO: Replace with Figma SVG icons when available
// Import Figma icons from assets folder
// Example: import EditIcon from "assets/IS_icons/IS_edit.svg";
// For now, using Material-UI outlined icons as fallback
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/**
 * Generates top right options for KPI Configurator tables based on selection
 * @param {Object} params - Configuration object
 * @param {Array} params.selectedRows - Currently selected rows
 * @param {Function} params.handleEditSelected - Handler for edit action
 * @param {Function} params.handleDuplicateSelected - Handler for duplicate action
 * @param {Function} params.handleDeleteSelected - Handler for delete action
 * @param {Function} params.handleCreate - Handler for create action
 * @param {string} params.createButtonLabel - Label for create button (default: "Create KPI")
 * @param {boolean} params.isCalculated - Whether this is the Calculated Fields table
 * @param {boolean} params.canEdit - Whether the user can perform create/edit/delete actions
 * @returns {Array} Array of React button components
 */
export const getTopRightOptions = ({
  selectedRows,
  handleEditSelected,
  handleDuplicateSelected = null,
  handleDeleteSelected,
  handleCreate,
  createButtonLabel = "Create KPI",
  isCalculated = false,
  canEdit = true,
}) => {
  let options = [];

  // Read-only access (e.g. PROD, QA in UAT, or clients): no create/edit/duplicate/delete actions
  if (!canEdit) {
    return options;
  }

  // Show Edit, Duplicate, Delete icons when exactly 1 row is selected
  if (selectedRows?.length === 1) {
    options.push(
      <Tooltip
        key="edit-button-tooltip"
        orientation="top"
        title="Edit"
        variant="tertiary"
      >
        <Button
          key="edit-button"
          variant="tertiary"
          onClick={() => handleEditSelected(isCalculated ? selectedRows[0] : selectedRows[0]?.kpi_id)}
          icon={<EditOutlinedIcon />}
        />
      </Tooltip>
    );

    !isCalculated && options.push(
      <Tooltip
        key="duplicate-button-tooltip"
        orientation="top"
        title="Duplicate"
        variant="tertiary"
      >
        <Button
          key="duplicate-button"
          variant="tertiary"
          onClick={handleDuplicateSelected}
          icon={<ContentCopyOutlinedIcon />}
        />
      </Tooltip>
    );
    options.push(
      <Tooltip
        key="delete-button-tooltip"
        orientation="top"
        title="Delete"
        variant="tertiary"
      >
        <Button
          key="delete-button"
          variant="tertiary"
          onClick={handleDeleteSelected}
          icon={<DeleteOutlineIcon />}
        />
      </Tooltip>
    );
  }
  // Show only Delete icon when multiple rows are selected
  else if (selectedRows?.length > 1) {
    options.push(
      <Tooltip
        key="delete-multiple-button-tooltip"
        orientation="top"
        title={`Delete ${selectedRows?.length} items`}
        variant="tertiary"
      >
        <Button
          key="delete-multiple-button"
          variant="tertiary"
          onClick={handleDeleteSelected}
          icon={<DeleteOutlineIcon />}
        />
      </Tooltip>
    );
  }
  // Show Create button when no rows are selected
  else {
    options.push(
      <Button
        key="create-button"
        variant="primary"
        onClick={handleCreate}
      >
        {createButtonLabel}
      </Button>
    );
  }

  return options;
};

