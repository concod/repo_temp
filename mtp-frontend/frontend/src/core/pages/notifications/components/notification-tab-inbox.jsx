import React, { useEffect, useState, useRef } from "react";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import Link from "@mui/material/Link";
import Button from "@mui/material/Button";
import ClearIcon from "@mui/icons-material/Clear";
import NorthEastTwoToneIcon from "@mui/icons-material/NorthEastTwoTone";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButton, Stack, Typography } from "@mui/material";
import Loader from "../../../Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate } from "react-router-dom-v5-compat";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { isNumber } from "lodash";
import axiosInstance from "core/Utils/axios";

const useStyles = makeStyles((theme) => ({
  inboxContainer: {
    overflowY: "auto",
  },
  unreadNotification: {
    backgroundColor: theme.palette.primary.lighter,

    "&:hover": {
      backgroundColor: `${theme.palette.primary.main}29`,
    },
  },
  marginLeftAuto: {
    marginLeft: "auto",
  },
  readNotification: {
    backgroundColor: `${theme.palette.background.primary}66`,
    color: theme.palette.text.secondary,

    "&:hover": {
      backgroundColor: theme.palette.background.primary,
    },
  },
  notifications: {
    borderRadius: theme.spacing(1),
    cursor: "pointer",
    marginBottom: theme.spacing(1),
    padding: theme.spacing(2),

    "& .showtransition": {
      opacity: 0,
      visibility: "hidden",
      transition: "opacity 0.225s ease-in-out",
    },

    "&:hover .showtransition": {
      opacity: 1,
      visibility: "visible",
    },
  },
  hidePointer: {
    cursor: "default",
  },
  ellipsis: {
    position: "relative",
    width: "4.25rem",
    height: "2.115rem",

    "& div": {
      position: "absolute",
      top: "0.625rem",
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "50%",
      background: theme.palette.primary.main,
      animationTimingFunction: "cubic-bezier(0, 1, 1, 0)",
    },
    "& div:nth-child(1)": {
      left: 8,
      animation: "$lds-ellipsis1 0.6s infinite",
    },
    "& div:nth-child(2)": {
      left: 8,
      animation: "$lds-ellipsis2 0.6s infinite",
    },
    "& div:nth-child(3)": {
      left: 32,
      animation: "$lds-ellipsis2 0.6s infinite",
    },
    "& div:nth-child(4)": {
      left: 56,
      animation: "$lds-ellipsis3 0.6s infinite",
    },
  },
  "@keyframes lds-ellipsis1": {
    "0%": {
      transform: "scale(0)",
    },
    "100%": {
      transform: "scale(1)",
    },
  },
  "@keyframes lds-ellipsis3": {
    "0%": {
      transform: "scale(1)",
    },
    "100%": {
      transform: "scale(0)",
    },
  },
  "@keyframes lds-ellipsis2": {
    "0%": {
      transform: "translate(0, 0)",
    },
    "100%": {
      transform: "translate(1.5rem, 0)",
    },
  },
}));

