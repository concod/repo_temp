import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { connect } from "react-redux";
import { removeSnack } from "../../../actions/snackbarActions";
import { DELAYED_ROUTES } from "config/constants";
import { useLocation } from "react-router-dom-v5-compat";

//SnackBar component is connected to redux => So to use this component, you need to
//dispatch actions to show snackbar
//This component is integrated with snackActions file and have respective methods
//like add a snack, close a snack and also dismiss all the existing snacks once

//Usage instructions =>
//1. Connect your component to redux store
//2. Inside dispatchToProps, include addSnack method
//3. Dispatch that action with the properties to display the Snack Bar
//4. Required Properties => object of message and options
//5. Inside options we can provide variant type, autoHideDuration, key(default value is taken based on the time),
//   action for custom actions to provide on snackbar such as close etc...
//6. If you want to use it inside action files for API calls,
//   dispatch ADD_SNACK action with the above properties

let displayedSnacks = [];
const Snackbar = (props) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  let location = useLocation();
  const snacks = props.snacks || [];
  const storeDisplayed = (id) => {
    displayedSnacks = [...displayedSnacks, id];
  };
  const removeDisplayed = (id) => {
    displayedSnacks = [...displayedSnacks.filter((key) => id !== key)];
  };
  useEffect(() => {
    //Whenever the snack notifications array is changed, call this function
    snacks.forEach((snack) => {
      const dismissed = snack.dismissed || false;
      const key = snack.options.key;
      if (dismissed) {
        // dismiss snackbar using notistack
        closeSnackbar(key);
        return;
      }
      if (displayedSnacks.includes(key)) return;
      const options = snack.options;
      enqueueSnackbar(snack.message, {
        ...options,
        onClose: (event, reason, myKey) => {
          if (options.onClose) {
            options.onClose(event, reason, myKey);
          }
        },
        onExited: (event, myKey) => {
          // remove this snackbar from redux store
          props.removeSnack(myKey);
          removeDisplayed(myKey);
        },
      });
      storeDisplayed(key);
    });
  }, [snacks, closeSnackbar, enqueueSnackbar]);

  useEffect(() => {
    //If the location is changed to login screen, we get the "please login to continue snack".
    //That has to be shown to the user for some time rather than dismissing it immediately
    //unlike rest of the screens. So added a delay of 2 seconds for login route snack dismissals
    if (DELAYED_ROUTES.includes(location.pathname)) {
      setTimeout(() => {
        closeSnackbar();
      }, 2000);
    } else {
      closeSnackbar();
    }
  }, [location]);
  return null;
};
const mapStateToProps = (state) => {
  return {
    snacks: state?.snackbarReducer?.snacks,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    removeSnack: (key) => dispatch(removeSnack(key)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Snackbar);
