import React from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  InputLabel,
  TextField,
} from "@mui/material";
import { plansmartLabelsForButtons } from "modules/plansmart/constants-plansmart/stringConstants";
import { Modal } from "impact-ui";
import { useBudgetStyles } from "../plansmart-budget-table/budget-table-style";
import { useStyles } from "../plansmart-styles";
import { Label } from "@mui/icons-material";
import { useState } from "react";

function CopyConfirmation({
  isInSeasonDashbaord,
  open,
  loader,
  onClose,
  onSubmit,
}) {
  const scenarioLabel = plansmartLabelsForButtons(isInSeasonDashbaord)
    ?.scenario_plan;

  const [displayName, setDisplayName] = useState("");

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
  };

  const handleOnBlur = () => {
    setDisplayName(displayName?.trim() || displayName);
  };

  const classes = useStyles();
  return (
    <Modal
      size="small"
      heading="Copy Plan"
      isOpen={open}
      onClose={() => onClose()}
      primaryButtonProps={{
        children: "Submit",
        onClick: () => onSubmit(displayName?.trim()),
        disabled: loader || (displayName?.trim() || "").length === 0,
      }}
      tertiaryButtonProps={{ children: "Cancel", onClick: onClose }}
    >
      <div className={classes.dashboardCopyPlanModal}>
        <span className="copy-text">Copy as {scenarioLabel}?</span>
        <span className="input-container">
          <InputLabel>Plan display Name</InputLabel>
          <TextField
            variant="outlined"
            sx={{ width: "100%" }}
            value={displayName}
            onChange={handleDisplayNameChange}
            onBlur={handleOnBlur}
            inputProps={{ maxLength: 64 }}
          />
        </span>
      </div>
    </Modal>
  );
}

export default CopyConfirmation;
