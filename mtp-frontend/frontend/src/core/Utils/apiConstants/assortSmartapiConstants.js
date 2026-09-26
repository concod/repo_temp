// Dashboard API URLs
export const GET_PLAN_DETAILS = "/assort/plan";
export const GET_CREATED_PLANS = "/assort/plan/search";
export const DELETE_PLAN = "/assort/plan/delete";
export const DELETE_CLUSTER_PLAN = "/cluster-smart/plan/delete";
export const CREATE_PLAN = "/assort/plan";
export const GET_PLAN_LEVELS = "/assort/plan/level";
export const GET_PLAN_ATTRIBUTES = "/assort/plan/attributes";
export const GET_DASHBOARD_FILTERS = "/assort/plan/dashboard-filters";
export const DOWNLOAD_BUY_ROLLUP = "/buy-rollups";
export const GET_DASHBOARD_PLANS_TABLE_CONFIG =
  "/assort/table-fields/dashboard";
export const COPY_ASSORT_PLAN = "/copy-plan";
export const FINALIZE_FOR_PO = "/assort/plan/finalize-po";
export const MAP_STYLE_DATA = "/assort/wedge/map-visulon-style-data";
export const GET_SEASON_YEAR = "/assort/plan/get-season-year";
export const GET_SEASON_OPTIONS = "/master/season/get-season-details";
export const CREATE_MASTER_PLAN = "assort-smart/masterplan/create-master-plan";
export const GET_SUMMARY_VIEW_DATA = "assort-smart/plan/get-master-plan-";
export const GET_MFP_UPLOAD_DATA = "assort-smart/mfp/get-ty-mfp-budget";
export const UPLOAD_MFP_DATA = "assort-smart/mfp/upload-file-ty-budget";
export const UPDATE_MFP_DATA = "assort-smart/mfp/update-ty-mfp-budget";
//Omni/Hindsight Dashboard table columns api url
export const OMNI_HINDSIGHT_DASHBOARD_TABLE_CONFIG = "assort/table-fields";

export const CLUSTER_DASHBOARD_TABLE_CONFIG = "cluster-smart/table-fields";

//Dashboard filters api
export const DASHBOARD_FILTER = "core/filter-configuration/screen";

export const CLUSTERSMART_ROLLUP_DOWNLOAD = "/cluster-smart/finalize/roll-up";
//1-1 api urls
export const GET_STORE_CHANNELS = "/master/store/channels";
export const GET_CHANNELS_BASED_STORE_GROUPS = "/core/group/store";
export const CALCULATE_SIG_SCORE =
  "/cluster-smart/attributes/calculate-attributes";
export const GET_PERFORMANCE_ATTRIBUTES = "/assort/plan/performance-attributes";
export const GET_PRODUCT_ATTRIBUTES = "/assort/plan/product-attributes";
export const GET_CLUSTER_ATTRIBUTES = "/cluster-smart/attributes";
export const RUN_CLUSTER = "/cluster-smart/cluster";
export const CLUSTER_POLL = "/cluster-smart/cluster/poll/";
export const UPDATE_ATTRIBUTES = "/cluster-smart/attributes/update-attributes";
export const ADD_ECOM_CLUSTER = "cluster-smart/cluster/add-ecom-details";
export const MULTIPLE_CHANNEL_DYNAMIC_COL =
  "assort/table-fields/multiple-channel";
//1-2 API URLs
export const GET_ATTRIBUTE_GRAPH_DATA = "cluster-smart/attributes/info";
export const GET_PERFORMANCE_GRAPH_DATA = "cluster-smart/performance/info";
export const GET_CLUSTER_BREAKDOWN_DATA =
  "cluster-smart/finalize/grade-breakdown";
export const FINAL_CLUSTER_BUCKET_SAVE = "cluster-smart/finalize/final-save";
export const GET_CLUSTER_STORE_LIST_DATA = "cluster-smart/stores/fetch-stores";
export const GET_STORE_DATA_FROM_CLUSTER = "/master/store/attributes";
export const UPDATE_SWAP_STORE_DATA = "cluster-smart/stores/store-swaps";
//Default Attributes
export const GET_DEFAULT_ATTRIBUTES = "master/attribute/get-default-attribute";

//comapare-plan url
export const GET_COMPARE_PLAN_DATA = "/plan/compare-plan";
export const VALIDATE_COMPARE_PLAN = "/plan/validate-compare-plan";
export const GET_COMPARE_PLAN_CLUSTER_DATA = "/plan/compare-cluster";



//Omni API urls
export const GET_OMNI_WEDGE_MAPPING_DATA = "/omni-wedge/get-mapping";
export const GET_OMNI_WEDGE_METRICS_DATA = "/omni-wedge/get-metrics";
export const UPLOAD_OMNI_MAPPING_FILE = "/omni-wedge/upload-file";
export const MERGE_OMNI_PLAN = "/omni-wedge/merge-plan";
export const ADD_REFRESH_PLAN = "/omni-wedge/refresh-plan";
export const UPDATE_OMNI_DATA = "/omni-wedge/update-omni-wedge";
export const OMNI_DELETE = "/omni-wedge/delete";
export const OMNI_DELETE_ROW = "/omni-wedge/delete-global-choice";
export const OMNI_CREATE_PLACEHOLDER_AND_CHOICE_ID =
  "/wedge/create-placeholder-and-choice-id";
export const OMNI_CALL_PLACEHOLDER_OID = "/placeholder/call-placeholder-oid";
export const GET_CARRYOVER_COLORWAY =
  "/omni-wedge/get-carryover-colorway-details";
export const OMNI_CALL_COLORWAY_SEASON_FINALIZED =
  "/omni-plan/callback-colorway-season-finalized-omni-plan";

//COre choice configuration api urls
export const CORE_CHOICE_DASHBOARD_TABLE_CONFIG =
  "assort/table-fields/assort_core_choice_dashboard";
export const GET_CORE_CHOICE_DASHBOARD = "/all_door_choice/get-dashboard";
export const CREATE_CORE_CHOICE_FILTERS =
  "core/filter-configuration/screen/Assort create core choice";
export const CREATE_CORE_CHOICE = "/all_door_choice/create-all-door-choice";
