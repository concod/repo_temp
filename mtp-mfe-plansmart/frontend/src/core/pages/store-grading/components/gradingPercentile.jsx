import { Button } from "@mui/material";
import React from "react";
import globalStyles from "core/Styles/globalStyles";

export const GradingPercentile = (props) => {
  const globalClasses = globalStyles();

  const gotoPreviousStep = () => {}
  const gotoNextStep = () => {}

  return (
    <>
      <div>GradingPercentile</div>
      <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
        <Button color="primary" variant="outlined" onClick={gotoPreviousStep}>
          Back
        </Button>
        <Button color="primary" variant="contained" onClick={gotoNextStep}>
          Next
        </Button>
      </div>
    </>
  );
};

export default GradingPercentile;
