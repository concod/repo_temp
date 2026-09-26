import React, { useEffect, useState } from "react";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";

const ConflictResolutionModal = (props) => {
  const useStyles = makeStyles((theme) => ({
    DialogContentTitle: {
      ...theme.typography.h6,
    },
  }));
  const [enableExtendOption, setEnableExtendOption] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    props.setResolutionType("hard_reset");
  }, []);
  return (
    <>
      <div className={globalClasses.dialogTitle}>
        {"Status Conflict Resolution"}
      </div>

      <div className={globalClasses.paperWrapper}>
        <RadioGroup
          aria-label="conflict-resolution"
          name="controlled-radio-buttons-group"
          value={props.resolutionType}
          onChange={(event) => {
            if (event.target.value === "enable-extend-dates") {
              setEnableExtendOption(true);
              props.setResolutionType("conflict_replace");
            } else if (event.target.value === "hard_reset") {
              setEnableExtendOption(false);
              props.setResolutionType(event.target.value);
            } else {
              props.setResolutionType(event.target.value);
            }
          }}
        >
          <div
            className={`${classes.DialogContentTitle} ${globalClasses.marginBottom}`}
          >
            Selected Dates must
          </div>

          <FormControlLabel
            value="hard_reset"
            control={<Radio color="primary" />}
            label="Replace ALL existing eligibility period with current selection."
          />
          <FormControlLabel
            value="enable-extend-dates"
            control={<Radio color="primary" />}
            label="Add current dates to existing eligibility period."
            disabled={enableExtendOption}
          />

          {enableExtendOption && (
            <>
              <div
                className={`${classes.DialogContentTitle} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
              >
                Extend existing dates- If current dates conflict then
              </div>

              <FormControlLabel
                value="conflict_replace"
                control={<Radio color="primary" />}
                label="Replace conflict dates with New dates"
                disabled={!enableExtendOption}
              />

              <FormControlLabel
                value="conflict_combine"
                control={<Radio color="primary" />}
                label="Do not replace conflict dates"
                disabled={!enableExtendOption}
              />
            </>
          )}
        </RadioGroup>
      </div>
    </>
  );
};

export default ConflictResolutionModal;
