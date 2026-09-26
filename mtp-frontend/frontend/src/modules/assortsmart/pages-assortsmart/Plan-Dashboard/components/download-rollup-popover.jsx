import React, { useState } from "react";
import {
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
} from "@mui/material";
import { StyledRadio } from "core/Utils/selection/selection";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect } from "react";

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
  const [downloadLevel, setDownloadLevel] = useState(props.screenConfiguration?.dashboard?.download_level)
  const handleChange = (event) => {
    setDownloadOption(event.target.value);
  };

  const handlePlanDownload = () => {
    props.onDownload(downloadOption);
  };

  const getFormLabel = (level) => {
    let levelVal;
    switch (level) {
      case "plan_level":
        levelVal = "plan level";
      case "channel_level":
        levelVal = "channel level";
      case "department_level":
        levelVal = "department level";
      case "division_level":
        levelVal = "division level";
      default:
        levelVal = level;
    }
    return levelVal;
  };
  useEffect(() => {
    let downloadingLevel = []
    if(props.displayDivisionOnly) {
      props.screenConfiguration?.dashboard?.download_level.forEach((item)=> {
        if(item.includes("division")) {
          downloadingLevel.push(item)
        }

      })
      setDownloadLevel(downloadingLevel)
    } else if(downloadLevel?.length !== props.screenConfiguration?.dashboard?.download_level?.length) {
      setDownloadLevel(props.screenConfiguration?.dashboard?.download_level?.length)
    }
  },[props.displayDivisionOnly])

  return (
    <div>
      <FormControl component="fieldset">
        <RadioGroup
          column
          className={classes.radioGrp}
          name="selection"
          aria-label="selection"
        >
          {downloadLevel.map((level) => {
            let label = `Download ${getFormLabel(level)} roll up`;
            return (
              <FormControlLabel
                value={level === "channel_level" ? "channel" : level}
                control={<StyledRadio color="primary" />}
                label={label}
                disabled={
                  level === "department_level" && props.selectedPlans.length > 1
                }
                onClick={handleChange}
              />
            );
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
