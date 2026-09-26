import { SET_TENANT_APPS } from "../actions/types";

const initialState = {
  tenantApps: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_TENANT_APPS:
      return {
        ...state,
        tenantApps: action.payload,
      };
    default:
      return state;
  }
}
