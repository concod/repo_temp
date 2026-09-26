import { create } from "zustand";
import {
    BannerAgentService,
    type ConversationMessageApi,
    type UserSessionListItemApi,
    getDisplayMetadataImageUrls,
    getDisplayMetadataProductImageUrls,
    renderDisplayMetadataHtml,
} from "../services/bannerAgentService";
import { normalizeBannerImageLinksInText } from "../features/chatbot/utils/messageUtils";
import { toProxyGeneratedImageUrl } from "../features/chatbot/utils/imageUtils";

export interface ChatSession {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    requestCount: number;
    avgExecutionTime: number | null;
    agentsUsed: string | null;
}

export interface ChatMessage {
    id: string;
    role: "user" | "bot";
    text: string;
    isHtml?: boolean;
    createdAt: string;
    sources: string[];
    imageUrls: string[];
    productImageUrls: string[];
    isError?: boolean;
    sessionId?: string;
}

interface ChatStore {
    // Session state
    sessions: ChatSession[];
    selectedSessionId: string | null;
    activeSessionId: string | null;
    sessionsLoading: boolean;
    sessionsError: string | null;
    conversationLoading: boolean;

    // Message state
    messages: ChatMessage[];
    isWaitingForResponse: boolean;
    isRetrying: boolean;

    // Actions - sessions
    fetchSessions: () => Promise<void>;
    selectSession: (sessionId: string) => Promise<void>;
    setActiveSessionId: (sessionId: string | null) => void;
    startNewSession: () => string;
    clearAllSessions: () => void;

    // Actions - messages
    addMessage: (message: ChatMessage) => void;
    clearChat: () => string;
    setWaitingForResponse: (waiting: boolean) => void;
    setRetrying: (retrying: boolean) => void;
}

const bannerAgentService = new BannerAgentService();

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const parseIsoDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const mapSession = (session: UserSessionListItemApi, index: number): ChatSession => {
    const firstRequest = parseIsoDate(session.first_request);
    const lastRequest = parseIsoDate(session.last_request);
    const createdAt = firstRequest ?? lastRequest ?? new Date(0);
    const updatedAt = lastRequest ?? firstRequest ?? new Date(0);
    const sessionId = session.session_id?.trim() || `unknown-session-${index}`;
    const fallbackTitle = `Chat ${index + 1}`;
    const title = session.session_title?.trim() || fallbackTitle;

    return {
        id: sessionId,
        title,
        createdAt,
        updatedAt,
        requestCount: isFiniteNumber(session.request_count) ? session.request_count : 0,
        avgExecutionTime: isFiniteNumber(session.avg_execution_time)
            ? session.avg_execution_time
            : null,
        agentsUsed:
            typeof session.agents_used === "string" && session.agents_used.trim()
                ? session.agents_used
                : null,
    };
};

const messageTextFromBlocks = (
    messageBlocks: unknown
): string => {
    if (!Array.isArray(messageBlocks)) return "";

    return messageBlocks
        .filter((block) => block?.type === "text" && typeof block.content === "string")
        .map((block) => String(block.content).trim())
        .filter(Boolean)
        .join("\n\n");
};

const formatTime = (date = new Date()): string =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const toConversationMessages = (
    messages: ConversationMessageApi[] | null | undefined,
    sessionId: string
): ChatMessage[] => {
    if (!Array.isArray(messages)) return [];

    const flattened: ChatMessage[] = [];

    messages.forEach((entry, index) => {
        const baseTimestamp = parseIsoDate(entry.timestamp) ?? new Date();
        const userInput = typeof entry.user_input === "string" ? entry.user_input.trim() : "";
        const messageId =
            typeof entry.id === "number" || typeof entry.id === "string"
                ? String(entry.id)
                : `row-${index}`;

        if (userInput) {
            flattened.push({
                id: `conv-${messageId}-user`,
                role: "user",
                text: userInput,
                createdAt: formatTime(baseTimestamp),
                sources: [],
                imageUrls: [],
                productImageUrls: [],
                sessionId,
            });
        }

        const rawHtml =
            entry.ai_message?.content?.html ??
            (entry.ai_message?.content as { html_content?: unknown } | null | undefined)
                ?.html_content;
        const displayMetadata =
            entry.ai_message?.content?.display_metadata ?? entry.ai_message?.display_metadata;
        const displayMetadataHtml = renderDisplayMetadataHtml(displayMetadata);
        const htmlContent = typeof rawHtml === "string" && rawHtml.trim() ? rawHtml : undefined;
        const rawText = entry.ai_message?.content?.text;
        const fallbackText = messageTextFromBlocks(entry.ai_message?.message_blocks);
        const text =
            (typeof rawText === "string" && rawText.trim() ? rawText : "") || fallbackText;

        if (displayMetadataHtml || htmlContent || text) {
            const botTimestamp = new Date(baseTimestamp.getTime() + 1);
            const normalizedText = displayMetadataHtml
                ? displayMetadataHtml
                : htmlContent
                    ? htmlContent
                    : normalizeBannerImageLinksInText(text);
            const imageUrls = getDisplayMetadataImageUrls(displayMetadata).map((url) =>
                toProxyGeneratedImageUrl(url)
            );
            const productImageUrls = getDisplayMetadataProductImageUrls(displayMetadata).map((url) =>
                toProxyGeneratedImageUrl(url)
            );

            flattened.push({
                id: `conv-${messageId}-assistant`,
                role: "bot",
                text: normalizedText,
                isHtml: Boolean(displayMetadataHtml || htmlContent),
                createdAt: formatTime(botTimestamp),
                sources: [],
                imageUrls,
                productImageUrls,
                sessionId,
            });
        }
    });

    return flattened;
};

