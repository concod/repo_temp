export const RECALCULATE_TABLE_CONFIG_NAME = "plansmart_planning_recalculate";
export const CORE_TABLE_CONFIG_API = "core/table-fields?table_name=";
export const RECALCULATE_CONSTRAINT_API =
  "/plan-smart/budget/constraint-filter-new";
export const RECALCULATE_INITIATED_MESSAGE =
  "Recalculation initiated, We will notify you once it is successful";
export const RECALCULATE_SUCCESS_MESSAGE = "Recalculated Successfully";

export const RECALCULATE_CONSTANTS = {
  BUTTON_RECALCULATE: "Recalculate",
  BUTTON_CANCEL: "Cancel",
  RECALCULATE_HEADER: "Recalculate",
  SET_PARAMETERS_HEADER: "Set Parameters",
  TABLE_ROW_HEADER_1: "Margin",
  TABLE_ROW_HEADER_2: "Revenue Growth",
  IAF_VERSION_ERROR: "Please add IAF version",
  TARGET_VALUE: "targetValue",
  THRESHOLD_PERC: "thresholdPercValue",
  UNIQUE_ID_MARGIN: "gross_margin_per",
  VERSION_LY: "LY",
  VERSION_WP: "WP",
  VERSION_WF: "WF",
  UNIQUE_ID_REVENUE_GROWTH: "revenue_growth_per",
  UNIQUE_ID_EOP: "eop_variance",
  UNIQUE_ID_REVENUE_TOTAL: "revenue_total"
};

export const RECALCULATE_CONSTANTS_ARHAUS = {
  ...RECALCULATE_CONSTANTS,
  COLUMN_KEY_MARGIN: "written_gm_dollar",
  COLUMN_KEY_REVENUE: "written_sales_dollars"
};

export const RECALCULATE_CONSTANTS_PARTYCITY = {
  ...RECALCULATE_CONSTANTS,
  COLUMN_KEY_MARGIN: "total_margin",
  COLUMN_KEY_REVENUE: "total_sales"
};

export const RECALCULATE_TABLE_DATA = [
  {
    empty: "",
    parameters: RECALCULATE_CONSTANTS.TABLE_ROW_HEADER_1,
    priority: 1,
    targetValue: 0,
    thresholdPercValue: 0,
    uniqueId: "gross_margin_per"
  },
  {
    empty: "",
    parameters: RECALCULATE_CONSTANTS.TABLE_ROW_HEADER_2,
    priority: 2,
    targetValue: 0,
    thresholdPercValue: 0,
    uniqueId: "revenue_growth_per"
  }
];

export const RECALCULATE_FILTER_FIELDS = [
  {
    label: "Target Margin",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "gross_margin_per",
    is_negative_value_allowed: true
  },
  {
    label: "Target Revenue Growth",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "revenue_growth_per",
    is_negative_value_allowed: true
  },
  {
    label: "Target EOP Variance",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "eop_variance",
    is_negative_value_allowed: true
  },
  {
    label: "Total revenue",
    field_type: "IntegerField",
    value_type: "int",
    accessor: "revenue_total",
    is_negative_value_allowed: true
  }
];

export const MOCK_RECALCULATE_PAYLOAD = [
  {
    filter_type: "non-cascaded",
    operator: "in",
    attribute_name: "l1_name",
    values: ["SOFT GOODS"]
  },
  {
    filter_type: "non-cascaded",
    attribute_name: "gross_margin_per",
    operator: "in",
    priority: 1,
    thresholdValues: [0],
    values: [0.49]
  },
  {
    filter_type: "non-cascaded",
    attribute_name: "revenue_growth_per",
    operator: "in",
    priority: 2,
    thresholdValues: [0.01],
    values: [2.1513]
  },
  {
    filter_type: "non-cascaded",
    operator: "in",
    attribute_name: "eop_variance",
    values: [0]
  },
  {
    filter_type: "non-cascaded",
    operator: "in",
    attribute_name: "revenue_total",
    values: [2841.6500000000015]
  }
];
