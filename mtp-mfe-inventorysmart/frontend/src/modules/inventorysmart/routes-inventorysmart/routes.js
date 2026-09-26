import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
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
import BuildIcon from "@mui/icons-material/Build";
import StoreIcon from "@mui/icons-material/Store";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import MoveDownIcon from "@mui/icons-material/MoveDown";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SettingsIcon from "../../../assets/impactv3/Settings.svg";
import { TENANT } from "config/api";
import {
  CONSTRAINTS,
  CREATE_PRODUCT_PROFILE,
  EDIT_CREATE_EXCEPTION_SCREEN,
  EXCEPTION_SCREEN,
  PRODUCT_PROFILE,
  CREATE_ALLOCATION,
  CREATE_STORE_TRANSFER,
  CREATE_DC_TRANSFER,
  CONFIGURATION,
  CONFIGURE,
  MANAGE_EXCEPTIONS,
  REVIEW_RULES,
  ADD_RULES,
  REVIEW_EXCEPTIONS,
  STORE_ELIGIBILITY_GROUP,
  CREATE_NEW_PRODUCT_MAPPING,
  ADA_VISUAL,
  VIEW_PAST_ALLOCATION,
  DASHBOARD,
  Add_RCL,
  CREATE_NEW_RULE,
  ALLOCATION_REPORT,
  ADA_VISUAL_MFP_DASHBOARD,
  EDIT_RULES,
  ORDER_BATCHING_PATH,
  ADD_NEW_STORE,
  CREATE_AUTO_ALLOCATION_RULES_PAGE,
  UPLOAD_VALIDATION,
  NEW_STORE_APPROVAL_FLOW,
  NEW_STORE_RELEASE_FLOW,
  REMODEL_STORE_RELEASE_FLOW,
  REMODEL_STORE_APPROVAL_FLOW,
  NEW_REMODEL_STORE,
  DC_TO_DC_TRANSFER_PATH,
  CREATE_SCENARIO,
  DC_TRANSFER_ALLOCATION_ALERT,
  ADA_VISUAL_STANDALONE,
  ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
  ADD_NEW_STORE_TRANSFER_RULE,
  STORE_TRANSFER_RULE_NEW_FLOW,
  ADD_NEW_DC_TRANSFER_RULE,
  KPI_CONFIGURATOR,
  CREATE_KPI,
  EDIT_KPI,
  AUTO_ALLOCATION_RECOMMENDATION,
  PRODUCT_STATUS,
  STORE_STATUS,
  KEYBOARD_SHORTCUTS_REDIRECT,
} from "../constants-inventorysmart/routesConstants";
import ProductStatusComponent from "../pages-inventorysmart/Product-Status";
import StoreStatusComponent from "../pages-inventorysmart/Store-Status";
import CreateProductProfileFiltersComponent from "../pages-inventorysmart/Product-Profile/Create-Product-Profile/create-product-profile-filters";
import ProductProfileComponent from "../pages-inventorysmart/Product-Profile";
import Configuration from "../pages-inventorysmart/Configuration";
import ConfigureContent from "../pages-inventorysmart/DC-Store-Policy/DC-To-Store-Strategy/configure-page/ConfigureContent";
import ConfigurePage from "../pages-inventorysmart/DC-Store-Policy/DC-To-Store-Strategy/configure-page/ConfigurePage";
import StoreEligiblityGroup from "../pages-inventorysmart/Store-Eligibility-Group";
import editGrpStores from "core/pages/store-grouping/components/editGrpStores";
import CreateStoreGroup from "core/pages/store-grouping/components/createGroup";
import UploadStoreGroup from "core/pages/store-grouping/components/uploadStoreGroups";
import ModifyStoreGroup from "core/pages/store-grouping/components/modifyGroup";
import AddStoreGroup from "core/pages/store-grouping/components/addStoreGroup";
import EditStoreGroup from "core/pages/store-grouping/components/editStoreGroup";
import GroupDefEdit from "core/pages/product-grouping/components/group-definition-components/definitionmapedit";
import CreateDefintion from "core/pages/product-grouping/components/group-definition-components/creategrpdefinition";
import GroupDefMapper from "core/pages/product-grouping/components/product-group-components/groupdefinitionMapper";
import CreateProductGroup from "core/pages/product-grouping/components/product-group-components/createGroup";
import GroupDefintions from "core/pages/product-grouping/components/group-definition-components/groupdefinitions";
import EditGrpProducts from "core/pages/product-grouping/components/product-group-components/editGrpProducts";
import EditDefinition from "core/pages/product-grouping/components/group-definition-components/editdefinition";
import ModifyGroup from "core/pages/product-grouping/components/product-group-components/modifyGroup";
import AddProductGroup from "core/pages/product-grouping/components/product-group-components/addProductGroup";
import EditProductGroup from "core/pages/product-grouping/components/product-group-components/editProductGroup";
import DcToDcTransferComponent from "../pages-inventorysmart/DC-DC-Transfer/LandingPage/index.jsx";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import {
  getInventorySmartAttributes,
  resetCommonStoreState,
  setInventorysmartScreenConfig,
  setInventorysmartCreateAllocationConfig,
  setProductStoreMappingConfig,
  setInventorysmartFinalizeAllocationConfig,
  setInventorysmartScreenConfigLoader,
  setOrderBatchingConfig,
} from "../services-inventorysmart/common/inventory-smart-common-services";
import { addSnack } from "core/actions/snackbarActions";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";
import { TourSharp } from "@mui/icons-material";
import Constraints from "../pages-inventorysmart/Constraints";
import AllocationReportingComponent from "../pages-inventorysmart/Allocation-Reporting";
import ExceptionsStores from "../pages-inventorysmart/Exceptions-stores";
import ProductMapping from "modules/inventorysmart/pages-inventorysmart/Product-Mapping";
import StoreMapping from "modules/inventorysmart/pages-inventorysmart/Store-Mapping";
import DcMapping from "modules/inventorysmart/pages-inventorysmart/DC-Mapping";
import ManageExceptions from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/manageExceptions";
import ReviewExceptions from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/reviewExceptions";
import ReviewRule from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/reviewRule";
import AddRule from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/addRule";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import CreateNewProductsMapping from "../pages-inventorysmart/Product-Supersession/Create-New-Product-Mapping";
import ADAVisual from "../pages-inventorysmart/ADA-Visual";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import KeyboardShortcutIcon from "coreAssets/keyboardShortcutIcon.svg";
import ViewPastAllocation from "../pages-inventorysmart/View-Past-Allocation";
import ADAVisualMFPDashboard from "../pages-inventorysmart/ADA-Visual-MFP-Dashboard";
import editRulesComponent from "../pages-inventorysmart/Constraints/Rules-Constraints/edit-rules-component";
import AddRclConstraints from "../pages-inventorysmart/Constraints/Rules-Constraints/add-rcl-component";
import CreateNewAllocationComponent from "../pages-inventorysmart/Create-Allocation";
import CreateStoreTransfer from "../pages-inventorysmart/Create-Store-Transfer";
import CreateDcTransfer from "../pages-inventorysmart/Create-DC-Transfer";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import editCreateExceptionTab from "../pages-inventorysmart/Exceptions-stores/edit-create-exception-tab";
import DashboardComponent from "../pages-inventorysmart/Decision-Dashboard";
import OrderBatchingComponent from "../pages-inventorysmart/Order-Batching/index";
import AddNewStore from "../pages-inventorysmart/New-Store-Setup/Add-New-Store";
import NewStoreApprovalFlow from "../pages-inventorysmart/New-Store-Setup/Approval-Flow";
import NewStoreReleaseFlow from "../pages-inventorysmart/New-Store-Setup/Release-Flow";
import CreateAutoAllocationRules from "../pages-inventorysmart/AutoAllocationRules/CreateAutoAllocationRules";
import FileUploadValidation from "core/pages/file-upload-validation";
import LoadingOverlay from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { clearNewStoreModuleConfig } from "../services-inventorysmart/New-Store/new-store-dashboard";
import { clearActiveModuleCache } from "../services-inventorysmart/active-module-common-service";
import {
  CONFIGUTAIONS_CACHE,
  REVAMP_ADA_VISUAL_CLIENTS,
} from "../constants-inventorysmart/stringConstants";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import NewRemodelStoreComponent from "../pages-inventorysmart/Remodel-Store-Setup/New-Remodel-Store";
import RemodelStoreApproveFlow from "../pages-inventorysmart/Remodel-Store-Setup/Approve-Flow";
import RemodelStoreReleaseFlow from "../pages-inventorysmart/Remodel-Store-Setup/Release-Flow";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import CreateScenario from "../pages-inventorysmart/CreateScenario";
import CreateRuleFlow from "../pages-inventorysmart/Store-Transfer-Rule/CreateRuleFlow";
import CreateStoreTransferRuleNewFlow from "../pages-inventorysmart/Store-Transfer-Rule_New_Flow/CreateRuleFlow";
import CreateDCTransferRuleFlow from "../pages-inventorysmart/DC-Transfer-Rule/CreateRuleFlow";
import ReviewDCTransfer from "../pages-inventorysmart/StoreInventoryAlerts/components/ReviewDCTransfer";
import KPIConfigurator from "../pages-inventorysmart/KPI-Configurator";
import CreateKPI from "../pages-inventorysmart/KPI-Configurator/CreateKPI/components/CreateKPI";
import AutoAllocationRecommendation from "../pages-inventorysmart/Auto-Allocation-Recommendation";
import KeyboardShortcutsRedirect from "../pages-inventorysmart/KeyboardShortcutsRedirect/index.jsx";
import Icon from "@mui/material/Icon";
import ConfiguratorLandingScreen from "../pages-inventorysmart/moduleConfiguratorScreen/moduleConfiguratorLandingScreen";
import ApplicationConfiguratorScreen from "../pages-inventorysmart/moduleConfiguratorScreen/ApplicationConfigurator";
import TenantConfigurationScreen from "../pages-inventorysmart/moduleConfiguratorScreen/TenantConfiguration";
import SystemConfiguratorScreen from "../pages-inventorysmart/moduleConfiguratorScreen/SystemConfigurator";
import ConfiguratorScreen from "../pages-inventorysmart/moduleConfiguratorScreen/moduleWorkflowConfig";
import AccessManagementScreen from "../pages-inventorysmart/ModuleAccessManagement";

