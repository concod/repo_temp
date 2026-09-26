import makeStyles from "@mui/styles/makeStyles";

export const useStyles = makeStyles((theme) => ({
  dragAndDropDiv: {
    margin: "1rem 20rem",
    padding: "2rem 7rem",
    borderStyle: "dashed",
    backgroundColor: theme.palette.primary.lighter,
    boxSizing: "content-box",
    border: `2px dashed ${theme.palette.primary.main}`,
    textAlign: "center",
  },
  browseButton: {
    marginLeft: "2rem",

    "& input": {
      display: "none",
    }
  },
}));
