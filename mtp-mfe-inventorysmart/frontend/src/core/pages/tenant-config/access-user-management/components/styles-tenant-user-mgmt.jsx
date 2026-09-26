import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles((theme) => ({
  button: {
  },
  buttonWithMarginValue: {
    marginRight: "1rem",
  },
  deleteButton: {
    height: "2.4rem",
    marginLeft: theme.typography.pxToRem(24),
    textTransform: "none",
    "&.MuiButton-outlined": {
      color: "#FF0000",
      border: "1px solid #f00",
    },
  },
  // Dialog box styles
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      borderRadius: "0.6rem",
    },
  },
  content: {
    padding: "0",
  },
  contentBody: {
    padding: "1rem 1.8rem 1.8rem 1.8rem",
    border: "1px solid #e3ecf4",
  },
  //  Round button styles
  roundButton: {
    height: theme.typography.pxToRem(50),
    borderRadius: "50%",
    padding: `${theme.typography.pxToRem(6)} ${theme.typography.pxToRem(10)}`,
    minWidth: 0,
    textTransform: "none",
    marginBottom: "0.5rem",
  },
  addIcon: {
    fontSize: "2rem",
  },
  iconText: {
    color: "#97a0a7",
    fontSize: "smaller",
  },
  iconStyle: {
    cursor: "pointer",
  },
}));
