import { useEffect, useState, useRef } from "react";
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
  setNotificationTab,
  ALL_NOTIFICATION_TABS,
  setBookMark,
  setDeleteNotification,
  setMarkAsRead,
  setMarkCompleted,
  setMoveToPending,
  setSelectChange,
  setActiveBadge,
  setActiveNotiTab,
  setSyncState,
} from "./notification-services/notification-services";
import { isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import axiosInstance from "core/Utils/axios";
import { NOTIFICATION_ACTION, NOTIFICATION_PAGE_SIZE, PAGINATED_BUCKETS } from "core/constants/apiConstants";

function UseNotification({ isOpen, setIsOpen, fetchNotifications, webSocketClientRef }) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const isFetchingRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const isPaginatedBucket = PAGINATED_BUCKETS.includes(activeBadge);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fetchBadgesList = async () => {
    if (applicationCode) {
      try {
        setShowBadgeLoader(true);
        const res = await getBadgesList(applicationCode);
        const badgesRes = res.data || {};
        const tabs = ALL_NOTIFICATION_TABS.filter((tab) => badgesRes[tab.value]);
        dispatch(setNotificationTab(tabs));
        const badgesList = createBadge(badgesRes, dispatch);
        dispatch(setBadgesList(badgesList));
        setFilters(badgesRes?.filters || [""]);
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
      setCurrentPage(1);
      setHasMore(true);
      isFetchingRef.current = false;
      const payload = {
        action: "fetch_by_bucket",
        bucket_name: activeBadge,
        application_code: applicationCode,
        special_classification: activeNotiTab,
        filter: selectedFilter.map((item) => item.value),
      };
      const meta = {};
      if (isPaginatedBucket) {
        meta.limit = {
          limit: NOTIFICATION_PAGE_SIZE,
          page: 1,
        };
        if (searchQuery) {
          meta.search = [
            { pattern: searchQuery, search_type: "contains" },
          ];
        }
      }
      if (!isEmpty(meta)) {
        payload.meta = meta;
      }
      fetchNotifications(JSON.stringify(payload));
    };
    fetchNotificationList();
  }, [activeBadge, activeNotiTab, searchQuery]);

  useEffect(()=>{
    if(isOpen){
      dispatch(setActiveBadge("New"));
      setShowNotificationListLoader(true);
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
    if (!isEmpty(notificationData) || webSocketClientRef === null) {
      const notiFilters = filters?.map((item) => ({
        label: item,
        value: item,
      }));
      const tabKeys = notificationTab.map((tab) => tab.value);
      dispatch(
        setNotificationPanels(
          createNotificationPanels(
            notificationData?.data?.notifications,
            activeNotiTab,
            activeBadge,
            notiFilters,
            performActionOnNotification,
            handleApplyFilter,
            selectedFilter,
            navigate,
            handleClose,
            tabKeys
          )
        )
      );
      if (isPaginatedBucket) {
        const notifCount = notificationData?.data?.notifications?.length || 0;
        setHasMore(notifCount >= currentPage * NOTIFICATION_PAGE_SIZE);
        isFetchingRef.current = false;
      }
    } 
    setShowNotificationListLoader(false);
  }, [notificationData, filters, selectedFilter, notificationTab]);

  const performActionOnNotification = async (type, notificationData) => {
    const notificationID = notificationData.data?.id || null;
    const notificationItemData = notificationData?.data;
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
        window.open(notificationData.data.downloadUrl);
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
      case "redirect": {
        {
          const currentOriginName = `https://${localStorage.getItem(
            "baseUrl"
          )}`;
          let downloadUrl = notificationItemData.url
            ? notificationItemData.url.includes("https://storage.googleapis.com/")
            : null;
          const rcl_code = notificationItemData.extra_attributes?.rcl_code;
          if (!downloadUrl && notificationItemData.url) {
            if (notificationItemData?.extra_attributes?.hasOwnProperty("state")) {
              const url = notificationItemData.extra_attributes.url?.replace?.(currentOriginName, "");
              if (window.location.pathname === notificationItemData.extra_attributes.url) {
                navigate(url, {
                  state: notificationItemData.extra_attributes?.state,
                  replace: true,
                });
              } else {
                navigate(url, { state: notificationItemData.extra_attributes?.state });
              }
            } else {
              const reportCode = notificationItemData?.extra_attributes?.report_code;
              const moduleCode = notificationItemData?.extra_attributes?.module_code;
              if (reportCode) {
                navigate(notificationItemData.url, {
                  state: {
                    reportCode: reportCode,
                    moduleCode: moduleCode,
                  },
                });
              }
              //if the url is same as current route, refresh the page because route navigation won't happen in that case
              else if (window.location.pathname === notificationItemData.url) {
                if (rcl_code) {
                  navigate(notificationItemData.url, {
                    state: { rcl_code: rcl_code },
                    replace: true,
                  });
                } else {
                  window.location.reload();
                }
              } else {
                if (rcl_code) {
                  navigate(notificationItemData.url, {
                    state: {
                      rcl_code: rcl_code,
                    },
                  });
                } else {
                  navigate(notificationItemData.url?.replace?.(currentOriginName, ""));
                }
              }
            }
          }
        }
        handleClose();
        break;
      }
      case "triggerApi":
        const triggerApiData = notificationItemData?.extra_attributes?.trigger_api;
        dispatch(setSyncState({ data: { id: notificationItemData?.no_code }, actionState: "in-progress" }));
        const triggerApiPayload = {
          user_code: notificationItemData?.user_code,
          noe_code: notificationItemData?.noe_code,
          no_code: notificationItemData?.no_code,
          extra: {
            trigger_api: {
              payload: triggerApiData?.payload || {},
              action_attribute: triggerApiData?.action_attribute || "",
              action_sub_attribute: triggerApiData?.action_sub_attribute || "",
              action_state: triggerApiData?.action_state || "completed", // pending, running, completed/ failed
            },
          },
        };  
        try {
          const request = await axiosInstance({
            url: NOTIFICATION_ACTION,
            method: "POST",
            data: triggerApiPayload,
          })
          console.log("triggerApi response", request);
        } catch (err) {
          console.error("triggerApi error", err);
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

  const handleSearchChange = (value) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  };

  const handleScrollToBottom = () => {
    if (isPaginatedBucket && hasMore && !isFetchingRef.current) {
      isFetchingRef.current = true;

      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);

      const payload = {
        action: "fetch_by_bucket",
        bucket_name: activeBadge,
        application_code: applicationCode,
        special_classification: activeNotiTab,
        filter: selectedFilter.map((item) => item.value),
        meta: {
          limit: {
            limit: NOTIFICATION_PAGE_SIZE,
            page: nextPage,
          }
        }
      };

      if (searchQuery) {
        payload.meta.search = [
          { pattern: searchQuery, search_type: "contains" },
        ];
      }

      fetchNotifications(JSON.stringify(payload));
    }
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
    handleScrollToBottom,
    handleSearchChange,
    isPaginatedBucket,
  };
}

export default UseNotification;
