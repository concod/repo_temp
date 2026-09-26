import React from "react";
import { Radio, Checkbox } from "@mui/material";

export const StyledCheckbox = (props) => {
  return (
    <Checkbox
      disableRipple
      color="default"
      inputProps={{ "aria-label": "decorative checkbox" }}
      {...props}
    />
  );
};

export const StyledRadio = (props) => {

  return (
    <Radio
      disableRipple
      color="primary"
      inputProps={{ "aria-label": "decorative radio" }}
      {...props}
    />
  );
};
