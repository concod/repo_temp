import React, { useEffect, lazy, useState } from "react";
import { connect } from "react-redux";
import Layout from "../layout";
import { APP_PLATFORM } from "config/constants";
import layoutActions from "core/actions/layoutActions";
import * as Icons from "@mui/icons-material/";
import "../layout/layout.css";
import ProductUnitDefinition from "core/pages/product-unit-definition";
import CreateNewUnitDefinition from "core/pages/product-unit-definition/components/createnew";
import GroupDefintions from "core/pages/product-grouping/components/group-definition-components/groupdefinitions";
import CreateDefintion from "core/pages/product-grouping/components/group-definition-components/creategrpdefinition";
import EditDefinition from "core/pages/product-grouping/components/group-definition-components/editdefinition";
import CreateProductGroup from "core/pages/product-grouping/components/product-group-components/createGroup";
import GroupDefMapper from "core/pages/product-grouping/components/product-group-components/groupdefinitionMapper";
import GroupDefEdit from "core/pages/product-grouping/components/group-definition-components/definitionmapedit";
import EditUnitDefinition from "core/pages/product-unit-definition/components/editDefinition";
import EditGrpProducts from "core/pages/product-grouping/components/product-group-components/editGrpProducts";
import ModifyGroup from "core/pages/product-grouping/components/product-group-components/modifyGroup";
import AddProductGroup from "core/pages/product-grouping/components/product-group-components/addProductGroup";
import EditProductGroup from "core/pages/product-grouping/components/product-group-components/editProductGroup";

import CreateStoreGroup from "core/pages/store-grouping/components/createGroup";
import ModifyStoreGroup from "core/pages/store-grouping/components/modifyGroup";
import EditGrpStores from "core/pages/store-grouping/components/editGrpStores";
import CreateStoreGrade from "core/pages/store-grading/components/createGrade";
import DCStatusScreen from "core/pages/dc-status";
import Events from "core/pages/notifications/components/event-configuration";
import UserMangement from "core/pages/tenant-config/access-user-management";
import UserRoleManagement from "core/pages/tenant-config/access-user-management/components/userRoleManagement";
import Notification from "core/pages/notifications";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { getCurrentApplicationName } from "core/Utils/functions/utils";
import AddStoreGroup from "core/pages/store-grouping/components/addStoreGroup";
import EditStoreGroup from "core/pages/store-grouping/components/editStoreGroup";
import AssortLandingPage from "modules/assortsmart/pages-assortsmart/AssortLandingPage";
import PlanSmartConfiguratorRoute from "modules/plansmartConfigurator";
const Filters = lazy(() => import("core/pages/filters"));
const ProductMapping = lazy(() => import("core/pages/product-mapping"));

const Product_Grouping_Screen = lazy(() =>
  import("core/pages/product-grouping")
);
const Store_Grouping_Screen = lazy(() => import("core/pages/store-grouping"));
const ProductFilter = lazy(() => import("core/pages/productStatus"));

const storeFilter = lazy(() => import("core/pages/storeStatus"));
const StoreGrading = lazy(() => import("core/pages/store-grading"));
const storeMapping = lazy(() => import("core/pages/storeMapping"));
const dcMapping = lazy(() => import("core/pages/dcmapping"));

const vendorStatusScreen = lazy(() => import("core/pages/vendor-status"));
const vendorProductScreen = lazy(() => import("core/pages/vendor-product"));

const ConfiguratorScreen = lazy(() =>
  import("core/pages/moduleConfiguratorScreen/moduleWorkflowConfig")
);

const ConfiguratorLandingScreen = lazy(() =>
  import("core/pages/moduleConfiguratorScreen/moduleConfiguratorLandingScreen")
);

const SystemConfiguratorScreen = lazy(() =>
  import("core/pages/moduleConfiguratorScreen/SystemConfigurator")
);

const ApplicationConfiguratorScreen = lazy(() =>
  import("core/pages/moduleConfiguratorScreen/ApplicationConfigurator")
);

const TenantConfigurationScreen = lazy(() =>
  import("core/pages/moduleConfiguratorScreen/TenantConfiguration")
);

const PivotTesting = lazy(() =>
  import("core/pages/test-pivot-table")
);

const KeyboardShortcutsRoutes = lazy(() =>
  import("core/pages/keyboardShortcuts/routes-keyboard-shortcuts")
);

const AgenticAssortRoutes = lazy(() => import("core/pages/agenticAssort/routes-agentic-assort"));
const AgenticPlanRoutes = lazy(() => import("core/pages/agenticPlan/routes-agentic-plan"));

