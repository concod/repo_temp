import React, { useEffect, lazy, useState } from "react";
import { connect } from "react-redux";
import Layout from "../layout";
import { APP_PLATFORM } from "config/constants";
import layoutActions from "core/actions/layoutActions";
import QrCode2 from "@mui/icons-material/QrCode2";
import AccountTree from "@mui/icons-material/AccountTree";
import Dialpad from "@mui/icons-material/Dialpad";
import ListAlt from "@mui/icons-material/ListAlt";
import LocalGroceryStore from "@mui/icons-material/LocalGroceryStore";
import LocalConvenienceStore from "@mui/icons-material/LocalConvenienceStore";
import MapRounded from "@mui/icons-material/MapRounded";
import GroupTwoTone from "@mui/icons-material/GroupTwoTone";
import LocalShipping from "@mui/icons-material/LocalShipping";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import LibraryBooks from "@mui/icons-material/LibraryBooks";
import Home from "@mui/icons-material/Home";
import LocalActivityOutlined from "@mui/icons-material/LocalActivityOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import NotificationsActive from "@mui/icons-material/NotificationsActive";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import "../layout/layout.css";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { getCurrentApplicationName } from "core/Utils/functions/utils";

const ProductUnitDefinition = lazy(() => import("core/pages/product-unit-definition"));
const CreateNewUnitDefinition = lazy(() => import("core/pages/product-unit-definition/components/createnew"));
const GroupDefintions = lazy(() => import("core/pages/product-grouping/components/group-definition-components/groupdefinitions"));
const CreateDefintion = lazy(() => import("core/pages/product-grouping/components/group-definition-components/creategrpdefinition"));
const EditDefinition = lazy(() => import("core/pages/product-grouping/components/group-definition-components/editdefinition"));
const CreateProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/createGroup"));
const GroupDefMapper = lazy(() => import("core/pages/product-grouping/components/product-group-components/groupdefinitionMapper"));
const GroupDefEdit = lazy(() => import("core/pages/product-grouping/components/group-definition-components/definitionmapedit"));
const EditUnitDefinition = lazy(() => import("core/pages/product-unit-definition/components/editDefinition"));
const EditGrpProducts = lazy(() => import("core/pages/product-grouping/components/product-group-components/editGrpProducts"));
const ModifyGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/modifyGroup"));
const AddProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/addProductGroup"));
const EditProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/editProductGroup"));
const CreateStoreGroup = lazy(() => import("core/pages/store-grouping/components/createGroup"));
const ModifyStoreGroup = lazy(() => import("core/pages/store-grouping/components/modifyGroup"));
const EditGrpStores = lazy(() => import("core/pages/store-grouping/components/editGrpStores"));
const CreateStoreGrade = lazy(() => import("core/pages/store-grading/components/createGrade"));
const Events = lazy(() => import("core/pages/notifications/components/event-configuration"));
const UserMangement = lazy(() => import("core/pages/tenant-config/access-user-management"));
const UserRoleManagement = lazy(() => import("core/pages/tenant-config/access-user-management/components/userRoleManagement"));
const Notification = lazy(() => import("core/pages/notifications"));
const AddStoreGroup = lazy(() => import("core/pages/store-grouping/components/addStoreGroup"));
const EditStoreGroup = lazy(() => import("core/pages/store-grouping/components/editStoreGroup"));
const AssortLandingPage = lazy(() => import("modules/assortsmart/pages-assortsmart/AssortLandingPage"));
const PlanSmartConfiguratorRoute = lazy(() => import("modules/plansmartConfigurator"));
const Filters = lazy(() => import("core/pages/filters"));
const ProductMapping = lazy(() => import("core/pages/product-mapping"));

const Product_Grouping_Screen = lazy(() =>
  import("core/pages/product-grouping")
);
const Store_Grouping_Screen = lazy(() => import("core/pages/store-grouping"));
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


