import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  bucketNotToMoveList,
  createBadge,
  createNotificationPanels,
} from "./notificationUtils";
import {
  setNotificationPanels,
  setMarkReadAll,
  setMoveAllPending,
  setNotificationDeleteAll,
  setSelectAll,
  getBadgesList,
  setBadgesList,
  setBookMark,
  setDeleteNotification,
  setMarkAsRead,
  setMarkCompleted,
  setMoveToPending,
  setSelectChange,
  setActiveBadge,
  setActiveNotiTab,
} from "./notification-services/notification-services";
import { isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";

function UseNotification({ isOpen, setIsOpen, fetchNotifications }) {
  const {
    notificationPanels,
    notificationTab,
    badgesList,
    notificationData,
    activeBadge,
    activeNotiTab,
  } = useSelector((state) => state.notificationReducerSlice);

  const applicationCode = 3;
  // useSelector(
  //   (state) => state.commonChatReducer?.appDetails.applicationCode
  // );

  const [bucketLists, setBucketList] = useState([]);
  const [filters, setFilters] = useState([]);
  const [showBadgeLoader, setShowBadgeLoader] = useState(false);
  const [showNotificationListLoader, setShowNotificationListLoader] = useState(
    false
  );
  const [selectedFilter, setSelectedFilter] = useState([]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fetchBadgesList = async () => {
    if (applicationCode) {
      try {
        setShowBadgeLoader(true);
        const res = await getBadgesList(applicationCode);
        const badgesRes = res.data || {};
        const badgesList = createBadge(badgesRes, dispatch);
        dispatch(setBadgesList(badgesList));
        setFilters(badgesRes?.filters);
        setBucketList(badgesList);
        setShowBadgeLoader(false);
      } catch (error) {
        setShowBadgeLoader(false);
      }
    }
  };

  useEffect(() => {
    fetchBadgesList();
  }, [applicationCode]);

  useEffect(() => {
    if (!isEmpty(bucketLists)) {
      setShowBadgeLoader(true);
      let newActiveBadge = "New";
      bucketLists.forEach((item) => {
        if (item.value === activeNotiTab)
          newActiveBadge = item?.lists?.[0]?.id || "";
      });
      dispatch(setActiveBadge(newActiveBadge));
      setShowBadgeLoader(false);
      fetchBadgesList();
    } else {
      setShowBadgeLoader(false);
    }
  }, [activeNotiTab]);

  useEffect(() => {
    const fetchNotificationList = async () => {
      setShowNotificationListLoader(true);
      const payload = {
        action: "fetch_by_bucket",
        bucket_name: activeBadge,
        application_code: applicationCode,
        special_classification: activeNotiTab,
        filter: selectedFilter.map((item) => item.value),
      };
      fetchNotifications(JSON.stringify(payload));
      // fetchBadgesList();
    };
    fetchNotificationList();
  }, [activeBadge, activeNotiTab]);

  useEffect(()=>{
    if(isOpen){
      dispatch(setActiveBadge("New"));
    }
  }, [isOpen])

  const handleApplyFilter = (selectedFilter) => {
    const payload = {
      action: "fetch_by_bucket",
      bucket_name: activeBadge,
      application_code: applicationCode,
      special_classification: activeNotiTab,
      filter: selectedFilter.map((item) => item.value),
    };
    setSelectedFilter(selectedFilter);
    fetchNotifications(JSON.stringify(payload));
  };

  useEffect(() => {
    if (!isEmpty(notificationData)) {
      const notiFilters = filters?.map((item) => ({
        label: item,
        value: item,
      }));
      dispatch(
        setNotificationPanels(
          createNotificationPanels(
            notificationData.data.notifications,
            activeNotiTab,
            activeBadge,
            notiFilters,
            performActionOnNotification,
            handleApplyFilter,
            selectedFilter,
            navigate,
            handleClose
          )
        )
      );
      setShowNotificationListLoader(false);
    } else {
      setShowNotificationListLoader(false);
    }
  }, [notificationData, filters, selectedFilter]);

  const performActionOnNotification = (type, notificationData) => {
    const notificationID = notificationData.data?.id || null;
    switch (type) {
      case "read":
        fetchNotifications(
          JSON.stringify({
            action: "mark_selected_read",
            notification_ids: [notificationID],
            bucket_name: activeBadge,
            read: notificationData.data.read ? 0 : 1,
          })
        );
        dispatch(setMarkAsRead(notificationData));
        break;
      case "delete":
        fetchNotifications(
          JSON.stringify({
            action: "clear",
            notification_id: notificationID,
          })
        );
        dispatch(setDeleteNotification(notificationData));
        break;
      case "bookmark":
        fetchNotifications(
          JSON.stringify({
            action: "bookmark",
            notification_id: notificationID,
            bookmark: !notificationData.data.bookMarked,
          })
        );
        dispatch(setBookMark(notificationData));
        break;
      case "move":
        fetchNotifications(
          JSON.stringify({
            action: "move_bucket",
            bucket_name: "Pending",
            notification_ids: [notificationData.data?.id],
            special_classification: activeNotiTab,
            application_code: applicationCode,
          })
        );
        dispatch(setMoveToPending(notificationData));
        break;
      case "completed":
        fetchNotifications(
          JSON.stringify({
            action: "move_bucket",
            bucket_name: "Completed",
            notification_ids: [notificationData.data?.id],
            special_classification: activeNotiTab,
            application_code: applicationCode,
          })
        );
        dispatch(setMarkCompleted(notificationData));
        break;
      case "select":
        dispatch(setSelectChange(notificationData));
        break;
      case "download":
        window.open(notificationData.data.url);
        if (!notificationData.data.read) {
          fetchNotifications(
            JSON.stringify({
              action: "mark_read",
              notification_id: notificationID,
              read: notificationData.data.read ? 0 : 1,
            })
          );
          dispatch(setMarkAsRead(notificationData));
        }
        break;
      default:
        break;
    }
  };

  const moveToPendingDropdownOptions = [];
  bucketLists?.forEach((bucket) => {
    if (bucket.value === activeNotiTab) {
      bucket?.lists?.forEach((badge) => {
        if (
          !bucketNotToMoveList.includes(badge.label) &&
          activeBadge !== badge.label
        ) {
          moveToPendingDropdownOptions.push({
            label: badge.label,
            value: badge.id,
          });
        }
      });
    }
  });

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleTabChange = (notiTab) => {
    dispatch(setActiveNotiTab(notiTab));
  };

  const handleMarkReadAll = (id, notiData) => {
    const allNotiIds = notiData.map((item) => item.id);
    fetchNotifications(
      JSON.stringify({
        action: "mark_selected_read",
        read: 1,
        notification_ids: allNotiIds,
      })
    );
    dispatch(setMarkReadAll({ notiTabId: id, notiData }));
  };

  const handleMoveAllPending = (id, notiData, bucketName = {}) => {
    const allNotiIds = notiData.map((item) => item.id);
    fetchNotifications(
      JSON.stringify({
        action: "move_bucket",
        bucket_name: bucketName.value,
        notification_ids: allNotiIds,
      })
    );
    dispatch(
      setMoveAllPending({
        notiTabId: id,
        allNotiIds,
        bucketName: bucketName.value,
      })
    );
  };

  const handleNotificationDeleteAll = (id, notiData) => {
    const allNotiIds = notiData.map((item) => item.id);
    fetchNotifications(
      JSON.stringify({
        action: "clear_selected",
        notification_ids: allNotiIds,
      })
    );
    dispatch(setNotificationDeleteAll({ notiTabId: id, allNotiIds }));
  };

  const handleSelectAll = (id, notiData) => {
    dispatch(setSelectAll({ notiTabId: id, notiData }));
  };

  const onPrimaryButtonClick = (...rest) => {
    console.log("Primary Button Click", rest);
  };

  const onSecondaryButtonClick = (...rest) => {
    console.log("Secondary Button Click", rest);
  };

  const onSettingButtonClick = (...rest) => {
    console.log("Setting Button Click", rest);
  };

  const settingTheNotificationPanel = (...rest) => {
    console.log("Adding teh Data", rest);
  };

  return {
    handleClose,
    handleMarkReadAll,
    handleMoveAllPending,
    handleNotificationDeleteAll,
    handleSelectAll,
    onPrimaryButtonClick,
    onSecondaryButtonClick,
    onSettingButtonClick,
    setIsOpen,
    settingTheNotificationPanel,
    handleTabChange,
    isOpen,
    badgesList,
    notificationTab,
    notificationPanels,
    activeNotiTab,
    activeBadge,
    moveToPendingDropdownOptions,
    showBadgeLoader,
    showNotificationListLoader,
  };
}

export default UseNotification;
