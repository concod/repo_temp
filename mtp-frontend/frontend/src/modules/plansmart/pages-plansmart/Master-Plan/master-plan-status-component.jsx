import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
} from "@mui/material";
import colours from "core/Styles/colours";

function MasterPlanStatusComponent({ open, onClose }) {
  return (
    <Dialog open={open} fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Status</DialogTitle>
      <Divider />
      <DialogContent>table</DialogContent>
      <Divider />
      <Box
        component={DialogActions}
        display="flex"
        justifyContent="center"
        py={2}
      >
        <Box
          component={Button}
          color={colours.black}
          variant="contained"
          onClick={onClose}
        >
          Cancel
        </Box>
      </Box>
    </Dialog>
  );
}

export default MasterPlanStatusComponent;
