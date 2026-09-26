import { SET_USER_APPS } from "../actions/types";

export const initialState = {
  userAppData: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_USER_APPS:
      return {
        ...state,
        userAppData: action.payload,
      };
    default:
      return state;
  }
}
