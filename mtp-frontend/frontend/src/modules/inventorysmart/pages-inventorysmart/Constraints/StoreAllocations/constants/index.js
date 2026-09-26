export const MIN_FILTER_ID = "min_stock";
export const MAX_FILTER_ID = "max_stock";
export const WOS_FILTER_ID = "wos";
export const MIN_MAX_WOS_FILTER_IDS = [MIN_FILTER_ID, MAX_FILTER_ID, WOS_FILTER_ID];

export const MIN_STORE_COL_ID = "stores.0.min_store";
export const MAX_STORE_COL_ID = "stores.0.max_store";
export const WOS_STORE_COL_ID = "stores.0.wos";
export const MIN_MAX_WOS_STORE_COL_IDS = [
  MIN_STORE_COL_ID,
  MAX_STORE_COL_ID,
  WOS_STORE_COL_ID,
];

export const MIN_ID = "min";
export const MAX_ID = "max";
export const WOS_ID = "wos";
export const MIN_MAX_WOS_COL_IDS = [MIN_ID, MAX_ID, WOS_ID];

export const MIN_LABEL = "Min";
export const MAX_LABEL = "Max";
export const WOS_LABEL = "WOS";
export const MIN_MAX_WOS_COL_LABELS = [MIN_LABEL, MAX_LABEL, WOS_LABEL];

export const COLUMN_LABEL_VALUE_PAIR = {
    [MIN_LABEL]: 'min_store',
    [MAX_LABEL]: 'max_store',
    [WOS_LABEL]: 'wos',
};

export const COL_ID_KEY_MAP = {
    [MIN_STORE_COL_ID]: 'min',
    [MAX_STORE_COL_ID]: 'max',
    [WOS_STORE_COL_ID]: 'wos',
};

export const STORE_ID = "store";
export const STORE_WEEK_ID = "store_week";
export const STORE_STORE_WEEK_IDS = [STORE_ID, STORE_WEEK_ID];

export const WEEK_COL_HEADER_REGEX = /^Week-/;

export const FISCAL_YEAR_WEEK_ID = "fiscal_year_week";

export const EIGHT_WEEK_SELECTION_ERROR =
  "Please select 8 weeks at max to fetch data";

export const NON_NEGATIVE_ERROR = "Please enter a non-negative integer value";

export const MIN_MAX_WOS_MANDATORY = "Enter value for atleast one of min, max and wos";

export const MIN_GREATER_THAN_MAX = "Min value should be less than or equal to max value";

export const MAX_LESS_THAN_MIN = "Max value should be greater than or equal to min value";

export const NO_CHANGES_TO_SAVE = "No changes to save";

export const STORE_WEEK_RECORD_COUNT_FETCH_ERR = "Error while fetching record count";

export const STORE_WEEK_SET_ALL_FIELDS = {
  MIN: {
    label: "Min",
    type: "TextField",
    accessor: "min_store",
    required: false,
  },
  MAX: {
    label: "Max",
    type: "TextField",
    accessor: "max_store",
    required: false,
  },
  WOS: {
    label: "WOS",
    type: "TextField",
    accessor: "wos",
    required: false,
  },
}