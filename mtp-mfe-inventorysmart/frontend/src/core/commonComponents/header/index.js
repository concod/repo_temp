import { useState, useRef, useEffect, useCallback , lazy, Suspense} from "react";
import PropTypes from "prop-types";
import { connect, useDispatch, useSelector } from "react-redux";
import { logoutUser } from "actions/authActions";
import {
  getCustomHeader,
  getDropdownValues,
  setHelpDesk,
  tenantConfigApiCache,
} from "actions/tenantConfigActions";
import {
  setNotifications,
  setNotificationDND,
  setWebSocketClient,
} from "actions/notificationActions";
import makeStyles from "@mui/styles/makeStyles";
import { firebaseobj } from "auth/firebase";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import { TENANT, WEBSOCKET_URL } from "config/api";
import { Header, useShortcut , useI18n } from "impact-ui-v3";
import { getAlanExceptionUserList, getSmartBotVisibilityData } from "../smartBot/services/chatbot-services";
import NotificationV2 from "../../pages/notifications/components/notifications-model";
import Popover from "@mui/material/Popover";
import globalStyles from "core/Styles/globalStyles";
import { setActiveUserApp } from "core/actions/sideBarActions";
import { setSmartBotActive } from "core/actions/smartBotActions";
import { getScreenMaster } from "core/actions/commentActions";
import { useBroadcastChannel } from "core/broadcastChannelContext";
import { cloneDeep, uniqueId, isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import UseChatSystemSocket from "../ChatSystem/UseChatSystemSocket";
import UseCellCommentSocket from "core/Utils/agGrid/cellComment/useCellCommentSocket";
import CommentBar from "../commentbar/CommentBar";
import {
  setNotificationData,
  setAdditionalNotificationData,
  setNotificationIndicator,
} from "../Notification/notification-services/notification-services";
import NotificationComponent from "../Notification/Notification";
import { APP_PLATFORM } from "config/constants";
import { headerLogoPaths, INITIAL_DELAY_MS, MAX_DELAY_MS, MAX_RETRIES, CONNECTION_TIMEOUT_MS, JITTER_MS, HEARTBEAT_INTERVAL_MS, SLAVE_MONITOR_INTERVAL_MS, HEARTBEAT_STALE_THRESHOLD_MS, SLAVE_MONITOR_JITTER_MS, CLAIM_VERIFICATION_DELAY_MS, LANGUAGE_TO_LOCALE_MAP, LOCALE_TO_LANGUAGE_MAP } from "./constants";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { useLocation } from "react-router";
import { getCurrentApplicationName, getEnvName, getFormattedApplicationName } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import "impact-chatbot/dist/index.esm.css";
import AgentNotificationToast from "core/commonComponents/AgentNotificationToast";
import { getApplicationCodeFromURL, getShortcutKeys } from "core/Utils/utils";
import { setEnableHelpdeskLink } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import SmartBot from "impact-chatbot";
import { setLanguagePreference } from "core/actions/tenantConfigActions";
const ShortcutsModal =lazy(()=> import("./ShortcutsModal/ShortcutsModal"))

const useStyles = makeStyles((theme) => ({
  header: {
    background: theme.palette.common.white,
    border: "none",
    borderRadius: "0",
    boxShadow: "0px 4px 10px 0px rgba(0, 0, 0, 0.12)",
    position: "sticky",
    right: 0,
    zIndex: 900,
    top: 0,
    height: theme.customVariables.headerHeight,
    flexDirection: "row",
  },
  notificationModel: {
    "& .MuiPopover-paper": {
      minWidth: "26rem",
      width: "30rem",
      minHeight: "30rem",
    },
  },
  headerCenterComponent: {
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "24px",
  },
  headerLogo: {
    height: "28px",
  },
}));
function HeaderComponent(props) {
  const {
    smartBotActive,
    setSmartBotActive,
    isSmartBotRestricted,
    keyboardShortcuts,
    // Products opt out of the SmartBot by passing enableSmartBot={false}
    // (DemandSmart does). Defaults to true so existing products are unchanged.
    enableSmartBot = true,
  } = props;
  const [unreadCount, setUnreadCount] = useState(0);
  const [dnd, setDnd] = useState(false);
  const ref = useRef();
  const [notifications, setNotificationsData] = useState(
    props.notificationData
  );
  const [isSmartBotVisible, setIsSmartBotVisible] = useState(false);
  const [isSmartBotAllowed, setIsSmartBotAllowed] = useState(true);
  const [enableTicketing, updateEnableTicketing] = useState(true);
  const [isComment, setIsComment] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [showMessageIcon, setShowMessageIcon] = useState(true);
  const [enabledLocales] = useState(["en-US", "de-DE"]);
  const { setLocale } = useI18n();
  const [partialClose, setPartialClose] = useState(false);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const keyboardShortcutsVisible = useSelector(
      (state) => state?.sideBarReducer?.keyboardShortcutsVisible
    );
  const enableKeyboardShortcutsUI = useSelector(
    (state) => state?.sideBarReducer?.shortcutsUiException?.navigation
  );
  const shortcutModalShortcut = useSelector(getShortcutKeys("general", "openCommandPalette"));
  const languageConfig = useSelector(
    (state) => state?.tenantConfigReducer?.languageConfig
  );

  const { handleSocketResponse } = UseChatSystemSocket();
  const { handleCellCommentResponse } = UseCellCommentSocket();
  const applicationDetails = getCurrentApplicationDetails();
  useShortcut(shortcutModalShortcut, () => setShortcutModalOpen(true));
  const getInitialLocale = (applicationCode) => {
    const savedPreference = localStorage.getItem(`languagePreference_${applicationCode}`);
    if (savedPreference) {
      return LANGUAGE_TO_LOCALE_MAP[savedPreference] || savedPreference;
    }
    return 'en-US';
  }
  const initialLocale = getInitialLocale(applicationDetails?.applicationCode);

  useEffect(() => {
    setLocale(initialLocale)
  },[])

  const handleLanguageChange = async (locale) => {
    try {
      const languageCode = LOCALE_TO_LANGUAGE_MAP[locale];
      if (languageCode) {
        await setLanguagePreference(languageCode);
        localStorage.setItem(
          `languagePreference_${applicationDetails?.applicationCode}`,
          languageCode
        );
        setLocale(locale);
      }
    } catch (error) {
      console.error("Failed to set language preference", error);
    }
  };

  const userID = localStorage.getItem("name");
  let userName = userID ? userID.split("@")[0] : "User";
  userName = userName
    .split(".")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [anchorEl, setAnchorEl] = useState(null);
  const notificationButtonRef = useRef(null);
  const broadcastChannel = useBroadcastChannel();
  const isMasterRef = useRef(null);
  const webSocketClientRef = useRef(null);
  const currentTabKeyRef = useRef(null);
  const tabIds = useRef(null);
  const navigate = useNavigate();
  const [customHeader, setCustomHeader] = useState(null);
  const location = useLocation();
  const dispatch = useDispatch();

  const isnotificationVersion3 = sessionStorage.getItem("notificationVersion") === "v3";
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const heartbeatIntervalRef = useRef(null);
  const slaveMonitorIntervalRef = useRef(null);
  const isClaimingRef = useRef(false);
  const claimTimeoutRef = useRef(null);
  const consecutiveStaleChecksRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  useEffect(() => {
    if (applicationDetails?.applicationCode) {
      const fetchHeader = async () => {
        const data = await getCustomHeader(applicationDetails?.applicationCode);
        setCustomHeader(data);
      };
      fetchHeader();
    }
  }, [applicationDetails?.applicationCode]);


  useEffect(() => {
    const hasMasterId = localStorage.getItem("web_master_key");
    const newKey = generateRandomKey();
    currentTabKeyRef.current = newKey;

    let shouldBecomeMaster = false;
    if (!hasMasterId) {
      shouldBecomeMaster = true;
    } else {
      const lastHeartbeat = parseInt(localStorage.getItem("ws_master_heartbeat"), 10);
      const isStale = !lastHeartbeat || (Date.now() - lastHeartbeat > HEARTBEAT_STALE_THRESHOLD_MS);
      if (isStale) {
        shouldBecomeMaster = true;
      }
      if (!shouldBecomeMaster) {
        const hasTimeDifference = getTimeStampDiff(hasMasterId);
        if (hasTimeDifference) {
          shouldBecomeMaster = true;
        }
      }
    }

    getHelpDesk();
    attachBroadcastEvents();
    if (enableSmartBot) {
      setTheVisibilityOfChatBotIcon();
      setBotsVisibilityAccordingToTheUserList();
    }
    setTheVisibilityOfMessageIcon();
    if (shouldBecomeMaster) {
      localStorage.setItem("web_master_key", newKey);
      broadcastChannel.postMessage({
        type: "updating_master",
      });
      isMasterRef.current = true;
      startMasterHeartbeat();
      createWebSocket();
    } else {
      startSlaveMonitor();
      broadcastChannel.postMessage({
        type: "fetch_data",
        payload: JSON.stringify({ action: "fetch", notification_type: "all" }),
      });
    }
    broadcastChannel.postMessage({
      type: "update_tab_key",
      payload: newKey,
    });
    broadcastChannel.postMessage({
      type: "fetch_tab_keys",
      payload: newKey,
    });

    const beforeUnloadHandler = () => {
      updateSocketConnetcions();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMasterRef.current) {
        reconnectAttemptsRef.current = 0;
        if (!webSocketClientRef.current || webSocketClientRef.current.readyState !== 1) {
          createWebSocket();
        }
      }
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // On SPA unmount (route change), clear master state from localStorage
      // so the next HeaderComponent instance can claim mastership immediately
      if (isMasterRef.current) {
        localStorage.removeItem("web_master_key");
        localStorage.removeItem("ws_master_heartbeat");
        if (tabIds.current?.[0]) {
          broadcastChannel.postMessage({
            type: "update_master",
            payload: tabIds.current[0],
          });
        }
      }
      broadcastChannel.postMessage({
        type: "remove_tab_key",
        payload: currentTabKeyRef.current,
      });
      cleanupLocalState();
    };
  }, []);

  const cleanupLocalState = () => {
    clearReconnectTimeout();
    clearConnectionTimeout();
    stopMasterHeartbeat();
    stopSlaveMonitor();
    clearClaimTimeout();
    isConnectingRef.current = false;

    if (webSocketClientRef.current) {
      try {
        intentionalCloseRef.current = true;
        webSocketClientRef.current.close(1000, "Component unmounting");
      } catch (error) {
        console.error("WebSocket: Error closing connection on cleanup", error);
      }
      webSocketClientRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
  };

  const updateSocketConnetcions = () => {
    cleanupLocalState();

    broadcastChannel.postMessage({
      type: "remove_tab_key",
      payload: currentTabKeyRef.current,
    });
    if (isMasterRef.current) {
      localStorage.removeItem("web_master_key");
      localStorage.removeItem("ws_master_heartbeat");
      if (tabIds.current?.[0]) {
        broadcastChannel.postMessage({
          type: "update_master",
          payload: tabIds.current[0],
        });
      }
    }
    isMasterRef.current = null;
    tabIds.current = [];
    currentTabKeyRef.current = null;
  };

  const attachBroadcastEvents = () => {
    broadcastChannel.onmessage = (event) => {
      switch (event.data.type) {
        case "update_tab_key":
          if (!event.data?.payload?.includes(tabIds.current)) {
            tabIds.current = [
              ...(tabIds?.current ? tabIds?.current : []),
              event?.data?.payload,
            ];
          }
          break;
        case "remove_tab_key":
          tabIds.current =
            tabIds.current?.filter((key) => key != event.data.payload) || [];
          break;
        case "fetch_tab_keys":
          broadcastChannel.postMessage({
            type: "update_tab_key",
            payload: currentTabKeyRef.current,
          });
          break;
        case "updating_master":
          // If we are the rightful master (our key matches localStorage), ignore competing broadcasts
          if (isMasterRef.current && localStorage.getItem("web_master_key") === currentTabKeyRef.current) {
            break;
          }
          // Abort any pending claim attempt
          clearClaimTimeout();
          isMasterRef.current = null;
          clearReconnectTimeout();
          clearConnectionTimeout();
          stopMasterHeartbeat();
          isConnectingRef.current = false;
          if (webSocketClientRef.current) {
            try {
              intentionalCloseRef.current = true;
              webSocketClientRef.current.close(1000, "Master tab changed");
            } catch (error) {
              console.error("WebSocket: Error closing connection", error);
            }
            webSocketClientRef.current = null;
          }
          reconnectAttemptsRef.current = 0;
          startSlaveMonitor();
          break;
        case "update_master":
          if (currentTabKeyRef.current === event.data.payload) {
            if (isMasterRef.current) break;
            localStorage.setItem("web_master_key", currentTabKeyRef.current);
            isMasterRef.current = true;
            reconnectAttemptsRef.current = 0;
            stopSlaveMonitor();
            startMasterHeartbeat();
            createWebSocket();
          } else {
            isMasterRef.current = null;
            clearReconnectTimeout();
            clearConnectionTimeout();
            stopMasterHeartbeat();
            isConnectingRef.current = false;
            if (webSocketClientRef.current) {
              try {
                intentionalCloseRef.current = true;
                webSocketClientRef.current.close(1000, "No longer master tab");
              } catch (error) {
                console.error("WebSocket: Error closing connection", error);
              }
              webSocketClientRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
            startSlaveMonitor();
          }
          break;
        case "master_ping":
          if (isMasterRef.current) {
            localStorage.setItem("ws_master_heartbeat", Date.now().toString());
            broadcastChannel.postMessage({ type: "master_pong" });
          }
          break;
        case "master_pong":
          consecutiveStaleChecksRef.current = 0;
          break;
        case "fetch_data":
          if (isMasterRef.current) {
            webSocketClientRef.current?.send(event.data.payload);
          }
          break;
        case "update_data": {
          const parsed = typeof event.data.payload === "string"
            ? JSON.parse(event.data.payload)
            : event.data.payload;
          if (!isEmpty(parsed.message) && parsed.message.type && parsed.message.data) {
            if (parsed?.message?.cell_changed) {
              handleCellCommentResponse(parsed?.message);
            } else {
              handleSocketResponse(parsed.message);
            }
          } else {
            updateWebSocketStatus(event.data.payload);
            updateNotificationData(parsed);
          }
          break;
        }
      }
    };
    broadcastChannel.onmessageerror = (event) => {
      console.error(event);
    };
  };

  const updateNotificationData = (data) => {
    if (data.action === "fetch") {
      props.setAdditionalNotificationData(data);
    }
    if (data.action === "fetch_by_bucket") {
      props.setNotificationData(data);
    }
  };

  const calculateBackoffDelay = () => {
    const exponentialDelay = Math.min(
      INITIAL_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
      MAX_DELAY_MS
    );
    const jitter = (Math.random() * JITTER_MS) - (JITTER_MS / 2);
    return Math.max(0, exponentialDelay + jitter);
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const clearConnectionTimeout = () => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  };

  const startMasterHeartbeat = () => {
    stopMasterHeartbeat();
    localStorage.setItem("ws_master_heartbeat", Date.now().toString());
    heartbeatIntervalRef.current = setInterval(() => {
      localStorage.setItem("ws_master_heartbeat", Date.now().toString());
    }, HEARTBEAT_INTERVAL_MS);
  };

  const stopMasterHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const stopSlaveMonitor = () => {
    if (slaveMonitorIntervalRef.current) {
      clearInterval(slaveMonitorIntervalRef.current);
      slaveMonitorIntervalRef.current = null;
    }
    consecutiveStaleChecksRef.current = 0;
  };

  const clearClaimTimeout = () => {
    if (claimTimeoutRef.current) {
      clearTimeout(claimTimeoutRef.current);
      claimTimeoutRef.current = null;
    }
    isClaimingRef.current = false;
  };

  const claimMastership = () => {
    if (isClaimingRef.current || isMasterRef.current) return;

    // Final heartbeat check — master might have responded to our ping
    const lastHb = parseInt(localStorage.getItem("ws_master_heartbeat"), 10);
    if (lastHb && (Date.now() - lastHb <= HEARTBEAT_STALE_THRESHOLD_MS)) {
      consecutiveStaleChecksRef.current = 0;
      return;
    }

    isClaimingRef.current = true;

    // Write our tab key as master candidate — last writer wins
    localStorage.setItem("web_master_key", currentTabKeyRef.current);
    stopSlaveMonitor();

    // Wait to let competing tabs also write, then verify if our key persists
    claimTimeoutRef.current = setTimeout(() => {
      claimTimeoutRef.current = null;
      const currentKey = localStorage.getItem("web_master_key");

      // Re-check heartbeat — master may have recovered during our claim window
      const hb = parseInt(localStorage.getItem("ws_master_heartbeat"), 10);
      const heartbeatFresh = hb && (Date.now() - hb <= HEARTBEAT_STALE_THRESHOLD_MS);

      if (currentKey === currentTabKeyRef.current && isClaimingRef.current && !heartbeatFresh) {
        // We won the election AND master is truly dead
        isClaimingRef.current = false;
        isMasterRef.current = true;
        reconnectAttemptsRef.current = 0;
        startMasterHeartbeat();
        broadcastChannel.postMessage({ type: "updating_master" });
        createWebSocket();
      } else {
        // We lost OR master is alive — stand down
        isClaimingRef.current = false;
        startSlaveMonitor();
      }
    }, CLAIM_VERIFICATION_DELAY_MS);
  };

  const startSlaveMonitor = () => {
    stopSlaveMonitor();
    consecutiveStaleChecksRef.current = 0;
    const jitter = Math.random() * SLAVE_MONITOR_JITTER_MS;
    slaveMonitorIntervalRef.current = setInterval(() => {
      if (isMasterRef.current || isClaimingRef.current) return;
      const lastHeartbeat = parseInt(localStorage.getItem("ws_master_heartbeat"), 10);
      const isStale = !lastHeartbeat || (Date.now() - lastHeartbeat > HEARTBEAT_STALE_THRESHOLD_MS);
      if (isStale) {
        consecutiveStaleChecksRef.current += 1;
        if (consecutiveStaleChecksRef.current === 1) {
          // First stale detection — ping master via BroadcastChannel (not throttled)
          broadcastChannel.postMessage({ type: "master_ping" });
        } else if (consecutiveStaleChecksRef.current >= 2) {
          // Second consecutive stale — master is truly dead
          consecutiveStaleChecksRef.current = 0;
          claimMastership();
        }
      } else {
        consecutiveStaleChecksRef.current = 0;
      }
    }, SLAVE_MONITOR_INTERVAL_MS + jitter);
  };

  const scheduleReconnect = () => {
    if (!isMasterRef.current || isConnectingRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RETRIES) {
      console.error(
        `WebSocket: Maximum reconnection attempts (${MAX_RETRIES}) reached. Please refresh the page or check your connection.`
      );
      return;
    }

    const delay = calculateBackoffDelay();
    reconnectAttemptsRef.current += 1;

    console.warn(
      `WebSocket: Scheduling reconnection attempt #${reconnectAttemptsRef.current} in ${Math.round(delay)}ms`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (isMasterRef.current) {
        createWebSocket();
      }
    }, delay);
  };

  const createWebSocket = async () => {
    if (!isMasterRef.current) {
      console.warn("WebSocket: Not master, skipping connection attempt");
      return;
    }

    if (isConnectingRef.current) {
      console.warn("WebSocket: Connection attempt already in progress, skipping...");
      return;
    }

    if (webSocketClientRef.current) {
      try {
        intentionalCloseRef.current = true;
        webSocketClientRef.current.close(1000, "Replacing connection");
      } catch (error) {
        console.error("WebSocket: Error closing existing connection", error);
      }
      webSocketClientRef.current = null;
    }

    isConnectingRef.current = true;

    try {
      const user = firebaseobj.auth().currentUser;
      let token = await user?.getIdToken();
      const newSocket = new W3CWebSocket(`${WEBSOCKET_URL}&token=${token}`);

      connectionTimeoutRef.current = setTimeout(() => {
        if (newSocket.readyState !== 1) {
          console.warn(
            `WebSocket: Connection attempt timed out after ${CONNECTION_TIMEOUT_MS}ms. Closing and retrying...`
          );
          try {
            newSocket.close();
          } catch (error) {
            console.error("WebSocket: Error closing timed out connection", error);
          }
        }
        clearConnectionTimeout();
      }, CONNECTION_TIMEOUT_MS);

      newSocket.onopen = () => {
        console.log("WebSocket: Connection established successfully");
        clearConnectionTimeout();
        clearReconnectTimeout();
        isConnectingRef.current = false;

        // Guard: if we lost mastership while connecting, close immediately
        if (!isMasterRef.current) {
          console.warn("WebSocket: No longer master, closing newly opened connection");
          try {
            intentionalCloseRef.current = true;
            newSocket.close(1000, "No longer master");
          } catch (error) {
            console.error("WebSocket: Error closing connection", error);
          }
          return;
        }

        reconnectAttemptsRef.current = 0;
        webSocketClientRef.current = newSocket;
        props.setWebSocketClient(newSocket);
      };

      /**
       * @desc Callback function to handle data when recieved through WebScoket
       * @param {Object} message
       */
      newSocket.onmessage = (message) => {
        const dataFromServer = cloneDeep(message.data);
        broadcastChannel.postMessage({
          type: "update_data",
          payload: dataFromServer,
        });
        const data =
          typeof dataFromServer === "string"
            ? JSON.parse(dataFromServer)
            : dataFromServer;
        if (!isEmpty(data.message) && data.message.type && data.message.data) {
          if (data?.message?.cell_changed) {
            handleCellCommentResponse(data?.message);
          } else {
            handleSocketResponse(data.message);
          }
        } else {
          updateWebSocketStatus(dataFromServer);
          updateNotificationData(data);
        }
      };

      newSocket.onerror = (error) => {
        console.error("WebSocket: Connection error occurred", error);
        clearConnectionTimeout();
        isConnectingRef.current = false;
      };

      newSocket.onclose = (event) => {
        console.log("WebSocket: Connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        clearConnectionTimeout();
        isConnectingRef.current = false;
        
        if (isMasterRef.current) {
          if (intentionalCloseRef.current) {
            intentionalCloseRef.current = false;
            console.log("WebSocket: Intentional close, not reconnecting");
            reconnectAttemptsRef.current = 0;
            return;
          }
          
          if (event.code === 1000 || event.code === 1001 || event.code === 1006) {
            webSocketClientRef.current= null
            console.log("WebSocket: Server-initiated clean close, reconnecting...");
          }
          
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("WebSocket: Error creating connection", error);
      clearConnectionTimeout();
      isConnectingRef.current = false;
      
      if (isMasterRef.current) {
        scheduleReconnect();
      }
    }
  };

  /**
   * @function
   * @description Update Store from data recieved
   */
  const updateWebSocketStatus = (dataFromServer) => {
    const data =
      typeof dataFromServer === "string"
        ? JSON.parse(dataFromServer)
        : dataFromServer;
    if (data.data) {
      if (!data.page) {
        props.setNotificationDND(data.data.dnd);
      } else {
        // Update the latest recieved notifications
        let updateNotifications = {
          notifications: data.data.notifications,
          unread_count: data.data.unread_count,
          dnd: data.data.dnd,
          total: data.total,
          new_notification: data?.new_notification ?? false
        };
        props.setNotifications(updateNotifications);
      }
    }
    if (data.unread_count || data.unread_count === 0) {
      setUnreadCount(data.unread_count);
    }
  };

  /**
   * @function
   * @description Helpdesk setup
   */
  const getHelpDesk = async () => {
    let helpDeskResponse = await tenantConfigApiCache(3, {
      attribute_name: "help_desk_url",
    })();
    props.setHelpDesk(
      helpDeskResponse?.data?.data?.[0]?.attribute_value?.value
    );
  };

  /**
   * @function
   * @description Generate a random key using lodasd and timestamp
   * @returns {String} Random time stamp based Key for every tab
   */
  const generateRandomKey = () => {
    const randomString = uniqueId("id_");
    const timestamp = Date.now();
    return `${randomString}_${timestamp}`;
  };

  /**
   * @function
   * @description Return the time difference in hours between the new time stamp and older time stamp
   * @param {String} tabID
   * @returns {Number || Boolean}
   */
  const getTimeStampDiff = (tabID) => {
    if (!tabID) {
      return false;
    }
    try {
      const stringParts = tabID.split("_");
      const timestamp = Number(stringParts[stringParts.length - 1]);
      const currentTimestamp = Date.now();
      const olderTimestamp = new Date(timestamp).getTime();
      return Math.floor((currentTimestamp - olderTimestamp) / (1000 * 60 * 60));
    } catch (error) {
      console.error("Couldn't read timestamp");
      return true;
    }
  };

  const fetchingNotificationFromWebsocket = (payload) => {
    if (isMasterRef.current) {
      webSocketClientRef.current?.send(payload);
    } else {
      broadcastChannel.postMessage({
        type: "fetch_data",
        payload: payload,
      });
    }
  };

  const handleNotiClick = (e) => {
    fetchingNotificationFromWebsocket(
      JSON.stringify({
        action: "fetch_by_bucket",
        bucket_name: "New",
        application_code: 3,
        special_classification: "actionable",
        filter: [],
      })
    );
    setAnchorEl(e.currentTarget);
    setNotiOpen(!notiOpen);
    setAnchorEl(e.currentTarget);
    if (!notiOpen) {
      props.setNotificationIndicator(false);
    }
  };

  const isTicketingEnabled = async () => {
    //By default ticketing is enabled to all clients without role based
    //But if any client needs role based access for this
    //Then we add a screen in WorkFlowInputCenter in db and check if that screen
    //exists for the role
    if (
      props.ticketingConfig["isEnabled"] &&
      props.ticketingConfig["isRoleBased"]
    ) {
      let getUserRole = await props.getScreenMaster({ application: [3] });
      if (getUserRole?.data?.status) {
        const enabled =
          getUserRole.data.data.findIndex(
            (screenObj) => screenObj["screen_name"] === "Mojo Ticketing link"
          ) > -1;
        updateEnableTicketing(enabled);
        dispatch(setEnableHelpdeskLink(enabled));
      }
    }
  };

  const setTheVisibilityOfChatBotIcon = async () => {
    try {
      let visibilityData = await getSmartBotVisibilityData();
      if (visibilityData?.data?.data[0]?.attribute_value?.value) {
        setIsSmartBotVisible(true);
      } else {
        setIsSmartBotVisible(false);
      }
    } catch (error) {
      console.error("setTheVisibilityOfChatBotIcon error", error);
    }
  };

  const setBotsVisibilityAccordingToTheUserList = async () => {
    try {
      let applicationURL = window.location.pathname.split("/")?.[1];
      let applicationName = getFormattedApplicationName(
        applicationURL
      ).toLowerCase();
      let appCode = getApplicationCodeFromURL(applicationName);
      let list = await getAlanExceptionUserList(appCode);
      if (list?.data?.data[0]?.attribute_value?.allow_all) {
        setIsSmartBotAllowed(true);
      } else if (list?.data?.data[0]?.attribute_value?.allow_patterns) {
        const allowedPatterns = list?.data?.data[0]?.attribute_value?.allow_patterns;
        const currentUserEmail = localStorage.getItem("name");
        setIsSmartBotAllowed(allowedPatterns.some((pattern) => currentUserEmail.includes(pattern)));
      }
      else if (list?.data?.data[0]?.attribute_value?.allowed_mail_list) {
        const allowedMailList = list?.data?.data[0]?.attribute_value?.allowed_mail_list;
        const currentUserEmail = localStorage.getItem("name");
        setIsSmartBotAllowed(allowedMailList.includes(currentUserEmail));
      }
      else {
        setIsSmartBotAllowed(false);
      }
    } catch (error) {
      console.error("setTheVisibilityOfChatBotIcon error", error);
    }
  };

  useEffect(() => {
    isTicketingEnabled();
  }, [props.ticketingConfig]);

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    setUnreadCount(props.notificationUnreadCount);
  }, [props.notificationUnreadCount]);

  useEffect(() => {
    setDnd(props.dnd);
  }, [props.dnd]);

  const handleClear = (data) => {
    if (isMasterRef.current) {
      webSocketClientRef.current?.send(data);
    } else {
      broadcastChannel.postMessage({
        type: "fetch_data",
        payload: data,
      });
    }
  };

  useEffect(() => {
    setNotificationsData(props.notificationData);
  }, [props.notificationData]);

  const openSupportLinkInNewTab = (url) => {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  const notificationIndicator = useSelector(
    (state) => state?.notificationReducerSlice?.notificationIndicator
  );

  const setTheVisibilityOfMessageIcon = async () => {
    try {
      let messageIconVisibility = await tenantConfigApiCache(3, {
        attribute_name: "show_message_icon",
      })();
      if (
        messageIconVisibility?.data?.data[0]?.attribute_value?.value === false
      ) {
        setShowMessageIcon(false);
      }
    } catch (error) {
      console.error("setTheVisibilityOfMessageIcon error", error);
    }
  };
  const getHeader = () => {
    return customHeader?.[0]?.attribute_value?.value === true && location.pathname.split("/")[1] !== "home" ? (
      <div className={globalClasses.centerAlign}>
        <img
          src={headerLogoPaths[TENANT.replace("-replica", "")]}
          alt={`${TENANT} logo`}
          className={classes.headerLogo}
        />
      </div>
    ) : (
      APP_PLATFORM.APP_NAME
    );
  };

  const getCenterComponent = () => {
    const appName = location.pathname.split("/")[1];
    const isInsideApp = appName !== "home";
    return customHeader?.[0]?.attribute_value?.value === true && isInsideApp ? (
      <>
        <span className={classes.headerCenterComponent}>
          {`${getCurrentApplicationName()} ${getEnvName()}`}
        </span>
      </>
    ) : null;
  };

  const displaySnackMessages = useCallback(
    (message, variant) => {
      try {
        dispatch(
          addSnack({
            message: message,
            options: {
              variant: variant,
            },
          })
        );
      } catch (error) {
        console.error("displaySnackMessages error", error);
      }
    },
    [dispatch]
  );

  const showSmartBot =
    enableSmartBot &&
    isSmartBotVisible &&
    !isSmartBotRestricted &&
    isSmartBotAllowed &&
    location.pathname.split("/")[1] !== "home";
  return (
    <>
      <div className={classes.header}>
        <Header
          handleLogoClick={() => navigate("/home")}
          handleHelpClick={() => {
            openSupportLinkInNewTab(props.helpDeskUrl);
          }}
          handleMessageClick={() => {
            setIsComment(true);
          }}
          handleNotificationClick={handleNotiClick}
          handleChatBotClick={() => {
            // if (localStorage.getItem("isStreaming") === "true") {
            //   displaySnackMessages(
            //     "Iris is processing request in another tab, This request can be processed once Iris is available",
            //     "warning"
            //   );
            //   return;
            // }
            setSmartBotActive(true);
            setPartialClose(false);
          }}
          notificationIndicator={unreadCount > 0 ? true : false}
          // notificationIndicator={notificationIndicator}
          title={getHeader()}
          userName={userName}
          showNotificationIcon={true}
          isNotificationDnd={dnd}
          showChatBotIcon={showSmartBot}
          showMessageIcon={false}
          isMessageIconDisabled={
            sessionStorage.getItem("activeScreenName") == "undefined"
          }
          showHelpIcon={enableTicketing}
          centerComponent={getCenterComponent()}
          showKeyboardShortcuts={keyboardShortcutsVisible && enableKeyboardShortcutsUI}
          handleKeyboardShortcutsClick={() => setShortcutModalOpen(true)}
          showLanguageIcon={languageConfig?.enable_header}
          enabledLocales={enabledLocales}
          onLanguageChange={handleLanguageChange}
        />
      </div>
      {isnotificationVersion3 ?
        <NotificationComponent
          isOpen={notiOpen}
          setIsOpen={setNotiOpen}
          fetchNotifications={fetchingNotificationFromWebsocket}
          webSocketClientRef={webSocketClientRef?.current}
        /> :
        <Popover
          id="simple-menu"
          anchorEl={anchorEl}
          placement="bottom"
          className={classes.notificationModel}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <NotificationV2
            characterLimit={true}
            {...props}
            onClose={handleClose}
            onClear={handleClear}
            fetchNotifications={(payload) => {
              if (isMasterRef.current) {
                webSocketClientRef.current?.send(payload);
              } else {
                broadcastChannel.postMessage({
                  type: "fetch_data",
                  payload: payload,
                });
              }
            }}
          ></NotificationV2>
        </Popover>
      }
      <CommentBar
        showCommentScreenNameOption={props.showCommentScreenNameOption}
        commentBarPlaceholder={props.commentBarPlaceholder}
        isComment={isComment}
        setIsComment={setIsComment}
      />
      <AgentNotificationToast />
      {showSmartBot && (
        <Suspense fallback={null}>
        <SmartBot
          showModal={smartBotActive}
          setShowModal={setSmartBotActive}
          userName={userName}
          partialClose={partialClose}
          setPartialClose={setPartialClose}
        />
        </Suspense>
        )}

      {keyboardShortcutsVisible && enableKeyboardShortcutsUI && (
        <Suspense fallback={<></>}>
          <ShortcutsModal
            props={{
              shortcutModalOpen,
              setShortcutModalOpen,
            }}
          />
        </Suspense>
      )}
    </>
  );
}

Header.propTypes = {
  logoutUser: PropTypes.func,
};

const mapStateToProps = (state) => ({
  notificationUnreadCount: state.notificationReducer.notificationUnreadCount,
  dnd: state.notificationReducer.dnd,
  notificationData: state.notificationReducer.notificationData,
  helpDeskUrl: state.tenantConfigReducer.helpDesk || "",
  ticketingConfig:
    state.tenantUserRoleMgmtReducer.userRoleManagementReducer.ticketingConfig,
  smartBotActive: state.smartBotReducer.smartBotActive,
  isSmartBotRestricted: state.smartBotReducer.isSmartBotRestricted,
  keyboardShortcuts: state.tenantConfigReducer.keyboardShortcuts,
});

export default connect(mapStateToProps, {
  logoutUser,
  setNotificationDND,
  setNotifications,
  setWebSocketClient,
  getDropdownValues,
  setActiveUserApp,
  setHelpDesk,
  getScreenMaster,
  setSmartBotActive,
  setNotificationData,
  setAdditionalNotificationData,
  setNotificationIndicator,
})(HeaderComponent);
