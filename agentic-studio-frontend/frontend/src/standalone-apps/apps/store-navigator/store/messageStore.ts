import { create } from "zustand";
import type {
  AIMessageBlock,
  AIMessageResponse,
  ChatMessage,
} from "../types/chat.types";
import { navigatorService } from "../services/NavigatorService";
import type { ProductRecommendation } from "../hooks/useFetchSearchResults";

interface MessageStore {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (userInput: string) => Promise<void>;
  clearChat: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  isSending: false,

  sendMessage: async (userInput: string) => {
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

    // 1. Append User Message
    const userMessage: ChatMessage = {
      id: userMsgId,
      isUser: true,
      messageBlock: { text: userInput },
    };

    // 2. Initialize Empty AI Message Block with Loading State
    const aiMessagePlaceholder: ChatMessage = {
      id: aiMsgId,
      isUser: false,
      messageBlock: {
        isLoading: true,
        messages: [],
      } as AIMessageBlock,
    };

    set((state) => ({
      messages: [...state.messages, userMessage, aiMessagePlaceholder],
      isSending: true,
    }));

    // Helper to update the specific AI message block as results arrive
    const updateAiBlock = (id: string, newResponse: AIMessageResponse) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                messageBlock: {
                  ...msg.messageBlock,
                  messages: [
                    ...(msg.messageBlock as AIMessageBlock).messages,
                    newResponse,
                  ],
                },
              }
            : msg
        ),
      }));
    };

    // 3. Define Parallel Tasks with coordination
    let agentProductIds: string[] = [];
    let agentCompleted = false;
    let recommendationData: ProductRecommendation | null = null;
    let recommendationCompleted = false;

    const parseProductIds = (text: string): string[] => {
      const regex = /P\d{3}/g;
      const matches = text.match(regex);
      return matches ? [...new Set(matches)] : [];
    };

    const agentTask = async () => {
      try {
        const res = await navigatorService.executeAgent(userInput);
        agentProductIds = parseProductIds(res.content.text);
        agentCompleted = true;

        updateAiBlock(aiMsgId, {
          status: "success",
          type: "agent",
          data: { text: res.content.text, html: res.html_content },
        });

        // If recommendation already completed, append agent product IDs
        if (recommendationCompleted && recommendationData) {
          set((state) => ({
            messages: state.messages.map((msg) => {
              if (msg.id !== aiMsgId) return msg;
              const block = msg.messageBlock as AIMessageBlock;
              return {
                ...msg,
                messageBlock: {
                  ...block,
                  messages: block.messages.map((m) =>
                    m.type === "recommendation"
                      ? (() => {
                          const existingData = m.data as ProductRecommendation;
                          const combinedProductIds = [
                            ...new Set([
                              ...existingData.productIds,
                              ...agentProductIds,
                            ]),
                          ];
                          const filteredSuggestedIds = (
                            existingData.suggestedProductIds || []
                          ).filter((id) => !combinedProductIds.includes(id));
                          return {
                            ...m,
                            data: {
                              ...existingData,
                              productIds: combinedProductIds,
                              suggestedProductIds: filteredSuggestedIds,
                            },
                          };
                        })()
                      : m
                  ),
                },
              };
            }),
          }));
        }
      } catch {
        agentCompleted = true;
        updateAiBlock(aiMsgId, {
          status: "error",
          type: "agent",
          data: { text: "Something went wrong", html: "Something went wrong" },
        });
      }
    };

    const recommendationTask = async () => {
      try {
        const res = await navigatorService.getSearchRecommendations(userInput);
        recommendationData = res;
        recommendationCompleted = true;

        // If agent already completed, include its product IDs (deduplicated)
        const combinedProductIds = agentCompleted
          ? [...new Set([...res.productIds, ...agentProductIds])]
          : res.productIds;

        // Filter suggestedProductIds to remove items present in productIds
        const filteredSuggestedIds = (res.suggestedProductIds || []).filter(
          (id) => !combinedProductIds.includes(id)
        );

        updateAiBlock(aiMsgId, {
          status: "success",
          type: "recommendation",
          data: {
            ...res,
            productIds: combinedProductIds,
            suggestedProductIds: filteredSuggestedIds,
          },
        });
      } catch {
        recommendationCompleted = true;
        updateAiBlock(aiMsgId, {
          status: "error",
          type: "recommendation",
          data: {
            explanation: "Something went wrong",
            productIds: [],
          },
        });
      }
    };

    // 4. Execute Parallely
    await Promise.all([agentTask(), recommendationTask()]);

    // 5. Finalize: Set loading to false for this block and the button
    set((state) => ({
      isSending: false,
      messages: state.messages.map((msg) =>
        msg.id === aiMsgId
          ? {
              ...msg,
              messageBlock: {
                ...(msg.messageBlock as AIMessageBlock),
                isLoading: false,
              },
            }
          : msg
      ),
    }));
  },

  clearChat: () => {
    navigatorService.clearSessionId();
    set({ messages: [] });
  },
}));