export const uamSideBarOptions = [
  {
    link: "/user-management",
    title: "User Management",
    icon: React.createElement(Icons.ListAlt),
    order: 1,
    disabled: false,
  },
  // {
  //   link: "/tenantconfig/applicationconfig",
  //   title: "Tenant Management",
  //   icon: React.createElement(Icons.MapRounded),
  //   order: 2,
  //   disabled: false,
  // },
];

export const notificationSideBarOptions = [
  {
    link: "/events",
    title: "Notifications",
    icon: React.createElement(Icons.NotificationsActive),
    order: 1,
  },
];

export const moduleConfiguratorSideBarOptions = [
  {
    link: "/configurator",
    title: "Module Configurator",
    icon: React.createElement(Icons.SettingsOutlined),
    order: 1,
  },
];

const CoreLayout = (props) => {
  const [coreRoutes, setCoreRoutes] = useState([]);
  const [options, setOptions] = useState({
    "workflow input center": [],
    "application access management": [],
    home: [],
  });

  useEffect(() => {
    //update the title of the application
    document.title = APP_PLATFORM.APP_NAME;

    const fetchCoreScreenConfiguration = async () => {
      /**
       * Fetch and filter side bar options & routes based on the client config
       * Base component for any component can also be changed here
       * If the config is not defined for any particular module, in that case default side bar options, routes & base components will be applicable
       */
      let config = await props.getSpecificScreenName(3, {
        attribute_name: "core_screen_configuration",
      });
    };
    fetchCoreScreenConfiguration();
  }, []);

  /**
   * @func
   * @desc
   * Setting new routes and menus if the store coreScreenNames changes
   */
  useEffect(() => {
    const routes = [
      {
        path: "/assort-configurator-landing-page",
        component: AssortLandingPage,
        title: "Configurator-Assortsmart",
        screenName: "Configurator View",
      },
      {
        path: `/product-unit-definition`,
        component: ProductUnitDefinition,
        title: `${dynamicLabelsBasedOnTenant(
          "product_unit_definition",
          "core"
        )}`,
        screenName: "Product Unit Definition",
      },
      {
        path: `/product-unit-definition/create/:style_id`,
        component: CreateNewUnitDefinition,
        title: `${dynamicLabelsBasedOnTenant(
          "product_unit_definition",
          "core"
        )}`,
        screenName: "Product Unit Definition",
      },
      {
        path: `/product-unit-definition/edit/:style_id/:defn_id`,
        component: EditUnitDefinition,
        title: `${dynamicLabelsBasedOnTenant(
          "product_unit_definition",
          "core"
        )}`,
        screenName: "Product Unit Definition",
      },
      {
        path: `/filters`,
        component: Filters,
        title: "Filters",
      },
      {
        path: `/product-grouping`,
        component: Product_Grouping_Screen,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/group-definition-mapping/:group_id/edit-definitions/:def_id`,
        component: GroupDefEdit,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/group-definition-mapping/:group_id/create-definition`,
        component: CreateDefintion,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/group-definition-mapping/:group_id`,
        component: GroupDefMapper,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/create-group`,
        component: CreateProductGroup,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/create-group/group-definitions`,
        component: GroupDefintions,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/create-group/group-definitions/create-definition`,
        component: CreateDefintion,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/view/:group_id`,
        component: EditGrpProducts,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/modify/:group_id/group-definitions/create-definition`,
        component: CreateDefintion,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/modify/:group_id/group-definitions/edit-definitions/:id`,
        component: EditDefinition,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/modify/:group_id/group-definitions`,
        component: GroupDefintions,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/modify/:group_id`,
        component: ModifyGroup,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/add-products`,
        component: AddProductGroup,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/bulk-edit`,
        component: EditProductGroup,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/group-definitions`,
        component: GroupDefintions,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/tenant/usermanagement`,
        component: GroupDefintions,
      },
      {
        path: `/product-grouping/group-definitions/create-definition`,
        component: CreateDefintion,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/create-group/group-definitions/edit-definitions/:id`,
        component: EditDefinition,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-grouping/group-definitions/edit-definitions/:id`,
        component: EditDefinition,
        title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
        screenName: [
          "Product Grouping",
          "Inventorysmart Store Eligibility Group",
        ],
      },
      {
        path: `/product-status`,
        component: ProductFilter,
        title: `${dynamicLabelsBasedOnTenant("product_status", "core")}`,
        screenName: "Product Status",
      },
      {
        path: `/product-mapping`,
        component: ProductMapping,
        title: `${dynamicLabelsBasedOnTenant("product_mapping", "core")}`,
        screenName: "Product Mapping",
      },
      {
        path: `/store-status`,
        component: storeFilter,
        title: "Store Status",
        screenName: "Store Status",
      },
      {
        path: `/store-mapping`,
        component: storeMapping,
        title: "Store Mapping",
        screenName: "Store Mapping",
      },
      {
        path: `/store-grading`,
        component: StoreGrading,
        title: `Store Grading`,
        screenName: "Store Grading",
      },
      {
        path: `/store-grading/create-grading`,
        component: CreateStoreGrade,
        title: `Create new grading`,
        screenName: "Store Grading",
      },
      {
        path: `/events`,
        component: Events,
        title: "Notifications",
      },
      {
        path: `/notifications`,
        component: Notification,
        title: "Notifications",
      },
      {
        path: `/dc-mapping`,
        component: dcMapping,
        title: "DC Mapping",
        screenName: "DC Mapping",
      },
      {
        path: `/store-grouping`,
        component: Store_Grouping_Screen,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/store-grouping/view/:group_id`,
        component: EditGrpStores,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/store-grouping/modify/:group_id`,
        component: ModifyStoreGroup,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/store-grouping/create-group`,
        component: CreateStoreGroup,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/store-grouping/add-stores`,
        component: AddStoreGroup,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/store-grouping/bulk-edit`,
        component: EditStoreGroup,
        title: "Store Grouping",
        screenName: "Store Grouping",
      },
      {
        path: `/dc-status`,
        component: DCStatusScreen,
        title: "DC Status",
        screenName: "DC Status",
      },
      {
        path: `/user-management`,
        component: UserMangement,
        title: "User Management",
      },
      {
        path: `/user-management/user-role-management`,
        component: UserRoleManagement,
        title: "User Management",
      },
      {
        path: `/vendor-status`,
        component: vendorStatusScreen,
        title: "Vendor Status",
        screenName: "VendorConfigurations",
      },
      {
        path: `/vendor-product`,
        component: vendorProductScreen,
        title: `${dynamicLabelsBasedOnTenant("vendor_product", "core")}`,
        screenName: "VendorConfigurations",
      },
      {
        path: `/configurator`,
        component: ConfiguratorLandingScreen,
        title: "ConfiguratorScreen",
        screenName: "Configurator View",
      },
      {
        path: `/configurator/:module/application-configurator`,
        component: ApplicationConfiguratorScreen,
        title: "ApplicationConfiguratorScreen",
        screenName: "Application Configurator View",
      },
      {
        path: `/configurator/:module/tenant-configuration`,
        component: TenantConfigurationScreen,
        title: "TenantConfigurationScreen",
        screenName: "Tenant Configuration View",
      },
      {
        path: `/configurator/:module/module-configurator`,
        component: SystemConfiguratorScreen,
        title: "SystemConfiguratorScreen",
        screenName: "System Configurator View",
      },
      {
        path: `/configurator/:module/module-configurator/:screen`,
        component: ConfiguratorScreen,
        title: "ModuleConfiguratorScreen",
        screenName: "Module Configurator View",
      },
      {
        path: `/configurator/plansmart/:screen`,
        component: PlanSmartConfiguratorRoute,
        title: "PlansmartConfiguratorScreen",
        screenName: "Plansmart Configurator View",
      },
      {
        path: `/pivot-test`,
        component: PivotTesting,
        title: "Pivot Testing",
        screenName: "Pivot Testing",
      },
      {
        path: '/keyboard-shortcuts',
        component: KeyboardShortcutsRoutes,
        title: "Keyboard Shortcuts",
        screenName: "Keyboard Shortcuts",
      },
      {
        path: '/agentic-assort',
        component: AgenticAssortRoutes,
        title: "Agentic Assort",
        screenName: "Agentic Assort",
      },
      {
        path: '/agentic-plan',
        component: AgenticPlanRoutes,
        title: "Agentic Plan",
        screenName: "Agentic Plan",
      },
    ];
    const masterSideBarOptions = [
      {
        isParent: true,
        title: `${captializeStringIfCamelCase(
          dynamicLabelsBasedOnTenant("product", "core")
        )}`,
        icon: React.createElement(Icons.QrCode2),
        childList: [
          {
            link: "/product-mapping",
            title: `${dynamicLabelsBasedOnTenant("product_mapping", "core")}`,
            icon: React.createElement(Icons.AccountTree),
            order: 1,
            disabled: false,
          },
          {
            link: "/product-grouping",
            title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
            icon: React.createElement(Icons.Dialpad),
            order: 2,
            disabled: false,
          },
          {
            link: "/product-unit-definition",
            title: `${dynamicLabelsBasedOnTenant(
              "product_unit_definition",
              "core"
            )}`,
            icon: React.createElement(Icons.ListAlt),
            order: 3,
            disabled: false,
          },
          {
            link: "/product-status",
            title: `${dynamicLabelsBasedOnTenant("product_status", "core")}`,
            icon: React.createElement(Icons.Flag),
            order: 4,
          },
        ],
      },
      {
        isParent: true,
        title: `Store`,
        icon: React.createElement(Icons.LocalGroceryStore),
        childList: [
          {
            link: "/store-status",
            title: "Store Status",
            icon: React.createElement(Icons.Store),
            order: 5,
          },
          {
            link: "/store-grouping",
            title: "Store Grouping",
            icon: React.createElement(Icons.Dialpad),
            order: 6,
          },
          {
            link: "/store-mapping",
            title: "Store Mapping",
            icon: React.createElement(Icons.AccountTree),
            order: 7,
            disabled: false,
          },
          {
            link: "/store-grading",
            title: "Store Grading",
            icon: React.createElement(Icons.AccountTree),
            order: 8,
            disabled: false,
          },
        ],
      },
      {
        isParent: true,
        title: `DC`,
        icon: React.createElement(Icons.LocalConvenienceStore),
        childList: [
          {
            link: "/dc-status",
            title: "DC Status",
            icon: React.createElement(Icons.Storefront),
            order: 9,
            disabled: false,
          },
          {
            link: "/dc-mapping",
            title: "DC Mapping",
            icon: React.createElement(Icons.MapRounded),
            order: 10,
            disabled: false,
          },
        ],
      },
      {
        isParent: true,
        title: `Vendor`,
        icon: React.createElement(Icons.GroupTwoTone),
        childList: [
          {
            link: "/vendor-status",
            title: "Vendor Status",
            icon: React.createElement(Icons.LocalShipping),
            order: 11,
            disabled: false,
          },
          {
            link: "/vendor-product",
            title: `${dynamicLabelsBasedOnTenant("vendor_product", "core")}`,
            icon: React.createElement(Icons.CategoryRounded),
            order: 12,
            disabled: false,
          },
        ],
      },
      {
        link: "/inventory",
        title: "Inventory",
        icon: React.createElement(Icons.LibraryBooks),
        order: 13,
        disabled: false,
      },
    ];
    const homeSidebarOptions = [
      {
        link: "/home",
        title: "Home",
        icon: React.createElement(Icons.Home),
        order: 1,
      },
      {
        isParentBottom: true,
        isPositionBottom: true,
        title: "Support",
        icon: React.createElement(Icons.LocalActivityOutlined),
        childList: [
          {
            link: props.helpDesk ? props.helpDesk : "",
            title: "Raise a ticket",
            icon: React.createElement(Icons.HelpOutlineOutlined),
            order: 2,
            openInNewPage: true,
          },
          {
            link: "/ticketing-system",
            title: "View Ticket Reports",
            appTitle: "ticketing",
            icon: React.createElement(Icons.FlagOutlined),
            order: 3,
          },
        ],
      },
    ];
    const menus = {
      "workflow input center": masterSideBarOptions,
      "application access management": uamSideBarOptions,
      notification: notificationSideBarOptions,
      "module configurator": moduleConfiguratorSideBarOptions,
      home: homeSidebarOptions,
    };
    setOptions(menus);
    setCoreRoutes(routes);
  }, [props.coreScreenNames, props.helpDesk]);

  return (
    <Layout
      routes={coreRoutes}
      sideBarOptions={options[getCurrentApplicationName()]}
      app={getCurrentApplicationName()}
    />
  );
};

const mapStateToProps = (state) => ({
  routes: state.layoutReducer.routes,
  coreScreenNames: state.tenantConfigReducer.coreScreenNames,
  helpDesk: state.tenantConfigReducer.helpDesk,
  tenantConfigReducer: state.tenantConfigReducer,
});

const mapActionsToProps = {
  setLayout: layoutActions.setLayout,
  getSpecificScreenName,
};

export default connect(mapStateToProps, mapActionsToProps)(React.memo(CoreLayout));
