import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
} from "@mui/material";
import { SNACK_VARIANT } from "modules/plansmart/utils-plansmart/snackMessage";

function SaveScenarioPlanModal({
  open,
  loader,
  onClose,
  onSubmit,
  showSnackMessage,
}) {
  const [scenarioName, setScenarioName] = useState("");

  const handleScenarioName = (event) => {
    setScenarioName(event.target.value);
  };
  const handleClose = () => {
    onClose();
  };
  const handleSubmit = async () => {
    if (scenarioName) {
      onSubmit(scenarioName);
    } else {
      showSnackMessage("Please enter scenario name", SNACK_VARIANT.ERROR);
    }
  };
  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={handleClose}>
      <DialogContent>
        <Box display="flex" alignItems="center">
          <div>Please enter Scenario Name</div>
          <Box
            component={TextField}
            placeholder="Enter Name"
            width="200px"
            type="text"
            name="user"
            value={scenarioName}
            variant="outlined"
            size="small"
            pl={1}
            onChange={handleScenarioName}
          />
        </Box>
      </DialogContent>
      <Box component={DialogActions}>
        <Button color="primary" size="small" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleSubmit}
          disabled={loader}
          startIcon={loader ? <CircularProgress size="1rem" /> : null}
        >
          Submit
        </Button>
      </Box>
    </Dialog>
  );
}

export default SaveScenarioPlanModal;
