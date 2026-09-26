import { SET_TICKET, SET_TICKETING_DATES} from "../constants";

const initialState = {
  tickets: [],
  summaryDates: {},
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_TICKET:
      return {
        ...state,
        tickets: action.payload,
      };
    case SET_TICKETING_DATES:
      return {
        ...state,
        summaryDates: action.payload,
      };
    default:
      return state;
  }
}
