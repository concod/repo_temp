// Dashboard API URLs
export const GET_PLAN_DETAILS = "/plan";
export const GET_CREATED_PLANS = "/plan/search";
export const DELETE_PLAN = "/assort/plan/delete";
export const DELETE_CLUSTER_PLAN = "/cluster-smart/plan/delete";
export const DELETE_HINDSIGHT_PLAN = "/hindsight/delete";
export const CREATE_PLAN = "/plan";
export const GET_PLAN_LEVELS = "/assort/plan/level";
export const GET_PLAN_ATTRIBUTES = "/assort/plan/attributes";
export const GET_DASHBOARD_FILTERS = "/assort/plan/dashboard-filters";
export const DOWNLOAD_BUY_ROLLUP = "/buy-rollups";
export const GET_DASHBOARD_PLANS_TABLE_CONFIG =
  "/assort/table-fields/dashboard";
export const GET_HINDSIGHT_DASHBOARD_PLANS_TABLE_CONFIG =
  "/table-fields/hindsight-dashboard";
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
export const DOWNLOAD_MFP_DATA = "assort-smart/mfp/get-ty-mfp-budget-download";
export const VALIDATE_PLAN = "/plan/validate-plan";
export const GET_CREATED_HINDSIGHT_PLANS = "/hindsight/search";
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
//2-1 API URLs
export const GET_BUDGET_L2 = "assort/optimization/get-l2-budget";
export const OPTIMIZE_L3 = "assort/optimization/2-1-cloud-task";
export const OPTIMIZE_CARRYOVER_CLOUD_TASK =
  "assort-smart/optimization/optimization-with-cloud-task";
export const GET_DROPS_DATA = "assort/plan/fetch-drops-data";
export const BUDGET_POLL = "/assort/task/poll/";
export const UPDATE_BUDGET_L2 = "assort/optimization/update-l2-budget";
export const UPDATE_BUDGET_L2_DROP = "assort/plan/update-l2-budget-drop";
export const GET_L3_OPT = "/optimization/get-l3-optimization";
export const UPDATE_L3_OPT = "/optimization/update-l3-optimization";
export const GET_CLUSTER_OPT = "/optimization/get-cluster-optimization";
export const UPDATE_CLUSTER_OPT = "/optimization/update-cluster-optimization";
export const DROP_CONFIG = "assort/optimization/drop-config";
export const GET_PRODUCT_LIST = "/plan-budget/product-list";
export const CREATE_NEW_L3 = "/new-l3";
export const GET_STORE_ELIGIBILITY_DATA =
  "assort/optimization/get-ip-eligibility-store-count";
export const GET_CARRYOVER_SELECTION_DATA =
  "assort-smart/budget/get-plan-carryover";
export const GET_RULE_ENGINE_CARRYOVER_DATA =
  "/plan-budget/rule-engine-carryover";
export const UPDATE_CARRYOVER_SELECTION_DATA =
  "assort-smart/budget/update-plan-carryover";
export const GET_PLAN_CARRYOVER_PERC_VIEW =
  "assort-smart/budget/get-plan-carryover-perc-view";
export const OPTIMIZATION_CARRYOVER_LOGIC =
  "assort-smart/carryover/carryover-optimization";
export const GET_REVIEW_TARGET_DATA = "assort-smart/plan/get-review-target";
export const OPTIMIZATION_DROP_FLOW_CONFIGURATION =
  "assort-smart/dropflow/drop-config";
export const DELETE_L3 = "/optimization/delete-l3-optimization";
export const GET_DROP_PLAN_DATA = "assort-smart/dropflow/get-plan-drop";
export const REVIEW_BUDGET_ACROSS_DROPS =
  "assort-smart/budget/review-budget-with-drop";
export const UPADATE_DROP_FLOW_DATA =
  "assort-smart/dropflow/update-drop-flow-data";
export const DELETE_OPTIMIZATION = "/optimization/delete-optimisation";
//2-2 API URLs
export const OPTIMIZE_APS_ST = "/depth-choice/calculate-aps-st";
export const GET_APS_ST = "/depth-choice/get-aps-st";
export const UPDATE_L3_APS_ST = "/depth-choice/update-aps-st-l3";
export const UPDATE_CLUSTER_APS_ST = "/depth-choice/update-cluster-aps-st";
export const GET_DEPTH_CHOICE = "/depth-choice/get-depth-choice";
export const UPDATE_DEPTH_CHOICE = "/depth-choice/update-depth-choice";
export const OPTIMIZE_DEPTH_CHOICE = "/depth-choice/calculate-depth-choice";

// 2-3 API URLs
export const GET_PLAN_OPTMIZATION_CONSTRAINT =
  "/wedge/get-plan-optimization-constraint";
export const UPDATE_OPTMIZATION_CONSTRAINT_DATA =
  "/wedge/update-plan-optimization-constraint";
