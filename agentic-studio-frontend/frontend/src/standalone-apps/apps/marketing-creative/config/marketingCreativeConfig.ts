import { appEnv } from "../../../../config/appEnv";
import type { StandaloneCreativeAppConfig } from "../../../shared/packages/marketingCreativeCore/types";
import logoSrc from "../../banner-agent/assets/ia-logo.webp";
import heroImageSrc from "../../banner-agent/assets/marketing-hero.png";
import loginHeaderSrc from "../../banner-agent/assets/login-header.svg";
import loginFooterSrc from "../../banner-agent/assets/login-form-footer.svg";
import createAssetButtonSrc from "../../banner-agent/assets/create-asset-btn.svg";
import logoutIconSrc from "../../banner-agent/assets/logout.svg";
import homeIcon from "../../banner-agent/assets/sidebar-icons/home.svg";
import homeSelectedIcon from "../../banner-agent/assets/sidebar-icons/home-selected.svg";
import brandIcon from "../../banner-agent/assets/sidebar-icons/brand.svg";
import brandSelectedIcon from "../../banner-agent/assets/sidebar-icons/brand-selected.svg";
import assetsIcon from "../../banner-agent/assets/sidebar-icons/assets.svg";
import assetsSelectedIcon from "../../banner-agent/assets/sidebar-icons/assets-selected.svg";
import projectsIcon from "../../banner-agent/assets/sidebar-icons/projects.svg";
import projectsSelectedIcon from "../../banner-agent/assets/sidebar-icons/projects-selected.svg";

const env = appEnv();

const baseUrl = {
    dev: "https://impact-agents.ai/",
    uat: "https://impact-agents.ai/",
    prod: "https://impact-agents.ai/",
    local: "https://impact-agents.ai/",
};

const agentId = {
    dev: "90676570-f7a8-4bc7-8e0c-ec241d03ea23",
    uat: "90676570-f7a8-4bc7-8e0c-ec241d03ea23",
    prod: "90676570-f7a8-4bc7-8e0c-ec241d03ea23",
    local: "90676570-f7a8-4bc7-8e0c-ec241d03ea23",
};

const isCreateAdEnabledInAssetEditor = {
    dev: true,
    uat: true,
    prod: true,
    local: true,
};

export const marketingCreativeConfig: StandaloneCreativeAppConfig = {
    name: "marketing-creative",
    title: "Marketing Creative",
    defaultPrompt: "Create banner Image for Nike Women's Classic Dri-FIT Short-Sleeve Top with Freedom in background",
    baseUrl: baseUrl[env],
    publicRoute: "/apps/marketing",
    agentId: agentId[env],
    isCreateAdEnabledInAssetEditor: isCreateAdEnabledInAssetEditor[env],
    apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
    apiEndpoint: "api/agent/execute",
    authStorageKey: "marketing-creative-auth-token",
    chatStorageKey: "marketing-creative-chat-messages",
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
                route: null,
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
                route: null,
                icon: projectsIcon,
                iconSelected: projectsSelectedIcon,
            },
        ],
    },
};