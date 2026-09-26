import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

/** UAM is loaded under add_rules when entering from Constraints (see handleCreateNewRule). */
const CONSTRAINTS_EDIT_MODULE_KEYS = [
  "inventorysmart_create_new_rule",
  "inventorysmart_add_rules",
];

export function canEditCreateNewRuleConstraints(
  inventorysmartModulesPermission,
  inventorysmartScreenConfig
) {
  if (!inventorysmartScreenConfig?.roleBasedAccess) {
    return true;
  }
  return CONSTRAINTS_EDIT_MODULE_KEYS.some((moduleKey) =>
    isActionAllowedOnSubModule(
      inventorysmartModulesPermission,
      moduleKey,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
      "edit"
    )
  );
}
