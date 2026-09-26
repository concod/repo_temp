export const SIZE_CHOICE_TABLE_PAYLOAD = {
  formatter: "roundOff",
  data_type: "float",
  forecast_source: "adjusted",
  aggregation_level: "W",
  style_info_required: true,
  table_config: {
    group_fiscal_weeks: true,
    include_product_hierarchy: true,
    po_rebalancing_columns: true,
    enable_pivot: true,
  },
  extra: {
    fullWidth: true,
    roundOffTo: 0,
    ignoreValueGetter: true,
    show_totals: true,
    is_grouping_key: true,
  },
};

export const UPPER_HIERARCHY_TOTAL_METRICS = [
  "Last_4_week_stock_sales",
  "Last_week_Stock_Sales",
  "DC_Inventory_WOS",
  "Store_Inventory_WOS",
];

export const RESET_FIELDS_FOR_RECOMMENDATION = [
  "po_destination",
  "po_source",
  "transfer",
  "transfer_id",
  "po_units_before_rebalance",
  "po_units_before_rebalance_des",
  "rem_transfer",
  "po_units_after_rebalance",
  "po_units_after_rebalance_des",
  "dc_inv_bop_post_allocation_after",
  "dc_inv_bop_post_allocation_des_after",
];

export const FIELDS_TO_COPY_FOR_RECOMMENDATION = [
  "size",
  "size_copy",
  "dc_inv_bop_post_allocation",
  "dc_inv_bop_post_allocation_des",
  "total_transfer_recomm",
];

export const FIELDS_FOR_SAVING_DRAFT = [
  "size",
  "transfer",
  "id",
  "po_source",
  "po_destination",
  "transfer_id",
  "po_units_before_rebalance",
  "po_units_after_rebalance",
  "po_units_before_rebalance_des",
  "po_units_after_rebalance_des",
  "total_transfer_recomm",
  "rem_transfer",
  "dc_inv_bop_post_allocation",
  "dc_inv_bop_post_allocation_des",
  "dc_inv_bop_post_allocation_after",
  "dc_inv_bop_post_allocation_des_after",
];