// -- Start of OMS Modules
import {
  OMS_MODULE_CONFIGURATION,
  OMS_USER_ACCESS_CONTROL,
} from "modules/oms/constants-oms/stringConstants";
import OrderingWrapper from "modules/oms/pages-oms/common/OrderingWrapper.jsx";
import CreateNewOrder from "modules/oms/pages-oms/Create-New-Order";
import OrderDeepDive from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive";
import OrderManagement from "modules/oms/pages-oms/Order-Management";
import OrderManagementV3 from "modules/oms/pages-oms/OrderManagement";
import ProductDetailsScreenV3 from "modules/oms/pages-oms/OrderManagement/ProductDetails";
import OrderCreateScenarioV3 from "modules/oms/pages-oms/OrderManagement/CreateScenario";
import MatrixSummary from "modules/oms/pages-oms/Order-Management/components/edit-hierarcy-forecast/editHierarchyMainIndex";
import OrderDetailsWrapper from "modules/oms/pages-oms/Order-Management/VendorStore/components/Order-Details/OrderDetailsWrapper";
import ProductDetailsScreen from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen";
import OrderCreateScenario from "modules/oms/pages-oms/Order-Management/Order-Create-Scenario";
import OrderCreateScenarioStore from "modules/oms/pages-oms/Order-Management/VendorStore/components/Order-Create-Scenario-Store";
import OrderRepository from "modules/oms/pages-oms/Order-Repository";
import PORebalanceComponent from "modules/oms/pages-oms/PO-Rebalance";
import OffCycleOrderViewDrafts from "modules/oms/pages-oms/OffCycle Order/ViewDrafts";
import OrderingConfigurator from "modules/oms/pages-oms/Ordering-Configurator";
import ModuleConfiguratorScreen from "modules/oms/pages-oms/Ordering-Configurator/ModuleConfigurator";
import ScreenConfigurationScreen from "modules/oms/pages-oms/Ordering-Configurator/ScreenConfiguration";
import OffCycleOrderExpediteOrders from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders";
import {
  CREATE_NEW_ORDER,
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_DEEP_DIVE,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_MANAGEMENT_CREATE_SCENARIO_STORE,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_ORDER_DETAILS,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_REPOSITORY,
  PO_REBALANCE,
  CONFIGURATOR,
  OFF_CYCLE_ORDER_VIEW_DRAFTS,
  OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V4,
  ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
} from "modules/oms/constants-oms/routeConstants";
import {
  setGenericTenantConfig,
  getOrderingRoleConfig,
  setOrderingRoleConfigSuccess,
  setOrderingAccessControl,
  setOrderingModuleConfig,
  setOrderingPackOrderConfig,
  setOrderingScreensConfig,
  setOmsBudgetConfig,
  setOmsDcFilterConfig,
  setOrderingVendorToStoreConfig,
  setOrderingUserAccess,
  setOrderRepositoryScreenConfig,
  setOrderRepositoryVendorDCConfig,
  setOrderRepositoryVendorToStoreConfig,
  resetOrderingCommonStates,
} from "modules/oms/services-oms/common/ordering-common-services";
import { OMS_BUDGET_CONFIG_ATTRIBUTE } from "modules/oms/utils-oms/omsBudgetConfig.util.js";
import { OMS_DC_FILTER_CONFIG_ATTRIBUTE } from "modules/oms/utils-oms/omsDcFilterConfig.util.js";
import { setOffCycleOrderConfiguration } from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import { maybeCollapseSingleOmNavTitle } from "modules/oms/pages-oms/OrderManagement/utils/resolveOmNavVariants.util.js";
import { CreateNewRuleFlow } from "../pages-inventorysmart/Constraints/create-new-rule-flow";

const CreateNewOrderWrapped = (props) => (
  <OrderingWrapper WrappedComponent={CreateNewOrder} {...props} />
);

const OrderManagementWrapped = (props) => (
  <OrderingWrapper WrappedComponent={OrderManagement} {...props} />
);

const OrderManagementV3Wrapped = (props) => (
  <OrderingWrapper WrappedComponent={OrderManagementV3} {...props} />
);

const OrderManagementV4Wrapped = (props) => (
  <OrderingWrapper WrappedComponent={OrderManagementV3} {...props} />
);

const OrderManagementV3ProductDetailsWrapped = (props) => (
  <OrderingWrapper WrappedComponent={ProductDetailsScreenV3} {...props} />
);

const OrderCreateScenarioV3Wrapped = (props) => (
  <OrderingWrapper WrappedComponent={OrderCreateScenarioV3} {...props} />
);

const OrderRepositoryWrapped = (props) => (
  <OrderingWrapper WrappedComponent={OrderRepository} {...props} />
);

const PORebalanceWrapped = (props) => (
  <OrderingWrapper WrappedComponent={PORebalanceComponent} {...props} />
);

// -- End of OMS Modules

// Adding hardCoded function to get the sideBarOptions based on the tenant
const getAdaLinks = () => {
  return {
    ADA_VISUAL: ADA_VISUAL_STANDALONE,
    ADA_VISUAL_MFP_DASHBOARD: ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
  };
};

/** Default Side Bar Options & Routes for Inventory Smart */

