import CopyIcon from "assets/IS_icons/IS_copy.svg";
import { Button, Tooltip } from "impact-ui-v3";

/**
 * Shared outlined copy action for Inventory screens.
 * Hover/disabled affordance comes from Impact Button.
 */
const CopyActionButton = ({
  onClick,
  disabled = false,
  title = "Copy",
  size = "large",
  ...rest
}) => {
  return (
    <Tooltip title={title} orientation="top" variant="tertiary">
      <Button
        variant="tertiary"
        onClick={onClick}
        disabled={disabled}
        icon={<CopyIcon />}
        size={size}
        title={title}
        {...rest}
      />
    </Tooltip>
  );
};

export default CopyActionButton;