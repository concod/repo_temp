import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  nonIssueToggleContainer: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(4),
    color: colours.lightslategray,
  },
  issueTypeHeader: {
    width: "100%",
  },
  mt0: {
    marginTop: "0px",
  },
}));
