import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  weekDateContainer: {
    padding: pxToRem(16),
    paddingBottom: pxToRem(24),
    height: "100%",
    "& h4": {
      margin: 0,
    },
    "& .select-label": {
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.slateGrayLight,
    },

    "& .select-button": {
      minWidth: pxToRem(166),
      height: pxToRem(37),
    },
    "& .select-dropdown-container": {
      minWidth: pxToRem(166),
    },
  },
  weekDateContainerHeader: {
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  weekToDateInfoContainer: {
    width: "100%",
    marginTop: pxToRem(18),
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridRowGap: pxToRem(18),
    gridColumnGap: pxToRem(37),
  },
  ticketVolumeContainerInfoPercentage: {
    display: "flex",
    alignItems: "center",
    marginTop: pxToRem(8),

    "& span": {
      marginRight: pxToRem(2),
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(18)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.eucalyptus,

      "& svg": {
        width: pxToRem(14),
        height: pxToRem(14),
      },
    },

    "& .text": {
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.lightslategray,
    },

    "& .ml-4": {
      marginLeft: pxToRem(4),
    },
    "& .ml-5": {
      marginLeft: pxToRem(5.48),
    },

    "& .positive": {
      color: colours.deYork,
      fontWeight: "bold",
      display: "flex",

      "& svg": {
        fill: colours.deYork,
      },
    },

    "& .negative": {
      color: colours.alizarinCrimson,
      fontWeight: "bold",
      display: "flex",

      "& svg": {
        fill: colours.alizarinCrimson,
      },
    },
  },
  flexContainerHeaderIcon: {
    gap: pxToRem(4),
    display: "flex",
    alignItems: "center",

    "& svg": {
      width: pxToRem(20),
      height: pxToRem(20),
    },
  },
}));
