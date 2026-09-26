import { SET_USER_MANAGEMENT_LIST } from "../actions/types";

export const initialState = {
  userManagementList: []
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_MANAGEMENT_LIST:
      return {
        ...state,
        userManagementList: action.payload,
      };
    default:
      return state;
  }
};