const NotificationTabInbox = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [limit, setLimit] = useState(10);
  const [loadMore, setLoadMore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedNotifictaion, setSelectedNotifictaion] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [notification, setNotification] = useState([]);
  const navigate = useNavigate();

  /**
   * @func
   * @desc Set the loader if there are still remaining notificaitons and set new limit.
   * Also set scrollActive to false when all notifications loaded.
   */
  const handleLoadMore = () => {
    if (limit >= props.notificationCount) {
      return;
    }
    let newLimit = limit + 10;
    setLimit(newLimit);
    setLoadMore(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (limit > 10) {
        props.fetchNotifications(
          JSON.stringify({
            action: "fetch",
            notification_type: props.tabName,
            page: 1,
            limit: limit,
          })
        );
      }
    };
    fetchData();
  }, [limit]);

  useEffect(() => {
    props.fetchNotifications(
      JSON.stringify({
        action: "fetch",
        notification_type: props.tabName,
      })
    );
    setLoading(false);
    return () => {
      setNotification([]);
    };
  }, []);

  const performAction = async (notificationID, action) => {
    if (action === "delete") {
      let newNotifications = notification.filter(
        (item) => item.id !== notificationID
      );
      props.setNotifications({ notifications: newNotifications });
      setNotification(newNotifications);
      props.onClear({
        payload: JSON.stringify({
          action: "clear",
          notification_id: notificationID,
        }),
      });
    }
    if (action === "read") {
      let newNotifications = notification.map((item) => {
        if (item.id === notificationID) {
          item.unread = false;
        }
        return item;
      });
      props.fetchNotifications(
        JSON.stringify({
          action: "mark_read",
          notification_id: notificationID,
          status: 1,
        })
      );
      setNotification(newNotifications);
    }
    if (action === "unread") {
      let newNotifications = notification.map((item) => {
        if (item.id === notificationID) {
          item.unread = true;
        }
        return item;
      });
      props.fetchNotifications(
        JSON.stringify({
          action: "mark_read",
          notification_id: notificationID,
          status: 0,
        })
      );
      setNotification(newNotifications);
    }
    props.fetchNotifications(
      JSON.stringify({
        action: "fetch",
        notification_type: props.tabName,
        page: 1,
        limit: limit,
      })
    );
  };

  /**
   * @func
   * @desc Return the type of notification for every item passed.
   * @param {Object} item
   * @param {Element} desc
   * @param {Number} key
   * @returns {Element}
   */
  const renderNotification = (item, desc, key) => {
    let description = desc ? desc : replaceSpecialCharacter(item.description);
    let textColor = item.unread ? "primary" : "disabled";
    let downloadUrl = item.url
      ? item.url.includes("https://storage.googleapis.com/")
      : null;
    return (
      <div
        className={`${
          item.unread ? classes.unreadNotification : classes.readNotification
        } ${classes.notifications} ${
          !item.url?.length ? classes.hidePointer : ""
        }`}
        onClick={async () => {
          //For Monitoring Download Logs
          const LOG_API_URL = item?.extra_attributes?.api_url;
          const LOG_TASK_ID = item?.extra_attributes?.task_id;
          if (downloadUrl && LOG_API_URL?.length && isNumber(LOG_TASK_ID)) {
            const response = await axiosInstance({
              url: LOG_API_URL,
              method: "POST",
              data: { task_id: LOG_TASK_ID },
            });
          }

          if (!downloadUrl && item.url) {
            const reportCode = item?.extra_attributes?.report_code;
            const moduleCode = item?.extra_attributes?.module_code;
            if (reportCode) {
              navigate(item.url, {
                state: {
                  reportCode: reportCode,
                  moduleCode: moduleCode,
                },
              });
            }
            //if the url is same as current route, refresh the page because route navigation won't happen in that case
            else if (window.location.pathname === item.url) {
              window.location.reload(false);
            } else {
              navigate(item.url);
            }
            props.onClose();
          }
        }}
        title={item.url && !downloadUrl ? "Click to view" : "Read Only"}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack
            direction="column"
            justifyContent="flex-start"
            alignItems="flex-start"
          >
            <Typography variant="h4">{item.subject}</Typography>
            <Typography variant="body1">{description}</Typography>
          </Stack>
          {item.special_classification === "actionable" ? (
            <NorthEastTwoToneIcon
              color={`${item.unread ? "warning" : "disabled"}`}
            />
          ) : (
            <InfoOutlinedIcon
              color={`${item.unread ? "primary" : "disabled"}`}
              title="Info"
            />
          )}
        </Stack>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginTop}`}
        >
          <Typography component="span" variant="subtitle1">
            {item.time} | {item.date}
          </Typography>
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            spacing={2}
            className="showtransition"
          >
            {downloadUrl && (
              <IconButton
                onClick={(e) => {
                  window.open(item.url);
                }}
                color="primary"
                size="small"
                title="download"
              >
                <DownloadIcon fontSize="small" color={textColor} />
              </IconButton>
            )}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                performAction(item.id, item.unread ? "read" : "unread");
              }}
              color="primary"
              size="small"
              title={item.unread ? "Read" : "Unread"}
            >
              {item.unread ? (
                <VisibilityIcon fontSize="small" color={textColor} />
              ) : (
                <VisibilityOffIcon
                  fontSize="small"
                  color={textColor}
                ></VisibilityOffIcon>
              )}
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                performAction(item.id, "delete");
              }}
              color="primary"
              size="small"
              title="clear"
            >
              <ClearIcon fontSize="small" color={textColor} />
            </IconButton>
          </Stack>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (props.notificationsData && props.notificationsData.length > 0) {
      let values = props.notificationsData.map((item) => {
        item.unread = item.status === 0 ? true : false;
        item.id = item.no_code;
        item.time = moment(item.created_at).format("LT");
        item.date = moment(item.created_at).format("DD-MMM-YYYY");
        return item;
      });

      setLoadMore(false);
      setNotification(values);
    } else {
      setLoadMore(false);
      setNotification([]);
      setLoading(false);
    }
  }, [props.notificationsData]);

  return (
    <>
      <ConfirmPrompt
        showModal={showModal}
        title=""
        message=""
        ariaLabeledBy="routePromptTitle"
        setConfirm={setShowModal}
        hideActionFooter={true}
      >
        {renderNotification(selectedNotifictaion, false, null)}
        <Button
          id="routePromptYes"
          onClick={() => setShowModal(false)}
          color="primary"
          variant="outlined"
          className={`${globalClasses.flexRow} ${globalClasses.marginTop} ${classes.marginLeftAuto}`}
          autoFocus
        >
          Close
        </Button>
      </ConfirmPrompt>
      <Loader loader={isLoading}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
        >
          <Typography component="span" variant="h5">
            Latest
          </Typography>
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            spacing={2}
          >
            <Button
              variant="text"
              color="primary"
              onClick={() => {
                props.fetchNotifications(
                  JSON.stringify({
                    action: "clear_all",
                  })
                );
                props.fetchNotifications(
                  JSON.stringify({
                    action: "fetch",
                    notification_type: props.tabName,
                    page: 1,
                    limit: limit,
                  })
                );
                setNotification([]);
              }}
            >
              Clear All
            </Button>
            <Button
              variant="text"
              color="primary"
              onClick={() => {
                let newNotifications = notification.map((item) => {
                  item.unread = false;
                  return item;
                });
                props.fetchNotifications(
                  JSON.stringify({
                    action: "mark_all_as_read",
                  })
                );
                props.fetchNotifications(
                  JSON.stringify({
                    action: "fetch",
                    notification_type: props.tabName,
                    page: 1,
                    limit: limit,
                  })
                );
                setNotification(newNotifications);
              }}
              className={classes.margin}
            >
              Mark all as read
            </Button>
          </Stack>
        </div>
        <div
          className={classes.inboxContainer}
          style={{ maxHeight: props.hidefooter ? "none" : "65vh" }}
        >
          {notification.map((item, key) => {
            let desc =
              props.characterLimit &&
              replaceSpecialCharacter(item.description).length > 60 ? (
                <span>
                  {" "}
                  {replaceSpecialCharacter(item.description).substr(
                    0,
                    60
                  )}...{" "}
                  <Link
                    color={`${item.unread ? "primary" : "disabled"}`}
                    component="button"
                    underline="none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNotifictaion(item);
                      setShowModal(true);
                    }}
                  >
                    see more
                  </Link>{" "}
                </span>
              ) : (
                replaceSpecialCharacter(item.description)
              );
            return <>{renderNotification(item, desc, key)}</>;
          })}
        </div>
        {notification.length < props.notificationCount && (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
          >
            {loadMore ? (
              <div className={globalClasses.marginAround}>
                <div className={classes.ellipsis}>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            ) : (
              <Button
                className={globalClasses.marginAround}
                color="primary"
                onClick={handleLoadMore}
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </Loader>
    </>
  );
};

export default NotificationTabInbox;
