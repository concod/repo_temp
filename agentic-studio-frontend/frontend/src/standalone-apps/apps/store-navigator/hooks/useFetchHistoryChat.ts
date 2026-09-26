import { useEffect, useState } from "react";
import { navigatorService } from "../services/NavigatorService";
import type { Message } from "../types/chat.types";

export const useFetchHistoryChat = (offset: number, chatId: string) => {
  const [data, setData] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      console.log(chatId);

      try {
        setLoading(true);
        const response = await navigatorService.getChatHistoryBySessionId(
          offset,
          5,
          chatId
        );
        if (isMounted) setData(response);
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [offset, chatId]);

  return {
    data,
    loading,
    error,
  };
};

export const useAggregateHistoryChat = (
  messages: Message[],
  sessionId: string
) => {
  const [aggregatedMessages, setAggregatedMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (messages.length > 0) {
      setAggregatedMessages((prev) => [...[...messages].reverse(), ...prev]);
    }
  }, [messages]);

  //Reset when session changes
  useEffect(() => {
    setAggregatedMessages([]);
  }, [sessionId]);

  return aggregatedMessages;
};
