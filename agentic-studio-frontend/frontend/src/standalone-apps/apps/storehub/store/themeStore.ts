import { create } from 'zustand';
import type { ThemeState } from '../types/chat.types';

interface ThemeStore extends ThemeState {
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: 'light',

  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));
