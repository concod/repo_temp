import { create } from "zustand";
import { IBAgentService } from "../services/ibAgentService";
import type {
    ChatSession,
    ChatState,
    ConversationMessageApi,
    Message,
    QueryClassificationResult,
    UserSessionListItemApi,
} from "../types/chat.types";

interface ChatStore extends ChatState {
    sessions: ChatSession[];
    selectedSessionId: string | null;
    activeSessionId: string | null;
    sessionsError: string | null;
    conversationError: string | null;
    manualDeepResearch: boolean;
    startNewSession: () => string;
    fetchSessions: () => Promise<void>;
    selectSession: (sessionId: string) => Promise<void>;
    setActiveSessionId: (sessionId: string | null) => void;
    addMessage: (
        message: Omit<Message, "id" | "timestamp" | "clientTimestamp"> & {
            id?: string;
            timestamp?: Date;
            clientTimestamp?: Date;
        }
    ) => void;
    setTyping: (typing: boolean) => void;
    setWaitingForResponse: (waiting: boolean) => void;
    setError: (error: string | null) => void;
    setClassificationResult: (result: QueryClassificationResult | null) => void;
    setManualDeepResearch: (enabled: boolean) => void;
    clearSession: (sessionId?: string) => void;
    clearAllSessions: () => void;
    renameSession: (sessionId: string, title: string) => void;
    updateLastMessage: (updates: Partial<Message>) => void;
    updateSessionTitleFromClassification: (classificationTitle?: string) => void;
}

const ibAgentService = new IBAgentService();

const GREETING_TITLE_PATTERNS = [
    /^general\s+greeting$/i,
    /^greeting$/i,
    /^hello$/i,
    /^hi$/i,
];

const isMeaningfulClassificationTitle = (title?: string): title is string => {
    if (!title?.trim()) return false;
    return !GREETING_TITLE_PATTERNS.some((pattern) => pattern.test(title.trim()));
};

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const parseIsoDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const readSuggestiveQuestions = (...candidates: unknown[]): string[] => {
    for (const candidate of candidates) {
        if (!Array.isArray(candidate)) continue;

        const normalized = candidate
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);

        if (normalized.length > 0) {
            return Array.from(new Set(normalized));
        }
    }

    return [];
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
    messageBlocks: ConversationMessageApi["ai_message"] extends { message_blocks?: infer T }
        ? T
        : unknown
): string => {
    if (!Array.isArray(messageBlocks)) return "";

    return messageBlocks
        .filter((block) => block?.type === "text" && typeof block.content === "string")
        .map((block) => String(block.content).trim())
        .filter(Boolean)
        .join("\n\n");
};