export const sideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    icon: React.createElement(GridViewIcon),
    order: 1,
    screenName: "InventoryDashboard",
    module: "dashboard",
  },
  {
    link: PRODUCT_PROFILE,
    title: "Product Profile",
    icon: React.createElement(CategoryIcon),
    order: 6,
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
  },
  {
    link: `${CREATE_ALLOCATION}?step=0`,
    title: "Create New Allocation",
    icon: React.createElement(BubbleChartIcon),
    order: 2,
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
  },
  {
    link: CREATE_DC_TRANSFER,
    title: "Create DC Transfer",
    icon: React.createElement(LocalShippingIcon),
    order: 12,
    screenName: "Inventorysmart Create DC Transfer",
    module: "inventorysmart_create_dc_transfer",
  },
  {
    link: STORE_ELIGIBILITY_GROUP,
    title: "Grouping",
    icon: React.createElement(DialpadIcon),
    order: 3,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
  },
  {
    link: CONFIGURATION,
    title: "Configuration",
    icon: React.createElement(TungstenOutlinedIcon),
    order: 4,
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
  },
  {
    link: CONSTRAINTS,
    title: "Constraints",
    icon: React.createElement(TourSharp),
    order: 5,
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_constraints",
  },
  {
    link: ALLOCATION_REPORT,
    title: "Report",
    icon: React.createElement(BarChartIcon),
    order: 7,
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
  },
  {
    link: getAdaLinks().ADA_VISUAL,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    link: getAdaLinks().ADA_VISUAL_MFP_DASHBOARD,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
  },
  {
    link: VIEW_PAST_ALLOCATION,
    title: "View Past Allocation",
    icon: React.createElement(AccessTimeIcon),
    order: 10,
    screenName: "Inventorysmart View Past Allocations",
    module: "inventorysmart_view_past_allocation",
  },
  {
    link: ORDER_BATCHING_PATH,
    icon: React.createElement(FactoryOutlined),
    title: "Order Batching",
    screenName: "Inventorysmart Order Batching",
    module: "inventorysmart_order_batching",
    order: 11,
  },
  {
    link: ORDER_MANAGEMENT,
    title: "Order Management",
    icon: React.createElement(Inventory2Outlined),
    order: 12,
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorysmart_order_management",
  },
  {
    link: ORDER_MANAGEMENT_V3,
    title: "Order Management (New)",
    icon: React.createElement(Inventory2Outlined),
    order: 18,
    screenName: "Inventorysmart Oms Order Management V3",
    module: "inventorysmart_order_management_v3",
  },
  {
    link: ORDER_MANAGEMENT_V4,
    title: "Order Management V4",
    icon: React.createElement(Inventory2Outlined),
    order: 19,
    screenName: "Inventorysmart Oms Order Management V4",
    module: "inventorysmart_order_management_v4",
  },
  {
    link: ORDER_REPOSITORY,
    title: "Order Repository",
    icon: React.createElement(InventoryOutlinedIcon),
    order: 13,
    screenName: "Inventorysmart Oms Order Repository",
    module: "inventorysmart_order_repository",
  },
  {
    link: CREATE_NEW_ORDER,
    title: "Create New Order",
    icon: React.createElement(NoteAddOutlinedIcon),
    order: 14,
    screenName: "Oms Create Order",
    module: "inventorysmart_create_new_order",
  },
  {
    link: DC_TO_DC_TRANSFER_PATH,
    title: "DC To DC Transfer",
    icon: React.createElement(GridViewIcon),
    order: 15,
    screenName: "Inventory-Dc-To-DC-Transfer",
    module: "inventorysmart_dc_to_dc_transfer",
  },
  {
    link: PO_REBALANCE,
    title: "PO Rebalance",
    icon: React.createElement(LoopIcon),
    order: 16,
    screenName: "PO-Rebalance",
    module: "inventorysmart_po_rebalance",
  },
  {
    link: CONFIGURATOR,
    title: "Super Admin",
    icon: React.createElement(LoopIcon),
    order: 17,
    screenName: "Super-Admin",
    module: "inventorysmart_super_admin",
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
      },
      {
        link: STORE_ELIGIBILITY_GROUP,
        title: "Grouping",
        icon: React.createElement(DialpadIcon),
        order: 3,
        screenName: "Inventorysmart Store Eligibility Group",
        module: "inventorysmart_store_eligibility_group",
      },
      {
        link: CONFIGURATION,
        title: "Configuration",
        icon: React.createElement(TungstenOutlinedIcon),
        order: 4,
        screenName: "Inventorysmart Configurations",
        module: "inventorysmart_configuration",
        disabled: false,
      },
      {
        link: CONSTRAINTS,
        title: "Constraints",
        icon: React.createElement(TourSharp),
        order: 5,
        screenName: "Inventorysmart Constraints",
        module: "inventorysmart_constraints",
        disabled: false,
      },
      {
        link: KPI_CONFIGURATOR,
        title: "KPI Configurator",
        icon: React.createElement(AnalyticsIcon),
        order: 6,
        screenName: "KPI Configurator",
        module: "inventorysmart_kpi_configurator",
        disabled: false,
      },
    ],
  },
  {
    link: getAdaLinks().ADA_VISUAL_MFP_DASHBOARD,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 8,
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
    childList: [],
  },
  {
    link: getAdaLinks().ADA_VISUAL,
    title: "ADA Visual",
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
      },
      {
        link: `${CREATE_STORE_TRANSFER}?step=0`,
        title: "Create New Store Transfer",
        icon: React.createElement(MoveDownIcon),
        order: 13,
        screenName: "Inventorysmart Create Store Transfer",
        module: "inventorysmart_create_store_transfer",
        disabled: false,
      },
      {
        link: CREATE_DC_TRANSFER,
        title: "Create DC Transfer",
        icon: React.createElement(LocalShippingIcon),
        order: 14,
        screenName: "Inventorysmart Create DC Transfer",
        module: "inventorysmart_create_dc_transfer",
        disabled: false,
      },
      {
        link: ORDER_BATCHING_PATH,
        icon: React.createElement(FactoryOutlined),
        title: "Order Batching",
        screenName: "Inventorysmart Order Batching",
        module: "inventorysmart_order_batching",
        order: 11,
        disabled: false,
      },
      {
        link: VIEW_PAST_ALLOCATION,
        title: "View Past Allocation",
        icon: React.createElement(AccessTimeIcon),
        order: 10,
        screenName: "Inventorysmart View Past Allocations",
        module: "inventorysmart_view_past_allocation",
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
      },
      {
        link: ORDER_MANAGEMENT_V3,
        title: "Order Management (New)",
        icon: React.createElement(Inventory2Outlined),
        order: 18,
        screenName: "Inventorysmart Oms Order Management V3",
        module: "inventorysmart_order_management_v3",
        disabled: false,
      },
      {
        link: ORDER_MANAGEMENT_V4,
        title: "Order Management V4",
        icon: React.createElement(Inventory2Outlined),
        order: 19,
        screenName: "Inventorysmart Oms Order Management V4",
        module: "inventorysmart_order_management_v4",
        disabled: false,
      },
      {
        link: ORDER_REPOSITORY,
        title: "Order Repository",
        icon: React.createElement(InventoryOutlinedIcon),
        order: 13,
        screenName: "Inventorysmart Oms Order Repository",
        module: "inventorysmart_order_repository",
        disabled: false,
      },
      {
        link: CREATE_NEW_ORDER,
        title: "Create New Order",
        icon: React.createElement(NoteAddOutlinedIcon),
        order: 14,
        screenName: "Oms Create Order",
        module: "inventorysmart_create_new_order",
        disabled: false,
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
  },
  {
    link: DC_TO_DC_TRANSFER_PATH,
    title: "DC To DC Transfer",
    icon: React.createElement(GridViewIcon),
    order: 15,
    screenName: "Inventory-Dc-To-DC-Transfer",
    module: "inventorysmart_dc_to_dc_transfer",
    childList: [],
  },
  {
    link: PO_REBALANCE,
    title: "PO Rebalance",
    icon: React.createElement(LoopIcon),
    order: 16,
    screenName: "PO-Rebalance",
    module: "inventorysmart_po_rebalance",
    childList: [],
  },
  {
    link: CONFIGURATOR,
    title: "Super Admin",
    icon: React.createElement(BuildIcon),
    order: 17,
    screenName: "Super-Admin",
    module: "inventorysmart_super_admin",
    childList: [],
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
      },
      {
        link: ORDER_BATCHING_PATH,
        icon: React.createElement(FactoryOutlined),
        title: "Order Batching",
        screenName: "Inventorysmart Order Batching",
        module: "inventorysmart_order_batching",
        order: 11,
        disabled: false,
      },
      {
        link: ORDER_MANAGEMENT,
        title: "Order Management",
        icon: React.createElement(Inventory2Outlined),
        order: 12,
        screenName: "Inventorysmart Oms Order Management",
        module: "inventorysmart_order_management",
        disabled: false,
      },
      {
        link: ORDER_REPOSITORY,
        title: "Order Repository",
        icon: React.createElement(InventoryOutlinedIcon),
        order: 13,
        screenName: "Inventorysmart Oms Order Repository",
        module: "inventorysmart_order_repository",
        disabled: false,
      },
      {
        link: CREATE_NEW_ORDER,
        title: "Create New Order",
        icon: React.createElement(NoteAddOutlinedIcon),
        order: 14,
        screenName: "Oms Create Order",
        module: "inventorysmart_create_new_order",
        disabled: false,
      },
      {
        link: ALLOCATION_REPORT,
        title: "Report",
        icon: React.createElement(BarChartIcon),
        order: 7,
        screenName: "Inventorysmart Reportings",
        module: "inventorysmart_allocation_report",
        disabled: false,
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
      },
      {
        link: CONFIGURATION,
        title: "Configuration",
        icon: React.createElement(TungstenOutlinedIcon),
        order: 4,
        screenName: "Inventorysmart Configurations",
        module: "inventorysmart_configuration",
        disabled: false,
      },
      {
        link: CONSTRAINTS,
        title: "Constraints",
        icon: React.createElement(TourSharp),
        order: 5,
        screenName: "Inventorysmart Constraints",
        module: "inventorysmart_constraints",
        disabled: false,
      },
    ],
  },
];

