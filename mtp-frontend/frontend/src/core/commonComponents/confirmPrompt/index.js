import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import CustomCheckBox from "../customCheckbox";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const sharedStyles = makeStyles(() => ({
  contentBody: {
    minHeight: "4rem",
    border: "none",
  }
}));

const ConfirmPrompt = ({
  showModal = true,
  setConfirm = () => null,
  confirmCallback = () => null,
  ariaLabeledBy = "routePromptTitle",
  message = "Are you sure you want to leave this page without saving changes?",
  title = "Leave Page",
  primaryBtnText = "Yes",
  secondaryBtnText = "No",
  isSaveAll = false,
  value = null,
  children,
  classes = {},
  size = "sm",
  showCloseIcon = false,
  hideActionFooter = false,
  onEscapeKeyDown = true,
  onBackdropClick = true,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const promptClasses = sharedStyles();
  const sharedClasses = useStyles();

  const allowTransition = (e) => {
    e.stopPropagation();
    setConfirm(false);
    confirmCallback(true, isChecked, value);
  };

  const blockTransition = (e, reason) => {
    switch(reason) {
      case "escapeKeyDown":
        onEscapeKeyDown && blockTransition(e);
        break;
      case "backdropClick":
        onBackdropClick && blockTransition(e);
        break;
      default:
        e.stopPropagation();
        setConfirm(false);
        confirmCallback(false);
    }
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={showModal}
      fullWidth={true}
      onClose={blockTransition}
      aria-labelledby={ariaLabeledBy}
      id="routePrompt"
      className={classes.dialog}
      maxWidth={size}
    >
      {title?.length ? (
        <DialogTitle id={ariaLabeledBy} className={classes.title}>
          {title}
        </DialogTitle>
      ) : null}
      {showCloseIcon && (
        <IconButton
          aria-label="close"
          size="small"
          className={sharedClasses.closeIcon}
        >
          <CloseIcon onClick={blockTransition} />
        </IconButton>
      )}
      <DialogContent dividers={true} className={promptClasses.contentBody}>
        {message?.length ? (
          <DialogContentText className={classes.dialogContentText}>
            {message}
          </DialogContentText>
        ) : null}
        {children}
        {isSaveAll && (
          <CustomCheckBox
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            key="userPreference"
            label="Do not show again"
            value="Do not show again"
          />
        )}
      </DialogContent>
      {!hideActionFooter && (
        <DialogActions>
          {primaryBtnText?.length ? (
            <Button
              id="routePromptYes"
              onClick={allowTransition}
              color="primary"
              variant="contained"
              autoFocus
            >
              {primaryBtnText}
            </Button>
          ) : null}
          {secondaryBtnText?.length ? (
            <Button
              autoFocus
              id="routePromptNo"
              onClick={blockTransition}
              color="primary"
              variant="outlined"
            >
              {secondaryBtnText}
            </Button>
          ) : null}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ConfirmPrompt;
