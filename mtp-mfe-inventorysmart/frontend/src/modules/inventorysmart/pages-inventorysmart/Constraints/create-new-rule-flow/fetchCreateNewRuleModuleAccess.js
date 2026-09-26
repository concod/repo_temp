import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const MANAGE_RCL_PERMISSION_MODULE = "inventorysmart_add_rules";
const CREATE_NEW_RULE_PERMISSION_MODULE = "inventorysmart_create_new_rule";

/** Same screen_name as CREATE_NEW_RULE route in routes.js */
export const CREATE_NEW_RULE_SCREEN_NAME = "Inventorysmart Constraints";

/**
 * Loads UAM permissions for create-new-rule (same API as Constraints → Create new rule).
 * Required on direct refresh of step 1; otherwise Redux has no edit actions and checkboxes stay hidden.
 */
export async function fetchCreateNewRuleModuleAccess({
  inventorysmartScreenConfig,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
}) {
  const subModules = ROLES_ACCESS_MODULES_MAPPING[MANAGE_RCL_PERMISSION_MODULE];
  let rolesBasedModulesPermission = {};

  setInventorySmartPermissionLoader?.(true);
  try {
    if (inventorysmartScreenConfig?.roleBasedAccess) {
      const accessDataResponse = await getModuleLevelAccessUtility({
        app: APP_NAME,
        module: subModules,
      })();
      rolesBasedModulesPermission = Object.fromEntries(
        Object.entries(accessDataResponse).map(([mod, actions]) => [
          mod,
          Object.keys(actions),
        ])
      );
    } else {
      subModules.forEach((subModule) => {
        rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
      });
    }

    setInventorySmartModulesPermissions?.({
      [MANAGE_RCL_PERMISSION_MODULE]: rolesBasedModulesPermission,
      [CREATE_NEW_RULE_PERMISSION_MODULE]: rolesBasedModulesPermission,
    });

    const createRulesConstraintActions =
      rolesBasedModulesPermission[
        INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT
      ];

    const hasEditPermission =
      !inventorysmartScreenConfig?.roleBasedAccess ||
      createRulesConstraintActions?.includes("edit");

    return { hasEditPermission };
  } finally {
    setInventorySmartPermissionLoader?.(false);
  }
}

/**
 * Loads tenant configs required on step-1 refresh (Add RCL fetches these on mount;
 * create-new-rule skips step 0 on refresh so constraintsConfigs was never populated).
 */
export async function fetchCreateNewRuleTenantConfigs({
  screenName = CREATE_NEW_RULE_SCREEN_NAME,
  setConstraintsConfigs,
  setCreateRulesConfigs,
}) {
  const loadConfig = getModuleBasedTenantConfig;
  const [constraintsConfigs, createRulesConfigs] = await Promise.all([
    loadConfig({
      module_name: "inventorysmart_constraints_configs",
      screen_name: screenName,
    })(),
    loadConfig({
      module_name: "create_rules_configs",
      screen_name: screenName,
    })(),
  ]);

  if (constraintsConfigs && Object.keys(constraintsConfigs).length) {
    setConstraintsConfigs?.(constraintsConfigs);
  }
  if (createRulesConfigs && Object.keys(createRulesConfigs).length) {
    setCreateRulesConfigs?.(createRulesConfigs);
  }

  return { constraintsConfigs, createRulesConfigs };
}
