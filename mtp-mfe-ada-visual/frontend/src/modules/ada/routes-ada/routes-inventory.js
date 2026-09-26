import React, { useEffect, useState } from "react";
// import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
// import DashboardIcon from "@mui/icons-material/Dashboard";
import CategoryIcon from "@mui/icons-material/Category";
import DialpadIcon from "@mui/icons-material/Dialpad";
import TungstenOutlinedIcon from "@mui/icons-material/TungstenOutlined";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GridViewIcon from "@mui/icons-material/GridView";
import BarChartIcon from "@mui/icons-material/BarChart";
import FactoryOutlined from "@mui/icons-material/FactoryOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import LoopIcon from "@mui/icons-material/Loop";
import StoreIcon from "@mui/icons-material/Store";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import { TourSharp } from "@mui/icons-material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SettingsIcon from "../../../assets/impactv3/Settings.svg";
import { isEmpty } from "lodash";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
  ADA_UPLOAD_VALIDATION,
  CONSTRAINTS,
  PRODUCT_PROFILE,
  CREATE_ALLOCATION,
  AUTO_ALLOCATION_RECOMMENDATION,
  CONFIGURATION,
  STORE_ELIGIBILITY_GROUP,
  ADA_VISUAL,
  VIEW_PAST_ALLOCATION,
  DASHBOARD,
  ALLOCATION_REPORT,
  ADA_VISUAL_MFP_DASHBOARD,
  ORDER_BATCHING_PATH,
  ORDER_MANAGEMENT,
  ORDER_REPOSITORY,
  CREATE_NEW_ORDER,
  DC_TO_DC_TRANSFER_PATH,
  PO_REBALANCE,
  KEYBOARD_SHORTCUTS_REDIRECT,
} from "../constants-ada/routesContants";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import AdaDashboardComponent from "../pages-ada/Dashboard";
import AdaMFPDashboardComponent from "../pages-ada/MFP-Dashboard";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTenantFilters,
  getClientConfig,
  getUserConfig,
  setClientConfig,
  setClientConfigLoader,
  setTenantConfigLoader,
  setTenantFilters,
  setUserConfig,
  setUserConfigLoader,
  AdaUploadValidationData,
  AdaGetKeyToLabelMapping,
  setEligibilityFlag,
  setCommentConfig,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  setModuleConfiguratorData,
  setModuleConfigsLoader,
} from "modules/ada/services-ada/ada-dashboard/ada-module-configurator-service";
import { getModuleCodes } from "../../../core/pages/file-upload-validation/file-upload-service";
import FileUploadValidation from "../../../core/pages/file-upload-validation/index";
import _ from "lodash";
import { getModuleBasedTenantConfig } from "../utils-ada/utilityFunctions.js";
import { Icon } from "@mui/material";
import {
  getSpecificScreenName,
  tenantConfigApiCache,
} from "core/actions/tenantConfigActions";
import { OMS_MODULE_CONFIGURATION } from "../constants-ada/stringContants";
import KeyboardShortcutIcon from "coreAssets/keyboardShortcutIcon.svg";
import KeyboardShortcutsRedirect from "../pages-ada/KeyboardShortcutsRedirect/index.jsx";

