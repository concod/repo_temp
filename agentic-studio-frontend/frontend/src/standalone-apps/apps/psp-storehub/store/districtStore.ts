import { create } from "zustand";
import { pspStoreHubService } from "../services/PspStoreHubService";
import type { StoreData } from "../types/dashboard.types";

interface DistrictState {
  stores: StoreData[];
  loading: boolean;
  error: string | null;
  fetchStores: (districtId: string) => Promise<void>;
}

export const useDistrictStore = create<DistrictState>((set) => ({
  stores: [],
  loading: false,
  error: null,

  fetchStores: async (districtId: string) => {
    set({ loading: true, error: null });
    try {
      const stores = await pspStoreHubService.getAllStores(districtId);
      set({ stores, loading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stores";
      set({ error: errorMessage, loading: false });
    }
  },
}));