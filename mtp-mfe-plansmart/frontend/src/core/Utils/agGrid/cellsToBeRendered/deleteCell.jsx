// Delete Icon cell renderer
import React from "react";

import Delete from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const DeleteCell = (props) => {
  const classes = useStyles();
  return (
    <IconButton
      variant="text"
      color="primary"
      className={classes.actionIcon}
      onClick={() => {
        props.onDeleteClick(props);
      }}
      title="Delete"
      size="large"
      disabled={
        props.isDeleteDisabled && props.isDeleteDisabled(props) ? true : false
      }
    >
      <Delete fontSize="small" />
    </IconButton>
  );
};

export default DeleteCell;
