import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import { Button, Tooltip } from "impact-ui-v3";

/**
 * Shared outlined view action for Inventory screens.
 * Hover/disabled affordance comes from Impact Button.
 */
const ViewActionButton = ({
  onClick,
  disabled = false,
  title = "View",
  size = "large",
  ...rest
}) => {
  return (
    <Tooltip title={title} orientation="top" variant="tertiary">
      <Button
        variant="tertiary"
        onClick={onClick}
        disabled={disabled}
        icon={<EyeIcon />}
        size={size}
        title={title}
        {...rest}
      />
    </Tooltip>
  );
};

export default ViewActionButton;
