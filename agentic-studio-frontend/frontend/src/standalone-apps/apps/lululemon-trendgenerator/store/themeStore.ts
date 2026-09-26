import { create } from 'zustand';
import type { ThemeState } from '../types/chat.types';

interface ThemeStore extends ThemeState {
  toggleTheme: () => void;
  setLanguage: (language: 'english' | 'spanish') => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: 'light',
  language: 'english',

  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),

  setLanguage: (language) => set({ language }),
}));

 