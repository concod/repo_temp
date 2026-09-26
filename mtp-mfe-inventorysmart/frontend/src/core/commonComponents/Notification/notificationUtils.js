import { setActiveBadge } from "./notification-services/notification-services";
import isNull from "lodash/isNull";
export const NOTI_PANEL_LIST = ["actionable", "informational"];

export const bucketNotToMoveList = ["Archived", "Bookmarked", "New"];

export const applyNotificationUpdate = (existingNotifications, incomingNotifications) => {
  const incomingMap = incomingNotifications.reduce((acc, noti) => {
    acc[noti.no_code] = noti;
    return acc;
  }, {});
  let wasUpdated = false;
  const updated = existingNotifications.map((noti) => {
    if (incomingMap[noti.no_code]) {
      wasUpdated = true;
      return incomingMap[noti.no_code];
    }
    return noti;
  });
  return { notifications: updated, wasUpdated };
};

export const applyNotificationDelete = (existingNotifications, noe_code, event_id) => {
  const filtered = existingNotifications.filter(
    (noti) => !(Number(noti.noe_code) === Number(noe_code) && noti.event_id === event_id)
  );
  return { notifications: filtered, wasDeleted: filtered.length < existingNotifications.length };
};

export const createBadge = (badgesList = {}, dispatch) => {
  return NOTI_PANEL_LIST.map((item, index) => {
    const id = index + 1;
    return {
      id,
      value: item,
      lists: createBadgesList(badgesList[item], dispatch),
    };
  });
};

export const createBadgesList = (badges, dispatch) => {
  return badges?.map((badge) => {
    return {
      id: badge.bucket_name,
      label: badge.bucket_name,
      numberOfTypes: badge.notifications_count || 0,
      handleClick: () => {
        dispatch(setActiveBadge(badge.bucket_name));
      },
    };
  });
};

export const createNotificationPanels = (
  notificationList = [],
  activeNotiTab = "",
  activeBadge = "",
  filters = [],
  performActionOnNotification,
  handleApplyFilter,
  selectedFilter,
  navigate,
  handleClose
) => {
  return NOTI_PANEL_LIST.map((item, index) => {
    const id = index + 1;
    return {
      id,
      value: item,
      notificationList:
        activeNotiTab === item
          ? createNotificationList(
              notificationList,
              item,
              activeBadge,
              performActionOnNotification,
              navigate,
              handleClose
            )
          : [],
      handleSettingClick: () => {},
      handleApplyFilter: handleApplyFilter,
      filterChip: filters,
      isMultiSelectFilter: true,
      selectedFilterChip: selectedFilter,
    };
  });
};

export const getNotificationHandlers = (
  activeBadge,
  performActionOnNotification,
  downloadUrl = false,
  item = "",
  noti
) => {
  const makeHandler = (action) => (notiTabId, notiData, fn, data) =>
    performActionOnNotification(action, { notiTabId, notiData, data: { ...data, ...noti, downloadUrl: downloadUrl} });

  if (activeBadge === "Archive") {
    return downloadUrl ? { handleDownloadNotification: makeHandler("download") } : {};
  }

  const isCompleted = activeBadge === "Completed";
  const isPendingOrBookmarked = activeBadge === "Pending" || activeBadge === "Bookmarked";
  const isInformational = item === "informational";
  const hasTriggerApi = noti?.extra_attributes?.hasOwnProperty("trigger_api");
  const hasRedirect = !isNull(noti?.url) || noti?.extra_attributes?.hasOwnProperty("url");
  return {
    handleDeleteNotification: makeHandler("delete"),
    handleMarkAsRead: makeHandler("read"),
    ...(!isInformational && { checkBoxClick: makeHandler("select") }),
    ...(isInformational ? {} : {
      ...(!isCompleted && { handleBookMark: makeHandler("bookmark") }),
      ...(!isPendingOrBookmarked && { handleMoveToPending: makeHandler("move") }),
      ...(!isCompleted && { handleMarkCompleted: makeHandler("completed") }),
      ...(downloadUrl && { handleDownloadNotification: makeHandler("download") }),
      ...(hasRedirect && { handleRedirect: makeHandler("redirect") }),
      ...(hasTriggerApi && { handleSync: makeHandler("triggerApi") }),
    }),
  };
};

