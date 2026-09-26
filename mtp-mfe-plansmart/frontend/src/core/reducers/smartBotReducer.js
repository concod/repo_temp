import {
  SET_IS_SMART_BOT_RESTRICTED,
  SET_SMART_BOT_ACTIVE,
} from "../actions/types";

export const initialState = {
  smartBotActive: false,
  isSmartBotRestricted: true,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SMART_BOT_ACTIVE:
      return {
        ...state,
        smartBotActive: action.payload,
      };
    case SET_IS_SMART_BOT_RESTRICTED:
      return {
        ...state,
        isSmartBotRestricted: action.payload,
      };

    default:
      return state;
  }
}
