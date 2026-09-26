import { SET_USER_MANAGEMENT_LIST, SET_COMMENT_BAR } from "../actions/types";

export const initialState = {
  userManagementList: [],
  commentBarActive: false,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_MANAGEMENT_LIST:
      return {
        ...state,
        userManagementList: action.payload,
      };
    case SET_COMMENT_BAR:
      return {
        ...state,
        commentBarActive: action.payload,
      };
    default:
      return state;
  }
};
