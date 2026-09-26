import { useEffect, useState } from "react";
import { RadioButtonGroup } from "impact-ui-v3";
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
  const handleRadioValChange = (event) => {
    if (event.target.value === "enable-extend-dates") {
      setEnableExtendOption(true);
      props.setResolutionType("conflict_replace");
    } else if (event.target.value === "hard_reset") {
      setEnableExtendOption(false);
      props.setResolutionType(event.target.value);
    } else {
      props.setResolutionType(event.target.value);
    }
  }

  const datesSelectedRadioOptions = [
    { value: "hard_reset", label: "Replace ALL existing eligibility period with current selection." },
    { value: "enable-extend-dates", label: "Add current dates to existing eligibility period.", disabled: enableExtendOption }
  ] 

  const extendDatesRadioOptions = [
    { value: "conflict_replace", label: "Replace conflict dates with New dates", disabled: !enableExtendOption },
    { value: "conflict_combine", label: "Do not replace conflict dates", disabled: !enableExtendOption }
  ]

  useEffect(() => {
    props.setResolutionType("hard_reset");
  }, []);
  return (
    <>
      <div className={globalClasses.dialogTitle}>
        {"Status Conflict Resolution"}
      </div>

      <div className={globalClasses.paperWrapper}>
          <div
            className={`${classes.DialogContentTitle} ${globalClasses.marginBottom}`}
          >
            Selected Dates must
          </div>

        <RadioButtonGroup
          aria-label="conflict-resolution"
          name="controlled-radio-buttons-group"
          value={props.resolutionType}
          onChange={handleRadioValChange}
          options = {datesSelectedRadioOptions}
       / >
         
          {enableExtendOption && (
            <>
              <div
                className={`${classes.DialogContentTitle} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
              >
                Extend existing dates- If current dates conflict then
              </div>
              <RadioButtonGroup
          aria-label="conflict-resolution"
          name="controlled-radio-buttons-group"
          value={props.resolutionType}
          onChange={handleRadioValChange}
          options = {extendDatesRadioOptions}
       />

            </>
          )}
      </div>
    </>
  );
};

export default ConflictResolutionModal;