const AgenticAssortRoutes = lazy(() => import("core/pages/agenticAssort/routes-agentic-assort"));
const AgenticPlanRoutes = lazy(() => import("core/pages/agenticPlan/routes-agentic-plan"));

export const uamSideBarOptions = [
  {
    link: "/user-management",
    title: "User Management",
    icon: React.createElement(ListAlt),
    order: 1,
    disabled: false,
  },
  // {
  //   link: "/tenantconfig/applicationconfig",
  //   title: "Tenant Management",
  //   icon: React.createElement(MapRounded),
  //   order: 2,
  //   disabled: false,
  // },
];

export const notificationSideBarOptions = [
  {
    link: "/events",
    title: "Notifications",
    icon: React.createElement(NotificationsActive),
    order: 1,
  },
];

export const moduleConfiguratorSideBarOptions = [
  {
    link: "/configurator",
    title: "Module Configurator",
    icon: React.createElement(SettingsOutlined),
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
        path: `/product-mapping`,
        component: ProductMapping,
        title: `${dynamicLabelsBasedOnTenant("product_mapping", "core")}`,
        screenName: "Product Mapping",
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
        icon: React.createElement(QrCode2),
        childList: [
          {
            link: "/product-mapping",
            title: `${dynamicLabelsBasedOnTenant("product_mapping", "core")}`,
            icon: React.createElement(AccountTree),
            order: 1,
            disabled: false,
          },
          {
            link: "/product-grouping",
            title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
            icon: React.createElement(Dialpad),
            order: 2,
            disabled: false,
          },
          {
            link: "/product-unit-definition",
            title: `${dynamicLabelsBasedOnTenant(
              "product_unit_definition",
              "core"
            )}`,
            icon: React.createElement(ListAlt),
            order: 3,
            disabled: false,
          },
        ],
      },
      {
        isParent: true,
        title: `Store`,
        icon: React.createElement(LocalGroceryStore),
        childList: [
          {
            link: "/store-grouping",
            title: "Store Grouping",
            icon: React.createElement(Dialpad),
            order: 6,
          },
          {
            link: "/store-mapping",
            title: "Store Mapping",
            icon: React.createElement(AccountTree),
            order: 7,
            disabled: false,
          },
          {
            link: "/store-grading",
            title: "Store Grading",
            icon: React.createElement(AccountTree),
            order: 8,
            disabled: false,
          },
        ],
      },
      {
        isParent: true,
        title: `DC`,
        icon: React.createElement(LocalConvenienceStore),
        childList: [
          {
            link: "/dc-mapping",
            title: "DC Mapping",
            icon: React.createElement(MapRounded),
            order: 10,
            disabled: false,
          },
        ],
      },
      {
        isParent: true,
        title: `Vendor`,
        icon: React.createElement(GroupTwoTone),
        childList: [
          {
            link: "/vendor-status",
            title: "Vendor Status",
            icon: React.createElement(LocalShipping),
            order: 11,
            disabled: false,
          },
          {
            link: "/vendor-product",
            title: `${dynamicLabelsBasedOnTenant("vendor_product", "core")}`,
            icon: React.createElement(CategoryRounded),
            order: 12,
            disabled: false,
          },
        ],
      },
      {
        link: "/inventory",
        title: "Inventory",
        icon: React.createElement(LibraryBooks),
        order: 13,
        disabled: false,
      },
    ];
    const homeSidebarOptions = [
      {
        link: "/home",
        title: "Home",
        icon: React.createElement(Home),
        order: 1,
      },
      {
        isParentBottom: true,
        isPositionBottom: true,
        title: "Support",
        icon: React.createElement(LocalActivityOutlined),
        childList: [
          {
            link: props.helpDesk ? props.helpDesk : "",
            title: "Raise a ticket",
            icon: React.createElement(HelpOutlineOutlined),
            order: 2,
            openInNewPage: true,
          },
          {
            link: "/ticketing-system",
            title: "View Ticket Reports",
            appTitle: "ticketing",
            icon: React.createElement(FlagOutlined),
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
