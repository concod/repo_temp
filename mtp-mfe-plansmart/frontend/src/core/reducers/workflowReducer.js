import {GET_STATES, GET_TRANSITIONS, GET_WORKFLOWS, GET_TRANSITION_APPROVALS} from "../actions/types"

const initialState = {
  states: [],
  transitions:[],
  workflows:[],
  transitionapprovals: []
};

export default function (state = initialState, action) {
  switch (action.type) {
    case GET_STATES:
      return {
        ...state,
        states: action.payload,
      }
      case GET_TRANSITIONS:
        return {
          ...state,
          transitions: action.payload,
        }
        case GET_WORKFLOWS:
          return {
            ...state,
            workflows: action.payload,
          }
        case GET_TRANSITION_APPROVALS:
          return {
            ...state,
            transitionapprovals: action.payload,
          }

    default:
      return state
  }
}
