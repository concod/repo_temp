import {
  LOGOUT_CURRENT_USER,
  SET_CURRENT_USER,
  SET_TENANT_ID,
  TENANT_FETCH_INIT,
  TENANT_FETCH_SUCCESS,
  TENANT_FETCH_FAILED,
  CHECK_USER_SESSION_INIT,
  EMAIL_LOGIN_FAILED,
} from "../actions/types";

const initialState = {
  isTokenVerified: false,
  isAuthenticated: false,
  showAlert: false,
  isTenantInfoFetched: false,
  isUsrSessionChecked: false,
  alertProperties: {
    Text: "",
    Type: "info",
  },
  tenantId: null,
  user: {},
  landingPage: "/home",
  isTenantFetchFailed: false,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_USER:
      return {
        ...state,
        isTokenVerified: true,
        isAuthenticated: action.payload.isAuthenticated,
        showAlert: false,
        isUsrSessionChecked: true,
        alertProperties: {
          Text: "",
          Type: "info",
        },
        user: action.payload.user,
        landingPage: action.payload.landingPage,
      };
    case EMAIL_LOGIN_FAILED:
      return {
        ...state,
        showAlert: true,
        alertProperties: {
          Text: action.payload.message,
          Type: "error",
        },
      };
    // case RESET_ALERT:
    //   return {
    //     ...state,
    //     showAlert: false,
    //     alertProperties: {
    //       Text: "",
    //       Type: "info",
    //     },
    //   };
    case LOGOUT_CURRENT_USER:
      return {
        ...state,
        isTokenVerified: true,
        isAuthenticated: false,
        user: {},
      };
    case TENANT_FETCH_INIT:
      return {
        ...state,
        isTenantFetchFailed: false,
        showAlert: true,
        alertProperties: {
          Text: "Fetching information",
          Type: "info",
        },
      };
    case TENANT_FETCH_SUCCESS:
      return {
        ...state,
        showAlert: false,
        isTenantInfoFetched: true,
        alertProperties: {
          Text: "",
          Type: "",
        },
        tenantId: action.payload,
      };
    case TENANT_FETCH_FAILED:
      return {
        ...state,
        isTenantFetchFailed: true,
        alertProperties: {
          Text: "Couldn't fetch information",
          Type: "error",
        },
      };
    case CHECK_USER_SESSION_INIT:
      return {
        ...state,
        showAlert: true,
        alertProperties: {
          Text: "Fetching information",
          Type: "info",
        },
      };
    case SET_TENANT_ID:
      return {
        ...state,
        tenantId: action.payload,
      };
    default:
      return state;
  }
}
