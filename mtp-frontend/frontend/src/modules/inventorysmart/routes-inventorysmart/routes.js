import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import GridViewIcon from "@mui/icons-material/GridView";
import DialpadIcon from "@mui/icons-material/Dialpad";
import TungstenOutlinedIcon from "@mui/icons-material/TungstenOutlined";
import TourIcon from "@mui/icons-material/Tour";
import BarChartIcon from "@mui/icons-material/BarChart";
import CategoryIcon from "@mui/icons-material/Category";
import PsychologyIcon from "@mui/icons-material/Psychology";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import {
  CREATE_ALLOCATION,
  DASHBOARD,
  CREATE_PRODUCT_PROFILE,
  STORE_ELIGIBILITY_GROUP,
  CONFIGURATION,
  CONSTRAINTS,
  PRODUCT_PROFILE,
  ALLOCATION_REPORT,
  ORDER_BATCHING,
  VIEW_PAST_ALLOCATION,
  ADA_VISUAL,
  ADD_NEW_STORE,
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_DEEP_DRIVE,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_REPOSITORY,
  CREATE_NEW_ORDER,
  NEW_STORE_APPROVAL_FLOW,
  NEW_STORE_RELEASE_FLOW,
  NEW_STORE_ALLOCATION_FLOW,
  CREATE_NEW_PRODUCT_MAPPING,
  ADA_VISUAL_MFP_DASHBOARD,
  EDIT_PRODUCT_MAPPING,
  UPLOAD_VALIDATION,
  CREATE_AUTO_ALLOCATION_RULES,
  CREATE_STORE_ALLOCATION_RULES_MAPPING,
  REVIEW_NEW_STORE_ALLOCATION,
} from "../constants-inventorysmart/routesConstants";
import DashboardComponent from "../pages-inventorysmart/Decision-Dashboard";
import CreateNewAllocationComponent from "../pages-inventorysmart/Create-Allocation";
import CreateProductProfileFiltersComponent from "../pages-inventorysmart/Product-Profile/Create-Product-Profile/create-product-profile-filters";
import Configuration from "../pages-inventorysmart/Configuration";
import Constraints from "../pages-inventorysmart/Constraints";
import StoreEligiblityGroup from "../pages-inventorysmart/Store-Eligibility-Group";
import ProductProfileComponent from "../pages-inventorysmart/Product-Profile";
import ProductConfiguration from "../pages-inventorysmart/Product-Configuration";
import AllocationReportingComponent from "../pages-inventorysmart/Allocation-Reporting";
import OrderBatchingComponent from "../pages-inventorysmart/Order-Batching";
import ViewPastAllocation from "../pages-inventorysmart/View-Past-Allocation";
import ADAVisual from "../pages-inventorysmart/ADA-Visual";
import ADAVisualMFPDashboard from "../pages-inventorysmart/ADA-Visual-MFP-Dashboard";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import editGrpStores from "core/pages/store-grouping/components/editGrpStores";
import CreateStoreGroup from "core/pages/store-grouping/components/createGroup";
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
import {
  getInventorySmartAttributes,
  resetCommonStoreState,
  setInventorysmartScreenConfig,
  setInventorysmartScreenConfigLoader,
  getOmsModuleCommonConfig,
  setInventorySmartOmsRepoConfig,
  setInventorySmartOmsCommonConfig,
} from "../services-inventorysmart/common/inventory-smart-common-services";
import { addSnack } from "core/actions/snackbarActions";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";
import AddNewStore from "../pages-inventorysmart/New-Store-Setup/Add-New-Store";
import NewStoreApprovalFlow from "../pages-inventorysmart/New-Store-Setup/Approval-Flow";
import NewStoreAllocationFlow from "../pages-inventorysmart/New-Store-Setup/Allocation-Flow";
import NewStoreReleaseFlow from "../pages-inventorysmart/New-Store-Setup/Release-Flow";
import OrderManagement from "../pages-inventorysmart/Order-Management";
import OrderDeepDrive from "../pages-inventorysmart/Order-Management/Order-Deep-Drive";
import OrderCreateScenario from "../pages-inventorysmart/Order-Management/Order-Create-Scenario";
import OrderRepository from "../pages-inventorysmart/Order-Repository";
import CreateNewOrder from "../pages-inventorysmart/Create-New-Order";
import CreateNewProductsMapping from "../pages-inventorysmart/Product-Supersession/Create-New-Product-Mapping";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import FileUploadValidation from "core/pages/file-upload-validation";
import CreateAutoAllocationRules from "../pages-inventorysmart/Auto-Allocation-Rules/CreateAutoAllocationRules"
import StoreMappingToScheduler from "../pages-inventorysmart/Auto-Allocation-Rules/StoreMappingComponents/StoreMappingToScheduler";
import ReviewNewStoreAllocation from "../pages-inventorysmart/New-Store-Setup/ReviewNewStoreAllocation";

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
    link: `${CREATE_ALLOCATION}?step=0`,
    title: "Create New Allocation",
    icon: React.createElement(BubbleChartIcon),
    order: 2,
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
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
    icon: React.createElement(TourIcon),
    order: 5,
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_constraints",
  },
  {
    link: PRODUCT_PROFILE,
    title: "",
    icon: React.createElement(CategoryIcon),
    order: 6,
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
  },
  {
    link: ADA_VISUAL,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 7,
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    link: ADA_VISUAL_MFP_DASHBOARD,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 7,
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
  },
  {
    link: ALLOCATION_REPORT,
    title: "Reports",
    icon: React.createElement(BarChartIcon),
    order: 8,
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
  },
  {
    link: ORDER_BATCHING,
    title: "Order Batching",
    icon: React.createElement(Inventory2Outlined),
    order: 9,
    screenName: "Inventorysmart Order Triaging",
    module: "order_triage",
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
    link: ORDER_MANAGEMENT,
    title: "Order Management",
    icon: React.createElement(Inventory2Outlined),
    order: 11,
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorysmart_order_management",
  },
  {
    link: ORDER_REPOSITORY,
    title: "Order Repository",
    icon: React.createElement(InventoryOutlinedIcon),
    order: 12,
    screenName: "Inventorysmart Oms Order Repository",
    module: "inventorysmart_order_repository",
  },
  {
    link: CREATE_NEW_ORDER,
    title: "Create New Order",
    icon: React.createElement(NoteAddOutlinedIcon),
    order: 13,
    screenName: "Oms Create Order",
    module: "inventorysmart_create_new_order",
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
    path: CREATE_ALLOCATION,
    component: CreateNewAllocationComponent,
    title: "Create New Allocation",
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
  },
  {
    path: STORE_ELIGIBILITY_GROUP,
    component: StoreEligiblityGroup,
    title: "Store Eligiblity Group",
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
  },
  {
    path: CONFIGURATION,
    component: Configuration,
    title: "Configuration",
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
  },
  {
    path: CONSTRAINTS,
    component: Constraints,
    title: "Constraints",
    screenName: "Inventorysmart Constraints",
    module: "inventorysmart_constraints",
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
    path: ADA_VISUAL,
    component: ADAVisual,
    title: "ADA Visual",
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    path: ADA_VISUAL_MFP_DASHBOARD,
    component: ADAVisualMFPDashboard,
    title: "ADA Visual Dashboard",
    screenName: "MFP ADA Dashboard",
    module: "inventorysmart_ada_visual_mfp_dashboard",
  },
  {
    path: PRODUCT_PROFILE,
    component: ProductProfileComponent,
    title: "Product Profile",
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
  },
  {
    path: CREATE_PRODUCT_PROFILE,
    component: CreateProductProfileFiltersComponent,
    screenName: "Create Product Profile",
    module: "inventorysmart_create_product_profile",
  },
  {
    path: ALLOCATION_REPORT,
    component: AllocationReportingComponent,
    title: "Configuration",
    screenName: "Inventorysmart Reportings",
    module: "inventorysmart_allocation_report",
  },
  {
    path: ORDER_BATCHING,
    component: OrderBatchingComponent,
    title: "View Current Allocations",
    screenName: "Inventorysmart Order Triaging",
    module: "order_triage",
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
    path: ORDER_MANAGEMENT,
    component: OrderManagement,
    title: "Order Management",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorysmart_order_management",
  },
  {
    path: ORDER_MANAGEMENT_DEEP_DRIVE,
    component: OrderDeepDrive,
    title: "Order Management Deep Drive",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_deep_drive",
  },
  {
    path: ORDER_MANAGEMENT_CREATE_SCENARIO,
    component: OrderCreateScenario,
    title: "Order Management Create Scenario",
    screenName: "Inventorysmart Oms Order Management",
    module: "inventorySmart_order_management_create_scenario",
  },
  {
    path: ORDER_REPOSITORY,
    component: OrderRepository,
    title: "Order Repository",
    screenName: "Inventorysmart Oms Order Repository",
    module: "inventorysmart_order_repository",
  },
  {
    path: ADD_NEW_STORE,
    component: AddNewStore,
    title: "Configuration",
    screenName: "Inventorysmart Configurations New Store",
    module: "inventorysmart_configuration_add_new_store",
  },
  {
    path: CREATE_NEW_ORDER,
    component: CreateNewOrder,
    title: "Create New Order",
    screenName: "Oms Create Order",
    module: "inventorysmart_create_new_order",
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
    path: NEW_STORE_ALLOCATION_FLOW,
    component: NewStoreAllocationFlow,
    title: "Configuration",
    screenName: "Inventorysmart Configurations New Store",
    module: "inventorysmart_configuration_new_store_allocation_flow",
  },
  {
    path: CREATE_NEW_PRODUCT_MAPPING,
    component: CreateNewProductsMapping,
    title: "Create New Mapping",
    screenName: "Inventorysmart Configurations Product Supersession",
    module: "inventorysmart_configuration_new_product_mapping",
  },
  {
    path: EDIT_PRODUCT_MAPPING,
    component: CreateNewProductsMapping,
    title: "Edit Mapping",
    screenName: "Inventorysmart Configurations Product Supersession",
    module: "inventorysmart_configuration_new_product_mapping",
  },
  {
    path: CREATE_AUTO_ALLOCATION_RULES,
    component: CreateAutoAllocationRules,
    title: "Create Auto Allocation Rules",
    screenName: "create_auto_allocation_rules",
    module: "create_auto_allocation_rules",
  },
  {
    path: CREATE_STORE_ALLOCATION_RULES_MAPPING,
    component: StoreMappingToScheduler,
    title: "Add Stores",
    screenName: "auto_allocation_rule_store_mapping",
    module: "auto_allocation_rule_store_mapping",
  },
  {
    path: REVIEW_NEW_STORE_ALLOCATION,
    component: ReviewNewStoreAllocation,
    title: "Review New Store Allocation",
    screenName: "Inventorysmart Configurations New Store Review Allocation",
    module: "inventorysmart_configuration_review_new_store_allocation",
  },
];

