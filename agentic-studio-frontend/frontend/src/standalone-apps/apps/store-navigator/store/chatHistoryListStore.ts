import { create } from "zustand";
import { navigatorService } from "../services/NavigatorService";
import type { ChatHistorySession } from "../types/chat.types";

interface ChatHistoryState {
  data: ChatHistorySession[];
  isLoading: boolean; // first load / refetch
  isFetchingNext: boolean; // pagination
  error: string | null;

  offset: number;
  limit: number;
  hasMore: boolean;

  fetchNext: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useChatHistoryListStore = create<ChatHistoryState>((set, get) => ({
  data: [],
  isLoading: false,
  isFetchingNext: false,
  error: null,

  offset: 0,
  limit: 10,
  hasMore: true,

  fetchNext: async () => {
    const { isLoading, isFetchingNext, hasMore, offset, limit, data } = get();

    if (isLoading || isFetchingNext || !hasMore) return;

    const isFirstLoad = offset === 0 && data.length === 0;

    try {
      set({
        error: null,
        isLoading: isFirstLoad,
        isFetchingNext: !isFirstLoad,
      });

      const res = await navigatorService.getHistoryList(offset, limit);

      set({
        data: [...data, ...res],
        offset: offset + limit,
        hasMore: res.length === limit,
        isLoading: false,
        isFetchingNext: false,
      });
    } catch {
      set({
        error: "Failed to fetch history",
        isLoading: false,
        isFetchingNext: false,
      });
    }
  },

  refetch: async () => {
    const { offset, limit } = get();

    try {
      set({
        isLoading: false,
        isFetchingNext: false,
        error: null,
      });

      let newData: ChatHistorySession[] = [];
      let currentOffset = 0;

      while (currentOffset < offset) {
        const res = await navigatorService.getHistoryList(currentOffset, limit);

        newData = [...newData, ...res];

        if (res.length < limit) break;
        currentOffset += limit;
      }

      set({
        data: newData,
        hasMore: true,
        isLoading: false,
      });
    } catch {
      set({
        error: "Failed to refetch history",
        isLoading: false,
      });
    }
  },
}));
