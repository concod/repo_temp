import { createSlice } from "@reduxjs/toolkit";
import {
  getUpdatedPanelsList,
  getUpdatedPanelNotiList,
  badgesCountIncreaseAndDecrease,
  getUpdatedNotiListForMoveAndDeleteAll,
  applyNotificationUpdate,
  applyNotificationDelete,
} from "../notificationUtils";
import axiosInstance from "core/Utils/axios";

export const ALL_NOTIFICATION_TABS = [
  {
    label: "Task List",
    value: "actionable",
  },
  {
    label: "Info",
    value: "informational",
  },
  {
    label: "Integrations",
    value: "integrations",
  }
];

export const notificaitonReducerSlice = createSlice({
  name: "notificaitonReducerSlice",
  initialState: {
    activeBadge: "New",
    activeNotiTab: "actionable",
    notificationPanels: [],
    badgesList: [],
    notificationData: {},
    notificationIndicator: false,
    notificationTab: ALL_NOTIFICATION_TABS,
  },
  reducers: {
    setActiveBadge: (state, action) => {
      state.activeBadge = action.payload;
    },
    setActiveNotiTab: (state, action) => {
      state.activeNotiTab = action.payload;
    },
    setBadgesList: (state, action) => {
      state.badgesList = action.payload;
    },
    setNotificationTab: (state, action) => {
      state.notificationTab = action.payload;
    },
    setNotificationPanels: (state, action) => {
      state.notificationPanels = action.payload;
    },
    setNotificationData: (state, action) => {
      if (
        (action?.payload?.bucket_name ??
          action?.payload?.data?.notifications?.[0]?.bucket_name) === state.activeBadge &&
        (action?.payload?.special_classification ??
          action?.payload?.data?.notifications?.[0]?.special_classification) ===
        state.activeNotiTab
      ) {
        state.notificationData = action?.payload;
      }
    },
    appendNotificationData: (state, action) => {
      if (
        (action?.payload?.bucket_name ??
          action?.payload?.data?.notifications?.[0]?.bucket_name) ===
          state.activeBadge &&
        (action?.payload?.special_classification ??
          action?.payload?.data?.notifications?.[0]?.special_classification) ===
          state.activeNotiTab
      ) {
        const newNotifications = action?.payload?.data?.notifications || [];
        state.notificationData = {
          ...state.notificationData,
          data: {
            ...(state?.notificationData?.data || {}),
            notifications: [
              ...(state?.notificationData?.data?.notifications || []),
              ...newNotifications,
            ],
          },
        };
      }
    },
    setAdditionalNotificationData: (state, action) => {
      if (
        action.payload.new_notification &&
        state.activeNotiTab ===
        action.payload.data?.notifications?.[0]?.special_classification &&
        state.activeBadge === action.payload.data?.notifications?.[0]?.bucket_name
      ) {
        state.notificationData = {
          ...state.notificationData,
          data: {
            ...(state?.notificationData?.data || {}),
            notifications: [
              ...action?.payload?.data?.notifications,
              ...(state?.notificationData?.data?.notifications || []),
            ],
          },
        };
        state.badgesList = badgesCountIncreaseAndDecrease(
          state.badgesList,
          action?.payload?.data?.notifications?.[0]?.special_classification,
          "",
          action.payload.data?.notifications?.[0]?.bucket_name
        );
      }
      if (action.payload.notification_action === "update_notification") {
        const incomingNotifications = action.payload.data?.notifications || [];
        const matchingNotifications = incomingNotifications.filter(
          (n) => n.special_classification === state.activeNotiTab
        );
        if (matchingNotifications.length) {
          const existingNotifications = state.notificationData?.data?.notifications || [];
          const { notifications, wasUpdated, bucketChanges } = applyNotificationUpdate(existingNotifications, matchingNotifications);
          if (wasUpdated) {
            if (!state.notificationData.data) {
              state.notificationData.data = {};
            }
            state.notificationData.data.notifications = notifications;
          }
          bucketChanges.forEach(change => {
            state.badgesList = badgesCountIncreaseAndDecrease(
              state.badgesList,
              state.activeNotiTab,
              change.oldBucket,
              change.newBucket,
              1
            )
          })
        }
      }
      if (action.payload.notification_action === "delete_notification" &&
        state.activeBadge !== "Archived"
      ) {
        const { noe_code, event_id } = action.payload;
        const existingNotifications = state?.notificationData?.data?.notifications || [];
        const { notifications, wasDeleted } = applyNotificationDelete(existingNotifications, noe_code, event_id);
        if (wasDeleted) {
          state.notificationData = {
            ...state.notificationData,
            data: { ...(state?.notificationData?.data || {}), notifications },
          };
          state.badgesList = badgesCountIncreaseAndDecrease(
            state.badgesList,
            state.activeNotiTab,
            state.activeBadge,
            "Archived"
          );
        }
      }
      if (action.payload.new_notification) {
        state.notificationIndicator = true;
      }
      return state;
    },
    setNotificationIndicator: (state, action) => {
      state.notificationIndicator = action.payload;
    },
    setBookMark: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        state.activeBadge === "Bookmarked"
          ? (notiList, currentData) => {
              return notiList.filter((item) => item.id != currentData.id);
            }
          : (notiList, currentData) => {
              return notiList.map((item) => {
                if (item.id == currentData.id) {
                  return {
                    ...item,
                    bookMarked: !item.bookMarked,
                  };
                }
                return item;
              });
          }
      );
      let incBucketName = "";
      let decBucketName = "";
      if (!data.bookMarked) incBucketName = "Bookmarked";
      if (data.bookMarked) decBucketName = "Bookmarked";

      state.badgesList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        decBucketName,
        incBucketName
      );

      state.notificationPanels = newNotificationPanels;
    },
    setSyncState: (state, action) => {
      const { data, actionState } = action.payload;
      const rawNoti = state.notificationData?.data?.notifications?.find(
        (item) => item.no_code == data.id
      );
      if (rawNoti?.extra_attributes?.trigger_api) {
        rawNoti.extra_attributes.trigger_api.action_state = actionState;
      }
    },
    setDeleteNotification: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        (notiList, currentData) =>
          notiList.filter((item) => item.id !== currentData.id)
      );
      let newBucketList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        state.activeBadge,
        "Archived"
      );
      if (state.activeBadge === "Bookmarked") {
        newBucketList = badgesCountIncreaseAndDecrease(
          newBucketList,
          notiTabId,
          data.bucketName,
          ""
        );
      }
      state.badgesList = newBucketList;
      state.notificationPanels = newNotificationPanels;
    },
    setMarkAsRead: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        (notiList, currentData) =>
          notiList.map((item) => {
            if (item.id == currentData.id) {
              return {
                ...item,
                read: item.read ? false : true,
              };
            }
            return item;
          })
      );
      state.notificationPanels = newNotificationPanels;
    },
    setMarkCompleted: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        (notiList, currentData) =>
          notiList.filter((item) => item.id !== currentData.id)
      );
      /**
       * For this hardcode value "Completed", we Know its a reserved Bucket Name So whenever any notification mark as completed
       * we need to decrease the current bucket count and also increase the `Completed` badge count. Same cases for `Pending`
       * bucket name.
       */
      let newBadgesList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        state.activeBadge,
        "Completed"
      );
      if (data.bookMarked) {
        newBadgesList = badgesCountIncreaseAndDecrease(
          newBadgesList,
          notiTabId,
          "Bookmarked",
          ""
        );
      }
      state.badgesList = newBadgesList;
      state.notificationPanels = newNotificationPanels;
    },
    setMoveToPending: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        (notiList, currentData) =>
          notiList.filter((item) => item.id !== currentData.id)
      );
      state.badgesList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        state.activeBadge,
        "Pending"
      );
      state.notificationPanels = newNotificationPanels;
    },
    setSelectChange: (state, action) => {
      const { notiTabId, notiData, data } = action.payload;
      const newNotificationPanels = getUpdatedPanelsList(
        notiData,
        notiTabId,
        data,
        (notiList, currentData) =>
          notiList.map((item) => {
            if (item.id == currentData.id) {
              return {
                ...item,
                selected: item.selected ? false : true,
              };
            }
            return item;
          })
      );
      state.notificationPanels = newNotificationPanels;
    },
    // MARK_READ_ALL
    setMarkReadAll: (state, action) => {
      const { notiData, notiTabId } = action.payload;
      const notiList = notiData.map((item) => ({ ...item, read: true }));
      const newNotificationPanels = getUpdatedPanelNotiList(
        state.notificationPanels,
        notiTabId,
        notiList
      );
      state.notificationPanels = newNotificationPanels;
    },
    setMoveAllPending: (state, action) => {
      const { notiTabId, allNotiIds, bucketName } = action.payload;
      const newNotificationPanels = getUpdatedNotiListForMoveAndDeleteAll(
        state.notificationPanels,
        notiTabId,
        allNotiIds
      );
      state.badgesList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        state.activeBadge,
        bucketName,
        allNotiIds.length
      );
      state.notificationPanels = newNotificationPanels;
    },
    setNotificationDeleteAll: (state, action) => {
      const { notiTabId, allNotiIds } = action.payload;
      const newNotificationPanels = getUpdatedNotiListForMoveAndDeleteAll(
        state.notificationPanels,
        notiTabId,
        allNotiIds
      );
      state.badgesList = badgesCountIncreaseAndDecrease(
        state.badgesList,
        notiTabId,
        state.activeBadge,
        "Archived",
        allNotiIds.length
      );
      state.notificationPanels = newNotificationPanels;
    },
    setSelectAll: (state, action) => {
      const { notiData, notiTabId } = action.payload;
      const notiList = notiData.map((item) => ({ ...item, selected: true }));
      const newNotificationPanels = getUpdatedPanelNotiList(
        state.notificationPanels,
        notiTabId,
        notiList
      );
      state.notificationPanels = newNotificationPanels;
    },
  },
});

export const {
  setActiveBadge,
  setActiveNotiTab,
  setNotificationPanels,
  setBookMark,
  setBadgesList,
  setNotificationTab,
  setDeleteNotification,
  setMarkAsRead,
  setMarkCompleted,
  setMoveToPending,
  setSelectChange,
  setMarkReadAll,
  setMoveAllPending,
  setNotificationDeleteAll,
  setSelectAll,
  setNotificationData,
  setAdditionalNotificationData,
  setNotificationIndicator,
  setSyncState,
  appendNotificationData,
} = notificaitonReducerSlice.actions;

export const getBadgesList = async (appCode) => {
  const response = await axiosInstance({
    url: `/notifications/buckets-and-filters?app_code=${appCode}`,
    method: "GET",
  });
  return response.data;
};

export default notificaitonReducerSlice.reducer;
