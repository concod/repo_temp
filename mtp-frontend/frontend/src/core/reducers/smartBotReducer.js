import { SET_SMART_BOT_ACTIVE } from "../actions/types";

export const initialState = {
  smartBotActive: false,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SMART_BOT_ACTIVE:
      return {
        ...state,
        smartBotActive: action.payload,
      };
    default:
      return state;
  }
}
