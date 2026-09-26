import { uniqBy } from "lodash";
import {
  SET_NOTIFICATIONS,
  SET_NOTIFICATION_DND,
  SET_USER_NOTIFICATION_TYPES,
  SET_WSCLIENT,
} from "../actions/types";

const initialState = {
  notificationData: [],
  // Temporary fix to get all notifications, new+old
  allNotificationData: [],
  userNotificationTypes: [],
  notificationCount: 0,
  dnd: false,
  notificationUnreadCount: 0,
  wsClient: null,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_NOTIFICATIONS:
      let allNotificationData = [
        ...state.allNotificationData,
        ...action.payload.results,
      ];
      return {
        ...state,
        notificationData: [...action.payload.results],
        allNotificationData: uniqBy(allNotificationData, "no_code"),
        notificationCount: action.payload.count,
        notificationUnreadCount: action.payload.unreadCount,
        dnd: action.payload.dnd,
      };
    case SET_NOTIFICATION_DND:
      return {
        ...state,
        dnd: action.payload,
      };
    case SET_USER_NOTIFICATION_TYPES:
      return {
        ...state,
        userNotificationTypes: action.payload,
      };
    case SET_WSCLIENT:
      return {
        ...state,
        wsClient: action.payload.wsClient,
      };
    default:
      return state;
  }
}
