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
export const GET_SEASON_YEAR = "/assort/plan/get-season-year";
export const GET_SEASON_OPTIONS = "/master/season/get-season-details";
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

//dashboard configurator
export const CLUSTER_PLAN_CREATE = `cluster-smart/filter-configuration/screen/${encodeURIComponent('cluster plan create')}?dimension=${encodeURIComponent('product')}`;    
export const SAVE_DEFAULT_ATTRIBUTES = 'cluster-smart/default-attributes-save';
export const GET_ATTRIBUTE_LIST = 'cluster-smart/attributes-list';
export const UPDATE_PREVIEW_TABLE = 'cluster-smart/default-attributes-next';
export const FETCH_DEFAULT_ATTRIBUTES = 'cluster-smart/default-attributes-get';

//clustering hyperparameter
export const GET_CLUSTER_HYPERMETER_DATA = 'cluster-smart/cluster-hyperparameter-get';
export const FETCH_DEFAULT_CLUSTER_HYPERPARAMETER_DATA = 'cluster-smart/cluster-hyperparameter-fetch/default';
export const FETCH_CUSTOM_CLUSTER_HYPERPARAMETER_DATA = 'cluster-smart/cluster-hyperparameter-fetch/custom';
export const SET_CLUSTER_HYPERPARAMETER_DATA = 'cluster-smart/cluster-hyperparameter-apply';
export const UPDATE_CLUSTER_HYPERPARAMETER_DATA = 'cluster-smart/cluster-hyperparameter-next';
