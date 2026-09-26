import { create } from "zustand";
import { persist } from "zustand/middleware";
import defaultLogoUrl from "../assets/psp-3.png";

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface BrandingBorderSettings {
    enabled: boolean;
    color: string;
    autoColor: boolean;
    weight: number;
    distance: number;
    logoEnabled: boolean;
    logoUrl: string;
    logoPosition: LogoPosition;
    logoSize: number;
    logoOffsetX: number;
    logoOffsetY: number;
}

export const DEFAULT_BRANDING_SETTINGS: BrandingBorderSettings = {
    enabled: false,
    color: "#ffffff",
    autoColor: true,
    weight: 8,
    distance: 24,
    logoEnabled: true,
    logoUrl: defaultLogoUrl,
    logoPosition: "bottom-left",
    logoSize: 74,
    logoOffsetX: 8,
    logoOffsetY: 8,
};

const isLegacyIaLogoUrl = (value: string | undefined): boolean => {
    if (!value) {
        return false;
    }
    const normalized = value.toLowerCase();
    return normalized.includes("ia-logo.webp");
};

const normalizeBrandingSettings = (
    input: Partial<BrandingBorderSettings> | undefined
): BrandingBorderSettings => {
    const merged: BrandingBorderSettings = {
        ...DEFAULT_BRANDING_SETTINGS,
        ...(input ?? {}),
    };

    if (!merged.logoUrl || isLegacyIaLogoUrl(merged.logoUrl)) {
        merged.logoUrl = defaultLogoUrl;
    }

    return merged;
};

interface BrandingStore {
    settings: BrandingBorderSettings;
    setSettings: (nextSettings: BrandingBorderSettings) => void;
    updateSettings: (updates: Partial<BrandingBorderSettings>) => void;
    setEnabled: (enabled: boolean) => void;
    resetSettings: () => void;
}

export const useBrandingStore = create<BrandingStore>()(
    persist(
        (set) => ({
            settings: DEFAULT_BRANDING_SETTINGS,
            setSettings: (nextSettings) => {
                set({ settings: normalizeBrandingSettings(nextSettings) });
            },
            updateSettings: (updates) => {
                set((state) => ({
                    settings: normalizeBrandingSettings({
                        ...state.settings,
                        ...updates,
                    }),
                }));
            },
            setEnabled: (enabled) => {
                set((state) => ({
                    settings: normalizeBrandingSettings({
                        ...state.settings,
                        enabled,
                    }),
                }));
            },
            resetSettings: () => {
                set({ settings: DEFAULT_BRANDING_SETTINGS });
            },
        }),
        {
            name: "banner-agent-branding-settings-v1",
            version: 2,
            migrate: (persistedState) => {
                const state = persistedState as { settings?: Partial<BrandingBorderSettings> } | undefined;
                return {
                    settings: normalizeBrandingSettings(state?.settings),
                };
            },
            partialize: (state) => ({ settings: normalizeBrandingSettings(state.settings) }),
        }
    )
);
