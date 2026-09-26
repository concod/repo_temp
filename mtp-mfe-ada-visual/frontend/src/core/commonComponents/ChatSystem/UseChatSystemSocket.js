import { useDispatch, useSelector } from "react-redux";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import { setChatEventsData } from "./services-chatsystem/custom-services-chat-system";
import { formatRelativeDate } from "./utils";
import { setChatConversationOpenOrNot } from "./services-chatsystem/custom-services-chat-system";
import { useEffect, useRef } from "react";
import { sortChatAccortoDates } from "./utils";

const UseChatSystemSocket = () => {
  const dispatch = useDispatch();
  const userListRef = useRef([]);
  const eventsDataRef = useRef({
    tableName: "",
    uniqueRowId: "",
    selectedRowsIDs: [],
    currentUser: {},
    chatList: {},
    starredList: {},
    resolvedList: {},
    eventsCreated: {},
  });

  const eventsData = useSelector(
    (state) => state.commonChatReducer?.eventsData
  );

  const userManagementList = useSelector(
    (state) => state.commentBarReducer.userManagementList
  );

  useEffect(() => {
    eventsDataRef.current = eventsData;
  }, [eventsData]);

  useEffect(() => {
    userListRef.current = userManagementList;
  }, [userManagementList]);

  const handleSocketMessages = (type, data, components) => {
    const newChatList = cloneDeep(eventsDataRef.current.chatList);
    const resolveChatList = cloneDeep(eventsDataRef.current.resolvedList);
    const formattedDate = formatRelativeDate(
      data.created_at || data?.updated_at || new Date()
    );
    const allComments = newChatList[data?.event_id]?.comments || [];
    const eventId = data?.event_id;
    switch (type) {
      case "new_event_found": {
        const selectedRowIds = eventsDataRef.current.selectedRowsIDs;
        const uniqueRowId = eventsDataRef.current.uniqueRowId;
        const rowIds = selectedRowIds.map((row) => row[uniqueRowId]);
        const componentIds = components.map((row) => row.component_id);
        const eventsChangesData = {};

        componentIds.forEach((id) => {
          if (rowIds.includes(id)) {
            newChatList[eventId] = {
              ...data,
              comments: {},
            };
          } else {
            eventsChangesData[id] = 1;
          }
        });
        dispatch(
          setChatEventsData({
            chatList: newChatList,
            eventsCreated: eventsChangesData,
          })
        );
        break;
      }
      case "new_comment_found": {
        const sortedComments = sortChatAccortoDates({
          ...allComments,
          [formattedDate]: [...(allComments?.[formattedDate] || []), data],
        });
        newChatList[eventId].comments = sortedComments;
        newChatList[eventId].comments_count += 1;
        const isAlreadyMember = newChatList?.[eventId]?.users_mentioned.some(user => data?.users_mentioned?.some(item => item?.user_code === user?.user_code))
        if (data?.users_mentioned.length > 0 && !isAlreadyMember) {
          if (newChatList[eventId].comments.hasOwnProperty('Today')) {
            newChatList[eventId].comments['Today'] = [
              ...newChatList[eventId]?.comments?.['Today'],
              {
                action_type: "add",
                comment: `${data?.users_mentioned?.[0]?.user_name} is added`,
                updated_at: new Date().toISOString(),
                user_email: data?.users_mentioned?.[0]?.email,
                user_id: data?.users_mentioned?.[0]?.user_code,
                user_name: data?.users_mentioned?.[0]?.user_name,
              }
            ]
          } else {
            newChatList[eventId].comments = {
              ['Today']: [
                {
                  action_type: "add",
                  comment: `${data?.users_mentioned?.[0]?.user_name} is added`,
                  updated_at: new Date().toISOString(),
                  user_email: data?.users_mentioned?.[0]?.email,
                  user_id: data?.users_mentioned?.[0]?.user_code,
                  user_name: data?.users_mentioned?.[0]?.user_name,
                }
              ]
            }
          }
        }
        newChatList[eventId].users_mentioned = uniqBy([...newChatList?.[eventId]?.users_mentioned, ...data?.users_mentioned], "user_code")
        dispatch(setChatEventsData({ chatList: newChatList }));
        break;
      }
      case "comment_updated": {
        newChatList[eventId].comments = {
          ...allComments,
          [formattedDate]: allComments[formattedDate].map((chat) =>
            chat.comment_id == data.comment_id
              ? {
                  ...chat,
                  ...data,
                }
              : chat
          ),
        };
        dispatch(setChatEventsData({ chatList: newChatList }));
        break;
      }
      case "event_updated": {
        newChatList[eventId] = {
          ...newChatList[eventId],
          ...data,
        };
        if (resolveChatList[eventId]) {
          resolveChatList[eventId] = {
            ...resolveChatList[eventId],
            ...data,
          };
        }
        dispatch(
          setChatEventsData({
            chatList: newChatList,
            resolvedList: resolveChatList,
          })
        );
        break;
      }
      case "comment_deleted": {
        Object.entries(allComments).forEach(([key, values]) => {
          allComments[key] = values.filter(
            (chat) => chat.comment_id != data.comment_id
          );
        });
        newChatList[eventId].comments = allComments;
        newChatList[eventId].comments_count -= 1;
        dispatch(setChatEventsData({ chatList: newChatList }));
        break;
      }
      case "events_deleted": {
        const updatedEvents = {};
        const selectedRowIds = eventsDataRef.current.selectedRowsIDs;
        const uniqueRowId = eventsDataRef.current.uniqueRowId;
        components.forEach(element => {
          updatedEvents[element?.component_id] = -element?.deleted_events_count
        });
        data.event_ids.forEach((item) => {
          delete newChatList[item];
          delete resolveChatList[item];
        });
        if (isEmpty(newChatList)) {
          dispatch(setChatConversationOpenOrNot(false));
        }
        dispatch(
          setChatEventsData({
            chatList: newChatList,
            resolvedList: resolveChatList,
            eventsCreated: updatedEvents,
          })
        );
        break;
      }
      case "event_users_updated": {
        const usersInvolved = userListRef?.current.reduce((result, item) => {
          if (data?.user_ids?.includes(item?.user_code)) {
            let actionName = data?.action === "add" ? "added" : "removed";
            result.push({
              action_type: actionName,
              comment: `${item?.user_name} is ${actionName}`,
              updated_at: new Date().toISOString(),
              user_email: item?.email,
              user_id: item?.user_code,
              user_name: item?.user_name,
            });
          }
          return result;
        }, []);
        const messages = cloneDeep(newChatList[eventId]?.comments);
        if(messages?.hasOwnProperty('Today')){
          messages.Today = [...messages.Today, ...usersInvolved]
        } else {
          messages['Today'] = usersInvolved
        }
        if (data.action === "add") {
          const newUsers = userListRef.current.filter((item) =>
            data?.user_ids?.includes(item.user_code)
          );
          newChatList[eventId] = {
            ...newChatList[eventId],
            comments: messages,
            users_mentioned: [
              ...newChatList[eventId].users_mentioned,
              ...newUsers,
            ],
          };
        } else {
          newChatList[eventId] = {
            ...newChatList[eventId],
            comments: messages,
            users_mentioned: newChatList[eventId].users_mentioned.filter(
              (item) => !data.user_ids.includes(item.user_code)
            ),
          };
        }
        dispatch(
          setChatEventsData({
            chatList: newChatList,
          })
        );
        break;
      }
    }
  };

  const handleSocketResponse = (response) => {
    const currentTableName = eventsDataRef.current.tableName;
    if (response.component_type === currentTableName) {
      handleSocketMessages(response.type, response.data, response.components);
    }
  };

  return { handleSocketResponse };
};

export default UseChatSystemSocket;
