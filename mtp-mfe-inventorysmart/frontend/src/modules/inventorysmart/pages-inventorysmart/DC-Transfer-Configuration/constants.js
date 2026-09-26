import { INVENTORY_SUBMODULES_NAMES } from "../../constants-inventorysmart/stringConstants";

export const DC_TRANSFER_CONFIGURATION_FILTER_CONFIG_KEY =
  "dcTransferConfigurationFilterConfiguration";

export const DC_TRANSFER_CONFIGURATION_FILTER_SCREEN_NAME =
  INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONFIG;

export const DC_TRANSFER_CONFIGURATION_TABLE_NAME = "dc_transfer_configuration";

export const DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID = "article";

export const DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN = "rule_name";
export const DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD = "rule_id";
export const DC_TRANSFER_CONFIGURATION_RULE_NAME_OPTIONS_FIELD =
  "rule_name_options";

export const DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN =
  "fulfillment_type";

export const FULFILLMENT_TYPE_TAG_SX = {
  "&.MuiChip-root": {
    background: "#F6F6F3 !important",
    color: "#8C906A !important",
  },
  "& .MuiChip-label": {
    color: "#8C906A !important",
  },
};

export const FULFILLMENT_TYPE_TAG_MAP = {
  need_based: { label: "Need Based" },
  fixed_push: { label: "Fixed Push" },
  NEED_BASED: { label: "Need Based" },
  FIXED_PUSH: { label: "Fixed Push" },
};

export const DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES = {
  RULE_ID: "rule_id",
  FULFILLMENT_TYPE: "fulfillment_type",
  TOTAL_DC: "dc_count",
  SOURCE_DC_INVENTORY_THRESHOLD: "source_dc_inventory_threshold",
  DESTINATION_DC_PO_WINDOW: "destination_dc_po_window",
};

export const NUMERIC_INLINE_FIELDS = new Set([
  DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.SOURCE_DC_INVENTORY_THRESHOLD,
  DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.DESTINATION_DC_PO_WINDOW,
]);
