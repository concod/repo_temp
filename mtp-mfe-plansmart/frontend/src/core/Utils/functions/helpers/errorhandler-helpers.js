import { BASE_API } from "config/api";
import { addSnack } from "core/actions/snackbarActions";
import { getToken } from "core/Utils/functions/helpers/authentication-helpers";
import { EventSourcePolyfill } from "event-source-polyfill";

/**
 * Add error handlers here
 */

export const errorHandler = (dispatch, error, errorMessage = "") => {
  return dispatch(
    addSnack({
      message:
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        errorMessage ||
        "Error in API",
      options: {
        variant: "error",
      },
    })
  );
};
export const errorHandlerWithWarnings = (dispatch, error, errorMessage = "") => {
  return dispatch(
    addSnack({
      message:
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        errorMessage ||
        "Error in API",
      options: {
        variant: "warning",
      },
    })
  );
};


export const successHandler = (dispatch, message = "Success") => {
  return dispatch(
    addSnack({
      message,
      options: {
        variant: "success",
      },
    })
  );
};

export const infoHandler = (
  dispatch,
  message = "Success",
  autoHideDuration = 4000
) => {
  return dispatch(
    addSnack({
      message,
      options: {
        variant: "info",
        autoHideDuration,
      },
    })
  );
};

export async function pollingService(url, onSuccess, onFailure) {
  const token = await getToken();
  //Polling Call
  const sse = new EventSourcePolyfill(`${BASE_API}${url}`, {
    headers: {
      Authorization: `${token}`,
    },
  });

  sse.onmessage = (msg) => {
    let responseObj = JSON.parse(msg.data);
    //Do not remove this console
    console.log("responseObj:", responseObj);
    //On polling success
    if (responseObj.status === "completed") {
      onSuccess(responseObj);
      sse.close();
      return;
    }
    //On polling failure
    if (responseObj.status === "failed") {
      onFailure(responseObj);
      sse.close();
    }
  };
}
