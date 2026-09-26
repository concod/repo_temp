import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

function PivotVersionsModal({ open, onClose }) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>Pivot Versions</DialogTitle>
      <DialogContent>Table</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained">Apply</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PivotVersionsModal;
