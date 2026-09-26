import { useEffect } from "react";
import { BannerAgentRoutes } from "../banner-agent/routes";
import "../banner-agent/styles/banner-agent.scss";
import { useAuthStore } from "../banner-agent/store/authStore";
import {
    StandaloneCreativeProvider,
    useStandaloneCreativeConfig,
} from "../../shared/packages/marketingCreativeCore/provider";
import { marketingCreativeConfig } from "./config/marketingCreativeConfig";

function MarketingCreativeAppContent() {
    const initializeAuth = useAuthStore((state) => state.initializeAuth);
    const config = useStandaloneCreativeConfig();

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    return (
        <div className={config.appClassName}>
            <BannerAgentRoutes />
        </div>
    );
}

export default function MarketingCreativeApp() {
    return (
        <StandaloneCreativeProvider config={marketingCreativeConfig}>
            <MarketingCreativeAppContent />
        </StandaloneCreativeProvider>
    );
}