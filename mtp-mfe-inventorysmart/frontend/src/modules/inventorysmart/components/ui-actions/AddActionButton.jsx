import AddIcon from "assets/IS_icons/IS_add.svg";
import { Button, Tooltip } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

const ADD_ICON_GREY = "#60697D";
const ADD_ICON_BLUE = "#4259EE";
const ADD_ICON_DISABLED = "#C3C8D4";

const iconFill = (color) => ({
  color: `${color} !important`,
  "& svg path": { fill: `${color} !important` },
});

/**
 * Shared add action for Inventory screens.
 *
 * Default: Impact tertiary (gray bordered square).
 * iconOnly: no chrome at rest; grey plus.
 * plainHover: no bg/border on hover — plus turns blue (icon hover and row hover).
 */
const useStyles = makeStyles({
  iconOnly: {
    "&.ia-styles.ia-btn.ia-btn-tertiary:not(.ia-btn-disabled)": {
      borderColor: "transparent",
      backgroundColor: "transparent",
      ...iconFill(ADD_ICON_GREY),
    },
    "&.ia-styles.ia-btn.ia-btn-tertiary.ia-btn-disabled, &.ia-styles.ia-btn.ia-btn-tertiary:disabled":
      {
        borderColor: "transparent",
        backgroundColor: "transparent",
        cursor: "not-allowed",
        ...iconFill(ADD_ICON_DISABLED),
      },
  },
  plainHover: {
    "&.ia-styles.ia-btn.ia-btn-tertiary:hover:not(.ia-btn-disabled)": {
      borderColor: "transparent",
      backgroundColor: "transparent",
      ...iconFill(ADD_ICON_BLUE),
    },
    ".ag-row-hover &.ia-styles.ia-btn.ia-btn-tertiary:not(.ia-btn-disabled)": {
      borderColor: "transparent",
      backgroundColor: "transparent",
      ...iconFill(ADD_ICON_BLUE),
    },
  },
});

const AddActionButton = ({
  onClick,
  disabled = false,
  title = "Add",
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
        variant="tertiary"
        onClick={onClick}
        disabled={disabled}
        icon={<AddIcon />}
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

export default AddActionButton;
