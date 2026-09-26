import React from "react";
import { Button, Dialog, DialogContent, DialogActions } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import StyledChip from "core/Utils/chip/StyledChip";

const TimeBoundStatusDialog = (props) => {
  const useStyles = makeStyles((theme) => ({
    spacedElements: {
      display: "flex",
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      gap: theme.spacing(0.25),
      flexWrap: "wrap",
      maxHeight: "10rem",
      overflowX: "auto",
    },
  }));

  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Dialog
      open={true}
      className={globalClasses.dialogConfirmBox}
      onClose={props.secondaryBtnAction}
      id={"routePrompt"}
    >
      <DialogContent className={globalClasses.minHeightBody}>
        <div className={globalClasses.dialogTitle}>{props.dialogTitle}</div>
        {props.timeBoundSuccessCode.length > 0 && (
          <div
            className={`${globalClasses.dialogText} ${globalClasses.verticalLabel}`}
          >
            Time Bound Validation Success
          </div>
        )}
        <div className={classes.spacedElements}>
          {props.timeBoundSuccessCode.map((ele) => (
            <StyledChip color="success" label={ele} />
          ))}
        </div>
        <div className={`${classes.dialogText} ${globalClasses.verticalLabel}`}>
          Time Bound Validation Error
        </div>
        <div className={classes.spacedElements}>
          {props.timeBoundErrorCode.map((ele) => (
            <StyledChip color="error" label={ele} />
          ))}
        </div>
      </DialogContent>
      <DialogActions className={globalClasses.dialogActionBox}>
        <Button
          id="routePromptYes"
          onClick={props.secondaryBtnAction}
          color="primary"
          autoFocus
        >
          {props.secondaryBtnText}
        </Button>
        <Button
          id="routePromptYes"
          onClick={props.primaryBtnAction}
          color="primary"
          autoFocus
          disabled={props.isPrimaryBtnDisabled}
        >
          {props.primaryBtnText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeBoundStatusDialog;
