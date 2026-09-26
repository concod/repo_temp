import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  ticketVolumeOuterContainer: {
    "& .progressBar-container": {
      width: "100%",
      maxWidth: pxToRem(310),
    },
    "& .progressBar-progress-test": {
      display: "none",
    },
    "& .progressBar-label": {
      width: "100%",
      font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.codGray,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    paddingBottom: pxToRem(35),
  },
  ticketVolumeContainerInfoStyleChange: {
    gap: pxToRem(141),
    justifyContent: "flex-start",
    marginTop: pxToRem(24),
  },
}));