const routes = [
  {
    path: UPLOAD_VALIDATION,
    component: FileUploadValidation,
    title: "File Upload Validation",
    screenName: "File Upload Validation",
    module: "file_upload_validation",
  },
  {
    path: DASHBOARD,
    component: DashboardComponent,
    title: "Dashboard",
    screenName: "InventoryDashboard",
    module: "dashboard",
  },
  {
    path: PRODUCT_PROFILE,
    component: ProductProfileComponent,
    title: "Product Profile",
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
  },
  {
    path: CREATE_ALLOCATION,
    component: CreateNewAllocationComponent,
    title: "Create New Allocation",
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
  },
  {
    path: CREATE_STORE_TRANSFER,
    component: CreateStoreTransfer,
    title: "Create New Store Transfer",
    screenName: "Inventorysmart Create Store Transfer",
    module: "inventorysmart_create_store_transfer",
  },
  {
    path: CREATE_DC_TRANSFER,
    component: CreateDcTransfer,
    title: "Create DC Transfer",
    screenName: "Inventorysmart Create DC Transfer",
    module: "inventorysmart_create_dc_transfer",
  },
  {
    path: CREATE_SCENARIO,
    component: CreateScenario,
    title: "Create New Scenario",
    screenName: "Allocation",
    module: "inventorysmart_create_scenario",
  },
  {
    path: CREATE_PRODUCT_PROFILE,
    component: CreateProductProfileFiltersComponent,
    screenName: "Create Product Profile",
    module: "inventorysmart_create_product_profile",
  },
  {
    path: CONSTRAINTS,
    component: Constraints,
    title: "Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_constraints",
  },
  {
    path: ALLOCATION_REPORT,
    component: AllocationReportingComponent,
    title: "Report",
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
  },
  {
    path: EXCEPTION_SCREEN,
    component: ExceptionsStores,
    title: "Inventorysmart Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_exception_constraint",
  },
  {
    path: EDIT_CREATE_EXCEPTION_SCREEN,
    component: editCreateExceptionTab,
    title: "Inventorysmart Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_add_exception",
  },
  {
    path: EDIT_RULES,
    component: editRulesComponent,
    title: "Inventorysmart Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_create_rules",
  },
  {
    path: Add_RCL,
    component: AddRclConstraints,
    title: "Add Exception Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_add_rules",
  },
  {
    path: CREATE_NEW_RULE,
    component: CreateNewRuleFlow,
    title: "Create new rule",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_create_new_rule",
  },
  {
    path: STORE_ELIGIBILITY_GROUP,
    component: StoreEligiblityGroup,
    title: "Store Eligiblity Group",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/view/:group_id`,
    component: editGrpStores,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_edit_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/modify/:group_id`,
    component: ModifyStoreGroup,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_modify_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/create-group`,
    component: CreateStoreGroup,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/upload-group`,
    component: UploadStoreGroup,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_upload_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/add-stores`,
    component: AddStoreGroup,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_add_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/bulk-edit`,
    component: EditStoreGroup,
    title: "Store Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_delete_store_eligibility_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definition-mapping/:group_id/edit-definitions/:def_id`,
    component: GroupDefEdit,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_edit_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definition-mapping/:group_id/create-definition`,
    component: CreateDefintion,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definition-mapping/:group_id`,
    component: GroupDefMapper,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_view_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group`,
    component: CreateProductGroup,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_group_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`,
    component: GroupDefintions,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_group_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions/create-definition`,
    component: CreateDefintion,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_group_create_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/view/:group_id`,
    component: EditGrpProducts,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_view_group_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/:group_id/group-definitions/create-definition`,
    component: CreateDefintion,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_modify_group__create_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/:group_id/group-definitions/edit-definitions/:id`,
    component: EditDefinition,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_modify_group_edit_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/:group_id/group-definitions`,
    component: GroupDefintions,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_modify_group_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/modify/:group_id`,
    component: ModifyGroup,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_modify_group_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/add-products`,
    component: AddProductGroup,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_bulf_add_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/bulk-edit`,
    component: EditProductGroup,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_bulf_edit_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions`,
    component: GroupDefintions,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_view_group_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions/create-definition`,
    component: CreateDefintion,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_group_defs_create_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions/edit-definitions/:id`,
    component: EditDefinition,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_create_group_edit_def_product_group",
  },
  {
    path: `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions/edit-definitions/:id`,
    component: EditDefinition,
    title: `${dynamicLabelsBasedOnTenant("product_grouping", "core")}`,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_prod_group_edit_def_product_group",
  },
  {
    path: CREATE_AUTO_ALLOCATION_RULES_PAGE,
    component: CreateAutoAllocationRules,
    title: "Create Allocation Rules",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_auto_allocation",
  },
  {
    path: DC_TRANSFER_ALLOCATION_ALERT,
    component: ReviewDCTransfer,
    title: "DC Transfer Allocation Alert",
    screenName: "Inventorysmart Custom Allocation Alerts",
    module: "inventorysmart_dc_transfer_allocation_alert",
  },
  {
    path: CONFIGURATION,
    component: Configuration,
    title: "Configuration",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
  },
  {
    path: "/inventory-smart/ia-table/configuration",
    component: Configuration,
    title: "Configuration",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
  },
  {
    path: CONFIGURE,
    component: ConfigurePage,
    title: "Configure",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_configure",
  },
  {
    path: "/product-mapping",
    component: ProductMapping,
    title: `${dynamicLabelsBasedOnTenant("product_mapping", "core")}`,
    screenName: "Product Mapping",
    module: "inventorysmart_product_mapping",
  },
  {
    path: "/store-mapping",
    component: StoreMapping,
    title: "Store Mapping",
    screenName: "Store Mapping",
    module: "inventorysmart_store_mapping",
  },
  {
    path: "/dc-mapping",
    component: DcMapping,
    title: "DC Mapping",
    screenName: "DC Mapping",
    module: "inventorysmart_dc_mapping",
  },
  {
    path: MANAGE_EXCEPTIONS,
    component: ManageExceptions,
    title: "Manage Exceptions",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_manage_exceptions_product_mapping",
  },
  {
    path: REVIEW_RULES,
    component: ReviewRule,
    title: "Review Rules",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_review_rules_product_mapping",
  },
  {
    path: ADD_RULES,
    component: AddRule,
    title: "Manage Exceptions",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_add_rule_product_mapping",
  },
  {
    path: REVIEW_EXCEPTIONS,
    component: ReviewExceptions,
    title: "Review Exceptions",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration_review_excpetions_product_mapping",
  },
  {
    path: CREATE_NEW_PRODUCT_MAPPING,
    component: CreateNewProductsMapping,
    title: "Create New Mapping",
    screenName: "Inventorysmart Configurations Product Supersession",
    module: "inventorysmart_configuration_new_product_mapping",
  },
  {
    path: getAdaLinks().ADA_VISUAL,
    component: ADAVisual,
    title: "ADA Visual",
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    path: getAdaLinks().ADA_VISUAL_MFP_DASHBOARD,
    component: ADAVisualMFPDashboard,
    title: "ADA Visual Dashboard",
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
  },
  {
    path: VIEW_PAST_ALLOCATION,
    component: ViewPastAllocation,
    title: "View Past Allocations",
    screenName: "Inventorysmart View Past Allocations",
    module: "inventorysmart_view_past_allocation",
  },
  {
    path: `/inventory-smart/store-eligibility-grouping/product-grouping`,
    component: StoreEligiblityGroup,
    title: "Grouping",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
  },
  {
    path: ORDER_BATCHING_PATH,
    component: OrderBatchingComponent,
    title: "Order Batching",
    screenName: "Inventorysmart Order Batching",
    module: "inventorysmart_order_batching",
  },
  {
    path: ADD_NEW_STORE,
    component: AddNewStore,
    title: "Configuration",
    screenName: "Inventorysmart Configurations New Store",
    module: "inventorysmart_configuration_add_new_store",
  },
  {
    path: ORDER_MANAGEMENT,
    component: OrderManagementWrapped,
    title: "Order Management",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorysmart_order_management",
  },
  {
    path: ORDER_MANAGEMENT_V3,
    component: OrderManagementV3Wrapped,
    title: "Order Management (New)",
    screenName: "Inventorysmart Oms Order Management V3",
    module: "inventorysmart_order_management_v3",
  },
  {
    path: ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
    component: OrderManagementV3ProductDetailsWrapped,
    title: "Order Management Product Details",
    screenName: "Inventorysmart Oms Order Management V3",
    module: "inventorysmart_order_management_v3_product_details",
  },
  {
    path: ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
    component: OrderCreateScenarioV3Wrapped,
    title: "Order Management Create Scenario",
    screenName: "Inventorysmart Oms Order Management V3",
    module: "inventorysmart_order_management_v3_create_scenario",
  },
  {
    path: ORDER_MANAGEMENT_V4,
    component: OrderManagementV4Wrapped,
    title: "Order Management V4",
    screenName: "Inventorysmart Oms Order Management V4",
    module: "inventorysmart_order_management_v4",
  },
  {
    path: ORDER_MANAGEMENT_DEEP_DIVE,
    component: OrderDeepDive,
    title: "Order Management Deep Dive",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_deep_dive",
  },
  {
    path: ORDER_MANAGEMENT_MATRIX_SUMMARY,
    component: MatrixSummary,
    title: "Order Management Matrix Summary",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_matrix_summary",
  },
  {
    path: ORDER_MANAGEMENT_PRODUCT_DETAILS,
    component: ProductDetailsScreen,
    title: "Order Management Product Details",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_product_details",
  },
  {
    path: ORDER_MANAGEMENT_CREATE_SCENARIO,
    component: OrderCreateScenario,
    title: "Order Management Create Scenario",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_create_scenario",
  },
  {
    path: ORDER_MANAGEMENT_CREATE_SCENARIO_STORE,
    component: OrderCreateScenarioStore,
    title: "Order Management Create Scenario Store",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_create_scenario_store",
  },
  {
    path: ORDER_REPOSITORY,
    component: OrderRepositoryWrapped,
    title: "Order Repository",
    screenName: "Inventorysmart Oms Order Repository",
    module: "inventorysmart_order_repository",
  },
  {
    path: CREATE_NEW_ORDER,
    component: CreateNewOrderWrapped,
    title: "Create New Order",
    screenName: "Oms Create Order",
    module: "inventorysmart_create_new_order",
  },
  {
    path: ORDER_MANAGEMENT_ORDER_DETAILS,
    component: OrderDetailsWrapper,
    title: "Order Management Order Details",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_order_details",
  },
  {
    path: DC_TO_DC_TRANSFER_PATH,
    component: DcToDcTransferComponent,
    title: "DC To DC Transfer",
    screenName: "Inventory-Dc-To-DC-Transfer",
    module: "inventorysmart_dc_to_dc_transfer",
  },
  {
    path: NEW_STORE_APPROVAL_FLOW,
    component: NewStoreApprovalFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations New Store",
    module: "inventorysmart_configuration_new_store_approval_flow",
  },
  {
    path: NEW_STORE_RELEASE_FLOW,
    component: NewStoreReleaseFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations New Store",
    module: "inventorysmart_configuration_new_store_release_flow",
  },
  {
    path: ADD_NEW_STORE_TRANSFER_RULE,
    component: CreateRuleFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations Store Transfer",
    module: "Inventorysmart_Configurations_Store_Transfer",
  },
  {
    path: STORE_TRANSFER_RULE_NEW_FLOW,
    component: CreateStoreTransferRuleNewFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations Store Transfer",
    module: "inventorysmart_store_transfer_rule_new_flow",
  },
  {
    path: ADD_NEW_DC_TRANSFER_RULE,
    component: CreateDCTransferRuleFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_dc_transfer_rule",
  },
  {
    path: NEW_REMODEL_STORE,
    component: NewRemodelStoreComponent,
    title: "Configuration",
    screenName: "Inventorysmart Configurations Remodel Store",
    module: "inventorysmart_configuration_new_remodel_store",
  },
  {
    path: REMODEL_STORE_APPROVAL_FLOW,
    component: RemodelStoreApproveFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations Remodel Store",
    module: "inventorysmart_configuration_remodel_store_approval_flow",
  },
  {
    path: REMODEL_STORE_RELEASE_FLOW,
    component: RemodelStoreReleaseFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations Remodel Store",
    module: "inventorysmart_configuration_remodel_store_release_flow",
  },
  {
    path: PO_REBALANCE,
    component: PORebalanceWrapped,
    title: "PO Rebalance",
    screenName: "PO-Rebalance",
    module: "inventorysmart_po_rebalance",
  },
  {
    path: KPI_CONFIGURATOR,
    component: KPIConfigurator,
    title: "KPI Configurator",
    screenName: "KPI Configurator",
    module: "inventorysmart_kpi_configurator",
  },
  {
    path: CREATE_KPI,
    component: CreateKPI,
    title: "KPI Configurator",
    screenName: "KPI Configurator",
    module: "inventorysmart_create_kpi",
  },
  {
    path: `${EDIT_KPI}/:kpi_id`,
    component: CreateKPI,
    title: "KPI Configurator",
    screenName: "KPI Configurator",
    module: "inventorysmart_create_kpi",
  },
  {
    path: `/inventory-smart/configurator/application-configurator`,
    component: ApplicationConfiguratorScreen,
    title: "ApplicationConfiguratorScreen",
    screenName: "Application Configurator View",
  },
  {
    path: `/inventory-smart/configurator/tenant-configuration`,
    component: TenantConfigurationScreen,
    title: "TenantConfigurationScreen",
    screenName: "Application Configurator View",
  },
  {
    path: `/inventory-smart/configurator/module-configurator`,
    component: SystemConfiguratorScreen,
    title: "SystemConfiguratorScreen",
    screenName: "Application Configurator View",
  },
  {
    path: `/inventory-smart/configurator/module-configurator/:screen`,
    component: ConfiguratorScreen,
    title: "ModuleConfiguratorScreen",
    screenName: "Application Configurator View",
  },
  {
    path: `/inventory-smart/configurator/access-management`,
    component: AccessManagementScreen,
    title: "AccessManagementScreen",
    screenName: "Application Configurator View",
  },
  {
    path: OFF_CYCLE_ORDER_VIEW_DRAFTS,
    component: OffCycleOrderViewDrafts,
    title: "Off Cycle Order View Drafts",
    screenName: "Oms Create Order",
    module: "inventorySmart_offcycle_order_view_drafts",
  },
  {
    path: CONFIGURATOR,
    component: OrderingConfigurator,
    title: "Super Admin",
    screenName: "Super-Admin",
    module: "inventorysmart_super_admin",
  },
  {
    path: `${CONFIGURATOR}/:module/module-configurator`,
    component: ModuleConfiguratorScreen,
    title: "SystemConfiguratorScreen",
    screenName: "Super-Admin",
    module: "inventorysmart_ordering_module_configurator",
  },
  {
    path: `${CONFIGURATOR}/:module/module-configurator/:screen`,
    component: ScreenConfigurationScreen,
    title: "ModuleConfiguratorScreen",
    screenName: "Super-Admin",
    module: "inventorysmart_ordering_module_screen_configurator",
  },
  {
    path: OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
    component: OffCycleOrderViewDrafts,
    title: "Expedite Orders",
    screenName: "Oms Create Order",
    module: "inventorySmart_offcycle_order_expedite_orders",
  },
  {
    path: AUTO_ALLOCATION_RECOMMENDATION,
    component: AutoAllocationRecommendation,
    title: "Auto Allocation Recommendation",
    screenName: "Allocation",
    module: "inventorysmart_auto_allocation_recommendation",
  },
  {
    path: PRODUCT_STATUS,
    component: ProductStatusComponent,
    title: "Product Status",
    screenName: "Product Status",
    module: "inventorysmart_product_status",
  },
  {
    path: STORE_STATUS,
    component: StoreStatusComponent,
    title: "Store Status",
    screenName: "Store Status",
    module: "inventorysmart_store_status",
  },
  {
    path: KEYBOARD_SHORTCUTS_REDIRECT,
    component: KeyboardShortcutsRedirect,
    title: "Keyboard Shortcuts",
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
  },
];

const Routes = (props) => {
  const [navBarOptions, setNavBarOptions] = useState([...sideBarOptions]);
  const [navRoutes, setNavRoutes] = useState([...routes]);
  const [requiredApisCalled, setRequiredApisCalled] = useState(false);
  const [showItemSmartIcon, setShowItemSmartIcon] = useState(false);

  /** Component map to change base component for a particular module for any client if required */
  const routesComponentMap = {
    file_upload_validation: {
      default: FileUploadValidation,
    },
    dashboard: {
      default: DashboardComponent,
    },
    inventorysmart_allocation_report: {
      default: AllocationReportingComponent,
    },
    inventorysmart_create_allocation: {
      default: CreateNewAllocationComponent,
    },
    inventorysmart_create_scenario: {
      default: CreateScenario,
    },
    inventorysmart_product_profile: {
      default: ProductProfileComponent,
    },
    inventorysmart_create_product_profile: {
      default: CreateProductProfileFiltersComponent,
    },
    inventorysmart_constraints: {
      default: Constraints,
    },
    inventorysmart_exception_constraint: {
      default: ExceptionsStores,
    },
    inventorysmart_add_exception: {
      default: editCreateExceptionTab,
    },
    inventorysmart_create_rules: {
      default: editRulesComponent,
    },
    inventorysmart_add_rules: {
      default: AddRclConstraints,
    },
    inventorysmart_create_new_rule: {
      default: CreateNewRuleFlow,
    },
    inventorysmart_store_eligibility_group: {
      default: StoreEligiblityGroup,
    },
    inventorysmart_edit_store_eligibility_group: {
      default: editGrpStores,
    },
    inventorysmart_modify_store_eligibility_group: {
      default: ModifyStoreGroup,
    },
    inventorysmart_create_store_eligibility_group: {
      default: CreateStoreGroup,
    },
    inventorysmart_upload_store_eligibility_group: {
      default: UploadStoreGroup,
    },
    inventorysmart_add_store_eligibility_group: {
      default: AddStoreGroup,
    },
    inventorysmart_delete_store_eligibility_group: {
      default: EditStoreGroup,
    },
    inventorysmart_configuration: {
      default: Configuration,
    },
    inventorysmart_configuration_configure: {
      default: ConfigurePage,
    },
    inventorysmart_configuration_auto_allocation: {
      default: CreateAutoAllocationRules,
    },
    inventorysmart_configuration_manage_exceptions_product_mapping: {
      default: ManageExceptions,
    },
    inventorysmart_configuration_review_rules_product_mapping: {
      default: ReviewRule,
    },
    inventorysmart_configuration_add_rule_product_mapping: {
      default: AddRule,
    },
    inventorysmart_configuration_review_excpetions_product_mapping: {
      default: ReviewExceptions,
    },
    inventorysmart_edit_def_product_group: {
      default: GroupDefEdit,
    },
    inventorysmart_create_def_product_group: {
      default: CreateDefintion,
    },
    inventorysmart_view_def_product_group: {
      default: GroupDefMapper,
    },
    inventorysmart_create_group_product_group: {
      default: CreateProductGroup,
    },
    inventorysmart_create_group_def_product_group: {
      default: GroupDefintions,
    },
    inventorysmart_create_group_create_def_product_group: {
      default: CreateDefintion,
    },
    inventorysmart_view_group_product_group: {
      default: EditGrpProducts,
    },
    inventorysmart_modify_group__create_def_product_group: {
      default: CreateDefintion,
    },
    inventorysmart_modify_group_edit_def_product_group: {
      default: EditDefinition,
    },
    inventorysmart_modify_group_def_product_group: {
      default: GroupDefintions,
    },
    inventorysmart_modify_group_product_group: {
      default: ModifyGroup,
    },
    inventorysmart_bulf_add_product_group: {
      default: AddProductGroup,
    },
    inventorysmart_bulf_edit_product_group: {
      default: EditProductGroup,
    },
    inventorysmart_view_group_def_product_group: {
      default: GroupDefintions,
    },
    inventorysmart_group_defs_create_def_product_group: {
      default: CreateDefintion,
    },
    inventorysmart_create_group_edit_def_product_group: {
      default: EditDefinition,
    },
    inventorysmart_configuration_new_product_mapping: {
      default: CreateNewProductsMapping,
    },
    inventorysmart_ada_visual: {
      default: ADAVisual,
    },
    inventorysmart_ada_visual_mfp_dashboard: {
      default: ADAVisualMFPDashboard,
    },
    inventorysmart_view_past_allocation: {
      default: ViewPastAllocation,
    },
    inventorysmart_prod_group_edit_def_product_group: {
      default: EditDefinition,
    },
    inventorysmart_order_batching: {
      default: OrderBatchingComponent,
    },
    inventorysmart_configuration_add_new_store: {
      default: AddNewStore,
    },
    inventorysmart_order_management: {
      default: OrderManagementWrapped,
    },
    inventorysmart_order_management_v3: {
      default: OrderManagementV3Wrapped,
    },
    inventorysmart_order_management_v3_product_details: {
      default: OrderManagementV3ProductDetailsWrapped,
    },
    inventorysmart_order_management_v3_create_scenario: {
      default: OrderCreateScenarioV3Wrapped,
    },
    inventorysmart_order_management_v4: {
      default: OrderManagementV4Wrapped,
    },
    inventorySmart_order_management_deep_dive: {
      default: OrderDeepDive,
    },
    inventorySmart_order_management_matrix_summary: {
      default: MatrixSummary,
    },
    inventorySmart_order_management_product_details: {
      default: ProductDetailsScreen,
    },
    inventorySmart_order_management_create_scenario: {
      default: OrderCreateScenario,
    },
    inventorySmart_order_management_create_scenario_store: {
      default: OrderCreateScenarioStore,
    },
    inventorysmart_order_repository: {
      default: OrderRepositoryWrapped,
    },
    inventorysmart_create_new_order: {
      default: CreateNewOrderWrapped,
    },
    inventorySmart_order_management_order_details: {
      default: OrderDetailsWrapper,
    },
    inventorysmart_dc_to_dc_transfer: {
      default: DcToDcTransferComponent,
    },
    inventorysmart_configuration_new_store_approval_flow: {
      default: NewStoreApprovalFlow,
    },
    inventorysmart_configuration_new_store_release_flow: {
      default: NewStoreReleaseFlow,
    },
    inventorysmart_configuration_new_remodel_store: {
      default: NewRemodelStoreComponent,
    },
    inventorysmart_configuration_remodel_store_release_flow: {
      default: RemodelStoreReleaseFlow,
    },
    inventorysmart_configuration_remodel_store_approval_flow: {
      default: RemodelStoreApproveFlow,
    },
    inventorysmart_po_rebalance: {
      default: PORebalanceWrapped,
    },
    inventorysmart_dc_transfer_allocation_alert: {
      default: ReviewDCTransfer,
    },
    inventorysmart_create_store_transfer: {
      default: CreateStoreTransfer,
    },
    inventorysmart_create_dc_transfer: {
      default: CreateDcTransfer,
    },
    Inventorysmart_Configurations_Store_Transfer: {
      default: CreateRuleFlow,
    },
    inventorysmart_store_transfer_rule_new_flow: {
      default: CreateStoreTransferRuleNewFlow,
    },
    inventorysmart_dc_transfer_rule: {
      default: CreateDCTransferRuleFlow,
    },
    inventorysmart_kpi_configurator: {
      default: KPIConfigurator,
    },
    inventorysmart_create_kpi: {
      default: CreateKPI,
    },

    inventorysmart_edit_kpi: {
      default: CreateKPI,
    },
    inventorySmart_offcycle_order_view_drafts: {
      default: OffCycleOrderViewDrafts,
    },
    inventorysmart_super_admin: {
      default: OrderingConfigurator,
    },
    inventorysmart_ordering_module_configurator: {
      default: ModuleConfiguratorScreen,
    },
    inventorysmart_ordering_module_screen_configurator: {
      default: ScreenConfigurationScreen,
    },
    inventorySmart_offcycle_order_expedite_orders: {
      default: OffCycleOrderExpediteOrders,
    },
    inventorysmart_auto_allocation_recommendation: {
      default: AutoAllocationRecommendation,
    },
    inventorysmart_product_status: {
      default: ProductStatusComponent,
    },
    inventorysmart_store_status: {
      default: StoreStatusComponent,
    },
    keyboard_shortcuts: {
      default: KeyboardShortcutsRedirect,
    },
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
        if (
          props.keyboardShortcutsVisible &&
          props?.enableKeyboardShortcutsUI?.navigation
        ) {
          filteredNavOptions.push(option);
        }
        return;
      }

      if (isEmpty(option?.childList)) {
        //Hiding OMS Modules on SidePanel
        if (
          OMS_MODULE_CONFIGURATION?.screenName?.indexOf(option.module) !== -1
        ) {
          if (!hideOMSSideOptions(inventorysmartOmsScreenConfig, option)) {
            filteredNavOptions.push(option);
          }
        } else {
          // Filtering out parents based on old logic only
          if (
            !(
              (option.module === "inventorysmart_ada_visual" &&
                inventorysmartScreenConfig?.hiddenModules.indexOf(
                  "MFP ADA Dashboard"
                ) === -1) ||
              inventorysmartScreenConfig?.hiddenModules.indexOf(
                option.screenName
              ) !== -1
            )
          ) {
            if (
              inventorysmartScreenConfig?.hiddenModules.indexOf(
                option.module
              ) === -1
            ) {
              filteredNavOptions.push(option);
            }
          }
        }
      } else {
        // Adding Relevant Parent Screens
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
      if (OMSScreenConfig?.screenName.indexOf(option.module) !== -1)
        return false;
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
          return (
            props.keyboardShortcutsVisible &&
            props?.enableKeyboardShortcutsUI?.navigation
          );
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
          inventorysmartScreenConfig?.hiddenModules.indexOf(
            option.screenName
          ) !== -1
        )
          return false;
        if (
          inventorysmartScreenConfig?.hiddenModules.indexOf(option.module) ===
          -1
        )
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

  useEffect(() => {
    const fetchInventorySmartScreenConfiguration = async () => {
      /**
       * Fetch and filter side bar options & routes based on the client config
       * Base component for any component can also be changed here
       * If the config is not defined for any particular module, in that case default side bar options, routes & base components will be applicable
       */
      try {
        props.setInventorysmartScreenConfigLoader(true);
        const omsScreenConfigResponse = await props?.tenantConfigApiCache(1, {
          attribute_name: "inventory_smart_oms_screen_configuration",
        });

        const omsScreenConfig =
          omsScreenConfigResponse.data.data[0]?.attribute_value;
        const inventorysmartOmsScreenConfig =
          omsScreenConfig && omsScreenConfig?.is_oms_enabled
            ? omsScreenConfig
            : OMS_MODULE_CONFIGURATION;

        props.setOrderingModuleConfig(inventorysmartOmsScreenConfig);

        const config = await props?.tenantConfigApiCache(1, {
          attribute_name: "inventory_smart_screen_configuration",
        });

        //To fetch if the special chars needs to be excluded
        const skipEncodingExcludedChars = await props?.tenantConfigApiCache(1, {
          attribute_name: "special_characters_encoding",
        });
        const specialCharacterEncodingConfig =
          skipEncodingExcludedChars.data.data[0]?.attribute_value || {};
        localStorage.setItem(
          "special_characters_encoding",
          JSON.stringify(specialCharacterEncodingConfig)
        );
        localStorage.setItem(
          "skip_excluded_special_chars",
          JSON.stringify(specialCharacterEncodingConfig)
        );

        // Fetch independent inventorysmart_create_allocation config
        const createAllocationConfigResponse = await props?.tenantConfigApiCache(
          1,
          {
            attribute_name: "inventorysmart_create_allocation",
          }
        );

        const productStoreMappingConfig = await props?.tenantConfigApiCache(1, {
          attribute_name: "product_store_mapping",
        });

        // Fetch independent inventorysmart_finalize_allocation config
        const finalizeAllocationConfigResponse = await props?.tenantConfigApiCache(
          1,
          {
            attribute_name: "inventorysmart_finalize_allocation",
          }
        );

        //Accessing core module screen configuration to display dynamicLabel values accordingly on Core configuration screens (Product status etc) when accessing from inventory module
        await props.getSpecificScreenName(3, {
          attribute_name: "core_screen_configuration",
        });

        const inventorysmartScreenConfig = config.data.data[0]?.attribute_value;
        const inventorysmartCreateAllocationConfig =
          createAllocationConfigResponse?.data?.data[0]?.attribute_value;
        const inventorysmartFinalizeAllocationConfig =
          finalizeAllocationConfigResponse?.data?.data[0]?.attribute_value;

        const productStoreMappingConfigValue =
          productStoreMappingConfig?.data?.data[0]?.attribute_value;
        // Store independent create allocation config separately
        props.setInventorysmartCreateAllocationConfig(
          inventorysmartCreateAllocationConfig
        );
        props.setProductStoreMappingConfig(productStoreMappingConfigValue);

        // Store independent finalize allocation config separately
        props.setInventorysmartFinalizeAllocationConfig(
          inventorysmartFinalizeAllocationConfig
        );

        // Fetch consolidated order_batching_config
        let orderBatchingModuleLabel = "";
        try {
          const obConfigResponse = await props?.tenantConfigApiCache(1, {
            attribute_name: "order_batching_config",
          });
          const obConfigValue =
            obConfigResponse?.data?.data?.[0]?.attribute_value || {};
          orderBatchingModuleLabel = obConfigValue?.module_label || "";
          props.setOrderBatchingConfig(obConfigValue);
        } catch (e) {
          // silently fail - OB config is optional
        }

        // If tenant config provides order_batching_config.module_label,
        // rename the Order Batching nav item title in all sidebar variants.
        if (orderBatchingModuleLabel) {
          const renameOrderBatching = (items) =>
            items?.forEach((item) => {
              if (item?.module === "inventorysmart_order_batching") {
                item.title = orderBatchingModuleLabel;
              }
              if (item?.childList) renameOrderBatching(item.childList);
            });
          renameOrderBatching(sideBarOptions);
          renameOrderBatching(parentChildSideBarOptions);
          renameOrderBatching(spanxSideBarOptions);
        }

        let navOptions = sideBarOptions;
        let finalRoutes = routes;

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
                return (
                  props.keyboardShortcutsVisible &&
                  props?.enableKeyboardShortcutsUI?.navigation
                );
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
              const moduleMap = routesComponentMap[route.module];
              if (moduleMap) {
                route.component =
                  moduleMap[
                    inventorysmartScreenConfig[route.module]?.component
                  ] || moduleMap.default;
              }
              return route;
            });
        }
        props.setInventorysmartScreenConfig(
          config.data.data[0]?.attribute_value
        );
        props.setGenericTenantConfig(
          config.data.data[0]?.attribute_value || {}
        );
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

        if (inventorysmartOmsScreenConfig?.is_oms_enabled) {
          tempOptions = maybeCollapseSingleOmNavTitle(tempOptions);
        }

        setNavBarOptions(tempOptions);
        setNavRoutes([...finalRoutes]);
        setRequiredApisCalled(true);
        props.setInventorysmartScreenConfigLoader(false);

        let isOMSModuleEnabled = inventorysmartOmsScreenConfig?.is_oms_enabled;
        if (isOMSModuleEnabled) {
          let OmsConfig = await props.getOrderingRoleConfig();
          props.setInventorysmartScreenConfigLoader(true);
          props.setOrderingRoleConfigSuccess(!!OmsConfig?.data?.status);
          if (OmsConfig.data.status) {
            const inventorysmartOmsCommonConfig = await props?.tenantConfigApiCache(
              1,
              {
                attribute_name: "inv_oms_roles_config",
              }
            );
            const omsConfig =
              inventorysmartOmsCommonConfig.data.data[0]?.attribute_value
                ?.default[0] || {};
            props.setOrderingScreensConfig({ ...omsConfig });

            // budget TAM (inv_oms_budget_config) — feature stays enabled by default.
            try {
              const omsBudgetConfigResponse = await props?.tenantConfigApiCache(
                1,
                { attribute_name: OMS_BUDGET_CONFIG_ATTRIBUTE }
              );
              const omsBudgetConfig =
                omsBudgetConfigResponse?.data?.data?.[0]?.attribute_value ||
                null;
              props.setOmsBudgetConfig(omsBudgetConfig);
            } catch (_budgetConfigError) {
              props.setOmsBudgetConfig(null);
            }

            // DC filter TAM (inv_oms_dc_filter_config) — opt-in per DcFilter variant.
            try {
              const omsDcFilterConfigResponse =
                await props?.tenantConfigApiCache(1, {
                  attribute_name: OMS_DC_FILTER_CONFIG_ATTRIBUTE,
                });
              const omsDcFilterConfig =
                omsDcFilterConfigResponse?.data?.data?.[0]?.attribute_value ||
                null;
              props.setOmsDcFilterConfig(omsDcFilterConfig);
            } catch (_dcFilterConfigError) {
              props.setOmsDcFilterConfig(null);
            }

            const omsVendorToStoreConfig = await props?.tenantConfigApiCache(
              1,
              {
                attribute_name: "inv_oms_vendor_to_store_config",
              }
            );
            const omsVendorToStoreSettings =
              omsVendorToStoreConfig.data.data[0]?.attribute_value?.default ||
              {};
            props.setOrderingVendorToStoreConfig(omsVendorToStoreSettings);

            const userRoleConfig = OmsConfig?.data?.data;
            const {
              tabOptions,
              user_access,
              tabOptionsForVendorToStore,
              order_repository,
              ...accessConfig
            } = userRoleConfig;
            console.log("userRoleConfig", userRoleConfig);
            props?.setOrderRepositoryVendorDCConfig(tabOptions || []);
            props?.setOrderRepositoryVendorToStoreConfig(
              tabOptionsForVendorToStore || []
            );
            props?.setOrderRepositoryScreenConfig(
              order_repository || userRoleConfig
            );
            props.setOrderingUserAccess(user_access || {});
            if (isEmpty(accessConfig))
              props.setOrderingAccessControl(OMS_USER_ACCESS_CONTROL);
            else props.setOrderingAccessControl(accessConfig);
          }

          const omsPackOrderingConfigResponse = await props?.tenantConfigApiCache(
            1,
            {
              attribute_name: "inv_oms_pack_ordering_config",
            }
          );
          const omsPackOrderingConfig =
            omsPackOrderingConfigResponse.data?.data?.[0]?.attribute_value ||
            {};
          props.setOrderingPackOrderConfig(omsPackOrderingConfig);

          const omsOffCycleOrderingConfigResponse = await props.tenantConfigApiCache(
            1,
            {
              attribute_name: "oms_offcycle_order_config",
            }
          );
          const omsOffCycleOrderingConfig =
            omsOffCycleOrderingConfigResponse.data?.data?.[0]
              ?.attribute_value || {};
          props?.setOffCycleOrderConfiguration(omsOffCycleOrderingConfig);
        }
        let showItemSmartNavigator = await props.tenantConfigApiCache(3, {
          attribute_name: "show_itemsmart_navigator",
        });
        showItemSmartNavigator =
          showItemSmartNavigator?.data?.data?.[0]?.attribute_value?.value ||
          false;

        setShowItemSmartIcon(showItemSmartNavigator);
        setRequiredApisCalled(true);
      } catch (error) {
        console.log("Error", error);
      } finally {
        props.setInventorysmartScreenConfigLoader(false);
      }
    };
    fetchInventorySmartScreenConfiguration();
    return () => {
      props.resetCommonStoreState();
      props.resetOrderingCommonStates();
    };
  }, [
    props.keyboardShortcutsVisible,
    props?.enableKeyboardShortcutsUI?.navigation,
  ]);

  useEffect(() => {
    // When a user switches to a different module use this function to clear the module config of the tabs within configuration module (New store)
    if (location && !location?.pathname.includes(CONFIGURATION)) {
      if (!isEmpty(props.newStoreModuleConfig)) {
        props.clearNewStoreModuleConfig();
        props.clearActiveModuleCache(CONFIGUTAIONS_CACHE);
      }
    }
  }, [location?.pathname]);

  return (
    <>
      {!requiredApisCalled ? (
        <LoadingOverlay
          loader={props.inventorysmartScreenConfigLoader}
          spinner
        ></LoadingOverlay>
      ) : (
        <Layout
          routes={navRoutes}
          sideBarOptions={navBarOptions}
          loading={props.inventorysmartScreenConfigLoader}
          app={"inventorysmart"}
          showItemSmartIcon={showItemSmartIcon}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigLoader:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    newStoreModuleConfig:
      store.inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig,
    keyboardShortcutsVisible: store.sideBarReducer?.keyboardShortcutsVisible,
    enableKeyboardShortcutsUI: store.sideBarReducer?.shortcutsUiException,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getInventorySmartAttributes: (applicationCode, attributeName) =>
    dispatch(getInventorySmartAttributes(applicationCode, attributeName)),
  setInventorysmartScreenConfigLoader: (payload) =>
    dispatch(setInventorysmartScreenConfigLoader(payload)),
  setInventorysmartScreenConfig: (payload) =>
    dispatch(setInventorysmartScreenConfig(payload)),
  setInventorysmartCreateAllocationConfig: (payload) =>
    dispatch(setInventorysmartCreateAllocationConfig(payload)),
  setProductStoreMappingConfig: (payload) =>
    dispatch(setProductStoreMappingConfig(payload)),
  setInventorysmartFinalizeAllocationConfig: (payload) =>
    dispatch(setInventorysmartFinalizeAllocationConfig(payload)),
  setOrderBatchingConfig: (payload) =>
    dispatch(setOrderBatchingConfig(payload)),
  resetCommonStoreState: (payload) => dispatch(resetCommonStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getSpecificScreenName: (applicationCode, queryParam) =>
    dispatch(getSpecificScreenName(applicationCode, queryParam)),
  clearNewStoreModuleConfig: () => dispatch(clearNewStoreModuleConfig()),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),

  getOrderingRoleConfig: () => dispatch(getOrderingRoleConfig()),
  setOrderingRoleConfigSuccess: (payload) =>
    dispatch(setOrderingRoleConfigSuccess(payload)),
  setOrderingScreensConfig: (payload) =>
    dispatch(setOrderingScreensConfig(payload)),
  setOmsBudgetConfig: (payload) => dispatch(setOmsBudgetConfig(payload)),
  setOmsDcFilterConfig: (payload) => dispatch(setOmsDcFilterConfig(payload)),
  setOrderingModuleConfig: (payload) =>
    dispatch(setOrderingModuleConfig(payload)),
  setOrderingAccessControl: (payload) =>
    dispatch(setOrderingAccessControl(payload)),
  setOrderingUserAccess: (payload) => dispatch(setOrderingUserAccess(payload)),
  setOrderingVendorToStoreConfig: (payload) =>
    dispatch(setOrderingVendorToStoreConfig(payload)),
  setOrderingPackOrderConfig: (payload) =>
    dispatch(setOrderingPackOrderConfig(payload)),
  setOffCycleOrderConfiguration: (payload) =>
    dispatch(setOffCycleOrderConfiguration(payload)),
  setOrderRepositoryScreenConfig: (payload) =>
    dispatch(setOrderRepositoryScreenConfig(payload)),
  setOrderRepositoryVendorDCConfig: (payload) =>
    dispatch(setOrderRepositoryVendorDCConfig(payload)),
  setOrderRepositoryVendorToStoreConfig: (payload) =>
    dispatch(setOrderRepositoryVendorToStoreConfig(payload)),

  setGenericTenantConfig: (payload) =>
    dispatch(setGenericTenantConfig(payload)),
  resetOrderingCommonStates: () => dispatch(resetOrderingCommonStates()),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Routes));
