import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { ENV } from "config/api";

// UAM module key used for KPI Configurator permissions (matches routes.js + ROLES_ACCESS_MODULES_MAPPING)
export const KPI_CONFIGURATOR_MODULE = "inventorysmart_kpi_configurator";

// UAM module name for Create KPI permissions
export const KPI_UAM_MODULE_NAME = "Create KPI";

// Environment name constants
export const KPI_ENV = {
  PROD: "PROD",
  UAT: "UAT",
  TEST: "TEST",
  DEV: "DEV",
};

// Normalise the tenant baseUrl derived ENV into a known environment name.
export const getKpiEnvironment = () => {
  if (!ENV) return KPI_ENV.PROD;
  const env = String(ENV).toLowerCase();
  if (env.includes("uat")) return KPI_ENV.UAT;
  if (env.includes("test")) return KPI_ENV.TEST;
  return KPI_ENV.DEV;
};

// Direct KPI creation/editing is never allowed in PROD; KPIs are synced from UAT.
export const isKpiEnvironmentEditable = (environment = getKpiEnvironment()) =>
  environment !== "PROD";

// Whether the logged-in user has UAM edit access on a KPI sub-module.
// When role based access is disabled for the tenant, everyone with the module gets edit.
export const hasKpiSubModuleEditAccess = (
  inventorysmartModulesPermission,
  inventorysmartScreenConfig,
  subModuleName
) => {
  if (!inventorysmartScreenConfig?.roleBasedAccess) {
    return true;
  }
  return isActionAllowedOnSubModule(
    inventorysmartModulesPermission,
    KPI_CONFIGURATOR_MODULE,
    subModuleName,
    "edit"
  );
};

// Combined gate: editable environment AND UAM edit permission on the sub-module.
export const canEditKpiSubModule = ({
  inventorysmartModulesPermission,
  inventorysmartScreenConfig,
  subModuleName,
  environment = getKpiEnvironment(),
}) =>
  isKpiEnvironmentEditable(environment) &&
  hasKpiSubModuleEditAccess(
    inventorysmartModulesPermission,
    inventorysmartScreenConfig,
    subModuleName
  );

// Returns environment-specific snackbar message for KPI/Calculated Fields tabs.
// Returns null for DEV (no message shown).
export const getKpiEnvironmentMessage = (
  environment,
  { entityLabel = "KPI configuration" } = {}
) => {
  switch (environment) {
    case KPI_ENV.PROD:
      return {
        message: `${entityLabel} is read-only in Production. Changes must be made in UAT and approved before syncing to Production.`,
        variant: "warning",
      };
    case KPI_ENV.UAT:
      return {
        message:
          "Changes made here will require QA and POD approval before syncing to Production.",
        variant: "info",
      };
    case KPI_ENV.TEST:
      return {
        message:
          "Test environment for functional validation. Data validation may be limited.",
        variant: "info",
      };
    default:
      return null;
  }
};