export const inventorySideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    icon: React.createElement(GridViewIcon),
    order: 1,
    screenName: "InventoryDashboard",
    module: "dashboard",
    external: true,
  },
  {
    link: PRODUCT_PROFILE,
    title: "Product Profile",
    icon: React.createElement(CategoryIcon),
    order: 6,
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
    external: true,
  },
  {
    link: `${CREATE_ALLOCATION}?step=0`,
    title: "Create New Allocation",
    icon: React.createElement(BubbleChartIcon),
    order: 2,
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
    external: true,
  },
  {
    link: STORE_ELIGIBILITY_GROUP,
    title: "Grouping",
    icon: React.createElement(DialpadIcon),
    order: 3,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
    external: true,
  },
  {
    link: CONFIGURATION,
    title: "Configuration",
    icon: React.createElement(TungstenOutlinedIcon),
    order: 4,
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
    external: true,
  },
  {
    link: CONSTRAINTS,
    title: "Constraints",
    icon: React.createElement(TourSharp),
    order: 5,
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_constraints",
    external: true,
  },
  {
    link: ALLOCATION_REPORT,
    title: "Report",
    icon: React.createElement(BarChartIcon),
    order: 7,
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
    external: true,
  },
  {
    link: ADA_VISUAL,
    title: "ADA Visual Dashboard",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    link: ADA_VISUAL_MFP_DASHBOARD,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "Inventory ADA Visual MFP",
    module: "inventorysmart_ada_visual_mfp_dashboard",
  },
  {
    link: VIEW_PAST_ALLOCATION,
    title: "View Past Allocation",
    icon: React.createElement(AccessTimeIcon),
    order: 10,
    screenName: "Inventorysmart View Past Allocations",
    module: "inventorysmart_view_past_allocation",
    external: true,
  },
  {
    link: ORDER_BATCHING_PATH,
    icon: React.createElement(FactoryOutlined),
    title: "Order Batching",
    screenName: "Inventorysmart Order Batching",
    module: "inventorysmart_order_batching",
    order: 11,
    external: true,
  },
  {
    link: ORDER_MANAGEMENT,
    title: "Order Management",
    icon: React.createElement(Inventory2Outlined),
    order: 12,
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorysmart_order_management",
    external: true,
  },
  {
    link: ORDER_REPOSITORY,
    title: "Order Repository",
    icon: React.createElement(InventoryOutlinedIcon),
    order: 13,
    screenName: "Inventorysmart Oms Order Repository",
    module: "inventorysmart_order_repository",
    external: true,
  },
  {
    link: CREATE_NEW_ORDER,
    title: "Create New Order",
    icon: React.createElement(NoteAddOutlinedIcon),
    order: 14,
    screenName: "Oms Create Order",
    module: "inventorysmart_create_new_order",
    external: true,
  },
  {
    link: DC_TO_DC_TRANSFER_PATH,
    title: "DC To DC Transfer",
    icon: React.createElement(GridViewIcon),
    order: 15,
    screenName: "Inventory-Dc-To-DC-Transfer",
    module: "inventorysmart_dc_to_dc_transfer",
    external: true,
  },
  {
    link: PO_REBALANCE,
    title: "PO Rebalance",
    icon: React.createElement(LoopIcon),
    order: 16,
    screenName: "PO-Rebalance",
    module: "inventorysmart_po_rebalance",
    external: true,
  },
  {
    link: KEYBOARD_SHORTCUTS_REDIRECT,
    title: "Keyboard Shortcuts",
    icon: React.createElement(KeyboardShortcutIcon),
    order: 99,
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
    childList: [],
    isPositionBottom: true,
    openInNewPage: true,
  },
];

