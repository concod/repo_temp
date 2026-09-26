import React from "react";
import { Prompt } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  warningPromptContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "0.5rem",
  },
});
const ExitWarningPrompt = (props) => {
  const customClasses = useStyles();
  return (
    <Prompt
      isOpen={props.showWarningPrompt}
      variant="warning"
      title="Are you sure you want to exit?"
      primaryButtonLabel={props.hasUnsavedChanges ? "Exit & Discard" : "Yes"}
      secondaryButtonLabel={props.hasUnsavedChanges ? "Stay" : "No"}
      onPrimaryButtonClick={props.handleConfirmExit}
      onSecondaryButtonClick={props.handleCancelExit}
      handleClose={props.handleCancelExit}
    >
      <div className={customClasses.warningPromptContent}>
        <p style={{ textAlign: "center" }}>
          Any unsaved changes will be lost on moving to another screen without
          saving the changes.
        </p>
      </div>
    </Prompt>
  );
};

export default ExitWarningPrompt;
