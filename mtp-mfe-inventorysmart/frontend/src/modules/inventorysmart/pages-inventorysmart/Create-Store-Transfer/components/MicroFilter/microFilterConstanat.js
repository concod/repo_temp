// Division (l0_name) and Department (l1_name) are mandatory micro filters.
export const MANDATORY_MICRO_FILTERS = ["l0_name", "l1_name"];
export const MICRO_FILTER_CONFIG_NAME =
  "Inventorysmart Transfer Recommendation Filters S2S";
export const microFilterKeys = ["l0_name", "l1_name", "l2_name", "l3_name"];

// Fixed options for the non-cascaded "Review Status" filter.
export const REVIEW_STATUS_MAPPING = {
  "1": "Created",
  "2": "Moved to Order Batching",
  "3": "Approved",
};
export const REVIEW_STATUS_OPTIONS = [
  { label: "Created", value: "1" },
  { label: "Moved to Order Batching", value: "2" },
  { label: "Approved", value: "3" },
];

// The extra non-cascaded config appended to the fetched filter config.
export const REVIEW_STATUS_CONFIG = {
  column_name: "review_status",
  attribute_name: "review_status",
  dimension: "product",
  display_type: "dropdown",
  filter_type: "non-cascaded",
  type: "non-cascaded",
  label: "Review Status",
  name: "Review Status",
  is_mandatory: false,
  display_order: 9999,
  options: REVIEW_STATUS_OPTIONS,
};

export const INITIAL_DISPLAY_COUNT = 100;
export const LOAD_MORE_COUNT = 100;
export const SEARCH_DISPLAY_LIMIT = 500;
