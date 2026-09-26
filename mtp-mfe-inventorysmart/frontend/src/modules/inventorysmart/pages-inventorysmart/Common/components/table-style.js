import makeStyles from "@mui/styles/makeStyles";

export const useStoreCapacityStyles = makeStyles(() => ({
  paddingContent: {
    padding: "2rem",
  },
  contentBody: {
    padding: "3rem",
  },
  storeModalPopup: {
    "& .MuiDialog-paperWidthSm": { maxWidth: "80%", width: "80%" },
  },
  constraintsToolbar: {
    display: "flex",
    justifyContent: "space-between",
  },
  footer: {
    textAlign: "center",
    padding: "1rem",
  },
  tableBody: {
    paddingTop: "2rem",
  },
  headerWrapper: {
    display: "flex",
    alignItems: "center",
  },
  headerContainer: {
    display: "flex",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    alignItems: "center",
  },
  radioBtnsHeader: {
    gap: "1rem",
    flex: 1,
  },
  storeDownloadButton: {
    marginRight: "12px",
  },
}));
export const useStockDrillDownStyles = makeStyles(() => ({
  sizeSplitTableWidth: {
    margin: "1rem auto",
    width: "60%",
  },
}));
