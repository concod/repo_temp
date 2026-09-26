import React, { useState } from "react";
import {
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
} from "@mui/material";
import { StyledRadio } from "core/Utils/selection/selection";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  radioGrp: {
    margin: "1rem",
  },
  button: {
    margin: 15,
  },
});

const DownloadRollupPopover = (props) => {
  const classes = useStyles();
  const [downloadOption, setDownloadOption] = useState("");
  const handleChange = (event) => {
    setDownloadOption(event.target.value);
  };

  const handlePlanDownload = () => {
    props.onDownload(downloadOption);
  };

  const getFormLabel = (level) => {
    return `Download ${
      level === "plan_level"
        ? "plan level"
        : level === "channel_level"
        ? "channel level"
        : level === "department_level"
        ? "department level"
        : level === "division_level"
        ? "division level"
        : level
    } roll up`;
  };
  
  return (
    <div>
      <FormControl component="fieldset">
        <RadioGroup
          column
          className={classes.radioGrp}
          name="selection"
          aria-label="selection"
        >
          {props.screenConfiguration?.dashboard?.download_level.map(level=>{
            let label = getFormLabel(level);
            return(
              <FormControlLabel
                value={level === "channel_level" ? "channel" : level}
                control={<StyledRadio color="primary" />}
                label={label}
                onClick={handleChange}
              />
            )
          })}
        </RadioGroup>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          onClick={handlePlanDownload}
        >
          Download
        </Button>
      </FormControl>
    </div>
  );
};
export default DownloadRollupPopover;
