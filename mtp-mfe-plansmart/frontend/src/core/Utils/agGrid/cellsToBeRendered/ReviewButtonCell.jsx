import React from "react";

import { ArrowForwardIosRounded } from "@mui/icons-material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Button } from "@mui/material";

const ReviewButtonCell = (props) => {
  const classes = useStyles();
  const isDisabled = props.data?.disableAction
    ? props.data?.[props.data?.disableAction] === 0
    : typeof props.disabled === "function"
    ? props.disabled(props.data, props.column_name)
    : props.disabled;

  return (
    <Button
      variant="outlined"
      color="primary"
      onClick={() => {
        props.onReviewClick(props);
      }}
      id="omniReviewBtn"
      className={classes.tableBtn}
      disabled={isDisabled}
    >
      {props.value || props?.extra?.label}
      <ArrowForwardIosRounded
        className={isDisabled ? classes.iconDisabled : classes.iconBlue}
      />
    </Button>
  );
};

export default ReviewButtonCell;
