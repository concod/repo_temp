import { CREATE_NEW_RULE_FILTER_CONFIG_KEY } from "./createNewRuleFilterUtils";

const CREATE_NEW_RULE_FLOW_SESSION_KEY = "inventorysmart_create_new_rule_flow";

function normalizeFiltersForCompare(filters) {
  return (filters || [])
    .map((f) => ({
      attribute_name: f.attribute_name || f.filter_id || f.column_name,
      dimension: f.dimension,
      values: JSON.stringify(f.values),
    }))
    .sort((a, b) =>
      String(a.attribute_name || "").localeCompare(String(b.attribute_name || ""))
    );
}

export function filtersMatchCreateNewRuleFlow(a, b) {
  return (
    JSON.stringify(normalizeFiltersForCompare(a)) ===
    JSON.stringify(normalizeFiltersForCompare(b))
  );
}

export function loadCreateNewRuleFlowSession() {
  try {
    const raw = sessionStorage.getItem(CREATE_NEW_RULE_FLOW_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCreateNewRuleFlowSession(partial) {
  if (!partial || typeof partial !== "object") return;
  const current = loadCreateNewRuleFlowSession() || {};
  try {
    sessionStorage.setItem(
      CREATE_NEW_RULE_FLOW_SESSION_KEY,
      JSON.stringify({
        ...current,
        ...partial,
        updatedAt: Date.now(),
      })
    );
  } catch {
    // sessionStorage quota or private mode
  }
}

export function clearCreateNewRuleFlowSession() {
  sessionStorage.removeItem(CREATE_NEW_RULE_FLOW_SESSION_KEY);
}

/**
 * Clears session/local storage and optional Redux + filter dashboard state
 * after a successful save or when explicitly exiting the flow.
 */
export function resetCreateNewRuleFlowState({
  setRclSelectedProductLevel,
  setProductsLevelDataForBackFlow,
  saveEditedRCL,
  resetFilterConfiguration,
  clearSession = true,
} = {}) {
  if (clearSession) {
    clearCreateNewRuleFlowSession();
  }
  localStorage.removeItem("rclCreatedTableName");
  setRclSelectedProductLevel?.([]);
  setProductsLevelDataForBackFlow?.({});
  saveEditedRCL?.([]);
  resetFilterConfiguration?.({
    [CREATE_NEW_RULE_FILTER_CONFIG_KEY]: {},
  });
}

export function getInitialCreateNewRuleStep() {
  const session = loadCreateNewRuleFlowSession();
  if (session?.activeStep === 1 && session?.filters?.length) {
    return 1;
  }
  return 0;
}

export function getPersistedCreateNewRuleTableName(filters) {
  const session = loadCreateNewRuleFlowSession();
  if (!session?.tableName || !session?.filters?.length) {
    return null;
  }
  if (!filtersMatchCreateNewRuleFlow(session.filters, filters)) {
    return null;
  }
  return session.tableName;
}

/** Step 1 page refresh — reuse stored table_name, skip fetchExistingRclDetails. */
export function isCreateNewRuleStep1Refresh(filters) {
  const session = loadCreateNewRuleFlowSession();
  return (
    session?.activeStep === 1 &&
    Boolean(getPersistedCreateNewRuleTableName(filters))
  );
}

export function getCreateNewRuleTableName() {
  return loadCreateNewRuleFlowSession()?.tableName ?? null;
}
