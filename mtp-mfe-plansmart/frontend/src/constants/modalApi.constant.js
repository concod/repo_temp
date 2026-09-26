export const MODEL_API_URL = "/plan-smart/model-data";
export const MATCH_WITH_CONFIG = "/plan-smart/config/match-with-kpis-v2";
export const UPDATE_BUDGET_TABLE_MATCH_WITH =
  "/plan-smart/budget/match-with-v4";
export const TARGET_PLAN_FILTER_CONFIG = "/plan-smart/model-data";
export const BUDGET_TABLE_SHOW_HIDE_API =
  "/plan-smart/budget/metrics/show-hide-default?plan_code=";
export const MASTER_PLAN_SHOW_HIDE_API =
  "/plan-smart/budget/metrics/show-hide-default?plan_module=";

export const SYNC_EOH_BOH_API = "/plan-smart/budget/sync-eop-bop";
export const IS_BOH_SYNC_REQUIRED_API =
  "/plan-smart/budget/is-eop-sync-required";
export const WRITTEN_TWO_DELIVER_API = "/plan-smart/plan/w2dlisting";

export const MODEL_API_METHOD = "POST";

// REQUEST PAYLOAD DATA LIST FOR MODEL APIs

export const GET_PLAN_DETAIL_MODAL_NO = "39";
export const GET_FORMULA_MODEL_NO = 48;
export const UPDATE_EOH_BOH_SYNC_VALUE = 19;

export const FETCH_FORM_FIELDS_MODEL_API_DATA = {
  id: 37,
  parameters: {
    fc_code: 161
  }
};

export const TARGET_PLAN_FORM_FIELDS_MODEL_API_DATA = {
  id: 37,
  parameters: {
    fc_code: 4
  }
};

export const FETCH_FILTER_CONF_MODEL_API_DATA = {
  id: 37,
  parameters: {
    fc_code: 3
  }
};
