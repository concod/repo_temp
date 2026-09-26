import React, { useState } from "react";
import { Button, Tooltip } from "impact-ui";
import PropTypes from "prop-types";
import "./CustomActionButton.css";

const CustomActionButton = (props) => {
  const {
    id,
    name = "",
    variant = "url",
    icon,
    onClick,
    tooltipText,
    hideTooltip = false,
    placement = "bottom",
    disabled = false,
    domRef = null,
    ...otherProps
  } = props;

  const [disableToolTip, setDisableToolTip] = useState(false);

  const handleButtonClick = () => {
    setDisableToolTip(true);
    onClick();
  };

  return (
    <div
      className={`custom-button-wrapper ${
        props.warnButton ? " warn-button" : ""
      }`}
      style={{ ...props.buttonWrapperStyle }}
      onMouseEnter={() => setDisableToolTip(false)}
      onMouseLeave={() => setDisableToolTip(true)}
    >
      <Tooltip
        text={tooltipText}
        placement={placement}
        disabled={hideTooltip || disableToolTip}
      >
        <Button
          className={`${
            variant === "url" &&
            ((props.warnButton && "custom-action-button-warn") ||
              "custom-action-button")
          }${
            variant === "url" && disabled ? " disabled-button" : ""
          } custom-button-icon-container`}
          disabled={disabled}
          id={id}
          data-testid={id}
          variant={variant}
          onClick={handleButtonClick}
          icon={icon}
          ref={domRef}
          {...otherProps}
        >
          {name}
        </Button>
      </Tooltip>
    </div>
  );
};

export default CustomActionButton;

CustomActionButton.PropTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  variant: PropTypes.oneOf(["primary", "secondary", "url"]),
  buttonWrapperStyle: PropTypes.object,
  disabled: PropTypes.bool,
  hideTooltip: PropTypes.bool,
  icon: PropTypes.func,
  onClick: PropTypes.func,
  tooltipText: PropTypes.string,
  placement: PropTypes.string,
  domRef: PropTypes.shape({
    current: PropTypes.any
  })
};
