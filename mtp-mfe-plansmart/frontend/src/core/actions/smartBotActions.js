import { SET_IS_SMART_BOT_RESTRICTED, SET_SMART_BOT_ACTIVE } from "./types";

export const setSmartBotActive = (value) => (dispatch) => {
  dispatch({
    type: SET_SMART_BOT_ACTIVE,
    payload: value,
  });
};

export const setIsSmartBotRestricted = (value) => (dispatch) => {
  dispatch({
    type: SET_IS_SMART_BOT_RESTRICTED,
    payload: value,
  });
};
