import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useAggregateHistoryChat,
  useFetchHistoryChat,
} from "../hooks/useFetchHistoryChat";
import { InfiniteScroll } from "../../../../components/InfiniteScroll/InfiniteScroll";
import { MessageBubble } from "../components/Chat/MessageBubble";
import Error from "../../../../components/Error/Error";
import type { Message, MessageGroup } from "../types/chat.types";
import React from "react";

const groupMessagesByDay = (messages: Message[]): MessageGroup[] => {
  const groups: { [key: string]: MessageGroup } = {};

  messages.forEach((message) => {
    // Normalize the date to midnight (Year-Month-Day 00:00:00)
    const date = new Date(message.timestamp);
    date.setHours(0, 0, 0, 0);

    // Create a unique key for the day
    const dateKey = date.toISOString();

    if (!groups[dateKey]) {
      groups[dateKey] = {
        timestamp: date,
        messages: [],
      };
    }

    // Push message into the group
    groups[dateKey].messages.push(message);
  });

  // Convert object back to array and sort chronologically
  return Object.values(groups).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
};

const ChatHistory = ({ sessionId }: { sessionId: string }) => {
  const [offset, setOffset] = useState<number>(0);
  const {
    data: messages,
    loading,
    error,
  } = useFetchHistoryChat(offset, sessionId || "");
  const aggregatedMessages = useAggregateHistoryChat(
    messages ? messages : [],
    sessionId || ""
  );
  const groupedMessages = groupMessagesByDay(aggregatedMessages);

  const onPageEnd = useCallback(() => {
    setOffset((prev) => prev + 5);
  }, []);

  if (offset === 0 && loading) {
    return (
      <div className="chat_history_loader">
        <div className="spinner" style={{ width: "32px", height: "32px" }} />
      </div>
    );
  }

  if (offset === 0 && error) {
    return (
      <div className="chat_history_error">
        <Error message="Something went wrong" />
      </div>
    );
  }

  return (
    <InfiniteScroll
      className="chat_history_conversation_container"
      direction="up"
      onPageEnd={onPageEnd}
      isLoading={offset > 0 && loading}
      list={groupedMessages.map((group) => (
        <React.Fragment key={group.timestamp.toISOString()}>
          <div className="chat_history_conversation_container__date">
            {group.timestamp.toDateString() === new Date().toDateString()
              ? "Today"
              : group.timestamp.toDateString() ===
                new Date(Date.now() - 86400000).toDateString()
              ? "Yesterday"
              : group.timestamp.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
          </div>
          {group.messages.map((item) => (
            <MessageBubble key={item.id} message={item} />
          ))}
        </React.Fragment>
      ))}
    />
  );
};

const ChatHistoryPage = () => {
  const { sessionId } = useParams();

  return <ChatHistory key={sessionId} sessionId={sessionId || ""} />;
};

export default ChatHistoryPage;
