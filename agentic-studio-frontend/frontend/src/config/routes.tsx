import { lazy, type ComponentType } from "react";
import { type ReactNode } from "react";
import {
  HomeIcon,
  RobotIcon,
  ToolsIcon,
  CodeIcon,
  DiagramIcon,
  PlugIcon,
  BookIcon,
  KeyIcon,
  BarGraphIcon,
  PieGraphIcon,
  UserIcon,
  GearIcon,
} from "../components/Navigation/navigationData";

// Lazy load components for better performance
const HomePage = lazy(() => import("../pages/HomePage/HomePage"));
const LoginPage = lazy(() => import("../pages/LoginPage/LoginPage"));
const AgentsPage = lazy(() => import("../pages/AgentsPage/AgentsPage"));
const CreateAgentPage = lazy(() => import("../pages/CreateAgent/CreateAgent"));
const CreateToolPage = lazy(() => import("../pages/CreateTool/CreateTool"));
const ManageToolPage = lazy(() => import("../pages/ManageTool/ManageTool"));
const ManageAgentPage = lazy(() => import("../pages/ManageAgent/ManageAgent"));
const ToolsPage = lazy(() => import("../pages/ToolsPage/ToolsPage"));
const SupportedModelsPage = lazy(() => import("../pages/SupportedModelsPage"));
const MultiAgentsPage = lazy(() => import("../pages/MultiAgentsPage"));
const CreateMultiAgentPage = lazy(() => import("../pages/CreateMultiAgent"));
const ManageMultiAgentPage = lazy(() => import("../pages/ManageMultiAgent"));
const ApiKeysPage = lazy(() => import("../pages/ApiKeys"));
const AgentWorkflowsPage = lazy(() => import("../pages/AgentWorkflowsPage"));
const DataConnectorPage = lazy(() => import("../pages/DataConnector"));
const KnowledgebasePage = lazy(() => import("../pages/KnowledgebasePage"));
const CreateKnowledgeBasePage = lazy(
  () => import("../pages/CreateKnowledgeBase")
);
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const ReportsPage = lazy(() => import("../pages/ReportsPage"));
const APIMonitoringPage = lazy(() => import("../pages/APIMonitoringPage"));
const AssetsPage = lazy(
  () => import("../standalone-apps/apps/banner-agent/pages/Assets/AssetsPage.jsx")
);

// Standalone Apps
const PspSopApp = lazy(() => import("../standalone-apps/apps/psp-sop/App"));
const GenericSopApp = lazy(() => import("../standalone-apps/apps/sop/App"));
const StoreHubApp = lazy(() => import("../standalone-apps/apps/storehub/App"));
const LabelComplianceCheckerApp = lazy(
  () => import("../standalone-apps/apps/label-compliance-checker/App")
);
const StoreNavigatorApp = lazy(
  () => import("../standalone-apps/apps/store-navigator/App")
);
const AgentLauncherApp = lazy(
  () => import("../standalone-apps/apps/agent-launcher/App")
);
const IBAgentApp = lazy(
  () => import("../standalone-apps/apps/ib-bi-agent/App")
);
const BannerAgentApp = lazy(
  () => import("../standalone-apps/apps/banner-agent/App")
);
const MarketingCreativeApp = lazy(
  () => import("../standalone-apps/apps/marketing-creative/App")
);

// Banner Agent has been moved to a dedicated domain. Redirect all envs
// (local, dev, uat, prod) to the new domain, while still rendering the app
// when already on the target domain to avoid an infinite redirect loop.
const BANNER_AGENT_REDIRECT_URL =
  "https://psp-creativeagent.impact-agents.ai/apps/banner-agent/";
const BANNER_AGENT_TARGET_HOST = "psp-creativeagent.impact-agents.ai";

const BannerAgentRedirect = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== BANNER_AGENT_TARGET_HOST
  ) {
    window.location.replace(BANNER_AGENT_REDIRECT_URL);
    return null;
  }
  return <BannerAgentApp />;
};

// Placeholder components for routes that don't exist yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <div style={{ padding: "2rem", textAlign: "center" }}>
    <h1>{title}</h1>
    <p>This page is under development.</p>
  </div>
);

