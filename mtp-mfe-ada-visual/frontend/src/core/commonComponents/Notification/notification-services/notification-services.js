import { createSlice } from "@reduxjs/toolkit";
import {
  getUpdatedPanelsList,
  getUpdatedPanelNotiList,
  badgesCountIncreaseAndDecrease,
  getUpdatedNotiListForMoveAndDeleteAll,
} from "../notificationUtils";
import axiosInstance from "core/Utils/axios";

export const notificaitonReducerSlice = createSlice({
  name: "notificaitonReducerSlice",
  initialState: {
    activeBadge: "New",
    activeNotiTab: "actionable",
    notificationPanels: [],
    badgesList: [],
    notificationData: {},
    notificationIndicator: false,
    notificationTab: [
      {
        label: "Task List",
        value: "actionable",
      },
      {
        label: "Info",
        value: "informational",
      },
    ],
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
    setNotificationPanels: (state, action) => {
      state.notificationPanels = action.payload;
    },
    setNotificationData: (state, action) => {
      state.notificationData = action.payload;
    },
    setAdditionalNotificationData: (state, action) => {
      if (
        state.activeBadge === "New" &&
        action.payload.new_notification &&
        state.activeNotiTab ===
          action.payload.data?.notifications?.[0]?.special_classification
      ) {
        state.notificationData = {
          ...state.notificationData,
          data: {
            ...(state.notificationData.data || {}),
            notifications: [
              ...action.payload.data.notifications,
              ...state.notificationData.data.notifications,
            ],
          },
        };
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
} = notificaitonReducerSlice.actions;

const dummyResponse = (data) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(data);
    }, 1000);
  });
};

export const getBadgesList = async (appCode) => {
  const response = await axiosInstance({
    url: `/notifications/buckets-and-filters?app_code=${appCode}`,
    method: "GET",
  });
  return response.data;
};

export default notificaitonReducerSlice.reducer;
