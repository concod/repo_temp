import React, { useMemo } from "react";
import PropTypes from "prop-types";
import MUIButton from "@mui/material/Button";
import "./Button.styles.scss";

export const Button = ({
  children,
  size = "large",
  variant = "contained",
  loading = false,
  icon = undefined,
  iconPlacement = "left",
  disabled,
  className,
  ...args
}) => {
  const convertedVariant = useMemo(() => {
    switch (variant) {
      case "secondary":
        return "outlined";
      case "text":
        return "text";
      case "url":
        return "link";
      case "primary":
      default:
        return "contained";
    }
  }, [variant]);

  const classStr = useMemo(() => {
    let retVal = `ia-styles ia-btn ${className}`;

    switch (convertedVariant) {
      case "outlined":
        retVal += " ia-btn-outlined";
        break;
      case "link":
        retVal += " ia-btn-link";
        break;
      case "text":
        retVal += " ia-btn-text";
        break;
      case "contained":
      default:
        retVal += " ia-btn-contained";
        break;
    }

    switch (size) {
      case "small":
        retVal += " ia-btn-small";
        break;
      case "medium":
        retVal += " ia-btn-medium";
        break;
      case "large":
      default:
        retVal += " ia-btn-large";
        break;
    }

    if (disabled) {
      retVal += " ia-btn-disabled";
    }

    if (icon) {
      if (children) {
        retVal += " ia-btn-with-icon";
      } else retVal += " ia-btn-only-icon";
    }

    return retVal;
  }, [children, convertedVariant, size, loading, disabled, icon]);

  const finalLabel =
    variant === "url" && !disabled && loading && children
      ? "Loading..."
      : children;

  const finalIcon =
    icon && loading && (convertedVariant !== "link" || !children) ? (
      <div className="ia-btn-loading-icon">
        <span
          className={`ia-btn-loading-track ia-btn-loading-${
            convertedVariant === "contained" ? "dark" : "light"
          }`}
        />
      </div>
    ) : (
      icon
    );

  if (iconPlacement === "right") {
    return (
      <MUIButton
        {...args}
        disabled={disabled}
        className={classStr}
        disableRipple
        disableElevation
      >
        {finalLabel}
        {finalIcon}
      </MUIButton>
    );
  }

  return (
    <MUIButton
      {...args}
      disabled={disabled}
      className={classStr}
      disableRipple
      disableElevation
    >
      {finalIcon}
      {finalLabel}
    </MUIButton>
  );
};

Button.propTypes = {
  size: PropTypes.string,
  variant: PropTypes.string,
  loading: PropTypes.bool,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  iconPlacement: PropTypes.string,
};