// Route configuration interface
export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  title: string;
  icon?: ReactNode;
  showInNavigation?: boolean;
  navigationSection?: "main" | "support";
  breadcrumbLabel?: string;
  isExact?: boolean;
  useLayout?: boolean; // Whether to wrap in AppLayout
  requiresAuth?: boolean; // Whether route requires authentication (defaults to true for security)
  layoutProps?: {
    showBreadcrumb?: boolean;
    breadcrumbProps?: {
      showHome?: boolean;
      className?: string;
    };
    className?: string;
    contentClassName?: string;
  };
  children?: RouteConfig[];
}

/**
 * Validates and normalizes a route configuration
 * Ensures security defaults are properly applied
 */
const normalizeRouteConfig = (route: RouteConfig): RouteConfig => {
  return {
    ...route,
    // Default to requiring authentication unless explicitly set to false
    requiresAuth: route.requiresAuth !== false,
    // Normalize children recursively
    children: route.children?.map(normalizeRouteConfig),
  };
};

/**
 * Validates that public routes are intentionally configured
 */
const validatePublicRoutes = (flatRoutes: RouteConfig[]): void => {
  const allowedPublicPaths = ["/login"]; // Only login should be public

  const publicRoutes = flatRoutes.filter(
    (route) => route.requiresAuth === false
  );

  publicRoutes.forEach((route) => {
    if (!allowedPublicPaths.includes(route.path)) {
      console.warn(
        `[Security] Route "${route.path}" is configured as public. Ensure this is intentional.`
      );
    }
  });
};

