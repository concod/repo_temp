import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activePage: 'dashboard',
      
      setActivePage: (page: string) =>
        set({ activePage: page }),
    }),
    {
      name: 'psp-storehub-navigation',
      partialize: (state) => ({ 
        activePage: state.activePage 
      }),
    }
  )
);
