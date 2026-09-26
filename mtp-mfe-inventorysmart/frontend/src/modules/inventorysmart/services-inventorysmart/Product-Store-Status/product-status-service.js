import { SET_PRODUCT_STATUS } from 'core/actions/types';

export const initialState = {
  productStatusData: []
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_PRODUCT_STATUS:
      return {
        ...state,
        productStatusData: action.payload
      };

    default:
      return state;
  }
}
