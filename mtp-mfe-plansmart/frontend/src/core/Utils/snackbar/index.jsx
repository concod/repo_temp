import { makeStyles } from "@mui/styles";
import { SnackbarProvider } from "notistack";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
const useStyles = makeStyles({
  error: {
    backgroundColor: "#F34636",
  },
  warning: {
    backgroundColor: "#F9982D",
  },
  info: {
    backgroundColor: "#2296F3",
  },
  success: {
    backgroundColor: "#52AF50",
  },
});
const SnackbarProviderComponent = (props) => {
  const classes = useStyles();
  return (
    <SnackbarProvider
      maxSnack={3}
      classes={{
        variantError: classes.error,
        variantInfo: classes.info,
        variantSuccess: classes.success,
        variantWarning: classes.warning,
      }}
      iconVariant={{
        error: <ErrorOutlineIcon style={{ marginRight: 5 }} />,
        info: <InfoOutlinedIcon style={{ marginRight: 5 }} />,
        warning: <ReportProblemOutlinedIcon style={{ marginRight: 5 }} />,
        success: <CheckCircleOutlineOutlinedIcon style={{ marginRight: 5 }} />,
      }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      {props.children}
    </SnackbarProvider>
  );
};
export default SnackbarProviderComponent;