const createClientSessionId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const sortSessionsDescending = (sessions: ChatSession[]) =>
    [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

export const useBannerChatStore = create<ChatStore>()((set, get) => ({
    sessions: [],
    selectedSessionId: null,
    activeSessionId: null,
    sessionsLoading: false,
    sessionsError: null,
    conversationLoading: false,
    messages: [],
    isWaitingForResponse: false,
    isRetrying: false,

    fetchSessions: async () => {
        set({ sessionsLoading: true, sessionsError: null });

        try {
            const response = await bannerAgentService.fetchUserSessions();
            const mappedSessions = (response.sessions ?? [])
                .map((session, index) => mapSession(session, index))
                .filter((session, index, arr) =>
                    arr.findIndex((entry) => entry.id === session.id) === index
                );

            set((state) => {
                const sorted = sortSessionsDescending(mappedSessions);
                return {
                    sessions: sorted,
                    selectedSessionId: state.selectedSessionId,
                    activeSessionId: state.selectedSessionId,
                    sessionsLoading: false,
                };
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unable to load previous chats.";
            set({ sessionsLoading: false, sessionsError: errorMessage });
        }
    },

    selectSession: async (sessionId) => {
        const trimmedSessionId = sessionId.trim();
        if (!trimmedSessionId) return;

        set({
            conversationLoading: true,
            selectedSessionId: trimmedSessionId,
            activeSessionId: trimmedSessionId,
        });

        try {
            const conversation = await bannerAgentService.fetchSessionConversation(trimmedSessionId);
            const conversationMessages = toConversationMessages(
                [...(conversation.messages ?? [])].reverse(),
                trimmedSessionId
            );

            set((state) => {
                const existing = state.sessions.find((s) => s.id === trimmedSessionId);
                const fallbackSession: ChatSession = {
                    id: trimmedSessionId,
                    title: existing?.title ?? "New chat",
                    createdAt: existing?.createdAt ?? new Date(),
                    updatedAt: existing?.updatedAt ?? new Date(),
                    requestCount: existing?.requestCount ?? conversationMessages.length,
                    avgExecutionTime: existing?.avgExecutionTime ?? null,
                    agentsUsed: existing?.agentsUsed ?? null,
                };

                const nextSessions = existing
                    ? state.sessions
                    : [...state.sessions, fallbackSession];

                return {
                    sessions: sortSessionsDescending(nextSessions),
                    messages: conversationMessages,
                    conversationLoading: false,
                };
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unable to load this session.";
            const isInvalidSession = /invalid|not\s*found|404/i.test(errorMessage);

            if (isInvalidSession) {
                set({
                    selectedSessionId: null,
                    activeSessionId: null,
                    messages: [],
                    conversationLoading: false,
                });
                return;
            }

            set({
                conversationLoading: false,
                messages: [],
            });
        }
    },

    setActiveSessionId: (sessionId) => {
        const normalized = sessionId?.trim() ? sessionId.trim() : null;

        set((state) => {
            if (!normalized) {
                return { selectedSessionId: null, activeSessionId: null };
            }

            const existing = state.sessions.find((s) => s.id === normalized);
            const nextSessions = existing
                ? state.sessions
                : [
                    {
                        id: normalized,
                        title: "New chat",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        requestCount: 0,
                        avgExecutionTime: null,
                        agentsUsed: null,
                    },
                    ...state.sessions,
                ];

            return {
                sessions: sortSessionsDescending(nextSessions),
                selectedSessionId: normalized,
                activeSessionId: normalized,
            };
        });
    },

    startNewSession: () => {
        const sessionId = createClientSessionId();
        const now = new Date();

        set({
            sessions: sortSessionsDescending([
                {
                    id: sessionId,
                    title: "New chat",
                    createdAt: now,
                    updatedAt: now,
                    requestCount: 0,
                    avgExecutionTime: null,
                    agentsUsed: null,
                },
                ...get().sessions.filter((s) => s.id !== sessionId),
            ]),
            selectedSessionId: sessionId,
            activeSessionId: sessionId,
            messages: [],
            isWaitingForResponse: false,
            isRetrying: false,
        });

        return sessionId;
    },

    clearAllSessions: () => {
        set({
            sessions: [],
            selectedSessionId: null,
            activeSessionId: null,
            messages: [],
            isWaitingForResponse: false,
            isRetrying: false,
        });
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, message],
        }));
    },

    clearChat: () => {
        const sessionId = createClientSessionId();
        const now = new Date();

        set((state) => ({
            sessions: sortSessionsDescending([
                {
                    id: sessionId,
                    title: "New chat",
                    createdAt: now,
                    updatedAt: now,
                    requestCount: 0,
                    avgExecutionTime: null,
                    agentsUsed: null,
                },
                ...state.sessions,
            ]),
            selectedSessionId: sessionId,
            activeSessionId: sessionId,
            messages: [],
            isWaitingForResponse: false,
            isRetrying: false,
        }));

        return sessionId;
    },

    setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),
    setRetrying: (retrying) => set({ isRetrying: retrying }),
}));
