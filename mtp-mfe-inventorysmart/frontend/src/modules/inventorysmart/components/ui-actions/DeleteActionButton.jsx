import DeleteTrashIcon from "assets/IS_icons/IS_deleteTrash.svg";
import { Button, Tooltip } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

const DELETE_ICON_DISABLED = "#C3C8D4";

const iconFill = (color) => ({
  color: `${color} !important`,
  "& svg path": { fill: `${color} !important` },
});

/**
 * Shared outlined delete action for Inventory screens.
 *
 * Default: secondary + destructive (gray bordered square, red fill/border on hover).
 * iconOnly: still paints red fill/border on hover.
 * plainHover: no bg/border on hover — only the icon turns red.
 */
const useStyles = makeStyles({
  iconOnly: {
    "&.ia-styles.ia-btn.ia-btn-outlined.ia-btn-destructive": {
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
    "&.ia-styles.ia-btn.ia-btn-outlined.ia-btn-destructive.ia-btn-disabled, &.ia-styles.ia-btn.ia-btn-outlined.ia-btn-destructive:disabled":
      {
        borderColor: "transparent",
        backgroundColor: "transparent",
        cursor: "not-allowed",
        ...iconFill(DELETE_ICON_DISABLED),
      },
  },
  plainHover: {
    "&.ia-styles.ia-btn.ia-btn-outlined.ia-btn-destructive:hover:not(.ia-btn-disabled)": {
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
  },
});

const DeleteActionButton = ({
  onClick,
  disabled = false,
  title = "Delete",
  size = "large",
  iconOnly = false,
  plainHover = false,
  className,
  ...rest
}) => {
  const classes = useStyles();
  return (
    <Tooltip title={title} orientation="top" variant="tertiary">
      <Button
        variant="secondary"
        type="destructive"
        onClick={onClick}
        disabled={disabled}
        icon={<DeleteTrashIcon />}
        size={size}
        title={title}
        className={[
          iconOnly ? classes.iconOnly : "",
          plainHover ? classes.plainHover : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
    </Tooltip>
  );
};

export default DeleteActionButton;
