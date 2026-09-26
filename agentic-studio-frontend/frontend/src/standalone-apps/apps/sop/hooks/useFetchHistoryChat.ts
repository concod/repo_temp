import { useEffect, useState } from "react";
import { pspSopService } from "../services/PspSopService";
import type { Message } from "../types/chat.types";
import { AUTH_KEY } from "../../agent-launcher/store/authStore";

export const useFetchHistoryChat = (offset: number, chatId: string) => {
  const [data, setData] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await pspSopService.getChatHistoryBySessionId(
          offset,
          5,
          chatId
        );
        if (isMounted) setData(response);
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem(AUTH_KEY);
          window.location.href = "/apps/agent-studio/";
          return;
        }
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
