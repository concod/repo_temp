export const UN_EDITABLE_COLUMNS_FOR_PO_STORE_DC = ["APS/ROS", "WOS_rounded"];

export const UN_EDITABLE_COLUMNS_FOR_STRATEGY_PO = ["user_def_inv_perc", "wos"];

export const DISABLED_COLUMNS_FOR_STRATEGY_PO = ["demand_type", "sizes", "inventory_source"];

export const COLUMNS_TO_DELETE_STRATEGY_PO = ["user_def_inv"];

export const DC_COLUMN_FOR_PO = {
  "sub_headers": [],
  "tc_code": 120,
  "label": "DC",
  "column_name": "dest_whouse",
  "dimension": "Inventory",
  "type": "str",
  "is_frozen": false,
  "is_editable": false,
  "is_aggregated": false,
  "order_of_display": 8,
  "is_hidden": false,
  "is_required": false,
  "tc_mapping_code": "5057",
  "aggregate_type": null,
  "formatter": null,
  "is_row_span": false,
  "footer": null,
  "is_searchable": false,
  "extra": {},
  "is_sortable": false,
  "width": 200,
  "is_deleted": false,
  "is_master_group": false
}