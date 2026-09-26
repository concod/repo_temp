import { makeStyles } from "@mui/styles";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  // Mirrors exception-flow `baseRuleSavedContainer` — separate card, no link line.
  container: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    borderBottom: "1px solid #D9DDE7",
    backgroundColor: "#FFF",
    alignSelf: "stretch",
    flex: "1 0 0",
    minWidth: 0,
    cursor: "default",
    fontFamily: "Manrope",
    maxWidth: "32%"
  },
  iconWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#D9DDE7",
    flexShrink: 0,
    color: "#60697D",
    "& svg": {
      width: 14,
      height: 14,
    },
  },
  label: {
    flex: "1 0 0",
    minWidth: 0,
    color: "#60697D",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "21px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 164,
    padding: "2px 8px",
    borderRadius: 1000,
    backgroundColor: "#F2F3F4",
    color: "#5F6673",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "20px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  infoIcon: {
    width: 24,
    height: 24,
    color: "#9E9E9E",
    flexShrink: 0,
    cursor: "pointer",
  },
}));

const ADD_EXCEPTIONS_INFO =
  "Override base constraints for specific stores";

export const AddExceptionsStepper = () => {
  const classes = useStyles();

  return (
    <div className={classes.container} aria-label="Add Exceptions, optional">
      <span className={classes.iconWrap}>
        <OpenInNewIcon fontSize="inherit" />
      </span>
      <span className={classes.label}>Add Exceptions</span>
      <span className={classes.badge}>Optional</span>
      <Tooltip title={ADD_EXCEPTIONS_INFO} orientation="right" variant="tertiary">
        <InfoOutlinedIcon className={classes.infoIcon} />
      </Tooltip>
    </div>
  );
};
