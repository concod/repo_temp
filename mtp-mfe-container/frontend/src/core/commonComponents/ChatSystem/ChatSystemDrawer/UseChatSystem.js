import { useEffect, useRef, useState } from "react";
import { formatRelativeDate } from "../utils";
import { cloneDeep } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import {
  createEventandChatConversation,
  deleteComment,
  editCommentAndMakeStarred,
  setChatEventsData,
  updateEventNameandResolveEventandPinEvent,
} from "../services-chatsystem/custom-services-chat-system";
import { displaySnackMessages } from "core/Utils/utils";
import { addHighligher } from "../utils";
import {
  arrageChatConversationCommentsData,
  arragenChatConversationCommentsStarredData,
} from "../utils";
import { arrageChatConversationData } from "../utils";
import { getEventsForParticularRow } from "../services-chatsystem/custom-services-chat-system";

const UseChatSystem = (props) => {
  const { openChat } = props;

  const [chatList, setChatList] = useState({});
  const [resolvedList, setResolveList] = useState({});
  const [starredList, setStarredList] = useState({});
  const [activeEvent, setActiveEvent] = useState("");
  const [activeEventId, setActiveEventId] = useState("");
  const [originalList, setOriginalList] = useState({});
  const [
    starredAndResolvedFixedData,
    setStarredAndResolvedMixedData,
  ] = useState([]);
  const [selectedOption, setSelectedOptions] = useState({
    label: "Channel",
    value: "channel",
  });

  const eventsData = useSelector(
    (state) => state.commonChatReducer?.eventsData
  );
  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );
  const openChatWithEvents = useSelector(
    (state) => state.commonChatReducer?.openChatWithEvents
  );

  const userName = eventsData.currentUser?.user_name || "";

  const dispatch = useDispatch();
  const currentEventIdRef = useRef(null);

  const isChannel = selectedOption.value === "channel";
  const isStarred = selectedOption.value === "starred";
  const isResolved = selectedOption.value === "resolved";

  useEffect(() => {
    const {
      chatList: newChatList = {},
      resolvedList: newResolvedList = {},
      starredList: newStarredList = {},
    } = eventsData;
    const eventsList = Object.keys(newChatList || {});
    if (
      !activeEvent ||
      !activeEventId ||
      activeEventId != currentEventIdRef.current.eventId ||
      !eventsList.includes(String(activeEventId))
    ) {
      currentEventIdRef.current = {
        eventId: eventsList[0],
        eventName: newChatList[eventsList[0]]?.event_name,
      };
      setActiveEvent(newChatList[eventsList[0]]?.event_name || "");
      setActiveEventId(eventsList[0] || "");
    }
    setResolveList(newResolvedList);
    setStarredList(newStarredList);
    setChatList(newChatList);
    setOriginalList(newChatList);
  }, [eventsData]);

  const customDisplayMessage = (message, variant) => {
    displaySnackMessages(message, variant, dispatch, {
      horizontal: "right",
      vertical: "top",
    });
  };

  const handleEvents = async (type, data) => {
    const tableName = eventsData?.tableName || "";
    const { applicationCode, screenCode } = appDetails || {};

    const commonData = {
      component_type: tableName,
      application_code: applicationCode,
      screen_code: screenCode,
    };

    switch (type) {
      case "event-name": {
        try {
          const { newName } = data;
          const response = await updateEventNameandResolveEventandPinEvent(
            activeEventId,
            {
              event_name: newName,
              ...commonData,
            }
          );
          if (response.status) {
            setActiveEvent(newName);
            customDisplayMessage(response.message, "success");
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "resolve": {
        try {
          const response = await updateEventNameandResolveEventandPinEvent(
            activeEventId,
            {
              resolved: true,
              ...commonData,
            }
          );
          if (response.status) {
            customDisplayMessage(response.message, "success");
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "unresolve": {
        try {
          const response = await updateEventNameandResolveEventandPinEvent(
            activeEventId,
            {
              resolved: false,
              ...commonData,
            }
          );
          if (response.status) {
            customDisplayMessage(response.message, "success");
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "pin": {
        const response = await updateEventNameandResolveEventandPinEvent(
          activeEventId,
          {
            pinned: data.pinned,
            ...commonData,
          }
        );
        if (response.status) {
          customDisplayMessage(response.message, "success");
        }
        break;
      }
      case "filter": {
        const {
          data: newData,
          tableName,
          uniqueRowId,
          selectedRowsIDs,
          selected,
        } = data;
        const response = await getEventsForParticularRow(newData);

        let eventData = {};
        if (response.status) {
          const {
            chatList: newChatList,
            starredList: newStarredList,
            resolvedList: newResolvedList,
          } = arrageChatConversationData(response.data);

          eventData = {
            tableName,
            uniqueRowId,
            selectedRowsIDs: selectedRowsIDs,
            chatList: newChatList,
            starredList: newStarredList,
            resolvedList: newResolvedList,
          };
          const chatListKeys = Object.keys(newChatList);
          const firstEventDetails = chatListKeys
            ? newChatList[chatListKeys[0]]
            : {};
          dispatch(setChatEventsData(eventData));
          currentEventIdRef.current = {
            eventId: firstEventDetails?.event_id,
            eventName: firstEventDetails?.event_name,
          };
          setSelectedOptions(selected);
        }
      }
      default:
        break;
    }
  };

  const handleCommentChanges = async (type, data) => {
    const currentActiveEventId = currentEventIdRef.current.eventId;
    const newObj = cloneDeep(originalList);
    const newStarred = cloneDeep(starredList);
    const formattedDate = formatRelativeDate(data?.created_at || data?.updated_at || new Date());
    const allComments = newObj[currentActiveEventId]?.comments || [];
    const tableName = eventsData?.tableName || "";
    const { applicationCode, screenCode } = appDetails || {};
    const uniqueRowId = eventsData.uniqueRowId;
    const components = eventsData.selectedRowsIDs.map((item) => {
      return {
        component_id: String(item[uniqueRowId]),
        sub_component_id: "",
      };
    });

    const commonData = {
      component_type: tableName,
      application_code: applicationCode,
      screen_code: screenCode,
    };

    switch (type) {
      case "add": {
        try {
          delete data.replyMessage;
          await createEventandChatConversation(data);
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "edit": {
        try {
          const response = await editCommentAndMakeStarred(data.commentId, {
            comment: data.comment,
            users_mentioned: data.usersMentioned,
            event_id: currentActiveEventId,
            components,
            ...commonData,
          });
          if (response.status) {
            customDisplayMessage(response.message, "success");
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "starred": {
        try {
          const response = await editCommentAndMakeStarred(data.comment_id, {
            starred: data.starred,
          });
          if (response.status) {
            newObj[currentActiveEventId].comments = {
              ...allComments,
              [formattedDate]: allComments[formattedDate].map((chat) =>
                chat.comment_id == data.comment_id ? data : chat
              ),
            };
            displaySnackMessages(response.message, "success", dispatch, {
              horizontal: "right",
              vertical: "top",
            });
            dispatch(setChatEventsData({ chatList: newObj }));
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "delete": {
        try {
          const response = await deleteComment(data.comment_id, {
            event_id: currentActiveEventId,
            components,
            ...commonData,
          });
          if (response.status) {
            customDisplayMessage(response.message, "success");
          }
        } catch (err) {
          customDisplayMessage(err.message, "error");
        }
        break;
      }
      case "search": {
        const value = data?.toLowerCase().trim();
        if (!value) {
          setChatList(originalList);
          if (isResolved || isStarred) {
            const starredData = {
              [currentActiveEventId]: {
                comments: [...starredAndResolvedFixedData],
              },
            };
            const resolveData = {
              [currentActiveEventId]: {
                comments: [...starredAndResolvedFixedData],
              },
            };
            setStarredList(starredData);
            setResolveList(resolveData);
          }
        } else {
          const currentEventsData = newObj[currentActiveEventId];
          const currentEventsCommentData = Object.entries(
            currentEventsData.comments
          );

          if (isResolved || isStarred) {
            const filterComments = [];
            const allComments = isStarred
              ? newStarred[currentActiveEventId].comments
              : resolvedList[currentActiveEventId].comments;
            allComments.forEach((commentData) => {
              let realComment = commentData.comment;
              const commentValue = realComment.toLowerCase();

              if (commentValue.includes(value)) {
                realComment = addHighligher(realComment, value);
                filterComments.push({
                  ...commentData,
                  comment: realComment,
                });
              }
            });

            if (isStarred) {
              newStarred[currentActiveEventId].comments = filterComments;
              setStarredList(newStarred);
            } else {
              const newResolvedList = {
                [currentActiveEventId]: {
                  comments: filterComments,
                },
              };
              setResolveList(newResolvedList);
            }
          } else {
            currentEventsCommentData.forEach(([key, values]) => {
              const filterComments = [];
              values.forEach((commentData) => {
                let realComment = commentData.comment;
                const commentValue = realComment?.toLowerCase();
                if (commentValue.includes(value) && !commentData.hasOwnProperty("action_type")) {
                  realComment = addHighligher(realComment, value);
                  filterComments.push({
                    ...commentData,
                    comment: realComment,
                  });
                }
              });

              newObj[currentActiveEventId].comments = {
                ...newObj[currentActiveEventId].comments,
                [key]: filterComments,
              };
            });
            setChatList(newObj);
          }
        }
        break;
      }
      case "add-all-comments": {
        const comments = arrageChatConversationCommentsData(data);
        newObj[currentActiveEventId] = {
          ...newObj[currentActiveEventId],
          comments,
        };

        if (currentActiveEventId) {
          dispatch(
            setChatEventsData({
              chatList: newObj,
            })
          );
        }
        break;
      }
      case "add-all-comments-data": {
        const {
          chatData,
          starredData,
          resolveData,
        } = arragenChatConversationCommentsStarredData(data);
        newObj[currentActiveEventId] = {
          ...newObj[currentActiveEventId],
          comments: chatData,
        };
        newStarred[currentActiveEventId] = {
          ...newStarred[currentActiveEventId],
          ...starredData,
        };
        const newResolvedList = {
          [currentActiveEventId]: {
            ...resolveData,
          },
        };
        dispatch(
          setChatEventsData({
            chatList: newObj,
            starredList: newStarred,
            resolvedList: newResolvedList,
          })
        );
        setStarredAndResolvedMixedData(data);

        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    return () => {
      dispatch(
        setChatEventsData({
          tableName: "",
          selectedRowsIDs: [],
          currentUser: {},
          chatList: {},
          starredList: {},
          resolvedList: {},
        })
      );
    };
  }, []);

  return {
    openChat,
    openChatWithEvents,
    chatList,
    activeEvent,
    activeEventId,
    selectedOption,
    isChannel,
    isStarred,
    isResolved,
    starredList,
    resolvedList,
    userName,
    currentEventIdRef,
    setActiveEvent,
    setActiveEventId,
    setSelectedOptions,
    handleEvents,
    setChatList,
    handleCommentChanges,
  };
};

export default UseChatSystem;