const Routes = (props) => {
  const [navBarOptions, setNavBarOptions] = useState([...sideBarOptions]);
  const [navRoutes, setNavRoutes] = useState([...routes]);

  /** Component map to change base component for a particular module for any client if required */
  const routesComponentMap = {
    file_upload_validation: {
      default: FileUploadValidation,
    },
    dashboard: {
      default: DashboardComponent,
    },
    inventorysmart_create_allocation: {
      default: CreateNewAllocationComponent,
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
    inventorySmart_product_group: {
      default: StoreEligiblityGroup,
    },
    inventorysmart_create_store_eligibility_group: {
      default: CreateStoreGroup,
    },
    inventorysmart_add_store_eligibility_group: {
      default: AddStoreGroup,
    },
    inventorysmart_delete_store_eligibility_group: {
      default: EditStoreGroup,
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
    inventorysmart_prod_group_edit_def_product_group: {
      default: EditDefinition,
    },
    inventorysmart_configuration: {
      default: Configuration,
    },
    inventorysmart_ada_visual: {
      default: ADAVisual,
    },
    inventorysmart_ada_visual_mfp_dashboard: {
      default: ADAVisualMFPDashboard,
    },
    inventorysmart_constraints: {
      default: Constraints,
    },
    inventorysmart_product_profile: {
      default: ProductProfileComponent,
    },
    inventorysmart_product_configuration: {
      default: ProductConfiguration,
    },
    inventorysmart_create_product_profile: {
      default: CreateProductProfileFiltersComponent,
    },
    inventorysmart_allocation_report: {
      default: AllocationReportingComponent,
    },
    order_triage: {
      default: OrderBatchingComponent,
    },
    inventorysmart_view_past_allocation: {
      default: ViewPastAllocation,
    },
    inventorysmart_configuration_add_new_store: {
      default: AddNewStore,
    },
    inventorysmart_configuration_review_new_store_allocation: {
      default: ReviewNewStoreAllocation,
    },
    inventorysmart_order_management: {
      default: OrderManagement,
    },
    inventorySmart_order_management_deep_drive: {
      default: OrderDeepDrive,
    },
    inventorySmart_order_management_create_scenario: {
      default: OrderCreateScenario,
    },
    inventorysmart_order_repository: {
      default: OrderRepository,
    },
    inventorysmart_create_new_order: {
      default: CreateNewOrder,
    },
    inventorysmart_configuration_new_store_approval_flow: {
      default: NewStoreApprovalFlow,
    },
    inventorysmart_configuration_new_store_allocation_flow: {
      default: NewStoreAllocationFlow,
    },
    inventorysmart_configuration_new_store_release_flow: {
      default: NewStoreReleaseFlow,
    },
    inventorysmart_configuration_new_product_mapping: {
      default: CreateNewProductsMapping,
    },
    create_auto_allocation_rules: {
      default: CreateAutoAllocationRules,
    },
    auto_allocation_rule_store_mapping: {
      default: StoreMappingToScheduler,
    }
  };

  useEffect(() => {
    const clientName = localStorage.getItem("CLIENT_NAME");
    const fetchInventorySmartScreenConfiguration = async () => {
      /**
       * Fetch and filter side bar options & routes based on the client config
       * Base component for any component can also be changed here
       * If the config is not defined for any particular module, in that case default side bar options, routes & base components will be applicable
       */
      try {
        props.setInventorysmartScreenConfigLoader(true);
        let config = await props.getInventorySmartAttributes(
          1,
          "inventory_smart_screen_configuration"
        );

        //Accessing core module screen configuration to display dynamicLabel values accordingly on Core configuration screens (Product status etc) when accessing from inventory module
        await props.getSpecificScreenName(3, {
          attribute_name: "core_screen_configuration",
        });
        const inventorysmartScreenConfig = config.data.data[0]?.attribute_value;
        let navOptions = sideBarOptions;
        let finalRoutes = routes;
        if (inventorysmartScreenConfig) {
          navOptions = navOptions
            .filter((option) => {
              if (
                option.module === "inventorysmart_ada_visual" &&
                inventorysmartScreenConfig?.hiddenModules.indexOf(
                  "MFP ADA Dashboard"
                ) === -1
              ) {
                return false;
              }
              if (
                inventorysmartScreenConfig?.hiddenModules.indexOf(
                  option.screenName
                ) !== -1
              )
                return false;
              if (
                inventorysmartScreenConfig?.hiddenModules.indexOf(
                  option.module
                ) === -1
              )
                return true;
            })
            .map((item) => {
              if (item.module === "inventorysmart_product_profile") {
                return {
                  ...item,
                  title: `${config.data.data[0]?.attribute_value?.dynamicLabels?.article} Profile`,
                };
              } else return item;
            });
          finalRoutes = finalRoutes
            .filter((route) => {
              if (
                inventorysmartScreenConfig?.hiddenModules.indexOf(
                  route.screenName
                ) !== -1
              )
                return false;
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

        setNavBarOptions([...navOptions]);
        setNavRoutes([...finalRoutes]);
        props.setInventorysmartScreenConfig(
          config.data.data[0]?.attribute_value
        );
        localStorage.setItem(
          "inventorysmartScreenConfig",
          JSON.stringify(config.data.data[0]?.attribute_value)
        );

        let isOmsScreenVisible = true;
        inventorysmartScreenConfig?.hiddenModules.map((screenName) => {
          if (screenName === "inventorysmart_order_management") {
            isOmsScreenVisible = false;
            return;
          }
        });
        if (isOmsScreenVisible) {
          let OmsConfig = await props.getOmsModuleCommonConfig();
          if (OmsConfig.data.status) {
            const inventorysmartOmsRepoConfig = OmsConfig?.data?.data?.filter(
              (val) => val.showTab
            );
            const inventorysmartOmsCommonConfig = OmsConfig?.data?.data?.filter(
              (val) => !val.showTab
            );
            props.setInventorySmartOmsRepoConfig([
              ...inventorysmartOmsRepoConfig,
            ]);
            props.setInventorySmartOmsCommonConfig(
              ...inventorysmartOmsCommonConfig
            );
          }
        }
      } catch (error) {
        console.log("Error", error);
      } finally {
        props.setInventorysmartScreenConfigLoader(false);
      }
    };
    fetchInventorySmartScreenConfiguration();
  }, []);
  return (
    <Layout
      routes={navRoutes}
      sideBarOptions={navBarOptions}
      loading={props.inventorysmartScreenConfigLoader}
      app={"inventorysmart"}
    />
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  getInventorySmartAttributes: (applicationCode, attributeName) =>
    dispatch(getInventorySmartAttributes(applicationCode, attributeName)),
  getOmsModuleCommonConfig: (payload) =>
    dispatch(getOmsModuleCommonConfig(payload)),
  setInventorysmartScreenConfigLoader: (payload) =>
    dispatch(setInventorysmartScreenConfigLoader(payload)),
  setInventorysmartScreenConfig: (payload) =>
    dispatch(setInventorysmartScreenConfig(payload)),
  setInventorySmartOmsRepoConfig: (payload) =>
    dispatch(setInventorySmartOmsRepoConfig(payload)),
  setInventorySmartOmsCommonConfig: (payload) =>
    dispatch(setInventorySmartOmsCommonConfig(payload)),
  resetCommonStoreState: (payload) => dispatch(resetCommonStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getSpecificScreenName: (applicationCode, queryParam) =>
    dispatch(getSpecificScreenName(applicationCode, queryParam)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Routes));
