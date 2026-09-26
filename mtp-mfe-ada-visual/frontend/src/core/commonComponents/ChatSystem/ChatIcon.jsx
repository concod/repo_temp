import { Loader, Badge } from "impact-ui-v3";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useDispatch, useSelector } from "react-redux";
import {
  setChatConversationOpenWithEvents,
  setChatEventsData,
} from "./services-chatsystem/custom-services-chat-system";
import { displaySnackMessages } from "core/Utils/utils";
import { isEmpty, isUndefined } from "lodash";
import { arrageChatConversationData } from "./utils";
import { getEventsForParticularRow } from "./services-chatsystem/custom-services-chat-system";
import { setChatLoading } from "./services-chatsystem/custom-services-chat-system";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";

const ChatIcon = ({ column, cellData, selectedRowsIDs = [] }) => {
  const dispatch = useDispatch();

  const {
    totalEventsCount = 0,
    tableName = "",
    uniqueRowId,
    eventsFound,
    resolvedEventsCount = 0,
  } = selectedRowsIDs?.extraData || {};

  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );

  const show = async () => {
    dispatch(setChatConversationOpenWithEvents(true));
    dispatch(setChatLoading(true));
    const data = {
      component_type: tableName,
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
      filter: "all",
      components: [
        {
          component_id: String(selectedRowsIDs[uniqueRowId]),
        },
      ],
    };

    const currentUserName = localStorage.getItem("user");

    try {
      const response = await getEventsForParticularRow(data);
      let eventData = {};
      if (response.status) {
        const {
          chatList,
          starredList,
          resolvedList,
        } = arrageChatConversationData(response.data);

        eventData = {
          tableName,
          uniqueRowId,
          selectedRowsIDs: [selectedRowsIDs],
          currentUser: {
            user_name: currentUserName,
            user_code: "",
            email: "",
          },
          chatList,
          starredList,
          resolvedList,
          eventsCreated: {},
        };
      }
      displaySnackMessages("Successfully Fetch Events!", "success", dispatch);
      dispatch(setChatEventsData(eventData));
      dispatch(setChatLoading(false));
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error", dispatch);
      dispatch(setChatEventsData({}));
      dispatch(setChatConversationOpenWithEvents(false));
      dispatch(setChatLoading(false));
    }
  };

  const updatedColumn = { ...column };
  updatedColumn.type = column.originalType;

  return (
    <span
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <p
        style={{
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {nonEditableCell(updatedColumn, null, true)(cellData)}
      </p>
      {totalEventsCount > 0 ? (
        <span className={"chat-conversation-icon-wrapper"}>
          <Badge
            color="info"
            label={`${resolvedEventsCount}/${totalEventsCount}`}
            size="small"
            variant="stroke"
          />
          <ChatBubbleOutlineIcon
            sx={{ color: "#4259ee", fontWeight: 100, cursor: "pointer" }}
            onClick={() => show()}
          />
          {totalEventsCount ? (
            <div className={"chat-conversation-event-icon-badge"}></div>
          ) : null}
        </span>
      ) : isUndefined(eventsFound) ? (
        <Loader progress="" size="small" text="" />
      ) : null}
    </span>
  );
};

export default ChatIcon;