export const parentChildSideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    icon: React.createElement(GridViewIcon),
    order: 1,
    screenName: "InventoryDashboard",
    module: "dashboard",
    childList: [],
    external: true,
  },
  {
    isParent: true,
    customDisable: true,
    title: `General Settings`,
    icon: (
      <Icon>
        <SettingsIcon />
      </Icon>
    ),
    childList: [
      {
        link: PRODUCT_PROFILE,
        title: "Product Profile",
        icon: React.createElement(CategoryIcon),
        order: 6,
        screenName: "Product Profile",
        module: "inventorysmart_product_profile",
        disabled: false,
        external: true,
      },
      {
        link: STORE_ELIGIBILITY_GROUP,
        title: "Grouping",
        icon: React.createElement(DialpadIcon),
        order: 3,
        screenName: "Inventorysmart Store Eligibility Group",
        module: "inventorysmart_store_eligibility_group",
        external: true,
      },
      {
        link: CONFIGURATION,
        title: "Configuration",
        icon: React.createElement(TungstenOutlinedIcon),
        order: 4,
        screenName: "Inventorysmart Configurations",
        module: "inventorysmart_configuration",
        disabled: false,
        external: true,
      },
      {
        link: CONSTRAINTS,
        title: "Constraints",
        icon: React.createElement(TourSharp),
        order: 5,
        screenName: "Inventorysmart Constraints",
        module: "inventorysmart_constraints",
        disabled: false,
        external: true,
      },
    ],
  },
  {
    link: ADA_VISUAL_MFP_DASHBOARD,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
    childList: [],
  },
  {
    link: ADA_VISUAL,
    title: "ADA Visual DashBoard",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
    childList: [],
  },
  {
    isParent: true,
    title: `Allocation`,
    customDisable: true,
    icon: <StoreIcon />,
    childList: [
      {
        link: `${CREATE_ALLOCATION}?step=0`,
        title: "Create New Allocation",
        icon: React.createElement(BubbleChartIcon),
        order: 2,
        screenName: "Allocation",
        module: "inventorysmart_create_allocation",
        external: true,
      },
      {
        link: ORDER_BATCHING_PATH,
        icon: React.createElement(FactoryOutlined),
        title: "Order Batching",
        screenName: "Inventorysmart Order Batching",
        module: "inventorysmart_order_batching",
        order: 11,
        disabled: false,
        external: true,
      },
      {
        link: VIEW_PAST_ALLOCATION,
        title: "View Past Allocation",
        icon: React.createElement(AccessTimeIcon),
        order: 10,
        screenName: "Inventorysmart View Past Allocations",
        module: "inventorysmart_view_past_allocation",
        external: true,
      },
    ],
  },
  {
    isParent: true,
    title: `Ordering`,
    customDisable: true,
    icon: React.createElement(FactoryOutlined),
    childList: [
      {
        link: ORDER_MANAGEMENT,
        title: "Order Management",
        icon: React.createElement(Inventory2Outlined),
        order: 12,
        screenName: "Inventorysmart Oms Order Management",
        module: "inventorysmart_order_management",
        disabled: false,
        external: true,
      },
      {
        link: ORDER_REPOSITORY,
        title: "Order Repository",
        icon: React.createElement(InventoryOutlinedIcon),
        order: 13,
        screenName: "Inventorysmart Oms Order Repository",
        module: "inventorysmart_order_repository",
        disabled: false,
        external: true,
      },
      {
        link: CREATE_NEW_ORDER,
        title: "Create New Order",
        icon: React.createElement(NoteAddOutlinedIcon),
        order: 14,
        screenName: "Oms Create Order",
        module: "inventorysmart_create_new_order",
        disabled: false,
        external: true,
      },
    ],
  },
  {
    link: ALLOCATION_REPORT,
    title: "Report",
    icon: React.createElement(BarChartIcon),
    order: 15,
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
    disabled: false,
    childList: [],
    external: true,
  },
  {
    link: DC_TO_DC_TRANSFER_PATH,
    title: "DC To DC Transfer",
    icon: React.createElement(GridViewIcon),
    order: 15,
    screenName: "Inventory-Dc-To-DC-Transfer",
    module: "inventorysmart_dc_to_dc_transfer",
    childList: [],
    external: true,
  },
  {
    link: PO_REBALANCE,
    title: "PO Rebalance",
    icon: React.createElement(LoopIcon),
    order: 16,
    screenName: "PO-Rebalance",
    module: "inventorysmart_po_rebalance",
    childList: [],
    external: true,
  },
  {
    link: KEYBOARD_SHORTCUTS_REDIRECT,
    title: "Keyboard Shortcuts",
    icon: React.createElement(KeyboardShortcutIcon),
    order: 99,
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
    childList: [],
    isPositionBottom: true,
    openInNewPage: true,
  },
];
export const spanxSideBarOptions = [
  {
    isParent: true,
    title: `Order Management`,
    customDisable: true,
    icon: React.createElement(FactoryOutlined),
    childList: [
      {
        link: DASHBOARD,
        title: "Dashboard",
        icon: React.createElement(GridViewIcon),
        order: 1,
        screenName: "InventoryDashboard",
        module: "dashboard",
        disabled: false,
        external: true,
      },
      {
        link: ORDER_BATCHING_PATH,
        icon: React.createElement(FactoryOutlined),
        title: "Order Batching",
        screenName: "Inventorysmart Order Batching",
        module: "inventorysmart_order_batching",
        order: 11,
        disabled: false,
        external: true,
      },
      {
        link: ORDER_MANAGEMENT,
        title: "Order Management",
        icon: React.createElement(Inventory2Outlined),
        order: 12,
        screenName: "Inventorysmart Oms Order Management",
        module: "inventorysmart_order_management",
        disabled: false,
        external: true,
      },
      {
        link: ORDER_REPOSITORY,
        title: "Order Repository",
        icon: React.createElement(InventoryOutlinedIcon),
        order: 13,
        screenName: "Inventorysmart Oms Order Repository",
        module: "inventorysmart_order_repository",
        disabled: false,
        external: true,
      },
      {
        link: CREATE_NEW_ORDER,
        title: "Create New Order",
        icon: React.createElement(NoteAddOutlinedIcon),
        order: 14,
        screenName: "Oms Create Order",
        module: "inventorysmart_create_new_order",
        disabled: false,
        external: true,
      },
      {
        link: ALLOCATION_REPORT,
        title: "Report",
        icon: React.createElement(BarChartIcon),
        order: 7,
        screenName: "Inventorysmart Reportings",
        module: "inventorysmart_allocation_report",
        disabled: false,
        external: true,
      },
    ],
  },
  {
    isParent: true,
    customDisable: true,
    title: `Common Setting`,
    icon: React.createElement(TungstenOutlinedIcon),
    childList: [
      {
        link: PRODUCT_PROFILE,
        title: "Product Profile",
        icon: React.createElement(CategoryIcon),
        order: 6,
        screenName: "Product Profile",
        module: "inventorysmart_product_profile",
        disabled: false,
        external: true,
      },
      {
        link: CONFIGURATION,
        title: "Configuration",
        icon: React.createElement(TungstenOutlinedIcon),
        order: 4,
        screenName: "Inventorysmart Configurations",
        module: "inventorysmart_configuration",
        disabled: false,
        external: true,
      },
      {
        link: CONSTRAINTS,
        title: "Constraints",
        icon: React.createElement(TourSharp),
        order: 5,
        screenName: "Inventorysmart Constraints",
        module: "inventorysmart_constraints",
        disabled: false,
        external: true,
      },
    ],
  },
  {
    link: KEYBOARD_SHORTCUTS_REDIRECT,
    title: "Keyboard Shortcuts",
    icon: React.createElement(KeyboardShortcutIcon),
    order: 99,
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
    childList: [],
    isPositionBottom: true,
    openInNewPage: true,
  },
];

