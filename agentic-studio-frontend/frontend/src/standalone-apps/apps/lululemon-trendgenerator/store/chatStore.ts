import { create } from 'zustand';
import type { Message, ChatState } from '../types/chat.types';

interface ChatStore extends ChatState {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (typing: boolean) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  updateLastMessage: (updates: Partial<Message>) => void;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [],
  isTyping: false,
  isWaitingForResponse: false,
  currentError: null,

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
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
    currentError: null 
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

 