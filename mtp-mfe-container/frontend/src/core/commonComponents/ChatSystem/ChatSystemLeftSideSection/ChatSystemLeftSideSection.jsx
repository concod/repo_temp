import { useEffect, useRef, useState } from "react";
import { Badge, Button, Prompt, useTranslation } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import { formatRelativeDate } from "../utils";
import Chat from "../Chat/Chat";
import ChatSystemMessage from "../ChatSystemMessage/ChatSystemMessage";
import {
  fetchSingleEventData,
  setChatEventsData,
  clearChatForUser,
} from "../services-chatsystem/custom-services-chat-system";
import "./ChatSystemLeftSideSection.scss";
import { useDispatch } from "react-redux";
import { displaySnackMessages } from "core/Utils/utils";
import ChatStarredMessagesPlaceholder from "../ChatStarredMessages/ChatStarredMessagesPlaceholder";
import globalStyles from "core/Styles/globalStyles";

const ChatSystemLeftSideSection = (props) => {
  const {
    chatList,
    setChatList,
    activeEvent,
    handleCommentChanges,
    userName,
    activeEventId,
    isStarred,
    isChannel,
    currentEventIdRef,
  } = props;

  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(false);
  const [replyMessage, setReplayMessage] = useState({});
  const [editMessage, setEditMessage] = useState({});
  const [currentChatList, setCurrentChatList] = useState(
    chatList[activeEventId]
  );

  const chatMessagesRef = useRef(null);
  const dispatch = useDispatch();
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchEventsData = async () => {
      if (
        activeEventId &&
        activeEventId === currentEventIdRef.current.eventId
      ) {
        const response = await fetchSingleEventData(activeEventId);
        if (response.status)
          handleCommentChanges("add-all-comments", response.data?.comments);
      }
    };
    fetchEventsData();
  }, [activeEventId, isStarred, isChannel]);

  useEffect(() => {
    setCurrentChatList(chatList[activeEventId]);
  }, [activeEventId]);

  useEffect(() => {
    chatMessagesRef?.current?.scrollTo(
      0,
      chatMessagesRef.current?.scrollHeight
    );
    setCurrentChatList(chatList[activeEventId]);
  }, [chatList, currentChatList]);

  const clearChat = async () => {
    try {
      const response = await clearChatForUser(activeEventId);
      if (response?.status) {
        displaySnackMessages(response?.message, "success", dispatch)
        const newChatList = cloneDeep(chatList);
        newChatList[activeEventId].comments = [];
        newChatList[activeEventId].comments_count = 0;
        dispatch(
          setChatEventsData({
            chatList: newChatList,
          })
        );
      }
    } catch (err) {
      console.error("clearChat error => ", err);
      displaySnackMessages(t("chatSystem.errorClearingChat"), "error", dispatch);
    } finally {
      setShowConfirmationDialogue(false)
    }
  };

  const isResolved = chatList[activeEventId]?.resolved || false;

  return (
    <section className={`left-section ` + `${!(!isResolved && currentChatList) && globalClasses.centerAlign}`} >
      {!isResolved && currentChatList ? (
        <>
          <Button variant="url" onClick={() => setShowConfirmationDialogue(true)}>
            {t("chat.clearChat")}
          </Button>
          <Prompt
            isOpen={showConfirmationDialogue}
            onPrimaryButtonClick={clearChat}
            onSecondaryButtonClick={() => setShowConfirmationDialogue(false)}
            primaryButtonLabel={t("chat.clear")}
            secondaryButtonLabel={t("button.cancel")}
            title={t("chat.clearConfirmTitle")}
            variant="error"
          >
            {t("chat.clearConfirmMessage")}
          </Prompt>
          <section ref={chatMessagesRef} className="all-msg-container">
            {currentChatList &&
              currentChatList.comments &&
              Object.entries(currentChatList.comments).map(([key, values]) => {
                let previousDate = null;
                return (
                  values.length > 0 && (
                    <div className="date-wise-messages">
                      {values.map((chatMessage) => {
                        const showDate = previousDate
                          ? formatRelativeDate(previousDate) !==
                          formatRelativeDate(chatMessage.created_at || chatMessage?.updated_at)
                          : true;
                        previousDate = chatMessage.created_at || chatMessage?.updated_at;
                        return (
                          <>
                            {showDate && (
                              <div className="date-chip">
                                <Badge
                                  variant="stroke"
                                  label={formatRelativeDate(
                                    chatMessage?.created_at || chatMessage?.updated_at
                                  )}
                                />
                              </div>
                            )}
                            <ChatSystemMessage
                              setReplayMessage={setReplayMessage}
                              chatMessage={chatMessage}
                              handleCommentChanges={handleCommentChanges}
                              setEditMessage={setEditMessage}
                              userName={userName}
                              isResolved={isResolved}
                            />
                          </>
                        );
                      })}
                    </div>
                  )
                );
              })}
          </section>
          <Chat
            replyMessage={replyMessage}
            setReplayMessage={setReplayMessage}
            handleCommentChanges={handleCommentChanges}
            editMessage={editMessage}
            setEditMessage={setEditMessage}
            activeEventId={activeEventId}
            eventName={activeEvent}
            isResolved={isResolved}
          />
        </>
      ) : <ChatStarredMessagesPlaceholder isEmptyChannel={true} />}
    </section>
  );
};

export default ChatSystemLeftSideSection;
