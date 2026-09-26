import { create } from "zustand";
import { navigatorService } from "../services/NavigatorService";
import type { StoreConfig } from "../types/store.types";

interface StoreMapState {
  map: StoreConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchStoreMap: () => Promise<void>;
}

export const useMapStore = create<StoreMapState>((set) => ({
  map: null,
  isLoading: false,
  error: null,

  fetchStoreMap: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await navigatorService.getStoreMap();
      set({ map: response, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Something went wrong",
        isLoading: false,
      });
    }
  },
}));