const customAPIHandler = async (reportCode) => {
  return await Promise.all([
    AdaUploadValidationData(reportCode),
    AdaGetKeyToLabelMapping(),
    getModuleCodes(),
  ]);
};

const routes = [
  {
    path: ADA_DASHBOARD,
    screenName: "ada-visual",
    component: AdaMFPDashboardComponent,
    title: "ADA Visual",
    module: "ada_visual_mfp_dashboard",
    reloadOnSameRouteClick: true,
  },
  {
    path: ADA_FORECAST_MANGEMENT,
    screenName: "ada-visual",
    component: AdaDashboardComponent,
    title: "ADA Visual Dashboard",
    module: "ada_visual_dashboard",
    reloadOnSameRouteClick: true,
  },
  {
    path: KEYBOARD_SHORTCUTS_REDIRECT,
    component: KeyboardShortcutsRedirect,
    title: "Keyboard Shortcuts",
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
  },
];
const useUrlParams = () => {
  const [searchParams, setSearchParams] = useState(window.location.search);

  useEffect(() => {
    const handleLocationChange = () => {
      setSearchParams(window.location.search);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  return searchParams;
};
const getFilteredParentOptions = (
  navOptions,
  inventorysmartScreenConfig,
  inventorysmartOmsScreenConfig
) => {
  let filteredNavOptions = [];
  navOptions.forEach((option) => {
    // Handle keyboard shortcuts based on visibility config
    if (option.module === "keyboard_shortcuts") {
      return;
    }

    if (isEmpty(option?.childList)) {
      // For non-parent items, check if they should be hidden
      //Hiding OMS Modules on SidePanel
      if (OMS_MODULE_CONFIGURATION?.screenName?.indexOf(option.module) !== -1) {
        if (!hideOMSSideOptions(inventorysmartOmsScreenConfig, option)) {
          filteredNavOptions.push(option);
        }
      } else {
        const isHiddenByScreenName =
          inventorysmartScreenConfig?.hiddenModules?.indexOf(
            option.screenName
          ) !== -1;
        const isHiddenByModule =
          inventorysmartScreenConfig?.hiddenModules?.indexOf(option.module) !==
          -1;
        const isSpecialADACase =
          option.module === "inventorysmart_ada_visual" &&
          inventorysmartScreenConfig?.hiddenModules?.indexOf(
            "MFP ADA Dashboard"
          ) === -1;

        if (!isHiddenByScreenName && !isHiddenByModule && !isSpecialADACase) {
          filteredNavOptions.push(option);
        }
      }
    } else {
      // Always add parent screens - they'll be filtered later based on their children
      filteredNavOptions.push(option);
    }
  });
  return filteredNavOptions;
};

//Hides all OMS Modules if OMS is not enabled or else specific module present in hiddenModules
const hideOMSModules = (OMSScreenConfig, option) => {
  if (OMSScreenConfig?.is_oms_enabled) {
    if (OMSScreenConfig?.hiddenModules.indexOf(option.module) !== -1)
      return false;
    if (OMSScreenConfig?.hiddenModules.indexOf(option.screenName) !== -1)
      return false;
  } else {
    if (OMSScreenConfig?.screenName.indexOf(option.module) !== -1) return false;
    if (OMSScreenConfig?.screenName.indexOf(option.screenName) !== -1)
      return false;
  }
  return true;
};

//Hides OMS Modules from SidePanel if OMS is not enabled or else specific module present in hiddenModules
const hideOMSSideOptions = (OMSScreenConfig, option) => {
  if (OMSScreenConfig?.is_oms_enabled) {
    if (OMSScreenConfig?.hiddenModules.indexOf(option.module) === -1)
      return false;
  }
  return true;
};

const finalNavOption = (
  navOptions,
  inventorysmartScreenConfig,
  OMSScreenConfig,
  createAllocationConfig
) => {
  let result = navOptions
    .filter((option) => {
      // Always include keyboard shortcuts if visible, skip normal filtering
      if (option.module === "keyboard_shortcuts") {
        return false;
      }

      if (
        option.module === "inventorysmart_ada_visual" &&
        inventorysmartScreenConfig?.hiddenModules.indexOf(
          "MFP ADA Dashboard"
        ) === -1
      ) {
        return false;
      }
      if (!hideOMSModules(OMSScreenConfig, option)) return false;
      if (
        inventorysmartScreenConfig?.hiddenModules.indexOf(option.screenName) !==
        -1
      ) {
        return false;
      }
      if (
        inventorysmartScreenConfig?.hiddenModules.indexOf(option.module) !== -1
      ) {
        return false;
      }
      return true;
    })
    .map((item) => {
      if (item.module === "inventorysmart_product_profile") {
        return {
          ...item,
          title: `${inventorysmartScreenConfig?.dynamicLabels?.article} Profile`,
        };
      } else if (item.module === "inventorysmart_create_allocation") {
        return {
          ...item,
          title: createAllocationConfig?.cnaLabel || item.title,
          link: createAllocationConfig?.isPreviewMode
            ? `${AUTO_ALLOCATION_RECOMMENDATION}`
            : item.link,
        };
      } else return item;
    });
  return result;
};

const RoutesInventorySmart = (props) => {
  const [navBarOptions, setNavBarOptions] = useState([]);
  const [navRoutes, setNavRoutes] = useState([]);
  const [showItemSmartIcon, setShowItemSmartIcon] = useState(false);
  const [isInventoryConfigLoading, setIsInventoryConfigLoading] = useState(
    false
  );

  /** Component map to change base component for a particular module for any client if required */
  const routesComponentMap = {
    ada_visual_dashboard: {
      default: AdaDashboardComponent,
    },
    ada_visual_mfp_dashboard: {
      default: AdaMFPDashboardComponent,
    },
    keyboard_shortcuts: {
      default: KeyboardShortcutsRedirect,
    },
  };

  const dispatch = useDispatch();
  const urlParams = useUrlParams();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const keyboardShortcutsVisible = useSelector(
    (store) => store?.sideBarReducer?.keyboardShortcutsVisible
  );

  //Fetching Tenant Based Filters
  useEffect(() => {
    const getTenantFilters = async () => {
      try {
        dispatch(setTenantConfigLoader(true));
        const { data } = await fetchTenantFilters();
        dispatch(setTenantFilters(data?.data));
      } catch (error) {
      } finally {
        dispatch(setTenantConfigLoader(false));
      }
    };

    getTenantFilters();
  }, []);

  //Fetching Client Based Configs
  useEffect(() => {
    const getClientBasedConfig = async () => {
      try {
        dispatch(setClientConfigLoader(true));
        dispatch(setModuleConfigsLoader(true));
        const [
          configuratorData,
          { data },
          commentingConfig,
        ] = await Promise.all([
          getModuleBasedTenantConfig({
            module_name: "Ada Visual Module Configurator",
            app_code: 1,
          })(),
          getClientConfig(),
          getModuleBasedTenantConfig({
            module_name: "commenting_configuration",
            app_code: 1,
          })(),
        ]);
        // Store configurator data in Redux
        dispatch(setModuleConfiguratorData(configuratorData));
        dispatch(setCommentConfig(commentingConfig || {}));

        let clientConfigData = data?.data?.[0];
        if (configuratorData?.hasOwnProperty("mfp")) {
          clientConfigData.attribute_value.mfp = configuratorData.mfp;
        }
        if (configuratorData?.hasOwnProperty("client_forecast_name")) {
          clientConfigData.attribute_value.show_features.custom_mfp_label =
            configuratorData.client_forecast_name;
        }
        dispatch(setClientConfig(clientConfigData));
        if (configuratorData?.hasOwnProperty("default_eligible_skus")) {
          dispatch(setEligibilityFlag(configuratorData?.default_eligible_skus));
        } else if (clientConfigData?.attribute_value?.hasOwnProperty("only_eligible")) {
          dispatch(setEligibilityFlag(clientConfigData?.attribute_value?.only_eligible));
        } else {
          dispatch(setEligibilityFlag(true));
        }
      } catch (error) {
        console.log(error);
      } finally {
        dispatch(setClientConfigLoader(false));
        dispatch(setModuleConfigsLoader(false));
      }
    };

    getClientBasedConfig();
  }, []);

  //Fetching User Based Configs
  useEffect(() => {
    const getUserBasedConfig = async () => {
      try {
        dispatch(setUserConfigLoader(true));
        const { data } = await getUserConfig();
        dispatch(setUserConfig(data?.data));
      } catch (error) {
      } finally {
        dispatch(setUserConfigLoader(false));
      }
    };
    getUserBasedConfig();
  }, []);

  useEffect(() => {
    let finalRoutes = [];
    if (sessionStorage.getItem("isRedirectedFromInventorySmart") === "true") {
      const fetchInventorySmartScreenConfiguration = async () => {
        /**
         * Fetch and filter side bar options & routes based on the client config
         * Base component for any component can also be changed here
         * If the config is not defined for any particular module, in that case default side bar options, routes & base components will be applicable
         */
        try {
          setIsInventoryConfigLoading(true);
          const omsScreenConfigResponse = await tenantConfigApiCache(1, {
            attribute_name: "inventory_smart_oms_screen_configuration",
          })();

          const omsScreenConfig =
            omsScreenConfigResponse.data.data[0]?.attribute_value;
          const inventorysmartOmsScreenConfig =
            omsScreenConfig && omsScreenConfig?.is_oms_enabled
              ? omsScreenConfig
              : OMS_MODULE_CONFIGURATION;

          const config = await tenantConfigApiCache(1, {
            attribute_name: "inventory_smart_screen_configuration",
          })();
          //Accessing core module screen configuration to display dynamicLabel values accordingly on Core configuration screens (Product status etc) when accessing from inventory module
          dispatch(
            getSpecificScreenName(3, {
              attribute_name: "core_screen_configuration",
            })
          );

          // Fetch independent inventorysmart_create_allocation config
          const createAllocationConfigResponse = await tenantConfigApiCache(1, {
            attribute_name: "inventorysmart_create_allocation",
          })();
          const inventorysmartCreateAllocationConfig =
            createAllocationConfigResponse?.data?.data[0]?.attribute_value;

          const inventorysmartScreenConfig =
            config.data.data[0]?.attribute_value;
          let navOptions = inventorySideBarOptions;
          finalRoutes = routes;
          if (inventorysmartScreenConfig) {
            if (!inventorysmartScreenConfig?.flatSideBar) {
              // By default Side bars are nested
              // If for any client we need flat sidebar we can add flatSideBar config in db
              let nestedOptions = parentChildSideBarOptions;
              if (inventorysmartScreenConfig?.nestedSidebar) {
                // Added custum sidebar bar option only for spanx
                // Key is true only for spanx
                nestedOptions = spanxSideBarOptions;
              }
              let filteredParentOptions = getFilteredParentOptions(
                nestedOptions,
                inventorysmartScreenConfig,
                inventorysmartOmsScreenConfig
              );
              navOptions = filteredParentOptions.map((item) => {
                item.childList = finalNavOption(
                  item.childList,
                  inventorysmartScreenConfig,
                  inventorysmartOmsScreenConfig,
                  inventorysmartCreateAllocationConfig
                );
                return item;
              });
            } else {
              navOptions = finalNavOption(
                navOptions,
                inventorysmartScreenConfig,
                inventorysmartOmsScreenConfig,
                inventorysmartCreateAllocationConfig
              );
            }
            finalRoutes = finalRoutes
              .filter((route) => {
                // Always include keyboard shortcuts route if visible
                if (route.module === "keyboard_shortcuts") {
                  return keyboardShortcutsVisible;
                }

                if (
                  inventorysmartScreenConfig?.hiddenModules.indexOf(
                    route.screenName
                  ) !== -1
                )
                  return false;
                if (!hideOMSModules(inventorysmartOmsScreenConfig, route)) {
                  return false;
                }
                if (
                  inventorysmartScreenConfig?.hiddenModules.indexOf(
                    route.module
                  ) === -1
                )
                  return true;
              })
              .map((route) => {
                route.component =
                  routesComponentMap[route.module][
                    inventorysmartScreenConfig[route.module]?.component
                  ] || routesComponentMap[route.module].default;
                return route;
              });
          }
          localStorage.setItem(
            "inventorysmartScreenConfig",
            JSON.stringify(config.data.data[0]?.attribute_value)
          );
          let tempOptions = [];
          if (!inventorysmartScreenConfig?.flatSideBar) {
            // Fow For Nested Side Bars
            tempOptions = [...navOptions];
          } else {
            tempOptions =
              inventorysmartOmsScreenConfig?.hiddenModules &&
              inventorysmartOmsScreenConfig?.hiddenModules.length
                ? navOptions.filter(
                    (screen) =>
                      screen.module === "keyboard_shortcuts" ||
                      !inventorysmartOmsScreenConfig?.hiddenModules.includes(
                        screen.module
                      )
                  )
                : [...navOptions];
            tempOptions = inventorysmartOmsScreenConfig?.is_oms_enabled
              ? tempOptions
              : tempOptions.filter(
                  (screen) =>
                    screen.module === "keyboard_shortcuts" ||
                    !inventorysmartOmsScreenConfig?.screenName.includes(
                      screen.module
                    )
                );
          }
          // Add keyboard shortcuts option if visible
          if (keyboardShortcutsVisible) {
            const kbOption = inventorySideBarOptions.find(
              (opt) => opt.module === "keyboard_shortcuts"
            );
            if (kbOption) {
              tempOptions.push(kbOption);
            }
          }
          setNavBarOptions(tempOptions);
          let uploadRoute = {
            path: ADA_UPLOAD_VALIDATION,
            screenName: "ada-visual",
            component: () => (
              <FileUploadValidation
                customAPIHandler={customAPIHandler}
                isCustomAPI={true}
              />
            ),
            title: "ADA Visual File Upload Validations",
          };
          setNavRoutes([...finalRoutes, uploadRoute]);
          let isOMSModuleEnabled = true;
          inventorysmartScreenConfig?.hiddenModules.map((data) => {
            if (data === "inventorysmart_order_management") {
              isOMSModuleEnabled = false;
              return;
            }
          });
          let showItemSmartNavigator = await tenantConfigApiCache(3, {
            attribute_name: "show_itemsmart_navigator",
          })();
          showItemSmartNavigator =
            showItemSmartNavigator?.data?.data?.[0]?.attribute_value?.value ||
            false;

          setShowItemSmartIcon(showItemSmartNavigator);
        } catch (error) {
          console.log("Error", error);
        } finally {
          setIsInventoryConfigLoading(false);
        }
      };
      fetchInventorySmartScreenConfiguration();
    }
  }, [adaReducer?.clientConfig, urlParams, keyboardShortcutsVisible]);

  return (
    <>
      {adaReducer?.clientConfig?.attribute_value && (
        <Layout
          routes={navRoutes}
          sideBarOptions={navBarOptions}
          app="ada"
          showItemSmartIcon={showItemSmartIcon}
          loading={
            isInventoryConfigLoading ||
            adaReducer?.clientConfigLoader ||
            adaReducer?.tenantConfigLoader ||
            adaReducer?.userConfigLoader
          }
        />
      )}
    </>
  );
};

export default RoutesInventorySmart;
