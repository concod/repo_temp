// Edit Icon cell renderer
import React from "react";

import Edit from "@mui/icons-material/Edit";
import { IconButton } from "@mui/material";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const EditCell = (props) => {
  const classes = useStyles();
  return (
    <IconButton
      variant="text"
      color="primary"
      className={classes.actionIcon}
      onClick={() => {
        props.onEditClick(props);
      }}
      title="Edit"
      size="large"
      disabled={props.isEditDisabled && props.isEditDisabled(props) ? true : false}
    >
      <Edit  fontSize="small"/>
    </IconButton>
  );
};

export default EditCell;
