/**
 * BASE based on the production or development run
 */

if (!localStorage.getItem("baseUrl"))
  localStorage.setItem("baseUrl", window.location.hostname);

const isLocalHost = window.location.hostname === "localhost"
const origin = window.location.origin // defaults to http://localhost:8080 for local development

export const BASE_API = isLocalHost ? origin +"/api/v2" : `https://${localStorage.getItem("baseUrl")}/api/v2`;
export const BASE_API_V3 = isLocalHost ? origin + "/api/v3" : `https://${localStorage.getItem("baseUrl")}/api/v3`;
export const TENANT = localStorage.getItem("baseUrl").split(".")[0];
export const ENV =
  localStorage.getItem("baseUrl").split(".").length === 3
    ? null
    : localStorage.getItem("baseUrl").split(".")[1];
export const TENANT_ENV = TENANT.includes("localhost")
  ? "localhost"
  : !ENV
    ? TENANT
    : `${TENANT}.${ENV}`;

/**
 * Platform API goes belows
 */
// websocketURl
export const WEBSOCKET_URL = `wss://${localStorage.getItem(
  "baseUrl"
)}/api/v2/notifications/connect?channels=channel:1,channel:2&`;

//please create api based on structure of below attribute api
export const FETCH_TENANT = "/core/google-tenant-id";
export const VERIFY_TOKEN = "/user/verify-token";
export const USER_ROLES = "/user/userrole";
export const USER_DETAILS = "/user/userdetail";
export const USER_PERMISSIONS = "/user/permissions";
export const USER_GROUPS = "/user/groups";
export const USER_ROLE_GROUP_MAP = "/user/map_user_role_group";

export const FILTER_ELEMENTS = "/common/filter_elements";
export const FILTER_PRODUCT_DETAILS = "/product/product_details";

export const POSTHOG_API = "https://posthog-devs.impactsmartsuite.com";
export const POSTHOG_KEY = "phc_jdfaPUcheTjuLkcagCcjqQx4ebTtQLcSiq115zfZQJj";

/**
 * Attribute Smart API goes below
 */

export const AS_BASE = "/attribute-smart";

//Dashboard API
export const AS_DASHBOARD_UPLOAD = AS_BASE + "/upload/";
export const AS_DASHBOARD_EXPORT = AS_BASE + "/export_product_attributes/";
export const AS_DASHBOARD_ERROR_REPORT = AS_BASE + "/export-image-error/";

//Explore Summary API
export const AS_EXPLORE_SUMMARY = AS_BASE + "/explore-api/";

//Explore category API
export const AS_EXPLORE_CATEGORY = AS_BASE + "/explore-category-api/";
export const AS_EXPLORE_VARIANT_CATEGORY =
  AS_BASE + "/explore-variant-category/";
export const AS_EXPLORE_FILTER = AS_BASE + "/explore-category-filter-api/";
export const AS_EXPLORE_VARIANT_FILTER =
  AS_BASE + "/explore-variant-category-filter/";
export const AS_SINGLE_EDIT_SAVE = AS_BASE + "/product_attributes/";
export const AS_FETCH_ATTRIBUTES = AS_BASE + "/fetch_tenant_attributes/";

//Product Detail Page
export const AS_PRODUCT_DETAIL = AS_BASE + "/product-view/";

//Workflow Page API
export const TRANSITION = "/workflow/transitionmeta/";
export const WORKFLOW = "/workflow/workflow/";
export const STATES = "/workflow/state/";
export const TRANSITIONAPPROVAL = "/workflow/transitionapproval/";

// Ticketing API
export const TICKETING = "/ticket/";
export const UPDATE_STATUS = "/ticket/update_status/";
export const TICKETING_SUPTYPE = "/ticket/subtype/";
export const TICKETING_TYPE = "/ticket/type/";

// Column API
export const GET_COLUMNS = "/core/table-fields";
export const SET_ALL_DATA = "/common/post_all_data";

//Filter API
export const MODEL_FIELDS = "/common/model_fields_properties";
export const SET_FILTER_ELEMENTS = "/common/filter_elements";
export const CREATE_DIMENSION_FILTER = "/master/dimension-table/filters/";
export const SAVE_FILTER_SELECTION = "/core/filter/user-preference/screen/";
export const SAVE_FILTER_GET = "/core/filter/user-preference/screen";
export const SAVE_FILTER_POST = "/core/filter/screen/save-user-preference";
export const SAVE_FILTER_PUT = "/core/filter/screen/update-user-preference";
export const SAVE_FILTER_DELETE = "/core/filter/screen/delete-user-preference";

