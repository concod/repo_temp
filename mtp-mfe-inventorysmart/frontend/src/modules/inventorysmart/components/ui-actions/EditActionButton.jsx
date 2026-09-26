import EditPencilIcon from "assets/IS_icons/IS_editPencil.svg";
import { Button, Tooltip } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

const EDIT_ICON_GREY = "#60697D";
const EDIT_ICON_BLUE = "#4259EE";
const EDIT_ICON_DISABLED = "#C3C8D4";
const EDIT_HOVER_BG = "#ECEEFD";

const iconFill = (color) => ({
  color: `${color} !important`,
  "& svg path": { fill: `${color} !important` },
});

/**
 * Shared outlined edit action for Inventory screens.
 *
 * Default: Impact tertiary (gray bordered square).
 * iconOnly: no chrome at rest; grey pencil.
 * plainHover: subtle blue bg + blue pencil on hover (icon hover and row hover).
 */
const useStyles = makeStyles({
  iconOnly: {
    "&.ia-styles.ia-btn.ia-btn-tertiary:not(.ia-btn-disabled)": {
      borderColor: "transparent",
      backgroundColor: "transparent",
      minWidth: "24px",
      width: "24px",
      height: "24px",
      maxHeight: "24px",
      padding: "4px !important",
      ...iconFill(EDIT_ICON_GREY),
    },
    "&.ia-styles.ia-btn.ia-btn-tertiary.ia-btn-disabled, &.ia-styles.ia-btn.ia-btn-tertiary:disabled":
      {
        borderColor: "transparent",
        backgroundColor: "transparent",
        cursor: "not-allowed",
        ...iconFill(EDIT_ICON_DISABLED),
      },
  },
  plainHover: {
    "&.ia-styles.ia-btn.ia-btn-tertiary:hover:not(.ia-btn-disabled):not(:disabled)": {
      borderColor: "transparent !important",
      backgroundColor: `${EDIT_HOVER_BG} !important`,
      ...iconFill(EDIT_ICON_BLUE),
    },
    ".ag-row-hover &.ia-styles.ia-btn.ia-btn-tertiary:not(.ia-btn-disabled)": {
      borderColor: "transparent !important",
      backgroundColor: `${EDIT_HOVER_BG} !important`,
      ...iconFill(EDIT_ICON_BLUE),
    },
  },
});

const EditActionButton = ({
  onClick,
  disabled = false,
  title = "Edit",
  size = "large",
  iconOnly = false,
  plainHover = false,
  tooltipVariant = "tertiary",
  tooltipOrientation = "top",
  className,
  ...rest
}) => {
  const classes = useStyles();
  return (
    <Tooltip
      title={title}
      orientation={tooltipOrientation}
      variant={tooltipVariant}
    >
      <Button
        variant="tertiary"
        onClick={onClick}
        disabled={disabled}
        icon={<EditPencilIcon />}
        size={size}
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

export default EditActionButton;
