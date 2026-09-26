import React, { useEffect, lazy, useState } from "react";
import { connect } from "react-redux";
import Layout from "../layout";
import { APP_PLATFORM } from "config/constants";
import layoutActions from "core/actions/layoutActions";
import ListAlt from "@mui/icons-material/ListAlt";
import Home from "@mui/icons-material/Home";
import LocalActivityOutlined from "@mui/icons-material/LocalActivityOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import NotificationsActive from "@mui/icons-material/NotificationsActive";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import "../layout/layout.css";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";
import { getCurrentApplicationName } from "core/Utils/functions/utils";

const GroupDefintions = lazy(() => import("core/pages/product-grouping/components/group-definition-components/groupdefinitions"));
const CreateDefintion = lazy(() => import("core/pages/product-grouping/components/group-definition-components/creategrpdefinition"));
const EditDefinition = lazy(() => import("core/pages/product-grouping/components/group-definition-components/editdefinition"));
const CreateProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/createGroup"));
const GroupDefMapper = lazy(() => import("core/pages/product-grouping/components/product-group-components/groupdefinitionMapper"));
const GroupDefEdit = lazy(() => import("core/pages/product-grouping/components/group-definition-components/definitionmapedit"));
const EditGrpProducts = lazy(() => import("core/pages/product-grouping/components/product-group-components/editGrpProducts"));
const ModifyGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/modifyGroup"));
const AddProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/addProductGroup"));
const EditProductGroup = lazy(() => import("core/pages/product-grouping/components/product-group-components/editProductGroup"));
const CreateStoreGroup = lazy(() => import("core/pages/store-grouping/components/createGroup"));
const ModifyStoreGroup = lazy(() => import("core/pages/store-grouping/components/modifyGroup"));
const EditGrpStores = lazy(() => import("core/pages/store-grouping/components/editGrpStores"));
const Events = lazy(() => import("core/pages/notifications/components/event-configuration"));
const UserMangement = lazy(() => import("core/pages/tenant-config/access-user-management"));
const UserRoleManagement = lazy(() => import("core/pages/tenant-config/access-user-management/components/userRoleManagement"));
const Notification = lazy(() => import("core/pages/notifications"));
const AddStoreGroup = lazy(() => import("core/pages/store-grouping/components/addStoreGroup"));
const EditStoreGroup = lazy(() => import("core/pages/store-grouping/components/editStoreGroup"));
const AssortLandingPage = lazy(() => import("modules/assortsmart/pages-assortsmart/AssortLandingPage"));
const PlanSmartConfiguratorRoute = lazy(() => import("modules/plansmartConfigurator"));

const Product_Grouping_Screen = lazy(() =>
  import("core/pages/product-grouping")
);
const Store_Grouping_Screen = lazy(() => import("core/pages/store-grouping"));

export const uamSideBarOptions = [
  {
    link: "/user-management",
    title: "User Management",
    icon: React.createElement(ListAlt),
    order: 1,
    disabled: false,
  },
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
        path: `/configurator/plansmart/:screen`,
        component: PlanSmartConfiguratorRoute,
        title: "PlansmartConfiguratorScreen",
        screenName: "Plansmart Configurator View",
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
