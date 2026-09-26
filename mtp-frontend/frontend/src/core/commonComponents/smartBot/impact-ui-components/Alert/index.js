import React from "react";
import MUIAlert from "@mui/material/Alert";
import MUIAlertTitle from "@mui/material/AlertTitle";
import PropTypes from "prop-types";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import CancelIcon from "@mui/icons-material/Cancel";

import { Button } from "@mui/material";

import "./Alert.styles.scss";

export const Alert = ({
  severity,
  title,
  description = "",
  actionName = "",
  onAction = undefined,
  onClose = undefined,
  actionButtonProps,
  children,
  ...args
}) => {
  return (
    <MUIAlert
      iconMapping={{
        success: <CheckCircleIcon fontSize="small" />,
        info: <InfoIcon fontSize="small" />,
        warning: <WarningIcon fontSize="small" />,
        error: <CancelIcon fontSize="small" />,
      }}
      className="ia-styles ia-alert"
      severity={severity}
      {...args}
    >
      <div className="ia-alert-body">
        <MUIAlertTitle>{title || severity}</MUIAlertTitle>
        {actionName && onAction ? (
          <Button variant="text" size="small" onClick={onAction}>
            {actionName}
          </Button>
        ) : null}
        {onClose ? (
          <Button variant="text" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </Button>
        ) : null}
      </div>
      {description ? <span className="description">{description}</span> : null}
    </MUIAlert>
  );
};

Alert.propTypes = {
  severity: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  actionName: PropTypes.string,
  onAction: PropTypes.func,
  onClose: PropTypes.func,
};
