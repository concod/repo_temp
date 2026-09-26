import { Button, Tooltip } from "impact-ui";
import PropTypes from "prop-types";

const ActionButton = (props) => {
  const {
    id,
    icon,
    onClick,
    tooltipText,
    placement = "top",
    ref = null,
    ...otherProps
  } = props;
  return (
    <Tooltip text={tooltipText} placement={placement}>
      <Button
        id={id}
        variant="secondary"
        onClick={onClick}
        icon={icon}
        ref={ref}
        {...otherProps}
      />
    </Tooltip>
  );
};

export default ActionButton;

ActionButton.PropTypes = {
  id: PropTypes.string,
  icon: PropTypes.func,
  onClick: PropTypes.func,
  tooltipText: PropTypes.string,
  placement: PropTypes.string,
  ref: PropTypes.shape({
    current: PropTypes.any
  })
};
