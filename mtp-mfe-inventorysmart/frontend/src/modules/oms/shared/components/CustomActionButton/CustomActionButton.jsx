import React from "react";
import { Button, Tooltip } from "impact-ui-v3";
import PropTypes from "prop-types";
import "./CustomActionButton.css";

const CustomActionButton = (props) => {
  const {
    id,
    name = "",
    variant = "secondary",
    icon,
    onClick,
    tooltipText,
    hideTooltip = false,
    placement = "top",
    disabled = false,
    domRef = null,
    size = "large",
    ...otherProps
  } = props;

  return (
    <div
      className="v3-custom-button-wrapper"
      style={{ ...props.buttonWrapperStyle }}
    >
      <Tooltip title={tooltipText} orientation={placement} variant="tertiary">
        <div className="v3-button-container" ref={domRef}>
          <Button
            disabled={disabled}
            id={id}
            data-testid={id}
            variant={variant}
            onClick={onClick}
            icon={icon}
            {...otherProps}
            className=".custom-action-button-icon"
            size={size}
          >
            {name}
          </Button>
        </div>
      </Tooltip>
    </div>
  );
};

CustomActionButton.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  variant: PropTypes.oneOf(["primary", "secondary", "text", "url"]),
  buttonWrapperStyle: PropTypes.object,
  disabled: PropTypes.bool,
  hideTooltip: PropTypes.bool,
  icon: PropTypes.func,
  onClick: PropTypes.func,
  tooltipText: PropTypes.string,
  placement: PropTypes.string,
  domRef: PropTypes.shape({ current: PropTypes.any }),
};

export default CustomActionButton;