export const GET_WEDGE_METRICS = "/wedge/get-wedge-metrics";
export const GET_WEDGE_ATTRIBUTES = "/wedge/get-wedge-attributes";
export const GET_WEDGE_TABLE_DATA = "/wedge/get-wedge-data";
export const UPDATE_WEDGE_TABLE_DATA = "/wedge/plan-wedge-details";
export const UPDATE_STYLE_WEDGE_TABLE_DATA = "/wedge/style-wedge-update";
export const OPTIMIZE_WEDGE = "/wedge/initiate-wedge-process";
export const RE_OPTIMIZE_WEDGE = "/wedge/plan-wedge-reoptimize";
export const DEPTH_MULTIPLIER = "/wedge/get-depth-multiplier-details";
export const UPLOAD_WEDGE = "/wedge/upload-file";
export const GET_PLAN_SETUP_DROPS = "/wedge/get-plan-drop";
export const UPDATE_PLAN_SETUP_DROPS = "/wedge/plan-drop-details";
export const WEDGE_ADD_CHOICE = "/wedge/wedge-add-choice";
export const WEDGE_ADD_CHOICE_VALIDATION = "/wedge/wedge-add-choice-validation";
export const WEDGE_ADD_STYLE = "/wedge/add-style";
export const WEDGE_DELETE_CHOICE = "/wedge/delete-choices";
export const WEDGE_DELETE_FETCH_DATA = "/wedge/delete-data-fetch";
export const ADD_DROP_SHIP_CHOICES = "/wedge/add-dropship-choices";
export const EOP_UPDATE = "/wedge/eop-update";
export const GET_MAP_STYLE_DETAILS = "/wedge/get-style-details";
export const MAP_CARRYOVER_STYLE_DETAILS = "/wedge/map-carryover-style-details";
export const FETCH_PAC_DOWNLOAD_DATA = "/pac/get-article-details";
export const UPDATE_ARTICLE_DETAILS = "/pac/wedge/update-article-details";
export const FETCH_CHOICE_SET_DETAILS = "/wedge/get-choice-set-details";
export const UPDATE_CHOICE_SET_DETAILS = "/wedge/update-choice-set-details";
export const DELETE_CHOICE_SET_DETAILS = "/wedge/delete-choice-set-details";
export const FETCH_SISTER_STYLE_MAPPING = "/wedge/get-sister-style-mapping";
export const SISTER_STYLE_MAPPING = "/wedge/sister-style-mapping";
export const IMAGE_WEDGE_MAP = "/image-gen/images-wedge-map";
export const ADD_WEDGE_ATTRIBUTE = "/wedge/add-attribute";

//2-4 API URLs
export const GET_FINALISE_PLAN_METRICS = "/finalize/get-finalise-plan-metrics";
export const OPTIMIZE_SIZE_REVIEW = "/finalize/calculate-size-split";
export const GET_SIZE_REVIEW_CONFIGURATION = "/finalize/get-size-details";
export const GET_FINALIZE_CLUSTER_GRADE_DATA = "/finalize/get-grade-details";
export const GET_FINALIZE_ATTRIBUTE_GRADE_DATA =
  "/finalize/get-attribute-grade-details";
export const OPTIMIZE_ATTRIBUTE_REVIEW = "/finalize/calculate-attr-split";
export const FINALIZE_PLAN = "/plan/finalize/";
export const DOWNLOAD_PO_SHEET = "/finalize/get-finalise-po-sheet";
//Receipt drawer and BOP URLs
export const GET_RECEIPT_DRAWER_DATA = "/plan/get-plan-receipt-drawer";
export const GET_BOP_L3_LEVEL_DATA = "/plan/get-bop-summary-l3";
export const GET_BOP_CHOICE_LEVEL_DATA = "/plan/get-bop-summary-choice";
export const GET_PLAN_RECEIPT_DRAWER_VIEW = "/plan/get-plan-receipt-drawer-view";
//NLE
export const NON_LINEAR_EDIT = "/finalize/non_linear_changes";
export const NON_LINEAR_CHANGES_REPLACE_DATA =
  "/finalize/non-linear-changes-replace-data";

//Default Attributes
export const GET_DEFAULT_ATTRIBUTES = "master/attribute/get-default-attribute";

//comapare-plan url
export const GET_COMPARE_PLAN_DATA = "/plan/compare-plan";
export const VALIDATE_COMPARE_PLAN = "/plan/validate-compare-plan";
export const GET_COMPARE_PLAN_CLUSTER_DATA = "/plan/compare-cluster";

//Omni/Hindsight Dashboard table columns api url
export const OMNI_HINDSIGHT_DASHBOARD_TABLE_CONFIG = "assort/table-fields";

export const CLUSTER_DASHBOARD_TABLE_CONFIG = "cluster-smart/table-fields";

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
export const DELETE_CORE_CHOICE = "/all_door_choice/delete-all-door-choice";

//Dashboard filters api
export const DASHBOARD_FILTER = "core/filter-configuration/screen";

export const CLUSTERSMART_ROLLUP_DOWNLOAD = "/cluster-smart/finalize/roll-up";

export const GET_STORE_ATTRIBUTES = "/plan-smart/plan/store-attributes";

// Hindsight api
export const GET_HINDSIGHT_KPI_VIEW = "/hindsight/kpi-view";
export const GET_TREEMAP_Data = "/hindsight/form-treemap";
export const TREEMAP_FILTERS_DATA = "/hindsight/get-filter-details";
export const CREATE_HINDSIGHT_VIEW = "/hindsight/create-plan";
export const GET_HINDSIGHT_PLAN_DETAILS = "/hindsight";
export const BUBBLE_GRAPH_DATA = "/hindsight/form-bubble-graph";
export const PARETO_GRAPH_DATA = "/hindsight/form-parito-graph";
