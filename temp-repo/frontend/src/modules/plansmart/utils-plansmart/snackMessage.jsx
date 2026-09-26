import { addSnack } from "core/actions/snackbarActions";
import get from "lodash/get";

export const SNACK_VARIANT = {
    ERROR: "error",
    INFO: "info",
    WARNING: "warning",
    SUCCESS: "success",
    FAILURE: "failure",
  }

export const DEFAULT_SNACK_ERROR_MESSAGE = "Something went wrong";

export const showSnackMessage = (text = DEFAULT_SNACK_ERROR_MESSAGE, variant = SNACK_VARIANT.INFO, apiResponseObj = {}) => (dispatch) => {
    const showResponseMessage = get(apiResponseObj, 'data.show_message', false);
    
    let responseMessage = null;
    let responseVariant = null;

    if (showResponseMessage) {
      responseMessage = get(apiResponseObj, 'data.message', null);
      responseVariant = get(apiResponseObj, 'data.status', false) ? SNACK_VARIANT.INFO : SNACK_VARIANT.ERROR;
    }
    
    dispatch(
      addSnack({
        message: responseMessage || text,
        options: {
          variant: responseVariant || variant,
        },
      })
    );
  };