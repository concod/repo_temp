import { SET_EVENTS } from "../actions/types";

const initialState = {
  events: []
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_EVENTS:
      return {
        ...state,
        events: action.payload,
      };
    default:
      return state;
  }
}