// Centralized route configuration
export const routeConfig: RouteConfig[] = [
  {
    path: "/login",
    component: LoginPage,
    title: "Login",
    showInNavigation: false,
    breadcrumbLabel: "Login",
    useLayout: false, // Login page doesn't use the common layout
    requiresAuth: false, // Login page doesn't require authentication
  },
  {
    path: "/home",
    component: HomePage,
    title: "Home",
    icon: <HomeIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Home",
    isExact: true,
    useLayout: true,
    layoutProps: {
      showBreadcrumb: false, // Home page doesn't show breadcrumb
    },
  },
  {
    path: "/agents",
    component: AgentsPage,
    title: "Agents factory",
    icon: <RobotIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Agents",
    useLayout: true,
    children: [
      {
        path: "/agents/create",
        component: CreateAgentPage,
        title: "Create Agent",
        showInNavigation: false,
        breadcrumbLabel: "Create new agent",
        useLayout: true,
      },
      {
        path: "/agents/manage/:id",
        component: () => <ManageAgentPage />,
        title: "Agent Details",
        showInNavigation: false,
        breadcrumbLabel: "Manage Agent",
        useLayout: true,
      },
      {
        path: "/agents/:id/edit",
        component: () => <PlaceholderPage title="Edit Agent" />,
        title: "Edit Agent",
        showInNavigation: false,
        breadcrumbLabel: "Edit Agent",
        useLayout: true,
      },
    ],
  },
  {
    path: "/tools",
    component: () => <ToolsPage />,
    title: "Tools factory",
    icon: <ToolsIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Tools",
    useLayout: true,
    children: [
      {
        path: "/tools/create",
        component: CreateToolPage,
        title: "Create Tool",
        showInNavigation: false,
        breadcrumbLabel: "Create new tool",
        useLayout: true,
      },
      {
        path: "/tools/manage/:id",
        component: ManageToolPage,
        title: "Manage Tool",
        showInNavigation: false,
        breadcrumbLabel: "Manage tool",
        useLayout: true,
      },
    ],
  },
  {
    path: "/models",
    component: SupportedModelsPage,
    title: "Models",
    icon: <CodeIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Supported models",
    useLayout: true,
  },
  {
    path: "/multi-agents",
    component: MultiAgentsPage,
    title: "Multi-agent orchestration",
    icon: <DiagramIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Multi-agent orchestration",
    useLayout: true,
    children: [
      {
        path: "/multi-agents/create",
        component: CreateMultiAgentPage,
        title: "Create Multi-Agent",
        showInNavigation: false,
        breadcrumbLabel: "Create new multi-agent",
        useLayout: true,
      },
      {
        path: "/multi-agents/edit/:id",
        component: CreateMultiAgentPage,
        title: "Edit Multi-Agent",
        showInNavigation: false,
        breadcrumbLabel: "Edit multi-agent",
        useLayout: true,
      },
      {
        path: "/multi-agents/manage/:id",
        component: ManageMultiAgentPage,
        title: "Manage Multi-Agent",
        showInNavigation: false,
        breadcrumbLabel: "Manage multi-agent",
        useLayout: true,
      },
    ],
  },
  {
    path: "/data-connectors",
    component: DataConnectorPage,
    title: "Data connectors",
    icon: <PlugIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Data connectors",
    useLayout: true,
  },
  {
    path: "/knowledge-base",
    component: KnowledgebasePage,
    title: "Knowledge base",
    icon: <BookIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Knowledge base",
    useLayout: true,
  },
  {
    path: "/knowledge-base/create",
    component: CreateKnowledgeBasePage,
    title: "Create Knowledge Base",
    showInNavigation: false,
    breadcrumbLabel: "Create Knowledge Base",
    useLayout: true,
  },
  {
    path: "/knowledge-base/edit/:id",
    component: CreateKnowledgeBasePage,
    title: "Edit Knowledge Base",
    showInNavigation: false,
    breadcrumbLabel: "Edit Knowledge Base",
    useLayout: true,
  },
  {
    path: "/workflows",
    component: AgentWorkflowsPage,
    title: "Agent workflows",
    icon: <DiagramIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Agent workflows",
    useLayout: true,
  },
  {
    path: "/api-keys",
    component: ApiKeysPage,
    title: "API Keys",
    icon: <KeyIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "API Keys",
    useLayout: true,
  },
  {
    path: "/dashboard",
    component: APIMonitoringPage,
    title: "API Monitoring",
    icon: <BarGraphIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "dashboard",
    useLayout: true,
  },
  {
    path: "/assets",
    component: AssetsPage,
    title: "Assets",
    showInNavigation: false,
    breadcrumbLabel: "Assets",
    useLayout: false,
  },
  {
    path: "/reports",
    component: ReportsPage,
    title: "Reports",
    icon: <PieGraphIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Reports",
    useLayout: true,
  },
  {
    path: "/users",
    component: UsersPage,
    title: "Users",
    icon: <UserIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Users",
    useLayout: true,
  },
  {
    path: "/profile",
    component: ProfilePage,
    title: "Profile",
    icon: <UserIcon />,
    showInNavigation: false,
    breadcrumbLabel: "Profile",
    useLayout: true,
  },
  {
    path: "/settings",
    component: SettingsPage,
    title: "Settings",
    icon: <GearIcon />,
    showInNavigation: true,
    navigationSection: "main",
    breadcrumbLabel: "Settings",
    useLayout: true,
  },

  // ==================== Standalone Apps ====================
  {
    path: "/apps/psp-sop/*",
    component: PspSopApp,
    title: "AI Powered SOP Navigator",
    showInNavigation: false,
    useLayout: false, // Standalone apps manage their own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "SOP Navigator",
  },
  {
    path: "/apps/sop/*",
    component: GenericSopApp,
    title: "AI Powered SOP Navigator",
    showInNavigation: false,
    useLayout: false, // Standalone apps manage their own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "SOP Navigator",
  },
  {
    path: "/apps/store-data-analyst/*",
    component: StoreHubApp,
    title: "AI Powered StoreHub Navigator",
    showInNavigation: false,
    useLayout: false, // Standalone apps manage their own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "StoreHub Navigator",
  },
  {
    path: "/apps/label-compliance-agent/*",
    component: LabelComplianceCheckerApp,
    title: "Label Compliance Checker Application",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "Label Compliance Checker",
  },
  {
    path: "/apps/navigator/*",
    component: StoreNavigatorApp,
    title: "Store Navigator Application",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "Store Navigator",
  },
  {
    path: "/apps/agent-studio/*",
    component: AgentLauncherApp,
    title: "Agent Launcher",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "Agent Launcher",
  },
  {
    path: "/apps/ib-bi-agent/*",
    component: IBAgentApp,
    title: "IB Agent",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access - app handles internal auth routing
    breadcrumbLabel: "IB Agent",
  },
  {
    path: "/ib-bi-agent/*",
    component: IBAgentApp,
    title: "IB Agent",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access - app handles internal auth routing
    breadcrumbLabel: "IB Agent",
  },
  {
    path: "/apps/banner-agent/*",
    component: BannerAgentRedirect,
    title: "Banner Agent",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "Banner Agent",
  },
  {
    path: "/banner-agent/*",
    component: BannerAgentRedirect,
    title: "Banner Agent",
    showInNavigation: false,
    useLayout: false, // Standalone app manages its own layout
    requiresAuth: false, // Public access
    breadcrumbLabel: "Banner Agent",
  },
  {
    path: "/apps/marketing/*",
    component: MarketingCreativeApp,
    title: "Marketing Creative",
    showInNavigation: false,
    useLayout: false,
    requiresAuth: false,
    breadcrumbLabel: "Marketing Creative",
  },

  // ==================== Support Routes ====================
  {
    path: "/feedback",
    component: () => <PlaceholderPage title="Feedback" />,
    title: "Feedbacks",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.76319 3.22615C8.75946 1.95532 7.27578 1.5332 5.76749 1.5332L3.65084 5.38555L1.53418 6.61289V11.6932L7.79291 12.7852C7.98976 12.8105 8.17359 12.8221 8.34551 12.8221C10.1348 12.8221 10.6305 11.5531 10.8281 11.0472C11.2128 10.0599 11.5325 8.27659 11.6516 7.59583L11.6528 7.59194C11.7804 6.83097 11.6108 6.13807 11.1756 5.64055C10.9042 5.33043 10.5409 5.10778 10.1202 4.99765C9.9244 4.94637 9.71616 4.91946 9.49899 4.91946H8.39322C8.39322 4.91946 8.56542 4.23803 8.69504 3.73304C8.74183 3.55076 8.76366 3.38205 8.76319 3.22615ZM9.90127 6.75565C9.85051 6.69766 9.73438 6.61277 9.49899 6.61277H6.21874C6.28859 6.33628 6.35837 6.05977 6.42809 5.78322L6.42857 5.78136L6.42861 5.78128C6.62863 4.98812 6.8287 4.19493 7.03166 3.40249L6.72126 3.31378L4.90794 6.61396L3.22749 7.58837V10.2697L8.04274 11.1098C8.15771 11.1234 8.25816 11.1287 8.34551 11.1287C8.58824 11.1287 8.72874 11.0867 8.80323 11.0553C8.87725 11.0241 8.92916 10.9853 8.97345 10.94C9.08275 10.8282 9.15447 10.6776 9.25055 10.4317C9.56095 9.63514 9.85487 8.03962 9.98362 7.30385L9.98739 7.28242C10.0364 6.95063 9.94353 6.80411 9.90127 6.75565ZM8.82613 14.3593C8.65012 14.158 8.51752 13.9248 8.43049 13.668C9.10482 13.6554 9.65592 13.4935 10.1007 13.2444C10.1516 13.3024 10.2677 13.387 10.5027 13.387H13.783L13.2501 15.4957L13.2497 15.4972L13.2482 15.5031L13.2425 15.5258L13.2211 15.6103L13.1475 15.9007C13.0886 16.1329 13.0294 16.3651 12.9701 16.5973C13.0455 16.6263 13.1475 16.6577 13.2805 16.686L14.8668 13.7988L15.0938 13.3858L15.5015 13.1494L16.7742 12.4114V9.73011L12.2605 8.94255C12.3574 8.46618 12.4318 8.04859 12.4774 7.78895L12.4794 7.78212L12.4878 7.73208C12.5135 7.57981 12.5299 7.42612 12.5369 7.27186L18.4675 8.30664V13.3869L16.3509 14.6143L14.2342 18.4666C12.7259 18.4666 11.2423 18.0445 11.2385 16.7737C11.2381 16.6178 11.2599 16.449 11.3067 16.2668C11.4363 15.7617 11.6085 15.0803 11.6085 15.0803H10.5027C10.2856 15.0803 10.0773 15.0534 9.8815 15.0022C9.46085 14.892 9.09755 14.6694 8.82613 14.3593Z"
          fill="currentColor"
        />
      </svg>
    ),
    showInNavigation: true,
    navigationSection: "support",
    breadcrumbLabel: "Feedbacks",
    useLayout: true,
  },
  {
    path: "/chat",
    component: () => <PlaceholderPage title="Chat with us" />,
    title: "Chat with us",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M9.00033 2.5C4.41699 2.5 0.666992 5.48333 0.666992 9.16667C0.688031 10.0522 0.904347 10.9222 1.30049 11.7145C1.69664 12.5068 2.26284 13.2018 2.95866 13.75C2.95866 14.25 2.60866 15.5583 0.666992 17.5C2.64199 17.4083 4.53366 16.6667 6.05866 15.4167C7.00866 15.6917 8.00866 15.8333 9.00033 15.8333C13.5837 15.8333 17.3337 12.85 17.3337 9.16667C17.3337 5.48333 13.5837 2.5 9.00033 2.5ZM9.00033 14.1667C5.31699 14.1667 2.33366 11.925 2.33366 9.16667C2.33366 6.40833 5.31699 4.16667 9.00033 4.16667C12.6837 4.16667 15.667 6.40833 15.667 9.16667C15.667 11.925 12.6837 14.1667 9.00033 14.1667Z"
          fill="currentColor"
        />
      </svg>
    ),
    showInNavigation: true,
    navigationSection: "support",
    breadcrumbLabel: "Chat with us",
    useLayout: true,
  },
];

