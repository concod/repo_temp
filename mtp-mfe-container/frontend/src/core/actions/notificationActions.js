import axiosInstance from "../Utils/axios";
import {
  LOADER,
  SET_NOTIFICATIONS,
  SET_NOTIFICATION_DND,
  SET_WSCLIENT,
} from "./types";

export const getNotifications = (pageIndex, pageSize, filterOptions) => async (
  dispatch
) => {
  dispatch({
    type: LOADER,
    payload: {
      status: true,
    },
  });
  const data = await axiosInstance({
    url: `/user/notification/?page=${pageIndex}&&notification_type=${filterOptions.notification_type}&&status=${filterOptions.status}`,
    method: "GET",
  });
  dispatch({
    type: SET_NOTIFICATIONS,
    payload: {
      results: [...data.data.data.results],
      count: data.data.data.count,
    },
  });
  dispatch({
    type: LOADER,
    payload: {
      status: false,
    },
  });
};

export const onNotificationAction = (notification, action) => async (
  dispatch
) => {
  const data = {
    notification_id: [notification.id],
    action: action,
  };
  const res = await axiosInstance({
    url: `user/notification_action/`,
    method: "POST",
    data: data,
  });
  if (res.data.status) {
    return [notification.id, true, res.data.data.message];
  } else {
    return [notification.id, false, res.data.data.message];
  }
};

export const setNotifications = (notifications) => (dispatch) => {
  if (notifications?.notifications?.length === 1) {
    notifications.notifications[0].new_notification = notifications?.new_notification;
  }
  dispatch({
    type: SET_NOTIFICATIONS,
    payload: {
      results: notifications.notifications,
      unreadCount: notifications.unread_count,
      dnd: notifications.dnd,
      count: notifications.total,
    },
  });
};
export const setNotificationDND = (dnd) => (dispatch) => {
  dispatch({
    type: SET_NOTIFICATION_DND,
    payload: dnd,
  });
};
export const setWebSocketClient = (client) => (dispatch) => {
  dispatch({
    type: SET_WSCLIENT,
    payload: {
      wsClient: client,
    },
  });
};