//Product Filter
export const GET_ALL_FILTER = "/core/filter-configuration/screen";
export const GET_FILTER_OPTIONS = "/core/attribute-filter";
export const GET_COMBINED_FILTER_OPTIONS = "/core/attribute-filter-v2";
export const GET_TABLE_DATA = "/master/dimension-table";
export const GET_MASTER_DIMENSION_DATA = "/master/dimension-table/basic";
export const GET_TABLE_DATA_AGGREGATE = "/master/dimension-table/aggregate";
export const VALIDATE_MAPPING = "/master/map-style";
export const VALID_PRODUCTS_STYLE = "master/map-style";
export const STYLE_PRODUCT_MAPPING = "/master/dimension-table/bulk/product";

export const SET_ALL_TABLE_DATA = "/master/dimension-table/set-all";
export const TIME_ATTRIBUTE = "/master/dimension-table/time-attribute";
export const GET_PRODUCT_GROUPS = "/core/group/product";

export const MAP_STORE_TO_PRODUCT = "/store-mapping/store-to-product";
export const GET_STORE_TO_DC = "/store-mapping/store-dc";
export const GET_STORE_TO_FC = "/store-mapping/store-fc";
export const GET_ALL_FC = "/master/fc";
export const GET_ALL_DC = "/master/dc";

export const MAP_STORE_TO_FC = "/store-mapping/map-store-to-fc";
export const MAP_STORE_TO_DC = "/store-mapping/map-store-to-dc/inline-save";
export const GET_REF_STORES = "/store-mapping/ref-stores";
export const GET_STORES_Product = "/store-mapping/products";
export const GET_STORES_GROUPS_Product = "/store-group-mapping/products";
export const POST_STORES_GROUP_TO_PRODUCT =
  "/store-group-mapping/store-group-to-product";
export const POST_STORES_TO_PRODUCT =
  "/store-mapping/store-to-product/inline-save";
export const UNMAPPED_STORE_PRODUCT = "/store-mapping/unmapped-stores";
export const UNMAPPED_STORE_GROUP_PRODUCT =
  "/store-group-mapping/unmapped-stores";
export const GET_MAPPED_PRODUCT_STORE = "/store-mapping/products/";
export const GET_MAPPED_PRODUCT_STORE_GROUP = "/store-group-mapping/products/";
export const STORE_GROUP_MAPPINGS_UPLOAD = "/core/group/store/upload-new";

// Inventory
export const DC_LIST = "/master/dc-list";
export const INVENTORY_OVERALL_VIEW = "/master/overall-view";
export const INVENTORY_DC_VIEW = "/master/dc-view";
export const INVENTORY_DC_STORE_VIEW = "/master/dc-store-view";
export const INVENTORY_STORE_VIEW = "/master/store-view";
export const INVENTORY_PRODUCT_VIEW = "/master/product-view";
export const GET_PRODUCT_TO_DC = "/product-mapping/product-dc";
export const GET_PRODUCT_TO_FC = "/product-mapping/product-fc";
export const MAP_PRODUCT_TO_DC = "/product-mapping/map-product-dc";
export const MAP_PRODUCT_TO_FC = "/product-mapping/map-product-fc";

export const TENANT_APP_CONFIG = "core/tenant/app_conf/assort";
export const HIERARCHIES_LIST = "core/tenant/hierarchies_list/";
export const GET_APP_CONFIG = "core/tenant/app_conf/";
export const GET_KPI_CONFIG = "core/tenant/assort/kpi";
export const GET_EXITING_PLANNING_LEVEL = "/core/tenant/assort/planning_lvl";

//event configuration
export const GET_EVENTS = "/notifications/event";
export const GET_EVENT_TYPE = "/notifications/event/types-triggers";
export const GET_APP_SCREENS = "/notifications/event/application-screens";
export const GET_APP_SCREENS_ACTIONS = "/notifications/event/screen-actions";
export const GET_DEPARTMENTS_CHANNEL = "/notifications/event/filter";

//user management
export const GET_USER_SCREENS = "/master/user-management/screens";
export const GET_MODULE_LEVEL_ACCESS =
  "/master/user-management/module-hierarchy";
// TENANT MANAGEMENT - MANAGE USER ROLE & MANAGE USER
export const GET_ROLE_MGMT_FILTER_CONFIG = "/core/user-role-mgmt/filter-conf";
export const GET_ROLE_MGMT_TABLE_CONFIG = "/core/user-role-mgmt/table-conf";
export const FETCH_TABLE_BASED_ON_FILTER = "/core/user-role-mgmt/mappings";
export const TABLE_HIERARCHY_ASSIGN_ROLE = "/core/user-role-mgmt/hierarchy";
export const GET_URM_FILTERS_LIST = "/core/user-role-mgmt/urm-filters";
export const GET_USER_APP_ACCESS_HIERARCHY = `/master/user-management/app-role-hierarchy`;
export const GET_USER_ACCESS_HIERARCHIES = `/core/user-role-mgmt/access_hierarchy`;

// same end point for all requests, maintaining one
export const SAVE_UPDATE_DELETE_USER_ROLE_MAPPING = "/core/user-role-mgmt/role";
export const DOWNLOAD_APP_DATA = "/core/user-role-mgmt/download";
export const ASSIGN_USER_ROLE_FORM_FILTERS =
  "core/user-role-mgmt/role-attributes";

