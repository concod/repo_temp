import { lightBlue } from "@mui/material/colors";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  recentActivityContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: pxToRem(319),
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    borderRadius: pxToRem(3),
    color: colours.codGray,
    letterSpacing: pxToRem(0),
    flexDirection: "column",
    padding: `${pxToRem(25)} ${pxToRem(0)} ${pxToRem(22)}`,
  },
  recentActivityTotalCount: {
    font: `normal normal 600 ${pxToRem(34)}/${pxToRem(51)} Poppins`,
  },
  recentActivityTitle: {
    font: `normal normal 500 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    marginTop: pxToRem(4),
  },
  recentActivityViewText: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    color: colours.endavour,
    cursor: "pointer",
    marginTop: pxToRem(12),
  },
  recentActivityAbsoluteContainer: {
    position: "absolute",
    top: "90px",
    right: "50px",
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(8)} ${colours.boxShadow}`,
    borderRadius: pxToRem(4),
    transition: "all 0.3s ease-in-out",
    width: "100%",
    maxWidth: pxToRem(549),
    background: colours.white,
    border: "none",
    zIndex: 1,
    height: "100%",
  },
  recentActivityHeaderClose: {
    cursor: "pointer",
    width: pxToRem(12),
    height: pxToRem(12),
    color: colours.slateGrayLight,

    "& svg": {
      width: pxToRem(12),
      height: pxToRem(12),
    },

    "&:hover": {
      transform: "scale(1.01)",
    },
  },
  mh100: {
    maxHeight: "100vh",
  },
}));
