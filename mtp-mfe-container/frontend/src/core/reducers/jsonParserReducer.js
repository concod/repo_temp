import {
  CREATE_PARSER_REDUCER_STATE,
  UPDATE_PARSER_REDUCER_STATE,
} from "../actions/types";

export const initialState = {};

export default (state = initialState, action) => {
  switch (action.type) {
    case CREATE_PARSER_REDUCER_STATE:
      const { key: createKey, value: createValue } = action.payload;
      return {
        ...state,
        [createKey]: createValue,
      };
    case UPDATE_PARSER_REDUCER_STATE:
      const { key: updateKey, value: updateValue } = action.payload;
      return {
        ...state,
        [updateKey]: updateValue,
      };
    default:
      return state;
  }
};
