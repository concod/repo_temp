import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  KPI_CONFIGURATOR_MODULE,
  KPI_UAM_MODULE_NAME,
} from "modules/inventorysmart/utils-inventorysmart/kpiConfigAccessControl";

/**
 * Loads UAM permissions for the KPI Configurator module and stores them in Redux.
 * Mirrors the module-level access pattern used across inventorysmart (see DC-DC / create-new-rule).
 * Required so Custom KPIs / Calculated Fields (and the Create/Edit KPI route) can gate
 * create/edit/delete actions per authorized user.
 */
export async function fetchKpiModuleAccess({
  inventorysmartScreenConfig,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
}) {
  const subModules =
    ROLES_ACCESS_MODULES_MAPPING[KPI_CONFIGURATOR_MODULE] || [];
  const rolesBasedModulesPermission = {};

  setInventorySmartPermissionLoader?.(true);
  try {
    if (inventorysmartScreenConfig?.roleBasedAccess) {
      const accessDataResponse = await getModuleLevelAccessUtility({
        app: APP_NAME,
        module: [KPI_UAM_MODULE_NAME],
      })();
      const createKpiPermissions = accessDataResponse[KPI_UAM_MODULE_NAME]
        ? Object.keys(accessDataResponse[KPI_UAM_MODULE_NAME])
        : FULL_ACCESS_PERMISSIONS_LIST;

      subModules.forEach((subModule) => {
        rolesBasedModulesPermission[subModule] = createKpiPermissions;
      });
    } else {
      subModules.forEach((subModule) => {
        rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
      });
    }

    setInventorySmartModulesPermissions?.({
      [KPI_CONFIGURATOR_MODULE]: rolesBasedModulesPermission,
    });
  } finally {
    setInventorySmartPermissionLoader?.(false);
  }
}
