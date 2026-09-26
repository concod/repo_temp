import { appEnv } from "../../../../config/appEnv";
import type { StandaloneCreativeAppConfig } from "../../../shared/packages/marketingCreativeCore/types";
import logoSrc from "../assets/ia-logo.webp";
import heroImageSrc from "../assets/marketing-hero.png";
import loginHeaderSrc from "../assets/login-header.svg";
import loginFooterSrc from "../assets/login-form-footer.svg";
import createAssetButtonSrc from "../assets/create-asset-btn.svg";
import logoutIconSrc from "../assets/logout.svg";
import homeIcon from "../assets/sidebar-icons/home.svg";
import homeSelectedIcon from "../assets/sidebar-icons/home-selected.svg";
import brandIcon from "../assets/sidebar-icons/brand.svg";
import brandSelectedIcon from "../assets/sidebar-icons/brand-selected.svg";
import assetsIcon from "../assets/sidebar-icons/assets.svg";
import assetsSelectedIcon from "../assets/sidebar-icons/assets-selected.svg";
import projectsIcon from "../assets/sidebar-icons/projects.svg";
import projectsSelectedIcon from "../assets/sidebar-icons/projects-selected.svg";

const env = appEnv();

const baseUrl = {
    dev: "https://agentic-studio.devs.impact-agents.ai/",
    uat: "https://agentic-studio.uat.impact-agents.ai/",
    prod: "https://impact-agents.ai/",
    local: "https://agentic-studio.devs.impact-agents.ai/",
};

const getAuthBaseUrlByEnv = () => {
    const runtimeEnv = appEnv();
    return baseUrl[runtimeEnv];
};

const agentId = {
    dev: "97da592e-659a-4efc-8b7d-d2fd05a0465b",
    uat: "5c1333f4-83de-44a6-9b92-e523d443b3e8",
    prod: "5c1333f4-83de-44a6-9b92-e523d443b3e8",
    local: "97da592e-659a-4efc-8b7d-d2fd05a0465b",
};

const isCreateAdEnabledInAssetEditor = {
    dev: true,
    uat: true,
    prod: true,
    local: true,
};

export const bannerAgentConfig: StandaloneCreativeAppConfig = {
    name: "banner-agent",
    title: "Banner Agent",
    defaultPrompt: "Generate a banner image for upc 750683053199 for a summer event",
    baseUrl: baseUrl[env],
    authBaseUrlResolver: getAuthBaseUrlByEnv,
    publicRoute: "/apps/banner-agent",
    agentId: agentId[env],
    isCreateAdEnabledInAssetEditor: isCreateAdEnabledInAssetEditor[env],
    apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
    apiEndpoint: "api/agent/execute",
    authStorageKey: "banner-agent-auth-token",
    chatStorageKey: "banner-agent-chat-messages",
    appClassName: "banner-agent-app",
    branding: {
        logoSrc,
        loginHeaderSrc,
        loginFooterSrc,
        heroImageSrc,
        createAssetButtonSrc,
        logoutIconSrc,
        sidebarNavItems: [
            {
                key: "home",
                label: "Home",
                route: "../home",
                icon: homeIcon,
                iconSelected: homeSelectedIcon,
            },
            {
                key: "brand",
                label: "Brand",
                route: "../branding",
                icon: brandIcon,
                iconSelected: brandSelectedIcon,
            },
            {
                key: "assets",
                label: "Assets",
                route: "../assets",
                icon: assetsIcon,
                iconSelected: assetsSelectedIcon,
            },
            {
                key: "projects",
                label: "Projects",
                route: "../projects",
                icon: projectsIcon,
                iconSelected: projectsSelectedIcon,
            },
        ],
    },
};
