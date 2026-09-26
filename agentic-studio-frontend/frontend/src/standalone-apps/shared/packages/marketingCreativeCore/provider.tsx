import { createContext, useContext, useRef, type PropsWithChildren } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import {
    createStandaloneCreativeAuthService,
    createStandaloneCreativeAuthStore,
    type AuthStore,
} from "./auth";
import type { StandaloneCreativeAppConfig } from "./types";

const StandaloneCreativeConfigContext = createContext<StandaloneCreativeAppConfig | null>(null);
const StandaloneCreativeAuthStoreContext = createContext<StoreApi<AuthStore> | null>(null);

type StandaloneCreativeProviderProps = PropsWithChildren<{
    config: StandaloneCreativeAppConfig;
}>;

export function StandaloneCreativeProvider({
    config,
    children,
}: StandaloneCreativeProviderProps) {
    const authStoreRef = useRef<StoreApi<AuthStore> | null>(null);

    if (!authStoreRef.current) {
        authStoreRef.current = createStandaloneCreativeAuthStore({
            storageKey: config.authStorageKey,
            authService: createStandaloneCreativeAuthService(
                config.authBaseUrlResolver ?? config.baseUrl,
                config.title
            ),
        });
    }

    return (
        <StandaloneCreativeConfigContext.Provider value={config}>
            <StandaloneCreativeAuthStoreContext.Provider value={authStoreRef.current}>
                {children}
            </StandaloneCreativeAuthStoreContext.Provider>
        </StandaloneCreativeConfigContext.Provider>
    );
}

export function useStandaloneCreativeConfig() {
    const config = useContext(StandaloneCreativeConfigContext);

    if (!config) {
        throw new Error("useStandaloneCreativeConfig must be used within StandaloneCreativeProvider");
    }

    return config;
}

export function useStandaloneCreativeAuthStore(): AuthStore;
export function useStandaloneCreativeAuthStore<T>(selector: (state: AuthStore) => T): T;
export function useStandaloneCreativeAuthStore<T>(selector?: (state: AuthStore) => T) {
    const store = useContext(StandaloneCreativeAuthStoreContext);

    if (!store) {
        throw new Error("useStandaloneCreativeAuthStore must be used within StandaloneCreativeProvider");
    }

    return useStore(store, selector ?? ((state) => state as T));
}