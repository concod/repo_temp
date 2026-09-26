import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  keyValue: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
  },
  keyValueKey: {
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.lightslategray,
  },
  keyValueValue: {
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
    textTransform: "capitalize",
  },
}));
