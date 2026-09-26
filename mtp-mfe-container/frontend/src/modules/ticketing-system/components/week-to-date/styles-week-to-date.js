import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  weekDateContainer: {
    height: "100%",
    padding: pxToRem(16),
    borderBottom: `1px solid ${theme.palette.background.separaterColor}`,
    maxWidth: pxToRem(558)
  },
  weekDateContainerHeader: {
    fontSize: pxToRem(16),
    fontWeight: 600,
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  weekToDateInfoContainer: {
    padding: pxToRem(16),
    width: "100%",
    display: "grid",
    gridTemplateColumns: `${pxToRem(255)} ${pxToRem(255)}`,
    gridRowGap: pxToRem(18),
    gridColumnGap: pxToRem(16),
    overflowX: "auto",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    "-ms-overflow-style": "none",
    scrollbarWidth: "none",
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
