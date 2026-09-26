import { OMS_ORDERING_SUBMODULES_NAMES } from "modules/oms/constants-oms/stringConstants";

const {
  OMS_ORDER_STATUS,
  OMS_ORDER_DELIVERY,
  OMS_ORDER_ORDERING,
  OMS_ORDER_SAFETY_STOCK,
  OMS_ORDER_POLICY,
  OMS_VENDOR_DC_POLICY,
  OMS_PO_CONVERSION,
  OMS_RULES_CONSTRAINTS,
  OMS_SHIPMENT_CONSTRAINTS,
} = OMS_ORDERING_SUBMODULES_NAMES;

export const tabModulePermissionMapForOrdering = {
  constraints_oms: [
    OMS_ORDER_STATUS,
    OMS_ORDER_DELIVERY,
    OMS_ORDER_ORDERING,
    OMS_ORDER_SAFETY_STOCK,
    OMS_ORDER_POLICY,
    OMS_VENDOR_DC_POLICY,
    OMS_PO_CONVERSION,
    OMS_RULES_CONSTRAINTS,
    OMS_SHIPMENT_CONSTRAINTS,
  ],
};

export const omsOrderingTabModulePermissionMap = {
  constraints_status: [OMS_ORDER_STATUS],
  constraints_delivery: [OMS_ORDER_DELIVERY],
  constraints_ordering: [OMS_ORDER_ORDERING],
  constraints_safety_stock: [OMS_ORDER_SAFETY_STOCK],
  constraints_order_policy: [OMS_ORDER_POLICY],
  constraints_vendor_dc_policy: [OMS_VENDOR_DC_POLICY],
  constraints_po_conversion: [OMS_PO_CONVERSION],
  vendor_constraints: [OMS_RULES_CONSTRAINTS],
  shipment_constraints: [OMS_SHIPMENT_CONSTRAINTS],
};
