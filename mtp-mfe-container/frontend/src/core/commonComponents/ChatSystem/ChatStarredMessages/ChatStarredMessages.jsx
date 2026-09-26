import { useEffect } from "react";
import { Avatar, useTranslation } from "impact-ui-v3";
import moment from "moment";
import StarIcon from "@mui/icons-material/Star";
import { fetchSingleEventData } from "../services-chatsystem/custom-services-chat-system";
import "./ChatStarredMessages.scss";
import ChatStarredMessagesPlaceholder from "./ChatStarredMessagesPlaceholder";
import { sanitizeHtml } from "core/Utils/functions/utils";

const ChatStarredMessages = (props) => {
  const { t } = useTranslation();
  const {
    starredList,
    handleCommentChanges,
    isStarred,
    isChannel,
    activeEventId,
    currentEventIdRef,
    setSelectedOptions,
    isResolved
  } = props;

  useEffect(() => {
    const fetchEventsData = async () => {
      if (activeEventId && activeEventId == currentEventIdRef.current.eventId) {
        const filter = isStarred ? "starred=true" : "";
        const response = await fetchSingleEventData(activeEventId, filter);
        if (response.status)
          handleCommentChanges("add-all-comments-data", response.data.comments);
      }
    };
    fetchEventsData();
  }, [activeEventId, isStarred, isChannel]);

  return (
    <section className="starred-msg-container">
      {starredList[activeEventId] &&
        starredList[activeEventId].comments?.map((chat) => (
          <div
            className="starred-msg-card"
            onClick={() => {
              if (isStarred) {
                setSelectedOptions({
                  label: t("chat.channel"),
                  value: "channel",
                });
              }
            }}
          >
            <div className="right-side-starred">
              <Avatar
                label={chat?.created_by?.user_name?.charAt(0) || "U"}
                size="small"
              />

              <div className="msg-details">
                <div className="user-name">
                  {chat?.created_by?.user_name || "User"}
                </div>
                <div
                  className="user-msg"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(chat.comment || '', {
                      ALLOWED_TAGS: ['span'],
                      ALLOWED_ATTR: ['class', 'contenteditable'],
                      ALLOW_DATA_ATTR: false
                    })
                  }}
                />
              </div>
            </div>
            <div className="date">{moment(chat?.created_at).format("L")}</div>
            <div className="starred-icon">
              <StarIcon />
            </div>
          </div>
        ))}
      {!starredList?.hasOwnProperty(activeEventId) && <ChatStarredMessagesPlaceholder isResolved={isResolved} isStarred={isStarred}/>}
    </section>
  );
};

export default ChatStarredMessages;