// Manage User
export const SAVE_NEW_USER = "/core/user-mgmt/create";
export const DELETE_EXISTING_USER = "/core/user-mgmt/remove";
export const GET_USERS = "/core/user-mgmt/list";
export const GET_HOME_APPLICATION = "/core/user-role-mgmt/applications";
export const GET_SCREEN_LEVEL_ACCESS =
  "master/user-management/screen-hierarchy";

// tenant Config
export const GET_TENANT_CONFIG = "core/tenant-config";
export const GET_TENANT_FILTER_CONFIG = "/core/tenant-filter/filter-config";
export const POST_TENANT_FILTER_CONFIG =
  "/core/tenant-filter/create-filter-config";
export const GET_APPLICATION_MASTER = "/core/applications";
export const UPDATE_TENANT_ATTRIBUTE_CONFIG =
  "/core/tenant-config/create-config";
export const FETCH_UNASSIGNED_ROLES_LIST = "/core/user-mgmt/list/no-roles";
export const FETCH_CONFIGURATOR_APP_MODULES_INFO = "core/configuration/modules";
export const FETCH_CLIENT_SUBSCRIBED_APPS = "/core/tenant-mgmt/applications";
export const FETCH_KEYBOARD_SHORTCUT_CONFIG = "core/shortcuts/fetch";

//OMS Common Config
export const GET_OMS_COMMON_CONFIG = "inventory-smart/oms/roles-config";
//Store Cluster Grouping
export const FETCH_STORE_GROUP_CLUSTER_METRIC_PARAMETERS =
  "/core/group/store/cluster";
export const SUBMIT_CUSTOM_STORE_GROUP_CLUSTER_REQUEST =
  "/core/group/store/cluster";
export const FETCH_STORE_GROUP_CUSTOM_CLUSTER_INFO =
  "/core/group/store/cluster/job";

//Get release notes
export const GET_RELEASE_NOTES = "/core/release-notes";

// Comment
export const GET_COMMENT = "/core/get-comment";
export const CREATE_COMMENT = "/core/comment";

//
export const GET_SCREEN_MASTER = "/core/user-role-mgmt/screens";

//cross-dimensional-api
export const CROSS_DIMENSIONAL_API = "/core/cross-filter";
export const COMBINED_CROSS_DIMENSIONAL_API = "/core/cross-filter-v2";

//ticketing-api
export const TICKETING_FILTER_API = "/core/ticket-filters/browse";
export const TICKETING_APPLY_FILTER_API = "/core/ticket-filters/fetch";
export const TICKETING_FISCAL_REPORT_API = "/core/fiscal-report";
export const TICKETING_RECENT_ACTIVITIES = "/core/ticket-recent-activities";
export const TICKETING_TICKET_COMMENT_INFO = "/core/ticket-details";

//Product Mapping
export const MAP_PRODUCTS_TO_STORE_GROUP =
  "/product-mapping/product-to-store-group";

// Fiscal Calendar Api
export const GET_FISCAL_CALENDAR = `/core/timeline/fiscal-calendar-data`;

// Download Table
export const DOWNLOAD_TABLE_DATA = `/core/table/download-table`;

// get module wise configs
export const MODULES_CONFIG = "/core/tenant-config/module-config";

// Configurator apis
export const SIDE_PANEL_DATA = `/core/configuration/sidelayout`;
export const FETCH_APPS_CONFIGURATOR_API = "/core/configurator/app-config";

//JSON Parser api
export const GET_JSON_STRUCTURE = `/core/configuration/template`;

// Table View Panel
export const SAVE_TABLE_VIEW = "core/table/view/save";

export const SET_VIR_CONSTRAINT_FLAG_SET_ALL =
  "/inventory-smart/constraint/inventory/set-all/status";
export const SET_VIR_CONSTRAINT_FLAG =
  "/inventory-smart/constraint/inventory/status";

// Workflow Config APIs
export const WORKFLOW_CONFIG_FETCH = "/inventory-smart/workflow/config/fetch";
export const WORKFLOW_CONFIG_UPDATE = "/core/tenant-config/workflow-config-update";

// Product Port of Call APIs
export const PRODUCT_PORT_OF_CALL_LIST = "/product-mapping/port-of-call/list";
export const PRODUCT_PORT_OF_CALL_ADD = "/product-mapping/port-of-call/add";
export const PRODUCT_PORT_OF_CALL_SET_ALL = "/product-mapping/port-of-call/set-all";
export const PRODUCT_PORT_OF_CALL_MODIFY_TIME_PERIOD = "/product-mapping/port-of-call/modify-time-period";
export const PRODUCT_PORT_OF_CALL_UNMAP_SET_ALL = "/product-mapping/port-of-call/unmap-set-all";
