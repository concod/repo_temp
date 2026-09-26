import { Avatar, Button, Menu } from "impact-ui-v3";
import { useCallback, useMemo, useState, useRef } from "react";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import globalStyles from "core/Styles/globalStyles";
import MoreMenuIcon from "core/coreAssets/more.svg";
import ChatSystemEventName from "./ChatSystemEventName";
import ChatSystemMemberAddition from "./ChatSystemMemberAddition";
import { setChatConversationOpenWithEvents, setChatEventsData, toggleChatNotifications } from "../services-chatsystem/custom-services-chat-system";
import { useDispatch } from "react-redux";
import { debounce, cloneDeep } from "lodash";
import Search from "../Search/Search";
import "./ChatSystemHeader.scss";
import { displaySnackMessages } from "core/Utils/utils";

const selectedEvents = [];

const ChatSystemHeader = (props) => {
  const globalClasses = globalStyles();
  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(
    false
  );
  const dispatch = useDispatch();
  const {
    chatList,
    activeEvent,
    handleEvents,
    handleCommentChanges,
    activeEventId,
    isResolved,
    isStarred
  } = props;
  const menuRef = useRef(null)

  const search = useCallback(
    (value) => {
      handleCommentChanges("search", value);
    },
    [handleCommentChanges]
  );

  const debounceSearch = useMemo(() => {
    return debounce(search, 300);
  }, [search]);

  const handleSearch = (event) => {
    const value = event.target.value;
    debounceSearch(value);
  };

  const handleToggleNotifications = async () => {
    try {
      const data = {
        event_id: activeEventId,
        snooze: !chatList?.[activeEventId]?.is_snoozed
      }
      const request = await toggleChatNotifications(data)
      if (request?.status) {
        let chatlistCopy = cloneDeep(chatList)
        chatlistCopy = {
          ...chatlistCopy,
          [activeEventId]: {
            ...chatlistCopy?.[activeEventId],
            is_snoozed: !chatlistCopy?.[activeEventId]?.is_snoozed
          }
        }
        dispatch(setChatEventsData({ chatList: chatlistCopy }));
        displaySnackMessages(request?.message || "Event muted successfully", "success", dispatch)
      }
    } catch (err) {
      displaySnackMessages(err?.message || "Error muting event. Please try again later", "success", dispatch)
    } finally {
      setShowConfirmationDialogue(false)
    }
  }
  return (
    <header
      className={`chat-system-header ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
    >
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
      >
        {chatList?.[activeEventId] && <>
          <Avatar size="small" label={activeEvent?.charAt(0) || "E"} />
          <div className="event-name">
            <ChatSystemEventName
              chatList={chatList}
              activeEvent={activeEvent}
              activeEventId={activeEventId}
              handleEvents={handleEvents}
              isResolvedFilter={isResolved}
            />
          </div>
        </>}
      </div>
      <div className="right-side-content">
        {chatList?.[activeEventId] && <>
          {!(isResolved || isStarred) && <>
            <Search handleSearch={handleSearch} selectedEvents={selectedEvents} />
            <ChatSystemMemberAddition
              handleEvents={handleEvents}
              eventId={activeEventId}
              userMentioned={chatList[activeEventId]?.users_mentioned || []}
            />
            {chatList?.[activeEventId] !== null && (<>
              <div
                ref={menuRef}
                onClick={() => setShowConfirmationDialogue(!showConfirmationDialogue)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: "8px" }}
              >
                <MoreMenuIcon />
              </div>
              <Menu
                anchorEl={menuRef.current}
                iconPlacement="left"
                onClose={() => setShowConfirmationDialogue(false)}
                open={showConfirmationDialogue}
                options={chatList?.[activeEventId]?.is_snoozed ? [
                  {
                    label: 'Unmute Notifications',
                    onClick: handleToggleNotifications,
                    value: 'Unmute Notifications'
                  }
                ] : [
                  {
                    label: 'Mute Notifications',
                    onClick: handleToggleNotifications,
                    value: 'Mute Notifications'
                  }
                ]}
              />
            </>)}
          </>}
        </>}
        <Button
          onClick={() => {
            dispatch(setChatConversationOpenWithEvents(false));
          }}
          variant="text"
          icon={<ClearOutlinedIcon />}
        />
      </div>
    </header>
  );
};

export default ChatSystemHeader;