// Utility functions to work with routes
export const getAllRoutes = (): RouteConfig[] => {
  const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
    return routes.reduce((acc, route) => {
      // Normalize the route to ensure security defaults
      const normalizedRoute = normalizeRouteConfig(route);
      acc.push(normalizedRoute);
      if (normalizedRoute.children) {
        acc.push(...flattenRoutes(normalizedRoute.children));
      }
      return acc;
    }, [] as RouteConfig[]);
  };

  const normalizedRoutes = routeConfig.map(normalizeRouteConfig);
  const flatRoutes = flattenRoutes(normalizedRoutes);

  // Validate public routes in development
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    validatePublicRoutes(flatRoutes);
  }

  return flatRoutes;
};

export const getNavigationItems = (section: "main" | "support") => {
  return routeConfig.map(normalizeRouteConfig).filter(
    (route) =>
      route.showInNavigation &&
      route.navigationSection === section &&
      route.requiresAuth !== false // Only show authenticated routes in navigation
  );
};

export const findRouteByPath = (path: string): RouteConfig | undefined => {
  return getAllRoutes().find((route) => route.path === path);
};

export const getBreadcrumbLabel = (path: string): string => {
  const route = findRouteByPath(path);
  return route?.breadcrumbLabel || route?.title || path.split("/").pop() || "";
};

// Helper to check if a route is active (including child routes)
export const isRouteActive = (
  routePath: string,
  currentPath: string
): boolean => {
  if (routePath === currentPath) return true;

  // Check if current path is a child route of this route
  const route = findRouteByPath(routePath);
  if (route?.children) {
    return route.children.some((child) => {
      // Handle exact matches first
      if (child.path === currentPath) return true;

      // Handle route parameters (e.g., /agents/manage/:id)
      if (child.path.includes(":")) {
        const pathParts = child.path.split("/");
        const currentParts = currentPath.split("/");

        // Must have same number of segments
        if (pathParts.length !== currentParts.length) return false;

        // Check each segment, allowing parameters
        return pathParts.every((part, index) => {
          return part.startsWith(":") || part === currentParts[index];
        });
      }

      // Handle static child routes
      return currentPath.startsWith(child.path + "/");
    });
  }

  // For parent routes, check if current path starts with route path
  if (currentPath.startsWith(routePath + "/")) return true;

  return false;
};
