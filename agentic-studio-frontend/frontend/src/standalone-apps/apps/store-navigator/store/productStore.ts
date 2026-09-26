import { create } from "zustand";
import type { Product } from "../components/ProductCard/ProductCard";
import { navigatorService } from "../services/NavigatorService";

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await navigatorService.getProducts();
      set({ products: response, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Something went wrong",
        isLoading: false,
      });
    }
  },
}));
