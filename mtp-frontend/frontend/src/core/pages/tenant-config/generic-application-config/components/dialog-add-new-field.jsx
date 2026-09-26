import React, { useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

const DialogAddNewField = (props) => {
  let [formValue, setFormValue] = useState("");

  const dialogueInputHandler = (e) => {
    setFormValue(e.target.value);
  };

  const dialogueSaveHandler = () => {
    props.setHideDialogueHandler(formValue);
    setFormValue("");
  };

  const dialogueCloseHandler = () => {
    props.setHideDialogueHandler();
    setFormValue("");
  };

  return (
    <Dialog
      open={props.show}
      onClose={dialogueCloseHandler}
      maxWidth="sm"
      fullWidth={true}
    >
      <DialogTitle>Add New Field</DialogTitle>
      <DialogContent>
        <DialogContentText>Provide label name for the field.</DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          type="text"
          fullWidth
          variant="outlined"
          size="small"
          value={formValue}
          onChange={(event) => {
            dialogueInputHandler(event);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="primary" onClick={dialogueCloseHandler}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            dialogueSaveHandler();
          }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogAddNewField;
