import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { logoutUser } from "../../actions/authActions";
import {
  getDropdownValues,
  setHelpDesk,
} from "../../actions/tenantConfigActions";
import {
  setNotifications,
  setNotificationDND,
  setWebSocketClient,
} from "../../actions/notificationActions";
import AppBar from "@mui/material/AppBar";
import makeStyles from "@mui/styles/makeStyles";
import IconButton from "@mui/material/IconButton";
import Notification from "../../pages/notifications/components/notifications-model";
import Popover from "@mui/material/Popover";
import { firebaseobj } from "../../../auth/firebase";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import { WEBSOCKET_URL } from "../../../config/api";
import { Badge, Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import BotButton from "assets/botButton.svg";
import SmartBot from "core/commonComponents/smartBot";
import { getSmartBotVisibilityData } from "../smartBot/smartBotservices";
import ChatIcon from "../../assets/chatIcon.svg";
import HelpIcon from "../../assets/helpIcon.svg";
import NotificationsIcon from "../../assets/notificationIcon.svg";
import NotificationsIconActive from "../../assets/notificationIconActive.svg";
import NotificationsDnd from "../../assets/notificationDnd.svg";
import globalStyles from "core/Styles/globalStyles";
import { setActiveUserApp } from "core/actions/sideBarActions";
import { setSmartBotActive } from "core/actions/smartBotActions";
import { getScreenMaster, setcommentBarActive } from "core/actions/commentActions";
import { useBroadcastChannel } from "core/broadcastChannelContext";
import { cloneDeep, isEmpty, uniqueId } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import useKeyboardShortcut from "core/Utils/keyboard-shorcuts";
import logo from "assets/header_logo.svg?url";

const useStyles = makeStyles((theme) => ({
  header: {
    background: theme.palette.common.white,
    border: "none",
    borderRadius: "0",
    boxShadow: "0px 4px 10px 0px rgba(0, 0, 0, 0.12)",
    position: "sticky",
    right: 0,
    zIndex: 800,
    top: 0,
    height: theme.customVariables.headerHeight,
    flexDirection: "row",
  },
  navList: {
    margin: 0,
    gap: "24px",
    "& button": {
      padding: 0
    }
  },
  heading: {
    textDecoration: "none",
    color: theme.palette.textColours.codGray,
  },
  userText: {
    alignSelf: "center",
    color: theme.palette.textColours.codGray,
    fontWeight: "normal",
    marginLeft: theme.typography.pxToRem(12),
  },
  notificationModel: {
    "& .MuiPopover-paper": {
      minWidth: "26rem",
      width: "30rem",
      minHeight: "30rem",
    },
  },
  notificationsIconActive: {
    color: theme.palette.primary.main,
    width: "2rem",
    height: "2rem",
  },
  notificationsIconInactive: {
    color: theme.palette.textColours.slateGrayLight,
    width: "2rem",
    height: "2rem",
  },
  avatar: {
    fontSize: "14px",
    color: "#FFFFFF !important",
    fontWeight: 600,
    width: "2.25rem",
    height: "2.25rem",
    background: "#0055AF !important",
    border: "1px solid #C1DDFF"
  },
  helpOutlineIcon: {
    color: theme.palette.textColours.slateGrayLight,
    width: "2rem",
    height: "2rem",
  },
  customTypography: {
    fontWeight: 600,
  },
  divider: {
    height: "1.5rem",
    width: theme.typography.pxToRem(1),
    background: theme.palette.colours.accordionBorder,
  },
  badge: {
    "& .MuiBadge-badge": {
      border: `1px solid ${theme.palette.error.light}`,
      background: theme.palette.error.main,
      color: theme.palette.common.white
    }
  },
  iconButton: {
    width: "24px",
    height: "24px"
  }
}));
function Header(props) {
  const {
    smartBotActive,
    setSmartBotActive,
    isSmartBotRestricted,
    keyboardShortcuts,
  } = props;
  const [unreadCount, setUnreadCount] = useState(0);
  const [dnd, setDnd] = useState(false);
  const ref = useRef();
  const [notifications, setNotificationsData] = useState(
    props.notificationData
  );
  const [isSmartBotVisible, setIsSmartBotVisible] = useState(false);
  const [enableTicketing, updateEnableTicketing] = useState(true);

  const userID = localStorage.getItem("name");
  let userName = userID ? userID.split("@")[0] : "User";
  const shortName = userName
    .split(".")
    .map((item) => item[0].toUpperCase())
    .join("");
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

  // Use the custom hook to listen for keyboards shortcut
  const shortcuts = [
    {
      shortcutKey: keyboardShortcuts?.navigation?.toggleNotificationPanel,
      callback: () => {
        if (notificationButtonRef.current) {
          setAnchorEl((prev) => (prev ? null : notificationButtonRef.current));
        }
      },
    },
    {
      shortcutKey: keyboardShortcuts?.navigation?.goToPlatformLandingPage,
      callback: () => navigate("/home"),
    },
  ];
  useKeyboardShortcut(shortcuts);

  useEffect(() => {
    const hasMasterId = localStorage.getItem("web_master_key");
    const newKey = generateRandomKey();
    let hasTimeDifference = false;
    if (hasMasterId) {
      hasTimeDifference = getTimeStampDiff(hasMasterId);
    }
    getHelpDesk();
    attachBroadcastEvents();
    setTheVisibilityOfChatBotIcon();
    if (!hasMasterId || hasTimeDifference) {
      localStorage.setItem("web_master_key", newKey);
      broadcastChannel.postMessage({
        type: "updating_master",
      });
      isMasterRef.current = true;
      createWebSocket();
      window.addEventListener("beforeunload", () => {
        updateSocketConnetcions();
      });
    } else {
      broadcastChannel.postMessage({
        type: "fetch_data",
        payload: JSON.stringify({ action: "fetch", notification_type: "all" }),
      });
    }
    currentTabKeyRef.current = newKey;
    broadcastChannel.postMessage({
      type: "update_tab_key",
      payload: newKey,
    });
    broadcastChannel.postMessage({
      type: "fetch_tab_keys",
      payload: newKey,
    });
    return () => {
      updateSocketConnetcions();
    };
  }, []);

  const updateSocketConnetcions = () => {
    broadcastChannel.postMessage({
      type: "remove_tab_key",
      payload: currentTabKeyRef.current,
    });
    if (isMasterRef.current || tabIds.current?.length) {
      localStorage.removeItem("web_master_key");
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
    webSocketClientRef.current?.close();
    webSocketClientRef.current = null;
  };

  const attachBroadcastEvents = () => {
    broadcastChannel.onmessage = (event) => {
      switch (event.data.type) {
        case "update_tab_key":
          if (!event.data.payload.includes(tabIds.current)) {
            tabIds.current = [
              ...(tabIds.current ? tabIds.current : []),
              event.data.payload,
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
          isMasterRef.current = null;
          webSocketClientRef.current?.close();
          webSocketClientRef.current = null;
          break;
        case "update_master":
          if (currentTabKeyRef.current === event.data.payload) {
            localStorage.setItem("web_master_key", currentTabKeyRef.current);
            isMasterRef.current = true;
            createWebSocket();
            window.addEventListener("beforeunload", () => {
              updateSocketConnetcions();
            });
          } else {
            isMasterRef.current = null;
            webSocketClientRef.current = null;
          }
          break;
        case "fetch_data":
          if (isMasterRef.current) {
            webSocketClientRef.current?.send(event.data.payload);
          }
          break;
        case "update_data":
          updateWebSocketStatus(event.data.payload);
          break;
      }
    };
    broadcastChannel.onmessageerror = (event) => {
      console.error(event);
    };
  };

  const createWebSocket = async () => {
    const user = firebaseobj.auth().currentUser;
    let token = await user?.getIdToken();
    const newSocket = new W3CWebSocket(`${WEBSOCKET_URL}&token=${token}`);

    newSocket.onopen = () => {
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
      updateWebSocketStatus(dataFromServer);
    };

    newSocket.onclose = () => {
      if (isMasterRef.current) {
        createWebSocket();
      }
    };
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
    let helpDeskResponse = await props.getDropdownValues(3, {
      attribute_name: "help_desk_url",
    });
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

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
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
        updateEnableTicketing(
          getUserRole.data.data.findIndex(
            (screenObj) => screenObj["screen_name"] === "Mojo Ticketing link"
          ) > -1
        );
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
      webSocketClientRef.current?.send(data.payload);
    } else {
      broadcastChannel.postMessage({
        type: "fetch_data",
        payload: data.payload,
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

  return (
    <>
      <AppBar
        position="fixed"
        className={`${classes.header} ${globalClasses.verticalAlignCenter} ${globalClasses.paddingHorizontal}`}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.fullWidth}`}
        >
          <Link to="/home" className={classes.heading}>
            <div className={globalClasses.centerAlign}>
              <img src={logo} alt="logo" className="header__logo" />
              <div
                className={`${classes.divider} ${globalClasses.marginHorizontal}`}
              />
              <Typography
                component="h1"
                variant="h4"
                className={classes.customTypography}
              >
                {props.title}
              </Typography>
            </div>
          </Link>
          <ul
            className={`${globalClasses.centerAlign} ${classes.navList} ${globalClasses.gap}`}
          >
            <li title="Notification" className={classes.iconButton}>
              <IconButton
                ref={notificationButtonRef}
                aria-label="notification"
                className={globalClasses.padding_0}
                onClick={handleClick}
                size="large"
                disableRipple
                disableTouchRipple
              >
                <Badge
                  className={classes.badge}
                  badgeContent={dnd ? null : unreadCount}
                  overlap="circular"
                >
                  {dnd ? (
                    <NotificationsDnd
                      className={
                        anchorEl
                          ? classes.notificationsIconActive
                          : classes.notificationsIconInactive
                      }
                    />
                  ) : unreadCount > 0 ? (
                    <NotificationsIcon
                      className={
                        anchorEl
                          ? classes.notificationsIconActive
                          : classes.notificationsIconInactive
                      }
                    />
                  ) : (
                    <NotificationsIconActive
                      className={
                        anchorEl
                          ? classes.notificationsIconActive
                          : classes.notificationsIconInactive
                      }
                    />
                  )}
                </Badge>
              </IconButton>
            </li>
            {isSmartBotVisible && !isSmartBotRestricted && (
              <li title="Smart Sage">
                <IconButton
                  aria-label="smart_sage"
                  className={globalClasses.padding_0}
                  onClick={() => setSmartBotActive(true)}
                  size="large"
                  disableRipple
                  disableTouchRipple
                >
                  <BotButton />
                </IconButton>
              </li>
            )}
            {enableTicketing && (
              <li title="Raise support ticket" className={classes.iconButton}>
                <IconButton
                  className={globalClasses.padding_0}
                  aria-label="raise support ticket"
                  onClick={() => openSupportLinkInNewTab(props.helpDeskUrl)}
                  disableRipple
                  disableTouchRipple
                  disabled={isEmpty(props?.helpDeskUrl)}
                >
                  <HelpIcon className={classes.helpOutlineIcon} />
                </IconButton>
              </li>
            )}
            <li title="CommentSection" className={classes.iconButton}>
              <IconButton
                aria-label="comment-section-button"
                disableRipple
                disableTouchRipple
                onClick={() => {
                  props.setcommentBarActive(!props.commentBarActive);
                }}
              >
                <ChatIcon />
              </IconButton>
            </li>
            <li
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}}`}
            >
              <Avatar className={classes.avatar}> {shortName} </Avatar>
            </li>
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
              <Notification
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
              ></Notification>
            </Popover>
          </ul>
        </div>
      </AppBar>
      {isSmartBotVisible && !isSmartBotRestricted && (
        <SmartBot
          invokeBot={smartBotActive}
          closeBot={() => setSmartBotActive(false)}
        />
      )}
    </>
  );
}

Header.propTypes = {
  logoutUser: PropTypes.func.isRequired,
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
  commentBarActive: state.commentBarReducer.commentBarActive
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
  setcommentBarActive
})(Header);
