import {
  LOGOUT_CURRENT_USER,
  SET_CURRENT_USER,
  SET_TENANT_ID,
  TENANT_FETCH_INIT,
  TENANT_FETCH_SUCCESS,
  TENANT_FETCH_FAILED,
  CHECK_USER_SESSION_INIT,
  EMAIL_LOGIN_FAILED,
  SET_SESSION_DATA,
  CLEAR_SESSION_DATA
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
  mfaRequired: false,
  expiresAt: null,
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
        mfaRequired: action.payload.mfaRequired,
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
    case LOGOUT_CURRENT_USER:
      return {
        ...state,
        isTokenVerified: true,
        isAuthenticated: false,
        user: {},
        mfaRequired: false,
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
    case SET_SESSION_DATA:
      return {
        ...state,
        expiresAt: action.payload.expiresAt,
        mfaRequired: action?.payload?.mfaRequired,
        landingPage: action?.payload?.landingPage,
        user: {
          ...state.user,
          name: action?.payload?.name,
        }
      };
    case CLEAR_SESSION_DATA:
      return {
        ...state,
        expiresAt: null,
        mfaRequired: false,
        landingPage: "/home",
        user: {},
      };
    default:
      return state;
  }
}
