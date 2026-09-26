import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
} from "@mui/material";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";

function MasterPlanSnapshotComponent({ open, onClose }) {
  const [masterPlanSnapshotFormData, setMasterPlanSnapshotFormData] = useState(
    {}
  );
  const handleMasterPlanSnapshotForm = (e) => {
    setMasterPlanSnapshotFormData({
      [e.target.name]: e.target.value,
    });
  };
  const handleSubmit = () => {
    addSnack({
      message:
        "Snapshot taken successfully and saved under snapshots in Dashboard",
      options: {
        variant: "success",
      },
    });
    onClose();
  };
  const onDate = masterPlanSnapshotFormData.onDate;
  const user = masterPlanSnapshotFormData.user;
  const notes = masterPlanSnapshotFormData.notes;
  return (
    <Dialog open={open} fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle>Snapshot</DialogTitle>
      <Divider />
      <DialogContent>
        <Box display="flex" alignItems="center" mt={2}>
          <span>Taking snapshot on</span>
          <Box
            component={TextField}
            width="120px"
            type="text"
            variant="outlined"
            name="onDate"
            size="small"
            value={onDate}
            px={1}
            onChange={handleMasterPlanSnapshotForm}
          />
          <span>date by</span>
          <Box
            component={TextField}
            width="120px"
            type="text"
            name="user"
            value={user}
            variant="outlined"
            size="small"
            px={1}
            onChange={handleMasterPlanSnapshotForm}
          />
          <span>user.</span>
        </Box>
        <Box mt={3} mb={2} display="flex" alignItems="center">
          <span>Notes</span>
          <Box
            component={TextField}
            width="200px"
            name="notes"
            value={notes}
            type="text"
            variant="outlined"
            size="small"
            ml={5}
            onChange={handleMasterPlanSnapshotForm}
          />
        </Box>
      </DialogContent>
      <Divider />
      <Box component={DialogActions} bgcolor={colours.concrete}>
        <Button color="primary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Snap
        </Button>
      </Box>
    </Dialog>
  );
}

const mapDispatch = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
  };
};

export default connect(null, mapDispatch)(MasterPlanSnapshotComponent);
