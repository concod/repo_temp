import { create } from 'zustand';
import type { KPICard, Store } from '../types/dashboard.types';

type OverlayType = 'kpi' | 'stores' | null;

interface OverlayStore {
  isOpen: boolean;
  overlayType: OverlayType;
  selectedKPI: KPICard | null;
  stores: Store[];
  storesTitle: string;
  openKPIOverlay: (kpiData: KPICard) => void;
  openStoresOverlay: (stores: Store[], title?: string) => void;
  closeOverlay: () => void;
}

export const useOverlayStore = create<OverlayStore>()((set) => ({
  isOpen: false,
  overlayType: null,
  selectedKPI: null,
  stores: [],
  storesTitle: 'All Stores',
  openKPIOverlay: (kpiData: KPICard) => set({ 
    isOpen: true, 
    overlayType: 'kpi',
    selectedKPI: kpiData 
  }),
  openStoresOverlay: (stores: Store[], title = 'All Stores') => set({ 
    isOpen: true, 
    overlayType: 'stores',
    stores,
    storesTitle: title
  }),
  closeOverlay: () => set({ 
    isOpen: false, 
    overlayType: null,
    selectedKPI: null,
    stores: [],
    storesTitle: 'All Stores'
  }),
}));