const toConversationMessages = (
    messages: ConversationMessageApi[] | null | undefined,
    sessionId: string
): Message[] => {
    if (!Array.isArray(messages)) return [];

    const hasAiContent = (entry: ConversationMessageApi): boolean => {
        const html = entry.ai_message?.content?.html;
        const text = entry.ai_message?.content?.text;
        const blocksText = messageTextFromBlocks(entry.ai_message?.message_blocks);

        return Boolean(
            (typeof html === "string" && html.trim()) ||
            (typeof text === "string" && text.trim()) ||
            blocksText
        );
    };

    const normalizedMessages = messages.filter((entry) => {
        const userInput =
            typeof entry.user_input === "string" ? entry.user_input.trim() : "";
        if (!userInput) return true;
        if (hasAiContent(entry)) return true;

        const hasMatchingSuccess = messages.some((candidate) => {
            if (candidate === entry) return false;
            const candidateInput =
                typeof candidate.user_input === "string"
                    ? candidate.user_input.trim()
                    : "";
            return candidateInput === userInput && hasAiContent(candidate);
        });

        return !hasMatchingSuccess;
    });

    const flattened: Message[] = [];

    normalizedMessages.forEach((entry, index) => {
        const baseTimestamp = parseIsoDate(entry.timestamp) ?? new Date();
        const userInput = typeof entry.user_input === "string" ? entry.user_input.trim() : "";
        const messageId =
            typeof entry.id === "number" || typeof entry.id === "string"
                ? String(entry.id)
                : `row-${index}`;

        if (userInput) {
            flattened.push({
                id: `conv-${messageId}-user`,
                text: userInput,
                isUser: true,
                timestamp: baseTimestamp,
                clientTimestamp: baseTimestamp,
                sessionId,
            });
        }

        const rawHtml = entry.ai_message?.content?.html;
        const htmlContent = typeof rawHtml === "string" && rawHtml.trim() ? rawHtml : undefined;
        const rawText = entry.ai_message?.content?.text;
        const fallbackText = messageTextFromBlocks(entry.ai_message?.message_blocks);
        const text =
            (typeof rawText === "string" && rawText.trim() ? rawText : "") || fallbackText;

        if (htmlContent || text) {
            const botTimestamp = new Date(baseTimestamp.getTime() + 1);
            const suggestions = readSuggestiveQuestions(
                entry.ai_message?.content?.suggestive_questions,
                entry.ai_message?.content?.suggestiveQuestions,
                entry.ai_message?.suggestive_questions,
                entry.ai_message?.suggestiveQuestions
            );

            flattened.push({
                id: `conv-${messageId}-assistant`,
                text,
                htmlContent,
                isUser: false,
                timestamp: botTimestamp,
                clientTimestamp: botTimestamp,
                sessionId,
                logUrl: typeof entry.log_url === "string" ? entry.log_url : undefined,
                agentName: typeof entry.agent_name === "string" ? entry.agent_name : undefined,
                executionTime: isFiniteNumber(entry.execution_time) ? entry.execution_time : null,
                executionId:
                    typeof entry.execution_id === "string" ? entry.execution_id : undefined,
                suggestions: suggestions.length ? suggestions : undefined,
            });
        }
    });

    return flattened.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
};

const createMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createClientSessionId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const sortSessionsDescending = (sessions: ChatSession[]) =>
    [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

export const useChatStore = create<ChatStore>()((set, get) => ({
    messages: [],
    isTyping: false,
    isWaitingForResponse: false,
    currentError: null,
    loading: false,
    classificationResult: null,
    manualDeepResearch: false,
    sessions: [],
    selectedSessionId: null,
    activeSessionId: null,
    sessionsError: null,
    conversationError: null,

    fetchSessions: async () => {
        set({ loading: true, sessionsError: null });

        try {
            const response = await ibAgentService.fetchUserSessions();
            const mappedSessions = (response.sessions ?? [])
                .map((session, index) => mapSession(session, index))
                .filter((session, index, arr) =>
                    arr.findIndex((entry) => entry.id === session.id) === index
                );

            set((state) => {
                const sorted = sortSessionsDescending(mappedSessions);
                const selectedSessionId = state.selectedSessionId;

                return {
                    sessions: sorted,
                    selectedSessionId,
                    activeSessionId: selectedSessionId,
                    loading: false,
                };
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unable to load previous chats.";
            set({ loading: false, sessionsError: errorMessage });
        }
    },

    selectSession: async (sessionId) => {
        const trimmedSessionId = sessionId.trim();
        if (!trimmedSessionId) return;

        set({
            loading: true,
            conversationError: null,
            currentError: null,
            selectedSessionId: trimmedSessionId,
            activeSessionId: trimmedSessionId,
        });

        try {
            const conversation = await ibAgentService.fetchSessionConversation(trimmedSessionId);
            const conversationMessages = toConversationMessages(
                conversation.messages,
                trimmedSessionId
            );

            set((state) => {
                const existing = state.sessions.find((session) => session.id === trimmedSessionId);
                const fallbackSession: ChatSession = {
                    id: trimmedSessionId,
                    title: existing?.title ?? "New chat",
                    createdAt: existing?.createdAt ?? new Date(),
                    updatedAt:
                        conversationMessages[conversationMessages.length - 1]?.timestamp ??
                        existing?.updatedAt ??
                        new Date(),
                    requestCount:
                        existing?.requestCount ??
                        (typeof conversation.total_messages === "number"
                            ? conversation.total_messages
                            : conversationMessages.length),
                    avgExecutionTime: existing?.avgExecutionTime ?? null,
                    agentsUsed: existing?.agentsUsed ?? null,
                };

                const nextSessions = existing
                    ? state.sessions.map((session) =>
                        session.id === trimmedSessionId
                            ? { ...session, updatedAt: fallbackSession.updatedAt }
                            : session
                    )
                    : [...state.sessions, fallbackSession];

                return {
                    sessions: sortSessionsDescending(nextSessions),
                    messages: conversationMessages,
                    loading: false,
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
                    loading: false,
                    conversationError: null,
                });
                return;
            }

            set({
                loading: false,
                conversationError: errorMessage,
                currentError: errorMessage,
                messages: [],
            });
        }
    },

    setActiveSessionId: (sessionId) => {
        const normalized = sessionId?.trim() ? sessionId.trim() : null;

        set((state) => {
            if (!normalized) {
                return {
                    selectedSessionId: null,
                    activeSessionId: null,
                };
            }

            const existing = state.sessions.find((session) => session.id === normalized);
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
                ...get().sessions.filter((session) => session.id !== sessionId),
            ]),
            selectedSessionId: sessionId,
            activeSessionId: sessionId,
            messages: [],
            isTyping: false,
            isWaitingForResponse: false,
            currentError: null,
            conversationError: null,
            classificationResult: null,
            manualDeepResearch: false,
        });

        return sessionId;
    },

    addMessage: (message) => {
        const now = new Date();
        const newMessage: Message = {
            ...message,
            id: message.id ?? createMessageId(),
            timestamp: message.timestamp ?? now,
            clientTimestamp: message.clientTimestamp ?? now,
            sessionId: message.sessionId ?? get().selectedSessionId ?? undefined,
        };

        set((state) => ({
            messages: [...state.messages, newMessage],
            sessions: state.selectedSessionId
                ? state.sessions.map((session) =>
                    session.id === state.selectedSessionId
                        ? {
                            ...session,
                            updatedAt: newMessage.clientTimestamp,
                            requestCount: Math.max(session.requestCount, state.messages.length + 1),
                        }
                        : session
                )
                : state.sessions,
        }));
    },

    setTyping: (typing) => set({ isTyping: typing }),

    setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),

    setError: (error) => set({ currentError: error }),

    setClassificationResult: (result) => set({ classificationResult: result }),

    setManualDeepResearch: (enabled) => set({ manualDeepResearch: enabled }),

    renameSession: (sessionId, title) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        set((state) => ({
            sessions: state.sessions.map((session) =>
                session.id === sessionId
                    ? { ...session, title: trimmedTitle, updatedAt: new Date() }
                    : session
            ),
        }));
    },

    clearSession: (sessionId) => {
        const targetId = sessionId ?? get().selectedSessionId;
        if (!targetId) return;

        set((state) => {
            const sessions = state.sessions.filter((session) => session.id !== targetId);
            const isActive = state.selectedSessionId === targetId;

            return {
                sessions,
                selectedSessionId: isActive ? null : state.selectedSessionId,
                activeSessionId: isActive ? null : state.activeSessionId,
                messages: isActive ? [] : state.messages,
            };
        });
    },

    clearAllSessions: () => {
        set({
            sessions: [],
            selectedSessionId: null,
            activeSessionId: null,
            messages: [],
            isTyping: false,
            isWaitingForResponse: false,
            currentError: null,
            conversationError: null,
            classificationResult: null,
            manualDeepResearch: false,
        });
    },

    updateSessionTitleFromClassification: (classificationTitle) => {
        const { selectedSessionId } = get();
        if (!selectedSessionId) return;
        if (!isMeaningfulClassificationTitle(classificationTitle)) return;

        set((state) => ({
            sessions: state.sessions.map((session) => {
                if (session.id !== selectedSessionId) return session;
                if (session.title !== "New chat") return session;

                return {
                    ...session,
                    title: classificationTitle.trim(),
                    updatedAt: new Date(),
                };
            }),
        }));
    },

    updateLastMessage: (updates) => {
        const { messages } = get();
        if (messages.length === 0) return;

        const lastIndex = messages.length - 1;
        const updatedMessage = {
            ...messages[lastIndex],
            ...updates,
        };

        set((state) => ({
            messages: [...state.messages.slice(0, lastIndex), updatedMessage],
        }));
    },
}));