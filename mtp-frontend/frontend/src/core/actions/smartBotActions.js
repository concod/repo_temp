import { SET_SMART_BOT_ACTIVE } from "./types";

export const setSmartBotActive = (value) => (dispatch) => {
    dispatch({
      type: SET_SMART_BOT_ACTIVE,
      payload: value,
    });
  };