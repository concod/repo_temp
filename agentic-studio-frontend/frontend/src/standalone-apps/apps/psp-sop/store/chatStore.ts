import { create } from 'zustand';
import { PspSopService } from '../services/PspSopService';
import type {
  ChatSession,
  ChatState,
  ConversationMessageApi,
  Message,
  UserSessionListItemApi,
} from '../types/chat.types';

interface ChatStore extends ChatState {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  activeSessionId: string | null;
  sessionsError: string | null;
  conversationError: string | null;
  fetchSessions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  setActiveSessionId: (sessionId: string | null) => void;
  startNewSession: () => string;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (typing: boolean) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  updateLastMessage: (updates: Partial<Message>) => void;
}

const pspSopService = new PspSopService();

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

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
    avgExecutionTime: isFiniteNumber(session.avg_execution_time) ? session.avg_execution_time : null,
    agentsUsed: typeof session.agents_used === 'string' && session.agents_used.trim() ? session.agents_used : null,
  };
};

const toConversationMessages = (
  messages: ConversationMessageApi[] | null | undefined,
  sessionId: string
): Message[] => {
  if (!Array.isArray(messages)) return [];

  const flattened: Message[] = [];

  messages.forEach((entry, index) => {
    const baseTimestamp = parseIsoDate(entry.timestamp) ?? new Date();
    const userInput = typeof entry.user_input === 'string' ? entry.user_input.trim() : '';
    const messageId = typeof entry.id === 'number' || typeof entry.id === 'string'
      ? String(entry.id)
      : `row-${index}`;

    if (userInput) {
      flattened.push({
        id: `conv-${messageId}-user`,
        text: userInput,
        isUser: true,
        timestamp: baseTimestamp,
        sessionId,
      });
    }

    const rawText = entry.ai_message?.content?.text;
    const blocksText = Array.isArray(entry.ai_message?.message_blocks)
      ? entry.ai_message!.message_blocks!
        .filter((block) => block?.type === 'text' && typeof block.content === 'string')
        .map((block) => String(block.content).trim())
        .filter(Boolean)
        .join('\n\n')
      : '';
    const text = (typeof rawText === 'string' && rawText.trim() ? rawText : '') || blocksText;

    if (text) {
      const botTimestamp = new Date(
        (baseTimestamp instanceof Date ? baseTimestamp : new Date(baseTimestamp)).getTime() + 1
      );
      const suggestions = Array.isArray(entry.ai_message?.content?.suggestive_questions)
        ? (entry.ai_message!.content!.suggestive_questions as string[]).filter(
          (s) => typeof s === 'string' && s.trim()
        )
        : [];

      flattened.push({
        id: `conv-${messageId}-assistant`,
        text,
        isUser: false,
        timestamp: botTimestamp,
        sessionId,
        suggestions: suggestions.length ? suggestions : undefined,
      });
    }
  });

  return flattened.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

const createClientSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
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
  sessions: [],
  selectedSessionId: null,
  activeSessionId: null,
  sessionsError: null,
  conversationError: null,

  fetchSessions: async () => {
    set({ loading: true, sessionsError: null });

    try {
      const response = await pspSopService.fetchUserSessions();
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
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to load previous chats.';
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
      const conversation = await pspSopService.fetchSessionConversation(trimmedSessionId);
      const conversationMessages = toConversationMessages(conversation.messages, trimmedSessionId);

      set((state) => {
        const existing = state.sessions.find((session) => session.id === trimmedSessionId);
        const nextSessions = existing
          ? state.sessions.map((session) =>
            session.id === trimmedSessionId
              ? { ...session, updatedAt: new Date() }
              : session
          )
          : [...state.sessions];

        return {
          sessions: sortSessionsDescending(nextSessions),
          messages: conversationMessages,
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to load this session.';
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
        return { selectedSessionId: null, activeSessionId: null };
      }

      const existing = state.sessions.find((session) => session.id === normalized);
      const nextSessions = existing
        ? state.sessions
        : [
          {
            id: normalized,
            title: 'New chat',
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
          title: 'New chat',
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
    });

    return sessionId;
  },

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: get().selectedSessionId ?? undefined,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  setTyping: (typing) => set({ isTyping: typing }),

  setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),

  setError: (error) => set({ currentError: error }),

  clearMessages: () => set({
    messages: [],
    isTyping: false,
    isWaitingForResponse: false,
    currentError: null,
  }),

  updateLastMessage: (updates) => {
    const { messages } = get();
    if (messages.length === 0) return;

    const updatedMessages = [...messages];
    const lastIndex = updatedMessages.length - 1;
    updatedMessages[lastIndex] = {
      ...updatedMessages[lastIndex],
      ...updates,
    };

    set({ messages: updatedMessages });
  },
}));