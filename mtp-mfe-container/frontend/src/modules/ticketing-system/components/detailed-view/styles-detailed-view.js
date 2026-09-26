import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  outerContainerDetailedView: {
    width: "100%",
    marginTop: pxToRem(20),
  },

  outerContainerDetailedViewHeader: {
    font: `normal normal 600 ${pxToRem(18)}/${pxToRem(27)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },

  outerContainerDetailedViewHeaderNumber: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },

  outerContainerDetailedViewHeaderInfo: {
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },

  detailedView: {
    position: "relative",
  },

  downloadBtn: {
    padding: "0.25rem",
    minWidth: "2.375rem",
  },
  leftMargin: {
    padding: pxToRem(16),
    width: "max-content",
  },
}));
