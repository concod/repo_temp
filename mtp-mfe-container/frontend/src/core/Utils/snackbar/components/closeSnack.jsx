import { connect } from "react-redux";
import { closeSnack } from "../../../actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
const useStyles = makeStyles({
  closeSnackBtn: {
    "&:hover": {
      cursor: "pointer",
    },
  },
});
const CloseSnackComponent = (props) => {
  const classes = useStyles();
  return (
    <CloseIcon
      className={classes.closeSnackBtn}
      onClick={() => props.closeSnackbar(props.uniqueId)}
    />
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    closeSnackbar: (key) => dispatch(closeSnack(key)),
  };
};

export default connect(null, mapDispatchToProps)(CloseSnackComponent);
