import { CREATE_REDUCER_STATE, UPDATE_REDUCER_STATE } from "core/actions/types";

export const initialState = {};

export default (state = initialState, action) => {
  switch (action.type) {
    case CREATE_REDUCER_STATE:
      const { key: createKey, value: createValue } = action.payload;
      return {
        ...state,
        [createKey]: createValue,
      };
    case UPDATE_REDUCER_STATE:
      const { key: updateKey, value: updateValue } = action.payload;
      return {
        ...state,
        [updateKey]: updateValue,
      };
    default:
      return state;
  }
};
