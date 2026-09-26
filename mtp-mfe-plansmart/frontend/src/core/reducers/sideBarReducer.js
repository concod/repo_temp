import {
  SET_USER_PLATFORM_SCREENS,
  SET_USER_SCREENS,
  SET_ACTIVE_APP_NAME,
  SET_ACTIVE_SIDEBAR_DATA,
  SET_PLANSMART_UNSAVED_STATUS,
  SET_PLANSMART_LOGOUT_STATUS,
} from "../actions/types";

export const initialState = {
  userScreenData: {},
  userPlatformScreenName: {},
  activeAppName: "",
  activeSideBarData: [],
  displayPlanSmartAlert: false,
  logoutAlertStatus: {},
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_SCREENS:
      return {
        ...state,
        userScreenData: { ...action.payload, ...state.userScreenData },
      };
    case SET_USER_PLATFORM_SCREENS:
      return {
        ...state,
        userPlatformScreenName: action.payload,
      };
    case SET_ACTIVE_APP_NAME:
      return {
        ...state,
        activeAppName: action.payload,
      };
    case SET_ACTIVE_SIDEBAR_DATA:
      return {
        ...state,
        activeSideBarData: action.payload,
      };
    //Reducers for update budget unsaved logout alert states
    case SET_PLANSMART_UNSAVED_STATUS:
      return {
        ...state,
        displayPlanSmartAlert: action.payload,
      };
    case SET_PLANSMART_LOGOUT_STATUS:
      return {
        ...state,
        logoutAlertStatus: { ...action.payload },
      };
    default:
      return state;
  }
};
