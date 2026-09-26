import makeStyles from "@mui/styles/makeStyles";

export const constraintsStyle = {
  readOnlyForm: { padding: "1rem" },
};

export const useConstraintsStyles = makeStyles(() => ({
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
    marginRight: '12px',
  }
}));
