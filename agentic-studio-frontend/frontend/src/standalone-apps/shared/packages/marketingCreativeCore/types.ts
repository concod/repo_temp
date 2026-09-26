export type StandaloneCreativeSidebarNavItem = {
    key: string;
    label: string;
    route: string | null;
    icon: string;
    iconSelected: string;
};

export type StandaloneCreativeBrandingConfig = {
    logoSrc: string;
    loginHeaderSrc: string;
    loginFooterSrc: string;
    heroImageSrc: string;
    createAssetButtonSrc: string;
    logoutIconSrc: string;
    sidebarNavItems: StandaloneCreativeSidebarNavItem[];
};

export type StandaloneCreativeAppConfig = {
    name: string;
    title: string;
    defaultPrompt: string;
    publicRoute: string;
    baseUrl: string;
    authBaseUrlResolver?: () => string;
    agentId: string;
    isCreateAdEnabledInAssetEditor: boolean;
    apiKey: string;
    apiEndpoint: string;
    authStorageKey: string;
    chatStorageKey: string;
    appClassName: string;
    branding: StandaloneCreativeBrandingConfig;
};