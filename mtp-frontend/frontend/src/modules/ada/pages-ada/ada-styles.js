import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";

export const useStyles = makeStyles((theme) => ({
  horizontalCenter: {
    display: "flex",
    alignItems: "center",
  },
  rightAlign: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  applyRightMargin: {
    marginRight: theme.typography.pxToRem(8),
  },
  applyLeftMargin: {
    marginLeft: theme.typography.pxToRem(8),
  },
  applyBottomMargin: {
    marginBottom: theme.typography.pxToRem(15),
  },

  //MFP - Forecast KPI
  forecastKpiContainer: {
    backgroundColor: `${colours.white}`,
    padding: "1rem",
    boxShadow: `0px 0px 6px ${colours.boxShadow}`,
    [theme.breakpoints.up("md")]: {
      padding: "2rem",
    },
  },
  forecastKpiDescription: {
    margin: "0",
    fontWeight: "normal",
    fontSize: "0.75rem",
    [theme.breakpoints.up("md")]: {
      margin: "0 0 1.5rem 0",
    },
  },
  forecastKpiItem: {
    display: "flex",
    gap: "1rem",
    borderBottom: `2px solid ${colours.lightGray}`,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "1.5rem 0",
    width: "100%",
    [theme.breakpoints.up("md")]: {
      borderBottom: "none",
      borderRight: `2px solid ${colours.lightGray}`,
      padding: "0 1.5rem",
      justifyContent: "center",
    },
  },
  forecastKpiIcon: {
    flex: "0 0 3rem",
    width: "3rem",
    height: "3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    [theme.breakpoints.up("md")]: {
      flex: "0 0 4rem",
      width: "4rem",
      height: "4rem",
    },
  },
  forecastKpiLabel: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    fontSize: "0.85rem",
    lineHeight: "1.5",
  },
  forecastKpiSubfix: {
    fontSize: "0.8rem",
    fontWeight: "normal",
  },

  //MFP - No Data Found
  forecastNoDataContainer: {
    backgroundColor: `${colours.white}`,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0px 0px 6px ${colours.boxShadow}`,
    [theme.breakpoints.up("md")]: {
      padding: "2rem",
    },
  },
  forecastNoDataIcon: {
    transform: "scale(0.85)",
  },
  forecastNoDataTitle: {
    marginBottom: "1rem",
    fontWeight: "600",
  },
}));
