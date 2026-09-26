import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  headerContainer: {
    padding: `${pxToRem(16)} ${pxToRem(21)}`,
  },
  header: {
    color: colours.black,
    font: `normal normal 600 ${pxToRem(18)}/normal Poppins`,
  },
  headerOptions: {
    color: colours.endavour,
    font: `normal normal 500 ${pxToRem(12)}/normal Poppins`,
    marginLeft: pxToRem(24),
    cursor: "pointer",
  },
  workflowPanelContainer: {
    paddingLeft: pxToRem(16),
    paddingRight: pxToRem(32),
    paddingBottom: pxToRem(17),
  },
}));