export const updateNotificationDescription = (
  description,
  additionalInfo = []
) => {
  if (Array.isArray(additionalInfo) && additionalInfo?.length) {
    additionalInfo.forEach((item) => {
      if (item.text && item.url) {
        description = description.replace(
          item.text,
          `<a href="${item.url}" target="_blank">${item.text}</a>`
        );
      }
    });
  }
  // replacing [text](url) with <a href=url>text</a>
  return description.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href=$2>$1</a>');
};

export const createNotificationList = (
  notificationList,
  item,
  activeBadge,
  performActionOnNotification,
  navigate,
  handleClose
) => {
  return notificationList.map((noti, index) => {
    const downloadUrl = noti.url && noti.url.includes("https://storage.googleapis.com/")
      ? noti.url
      : null;
    return {
      id: noti.no_code,
      read: noti.read,
      selected: !!noti.selected,
      status: noti?.extra_attributes?.noti_type ?? "success",
      time: new Date(noti.created_at).getTime(),
      label: noti.subject,
      date: new Date(noti.created_at),
      description: updateNotificationDescription(
        noti.description,
        noti.additional_info
      ),
      showOverdueIcon: noti.urgent,
      showFastApproachingIcon: noti.fast_approaching,
      bookMarked: noti.bookmarked,
      bucketName: noti.bucket_name,
      handleSelectChange: () =>
        handleSelectChange(
          noti?.special_classification,
          noti,
          navigate,
          handleClose
        ),
      ...(activeBadge !== "Archived"
        ? getNotificationHandlers(
            activeBadge,
            performActionOnNotification,
            downloadUrl,
            item,
            noti
          )
        : {}),
    };
  });
};

export const getUpdatedPanelsList = (list, notiTabId, data, func) => {
  return list.map((panel) => {
    if (panel.value === notiTabId) {
      return {
        ...panel,
        notificationList: func(panel.notificationList, data),
      };
    }
    return panel;
  });
};

export const getUpdatedPanelNotiList = (list, notiTabId, notiList) => {
  return list.map((item) => {
    if (item.value === notiTabId) {
      return { ...item, notificationList: notiList };
    }
    return item;
  });
};

export const getBadgeList = (lists, activeBadgeId, type, count) => {
  return lists?.map((item) => {
    if (item.label === activeBadgeId) {
      return { ...item, numberOfTypes: Math.max(0, item.numberOfTypes - count) };
    } else if (type === item.label) {
      return { ...item, numberOfTypes: item.numberOfTypes + count };
    }
    return item;
  });
};

export const badgesCountIncreaseAndDecrease = (
  badgesList,
  notiTabId,
  activeBadgeId,
  type = "",
  count = 1
) => {
  return badgesList.map((badge) => {
    if (badge.value === notiTabId) {
      return {
        ...badge,
        lists: getBadgeList(badge.lists, activeBadgeId, type, count),
      };
    }
    return badge;
  });
};

export const getUpdatedNotiListForMoveAndDeleteAll = (
  list,
  notiTabId,
  allNotiIds
) => {
  return list.map((tab) => {
    if (tab.value === notiTabId) {
      return {
        ...tab,
        notificationList: tab.notificationList.filter(
          (item) => !allNotiIds.includes(item.id)
        ),
      };
    }
    return tab;
  });
};

export const handleSelectChange = (
  special_classification,
  notifcationData,
  navigate,
  handleClose
) => {
  try{
    if (special_classification === "actionable") {
      const { extra_attributes } = notifcationData;
      switch (extra_attributes?.action_type) {
        case "redirect":
          const appRoute = extra_attributes?.url?.substring(
            extra_attributes?.host?.length,
            extra_attributes?.url?.length
          );
          navigate(appRoute);
          handleClose();
          break;
        default:
          handleClose();
          break;
      }
    }
  } catch(error){
    console.error("Error : handleSelectChange in notifications click handler")
  }
};
