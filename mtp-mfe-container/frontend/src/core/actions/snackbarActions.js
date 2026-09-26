import { ADD_SNACK, REMOVE_SNACK, CLOSE_SNACK } from "./types";

export const removeSnack = (key) => (dispatch) => {
  dispatch({
    type: REMOVE_SNACK,
    payload: key,
  });
};

export const addSnack = (snack) => (dispatch) => {
  dispatch({
    type: ADD_SNACK,
    payload: {
      ...snack,
    },
  });
};

export const closeSnack = (key) => (dispatch) => {
  dispatch({
    type: CLOSE_SNACK,
    payload: {
      dismissAll: !key,
      key: key,
    },
  });
};
