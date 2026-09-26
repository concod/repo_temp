import makeStyles from "@mui/styles/makeStyles";
const storeGroupStyles = makeStyles((theme) => ({
  horizontalCenter: {
    display: "flex",
    alignItems: "center",
  },
  centerAlign: {
    display: "flex",
    justifyContent: "center",
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
}));

export default storeGroupStyles;
