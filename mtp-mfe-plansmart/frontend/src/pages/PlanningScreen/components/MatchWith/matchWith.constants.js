export const fields = [
  {
    column_name: "match_with",
    label: "Match with",
    display_type: "dropdown",
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    dimension: "plan",
    options: [],
    extra: {
      showPlaceholderWithRatio: true
    }
  },
  {
    column_name: "category",
    label: "Category",
    display_type: "dropdown",
    is_mandatory: false,
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    dimension: "plan",
    options: [
      {
        value: "Select all",
        label: "Select all"
      }
    ],
    extra: {
      showPlaceholderWithRatio: true
    }
  },
  {
    column_name: "kpi",
    label: "KPI",
    display_type: "dropdown",
    is_mandatory: false,
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    options: []
  }
];

export const PRE_SEASON_STATUS_CODES = [0, 1, 2];

export const KPI = "KPI";
export const MATCH_WITH = "match_with";
export const CATEGORY = "category";
export const IAF = "IAF";
export const WRITTEN_SALES = "Written Sales";
export const SELECT_ALL = "Select all";
export const SUCCESS_MESSAGE = "Budget table updated successfully.";
export const IN_SEASON = "in-season";
export const PRE_SEASON = "pre-season";
export const ADDED_VERSION = "added_versions";

export const MATCH_WITH_DROPDOWN_API = "/plan-smart/config/matchwith-dropdown";
