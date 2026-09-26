export const FULFILMENT_TYPE = {
  NEED_BASED: "NEED_BASED",
  FIXED_PUSH: "FIXED_PUSH",
};

export const FULFILLMENT_TYPE_API_MAP = {
  [FULFILMENT_TYPE.NEED_BASED]: "need_based",
  [FULFILMENT_TYPE.FIXED_PUSH]: "fixed_push",
};

export const FULFILLMENT_TYPE_UI_MAP = {
  need_based: FULFILMENT_TYPE.NEED_BASED,
  fixed_push: FULFILMENT_TYPE.FIXED_PUSH,
};

export const DC_TRANSFER_RULE_MASTER_TABLE_NAME = "dc_transfer_mapping";
export const DC_TRANSFER_RULE_LIST_TABLE_NAME = "dc_transfer_rule_master";
