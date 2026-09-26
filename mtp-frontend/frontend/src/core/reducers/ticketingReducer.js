import { SET_DETAILED_VIEW_TICKETING_DATES, SET_IS_WEEK_TO_DATE_ROW_MAXIMIZED, SET_TICKET, SET_TICKETING_DATES } from "../actions/types";

const initialState = {
  tickets: [],
  summaryDates: {},
  detailedViewDates: {},
  isWeekToDateRowMaximized: false,
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
    case SET_DETAILED_VIEW_TICKETING_DATES:
      return {
        ...state,
        detailedViewDates: action.payload,
      };
    case SET_IS_WEEK_TO_DATE_ROW_MAXIMIZED:
      return {
        ...state,
        isWeekToDateRowMaximized: action.payload,
      };
    default:
      return state;
  }
}
