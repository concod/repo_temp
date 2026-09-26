import { useEffect } from "react";
import { BannerAgentRoutes } from "./routes";
import "./styles/banner-agent.scss";
import { useAuthStore } from "./store/authStore";
import { bannerAgentConfig } from "./config/bannerAgentConfig";
import { useBannerChatStore } from "./store/chatStore";
import {
    StandaloneCreativeProvider,
    useStandaloneCreativeConfig,
} from "../../shared/packages/marketingCreativeCore/provider";

const BANNER_AGENT_UNAUTHORIZED_EVENT = "banner-agent:unauthorized";

function BannerAgentAppContent() {
    const initializeAuth = useAuthStore((state) => state.initializeAuth);
    const logout = useAuthStore((state) => state.logout);
    const config = useStandaloneCreativeConfig();

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    // Handle unauthorized event (401 from APIs) → logout and clear sessions
    useEffect(() => {
        const handleUnauthorized = () => {
            useBannerChatStore.getState().clearAllSessions();
            logout();
        };

        window.addEventListener(BANNER_AGENT_UNAUTHORIZED_EVENT, handleUnauthorized);

        return () => {
            window.removeEventListener(BANNER_AGENT_UNAUTHORIZED_EVENT, handleUnauthorized);
        };
    }, [logout]);

    return (
        <div className={config.appClassName}>
            <BannerAgentRoutes />
        </div>
    );
}

export default function BannerAgentApp() {
    return (
        <StandaloneCreativeProvider config={bannerAgentConfig}>
            <BannerAgentAppContent />
        </StandaloneCreativeProvider>
    );
}
