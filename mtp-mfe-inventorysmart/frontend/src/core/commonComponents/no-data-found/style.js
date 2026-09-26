import makeStyles from "@mui/styles/makeStyles";
import colours from "Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
export const useStyles = makeStyles((theme) => ({
  noDataFoundOuterContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  noDataFoundContainer: {
    width: "100%",
    height: "100%",
    maxHeight: pxToRem(517),
    maxWidth: "83.56%",
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(8)} ${pxToRem(0)} ${
      colours.boxShadowCard
    }`,
    background: colours.white,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: `${pxToRem(78)} ${pxToRem(0)}`,
    "& button": {
      marginTop: pxToRem(24),
    },
  },
  noDataFoundContainerHeader: {
    font: `normal normal 600 ${pxToRem(20)}/normal Poppins`,
    color: colours.black,
    marginTop: pxToRem(32),
  },
  noDataFoundContainerSubHeader: {
    font: `normal normal 400 ${pxToRem(16)}/normal Poppins`,
    color: colours.slateGrayLight,
    marginTop: pxToRem(12),
  },
}));