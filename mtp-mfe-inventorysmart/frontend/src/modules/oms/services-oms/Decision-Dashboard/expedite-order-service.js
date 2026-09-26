import { createSlice } from "@reduxjs/toolkit";
import { cloneDeep } from "lodash";
import axiosInstance from "core/Utils/axios";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  OFFCYCLE_EXPEDITE_ORDERS_LOST_SALES_KPI,
  OFFCYCLE_EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG,
  OFFCYCLE_EXPEDITE_ORDERS_ALERTS_TABLE_DATA,
  OFFCYCLE_EXPEDITE_ORDERS_DEEP_DIVE_DOWNLOAD,
  OFFCYCLE_EXPEDITE_ORDERS_ALERTS_PO_SUMMARY_TABLE_CONFIG,
  OFFCYCLE_EXPEDITE_ORDERS_ALERTS_PO_SUMMARY,
  ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA,
  EXPEDITE_DEEP_DIVE_SESSION_START,
  EXPEDITE_DEEP_DIVE_SESSION_VALIDATE,
  EXPEDITE_DEEP_DIVE_KPI,
  EXPEDITE_DEEP_DIVE_CHART,
  EXPEDITE_DEEP_DIVE_CONSTRAINTS,
  EXPEDITE_DEEP_DIVE_SIMULATE,
  EXPEDITE_DEEP_DIVE_POST_SIMULATION_SUMMARY,
  EXPEDITE_SIMULATE_RECOMMENDATIONS_CONFIG,
  CREATE_NEW_OFF_CYCLE_ORDER_TABLE_CONFIG,
} from "modules/oms/constants-oms/apiConstants";
import {
  EXPEDITE_LS_KEYS,
  getExpediteActiveArticles,
  overrideExpediteArticleFilter,
  ensureExpediteArticleScope,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";
import { buildExpediteRecoveryWindowChartRequest } from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";

/**
 * Build the active article set for a session request based on (optionally
 * overridden) state. Always prefers an explicit override (used by
 * `runSimulationAndFetchAfterState` when the just-simulated card hasn't been
 * pushed into `generatedOrders` yet), else derives from Redux state.
 */
const resolveExpediteActiveArticles = (getState, activeArticlesOverride) => {
  if (Array.isArray(activeArticlesOverride)) return activeArticlesOverride;
  const svc = getState()?.omsReducer?.expediteOrdersService;
  const choiceDcCombinations = svc?.baseExpeditePayload?.data || [];
  return getExpediteActiveArticles(choiceDcCombinations, svc?.generatedOrders);
};

/** Scope a chart/KPI request payload's `filters.article` to the active set. */
const scopeExpediteRequestToActiveArticles = (
  requestPayload,
  activeArticles
) => ({
  ...requestPayload,
  filters: ensureExpediteArticleScope(
    overrideExpediteArticleFilter(
      requestPayload?.filters || [],
      activeArticles
    ),
    activeArticles
  ),
});

export const expediteOrdersService = createSlice({
  name: "expediteOrdersService",
  initialState: {
    expediteOrdersConfig: {},
    selectedRowsFromAlert: [],

    // Session-based deep dive state
    sessionId: null,
    revisionId: null,
    baseExpeditePayload: null, // filters + dateFilter + choiceDcCombinations

    beforeKpi: null,
    beforeChart: null,
    constraintDefaults: [],

    afterKpi: null,
    afterChart: null,

    generatedOrders: [], // step-2 carousel cards
    expediteFlowStep: 1, // 1 = before state, 2 = after state (generated)
    selectedChartScenario: "default_lead_time", // Selected chip scenario for chart API

    isLoadingSession: false,
    isSimulating: false,
    sessionError: null,
    isBeforeKpiLoading: false,
    isBeforeChartLoading: false,
    isConstraintsLoading: false,
    isAfterKpiLoading: false,
    isAfterChartLoading: false,

    // Deep-dive panel filters (kept for deep-dive chart filter panel)
    deepDiveFilters: [],
    deepDiveProductFilter: {},

    // Kept for legacy compatibility - unused after session-based refactor
    isExpediteOrdersGenerated: false,
    deepDiveTableLoader: false,
    deepDiveTableConfigLoader: false,
    deepDiveTableConfig: [],
    deepDiveTableData: [],
    deepDiveWeekRange: {},
    deepDiveFiltersData: [],
    deepDiveFiltersPayload: [],
    isDeepDiveFiltersLoading: false,

    /** Row-scoped recovery window chart + KPI shown in deep dive (step 1 View Graph). */
    recoveryWindowChartRow: null,
    recoveryWindowChartData: null,
    recoveryWindowKpi: null,
    isRecoveryWindowChartLoading: false,
    isRecoveryWindowKpiLoading: false,
  },
  reducers: {
    setExpediteOrdersConfig: (state, action) => {
      state.expediteOrdersConfig = action.payload;
    },
    setIsExpediteOrdersGenerated: (state, action) => {
      state.isExpediteOrdersGenerated = action.payload;
    },
    setSelectedChartScenario: (state, action) => {
      state.selectedChartScenario = action.payload;
    },
    setSelectedRowsFromAlert: (state, action) => {
      state.selectedRowsFromAlert = action.payload;
    },

    // Session-based reducers
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    setRevisionId: (state, action) => {
      state.revisionId = action.payload;
    },
    setBaseExpeditePayload: (state, action) => {
      state.baseExpeditePayload = action.payload;
    },
    setBeforeKpi: (state, action) => {
      state.beforeKpi = action.payload;
    },
    setBeforeChart: (state, action) => {
      state.beforeChart = action.payload;
    },
    setConstraintDefaults: (state, action) => {
      state.constraintDefaults = action.payload;
    },
    setAfterKpi: (state, action) => {
      state.afterKpi = action.payload;
    },
    setAfterChart: (state, action) => {
      state.afterChart = action.payload;
    },
    setGeneratedOrders: (state, action) => {
      state.generatedOrders = action.payload;
    },
    setExpediteFlowStep: (state, action) => {
      state.expediteFlowStep = action.payload;
    },
    setIsLoadingSession: (state, action) => {
      state.isLoadingSession = action.payload;
    },
    setIsSimulating: (state, action) => {
      state.isSimulating = action.payload;
    },
    setSessionError: (state, action) => {
      state.sessionError = action.payload;
    },
    setIsBeforeKpiLoading: (state, action) => {
      state.isBeforeKpiLoading = action.payload;
    },
    setIsBeforeChartLoading: (state, action) => {
      state.isBeforeChartLoading = action.payload;
    },
    setIsConstraintsLoading: (state, action) => {
      state.isConstraintsLoading = action.payload;
    },
    setIsAfterKpiLoading: (state, action) => {
      state.isAfterKpiLoading = action.payload;
    },
    setIsAfterChartLoading: (state, action) => {
      state.isAfterChartLoading = action.payload;
    },

    setDeepDiveTableConfigLoader: (state, action) => {
      state.deepDiveTableConfigLoader = action.payload;
    },
    setDeepDiveTableLoader: (state, action) => {
      state.deepDiveTableLoader = action.payload;
    },
    setDeepDiveTableConfig: (state, action) => {
      state.deepDiveTableConfig = action.payload;
    },
    setDeepDiveTableData: (state, action) => {
      state.deepDiveTableData = action.payload;
    },
    setDeepDiveWeekRange: (state, action) => {
      state.deepDiveWeekRange = action.payload;
    },
    setDeepDiveFilters: (state, action) => {
      state.deepDiveFilters = action.payload;
    },
    setDeepDiveFiltersData: (state, action) => {
      state.deepDiveFiltersData = action.payload;
    },
    setDeepDiveFiltersPayload: (state, action) => {
      state.deepDiveFiltersPayload = action.payload;
    },
    setIsDeepDiveFiltersLoading: (state, action) => {
      state.isDeepDiveFiltersLoading = action.payload;
    },
    setDeepDiveProductFilter: (state, action) => {
      state.deepDiveProductFilter = action.payload;
    },
    setRecoveryWindowChartRow: (state, action) => {
      state.recoveryWindowChartRow = action.payload;
    },
    setRecoveryWindowChartData: (state, action) => {
      state.recoveryWindowChartData = action.payload;
    },
    setRecoveryWindowKpi: (state, action) => {
      state.recoveryWindowKpi = action.payload;
    },
    setIsRecoveryWindowChartLoading: (state, action) => {
      state.isRecoveryWindowChartLoading = action.payload;
    },
    setIsRecoveryWindowKpiLoading: (state, action) => {
      state.isRecoveryWindowKpiLoading = action.payload;
    },
    clearRecoveryWindowChart: (state) => {
      state.recoveryWindowChartRow = null;
      state.recoveryWindowChartData = null;
      state.recoveryWindowKpi = null;
      state.isRecoveryWindowChartLoading = false;
      state.isRecoveryWindowKpiLoading = false;
    },

    /** Reset the full session-based state without touching config. */
    resetExpediteSessionState: (state) => {
      state.sessionId = null;
      state.revisionId = null;
      state.baseExpeditePayload = null;
      state.beforeKpi = null;
      state.beforeChart = null;
      state.constraintDefaults = [];
      state.afterKpi = null;
      state.afterChart = null;
      state.generatedOrders = [];
      state.expediteFlowStep = 1;
      state.isLoadingSession = false;
      state.isSimulating = false;
      state.sessionError = null;
      state.isBeforeKpiLoading = false;
      state.isBeforeChartLoading = false;
      state.isConstraintsLoading = false;
      state.isAfterKpiLoading = false;
      state.isAfterChartLoading = false;
      state.recoveryWindowChartRow = null;
      state.recoveryWindowChartData = null;
      state.recoveryWindowKpi = null;
      state.isRecoveryWindowChartLoading = false;
      state.isRecoveryWindowKpiLoading = false;
    },

    resetDeepDiveReducersForExpediteOrder: (state) => {
      state.deepDiveWeekRange = {};
      state.deepDiveFiltersData = [];
      state.deepDiveFiltersPayload = [];
      state.deepDiveTableConfigLoader = false;
      state.deepDiveTableLoader = false;
      state.deepDiveTableData = [];
      state.deepDiveTableConfig = [];
      state.isDeepDiveFiltersLoading = false;
      state.deepDiveProductFilter = {};
      state.expediteOrdersConfig = {};
    },
  },
});

export const {
  setExpediteOrdersConfig,
  setIsExpediteOrdersGenerated,
  setSelectedChartScenario,
  setSelectedRowsFromAlert,
  setSessionId,
  setRevisionId,
  setBaseExpeditePayload,
  setBeforeKpi,
  setBeforeChart,
  setConstraintDefaults,
  setAfterKpi,
  setAfterChart,
  setGeneratedOrders,
  setExpediteFlowStep,
  setIsLoadingSession,
  setIsSimulating,
  setSessionError,
  setIsBeforeKpiLoading,
  setIsBeforeChartLoading,
  setIsConstraintsLoading,
  setIsAfterKpiLoading,
  setIsAfterChartLoading,
  setDeepDiveTableConfig,
  setDeepDiveTableData,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableLoader,
  setDeepDiveWeekRange,
  setDeepDiveFilters,
  setDeepDiveFiltersData,
  setDeepDiveFiltersPayload,
  setIsDeepDiveFiltersLoading,
  setDeepDiveProductFilter,
  setRecoveryWindowChartRow,
  setRecoveryWindowChartData,
  setRecoveryWindowKpi,
  setIsRecoveryWindowChartLoading,
  setIsRecoveryWindowKpiLoading,
  clearRecoveryWindowChart,
  resetExpediteSessionState,
  resetDeepDiveReducersForExpediteOrder,
} = expediteOrdersService.actions;

export default expediteOrdersService.reducer;

/**
 * Chart API returns either a row array or an envelope
 * `{ session_id, is_simulated, data: rows[], lost_sales_start, ... }`.
 * Always normalize to `rows[]` for Redux and chart rendering.
 */
export function normalizeExpediteChartRows(apiBody) {
  if (apiBody == null) return null;
  if (Array.isArray(apiBody)) return apiBody;
  if (Array.isArray(apiBody?.data)) return apiBody.data;
  return null;
}

export function extractExpediteChartHighlights(apiBody) {
  if (!apiBody || typeof apiBody !== "object" || Array.isArray(apiBody)) {
    return null;
  }
  const lostSalesStart = apiBody.lost_sales_start ?? null;
  const recoverableStart = apiBody.recoverable_start ?? null;
  const recoverableEnd = apiBody.recoverable_end ?? null;
  if (
    lostSalesStart == null &&
    recoverableStart == null &&
    recoverableEnd == null
  ) {
    return null;
  }
  return { lostSalesStart, recoverableStart, recoverableEnd };
}

// ---------------------------------------------------------------------------
// Legacy KPI thunk (kept for reference; replaced by session-based KPI below)
// ---------------------------------------------------------------------------
export const getLostSalesKPI = (postBody) => () => {
  return axiosInstance({
    url: `${OFFCYCLE_EXPEDITE_ORDERS_LOST_SALES_KPI}`,
    method: "POST",
    data: postBody,
  });
};

export const fetchOmsDeepDiveFiltersData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getExpediteOrdersConfig = () => async () => {
  const response = await tenantConfigApiCache(1, {
    attribute_name: EXPEDITE_SIMULATE_RECOMMENDATIONS_CONFIG,
  })();
  const configs = response?.data?.data[0]?.attribute_value || {};
  return configs;
};

export const getExpediteOrdersDeepDiveDownloadConfiguration = () => () => {
  return axiosInstance({
    url: OFFCYCLE_EXPEDITE_ORDERS_DEEP_DIVE_DOWNLOAD,
    method: "GET",
  });
};

// ---------------------------------------------------------------------------
// Session-based expedite deep-dive thunks
// ---------------------------------------------------------------------------

/** Start a new expedite session and return the session_id. */
export const startExpediteSession = (payload) => () => {
  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_SESSION_START,
    method: "POST",
    data: payload,
  });
};

/**
 * Validate an existing session_id against the backend.
 * Returns ``{ data: { active: bool, ... } }``.
 */
export const validateExpediteSession = (sessionId) => () => {
  return axiosInstance({
    url: `${EXPEDITE_DEEP_DIVE_SESSION_VALIDATE}?session_id=${encodeURIComponent(
      sessionId
    )}`,
    method: "GET",
  });
};

/** Fetch KPI block (before or after). */
export const fetchExpediteKpi = (payload) => () => {
  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_KPI,
    method: "POST",
    data: payload,
  });
};

export const fetchExpediteAlertStrategyKpi = (alertPayload) => async (
  dispatch
) => {
  const scopedFilters = overrideExpediteArticleFilter(
    alertPayload?.filters || [],
    alertPayload?.choiceDcCombinations || []
  );
  const baseRequest = {
    filters: scopedFilters,
    date_filter: alertPayload?.dateFilter || [],
    transform_flag: true,
    data: alertPayload?.choiceDcCombinations || [],
  };
  const startRes = await dispatch(startExpediteSession(baseRequest));
  const sessionId = startRes?.data?.data?.session_id;
  if (!sessionId) throw new Error("Failed to create expedite session");
  const kpiRes = await dispatch(
    fetchExpediteKpi({
      ...baseRequest,
      session_id: sessionId,
      is_simulated: false,
    })
  );
  const kpiEnvelope = kpiRes?.data?.data;
  return kpiEnvelope?.data ?? kpiEnvelope ?? null;
};

/** Fetch chart block (before or after). */
export const fetchExpediteChart = (payload) => (dispatch, getState) => {
  const selectedChartScenario = getState()?.omsReducer?.expediteOrdersService
    ?.selectedChartScenario;

  // Skip API calls for loading_scenario and completed_scenario
  if (
    selectedChartScenario === "loading_scenario" ||
    selectedChartScenario === "completed_scenario"
  ) {
    return;
  }

  // If selectedChartScenario is null/undefined, skip chart_scenario and set scenario_enabled = false
  // Otherwise, include chart_scenario and set scenario_enabled = true
  const chartData = selectedChartScenario
    ? {
        ...payload,
        chart_scenario: selectedChartScenario,
        scenario_enabled: true,
      }
    : {
        ...payload,
        scenario_enabled: false,
      };

  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_CHART,
    method: "POST",
    data: chartData,
  });
};

/**
 * Ephemeral session + chart fetch for a single expedite alert row (recovery
 * window popover on Decision Dashboard). Does not mutate Redux expedite state.
 */
export const fetchExpediteRecoveryWindowChart = async (baseRequest) => {
  if (!baseRequest) return null;

  const startRes = await axiosInstance({
    url: EXPEDITE_DEEP_DIVE_SESSION_START,
    method: "POST",
    data: baseRequest,
  });
  const sessionId = startRes?.data?.data?.session_id;
  if (!sessionId) {
    throw new Error(
      "Failed to start expedite session for recovery window chart"
    );
  }

  const chartRes = await axiosInstance({
    url: EXPEDITE_DEEP_DIVE_CHART,
    method: "POST",
    data: {
      ...baseRequest,
      session_id: sessionId,
      is_simulated: false,
    },
  });

  return chartRes?.data?.data ?? null;
};

export const loadExpediteRecoveryWindowChartInDeepDive = ({
  rowData,
  selectedFilters = [],
  alertTopRightOptions = [],
  dateRange = {},
}) => async (dispatch) => {
  dispatch(setRecoveryWindowChartRow(rowData ?? null));
  dispatch(setRecoveryWindowChartData(null));
  dispatch(setRecoveryWindowKpi(null));
  dispatch(setIsRecoveryWindowChartLoading(true));
  dispatch(setIsRecoveryWindowKpiLoading(true));

  try {
    const baseRequest = buildExpediteRecoveryWindowChartRequest(
      rowData,
      selectedFilters,
      alertTopRightOptions,
      dateRange
    );
    if (!baseRequest) {
      throw new Error("Invalid recovery window chart request");
    }

    /* Session-start is a single shared call so chart + KPI hit the same
     * server-side cache. Both downstream calls run in parallel via
     * Promise.allSettled so one failing doesn't block the other. */
    const startRes = await dispatch(startExpediteSession(baseRequest));
    const sessionId = startRes?.data?.data?.session_id;
    if (!sessionId) {
      throw new Error(
        "Failed to start expedite session for recovery window chart"
      );
    }

    const scopedPayload = {
      ...baseRequest,
      session_id: sessionId,
      is_simulated: false,
    };

    const [chartSettled, kpiSettled] = await Promise.allSettled([
      dispatch(fetchExpediteChart(scopedPayload)),
      dispatch(fetchExpediteKpi(scopedPayload)),
    ]);

    let chartEnvelope = null;
    if (chartSettled.status === "fulfilled") {
      chartEnvelope = chartSettled.value?.data?.data ?? null;
      dispatch(setRecoveryWindowChartData(chartEnvelope));
    } else {
      console.warn(
        "loadExpediteRecoveryWindowChartInDeepDive: chart fetch failed",
        chartSettled.reason
      );
      dispatch(setRecoveryWindowChartData(null));
    }
    dispatch(setIsRecoveryWindowChartLoading(false));

    if (kpiSettled.status === "fulfilled") {
      dispatch(setRecoveryWindowKpi(kpiSettled.value?.data?.data ?? null));
    } else {
      console.warn(
        "loadExpediteRecoveryWindowChartInDeepDive: KPI fetch failed",
        kpiSettled.reason
      );
      dispatch(setRecoveryWindowKpi(null));
    }
    dispatch(setIsRecoveryWindowKpiLoading(false));

    /* Surface chart-fetch failures to the caller so the table can show its
     * error snack — KPI failures are non-fatal and only logged. */
    if (chartSettled.status === "rejected") {
      throw chartSettled.reason;
    }

    return chartEnvelope;
  } catch (error) {
    dispatch(setRecoveryWindowChartData(null));
    dispatch(setRecoveryWindowKpi(null));
    dispatch(setIsRecoveryWindowChartLoading(false));
    dispatch(setIsRecoveryWindowKpiLoading(false));
    throw error;
  }
};

/** Fetch default simulation constraints for a session using the scoped base payload. */
export const fetchExpediteConstraints = (payload) => () => {
  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_CONSTRAINTS,
    method: "POST",
    data: payload,
  });
};

/** Run a simulation and return a revision_id. */
export const simulateExpediteOrder = (payload) => () => {
  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_SIMULATE,
    method: "POST",
    data: payload,
  });
};

/** Post-simulation card summary (order id, lost sales, ROQ) for a revision. */
export const fetchExpeditePostSimulationSummary = (payload) => () => {
  return axiosInstance({
    url: EXPEDITE_DEEP_DIVE_POST_SIMULATION_SUMMARY,
    method: "POST",
    data: payload,
  });
};

/** GET ag-Grid column metadata for the expedite simulate bottom sheet. */
export const fetchExpediteSimulateRecommendationsTableConfig = () => {
  return axiosInstance({
    url: CREATE_NEW_OFF_CYCLE_ORDER_TABLE_CONFIG,
    method: "GET",
  });
};

/** GET ag-Grid column metadata for expedite orders alerts details table (step 1). */
export const fetchExpediteOrdersAlertsDetailsTableConfig = () => () => {
  return axiosInstance({
    url: OFFCYCLE_EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG,
    method: "GET",
  });
};

/** POST paginated alerts details rows for the expedite orders screen. */
export const fetchExpediteOrdersAlertsTableData = (payload) => () => {
  return axiosInstance({
    url: OFFCYCLE_EXPEDITE_ORDERS_ALERTS_TABLE_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchExpeditePoSummaryTableConfig = () => () => {
  return axiosInstance({
    url: OFFCYCLE_EXPEDITE_ORDERS_ALERTS_PO_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const fetchExpeditePoSummaryTableData = (payload) => () => {
  return axiosInstance({
    url: OFFCYCLE_EXPEDITE_ORDERS_ALERTS_PO_SUMMARY,
    method: "POST",
    data: payload,
  });
};

// ---------------------------------------------------------------------------
// Orchestrating thunks that drive page flow
// ---------------------------------------------------------------------------

/**
 * Bootstrap the expedite session on page load.
 *
 * Sequence:
 * 1. If storedSessionId is provided, validate it.
 *    - If active  → proceed with it.
 *    - If inactive → create a new session from the alert payload.
 * 2. Once a valid sessionId is established, fetch before-KPI, before-chart,
 *    and constraints in parallel.
 * 3. Store sessionId in localStorage.
 *
 * If `rehydrateAfterStateRevisionId` is set (page refresh with step-2 state) and
 * the **existing** session was reused (not recreated), also fetch after-KPI and
 * charts for that revision. If a **new** session had to be created, step-2
 * persisted state is invalid — clear generated orders / revision and return to
 * step 1.
 *
 * On unrecoverable failure the thunk sets sessionError so the page can
 * redirect back to Decision Dashboard.
 */
export const bootstrapExpediteSession = ({
  alertPayload,
  storedSessionId,
  rehydrateAfterStateRevisionId = null,
  notificationType = null,
  draftId = null,
}) => async (dispatch, getState) => {
  dispatch(setIsLoadingSession(true));
  dispatch(setSessionError(null));
  try {
    // Session-scope the `article` filter to `choiceDcCombinations` so
    // `baseExpeditePayload.filters.article.values` matches `data` (e.g. 50
    // alert-picked articles) instead of the full dashboard universe
    // (e.g. 581). Every downstream session call (session/start, KPI, chart,
    // simulate) inherits this scope via `baseExpeditePayload`.
    const scopedFilters = overrideExpediteArticleFilter(
      alertPayload.filters || [],
      alertPayload.choiceDcCombinations || []
    );
    const baseRequest = {
      filters: scopedFilters,
      date_filter: alertPayload.dateFilter || [],
      transform_flag: true,
      data: alertPayload.choiceDcCombinations,
      // Notification (draft-launch) mode: stamp `type` (before/after) and
      // `draft_id` onto the base request so every downstream call
      // (session/start, KPI, chart, constraints, simulate) inherits them via
      // `baseExpeditePayload`. Legacy mode (no draftId) carries neither.
      ...(draftId ? { type: notificationType, draft_id: draftId } : {}),
    };

    let sessionId = storedSessionId;
    let sessionWasCreated = false;

    // Validate or create session
    if (sessionId) {
      try {
        const validRes = await dispatch(validateExpediteSession(sessionId));
        if (!validRes?.data?.data?.active) {
          sessionId = null;
        }
      } catch {
        sessionId = null;
      }
    }

    if (!sessionId) {
      sessionWasCreated = true;
      const startRes = await dispatch(startExpediteSession(baseRequest));
      if (!startRes?.data?.data?.session_id) {
        throw new Error("Failed to create expedite session");
      }
      sessionId = startRes.data.data.session_id;
      localStorage.setItem(EXPEDITE_LS_KEYS.SESSION_ID, sessionId);
    }

    dispatch(setSessionId(sessionId));
    dispatch(setBaseExpeditePayload(baseRequest));
    dispatch(setIsLoadingSession(false));

    if (rehydrateAfterStateRevisionId && sessionWasCreated) {
      dispatch(setGeneratedOrders([]));
      dispatch(setExpediteFlowStep(1));
      dispatch(setRevisionId(null));
      dispatch(setAfterKpi(null));
      dispatch(setAfterChart(null));
      localStorage.removeItem(EXPEDITE_LS_KEYS.GENERATED_ORDERS);
      localStorage.removeItem(EXPEDITE_LS_KEYS.REVISION_ID);
      localStorage.removeItem(EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA);
    } else if (rehydrateAfterStateRevisionId && !sessionWasCreated) {
      dispatch(
        fetchExpediteAfterStateForRevision({
          baseExpeditePayload: baseRequest,
          sessionId,
          revisionId: rehydrateAfterStateRevisionId,
        })
      );
    }

    const beforeBasePayload = {
      ...baseRequest,
      session_id: sessionId,
      is_simulated: false,
    };

    dispatch(setIsBeforeKpiLoading(true));
    dispatch(fetchExpediteKpi(beforeBasePayload))
      .then((kpiRes) => {
        if (kpiRes?.data?.data) {
          dispatch(setBeforeKpi(kpiRes.data.data));
        }
      })
      .catch((error) => {
        console.warn(
          "bootstrapExpediteSession: before KPI fetch failed",
          error
        );
      })
      .finally(() => {
        dispatch(setIsBeforeKpiLoading(false));
      });

    dispatch(setIsBeforeChartLoading(true));
    dispatch(fetchExpediteChart(beforeBasePayload))
      .then((chartRes) => {
        const beforeChartEnvelope = chartRes?.data?.data;
        const beforeChartRows = normalizeExpediteChartRows(beforeChartEnvelope);
        if (beforeChartRows?.length) {
          dispatch(setBeforeChart(beforeChartEnvelope));
        }
      })
      .catch((error) => {
        console.warn(
          "bootstrapExpediteSession: before chart fetch failed",
          error
        );
      })
      .finally(() => {
        dispatch(setIsBeforeChartLoading(false));
      });

    dispatch(setIsConstraintsLoading(true));
    dispatch(fetchExpediteConstraints(beforeBasePayload))
      .then((constraintsRes) => {
        if (constraintsRes?.data?.data?.data) {
          dispatch(setConstraintDefaults(constraintsRes.data.data.data));
        }
      })
      .catch((error) => {
        console.warn(
          "bootstrapExpediteSession: constraints fetch failed",
          error
        );
      })
      .finally(() => {
        dispatch(setIsConstraintsLoading(false));
      });
  } catch (err) {
    dispatch(setSessionError(err?.message || "Session initialization failed"));
  } finally {
    dispatch(setIsLoadingSession(false));
  }
};

/**
 * Load after-KPI plus before/after charts for an existing revision (step 2 UI).
 * Persists `revisionId` to Redux + localStorage. Used after simulate and on
 * bootstrap rehydration when the same session is restored.
 */
export const fetchExpediteAfterStateForRevision = ({
  baseExpeditePayload,
  sessionId,
  revisionId,
  activeArticlesOverride = null,
}) => async (dispatch, getState) => {
  if (!baseExpeditePayload || !sessionId || !revisionId) return;

  dispatch(setRevisionId(revisionId));
  localStorage.setItem(EXPEDITE_LS_KEYS.REVISION_ID, revisionId);

  // Narrow step-2 KPI/chart payloads to the active article set (union of
  // `constraints[].choice` across current generated-order cards, or the
  // explicit override passed by `runSimulationAndFetchAfterState` for a
  // just-created card not yet in Redux). Session-level scope in
  // `baseExpeditePayload.filters.article` stays at the 50; step-2 views
  // drill further down to only the articles actually being simulated.
  const activeArticles = resolveExpediteActiveArticles(
    getState,
    activeArticlesOverride
  );
  const scopedBase = scopeExpediteRequestToActiveArticles(
    baseExpeditePayload,
    activeArticles
  );

  const sharedReq = {
    ...scopedBase,
    session_id: sessionId,
    revision_id: revisionId,
  };
  const afterReq = {
    ...sharedReq,
    is_simulated: true,
  };
  const beforeReqWithRevision = {
    ...sharedReq,
    is_simulated: false,
  };

  dispatch(setIsAfterKpiLoading(true));
  dispatch(fetchExpediteKpi(afterReq))
    .then((afterKpiRes) => {
      if (afterKpiRes?.data?.data) {
        dispatch(setAfterKpi(afterKpiRes.data.data));
      }
    })
    .catch((error) => {
      console.warn(
        "fetchExpediteAfterStateForRevision: after KPI failed",
        error
      );
    })
    .finally(() => {
      dispatch(setIsAfterKpiLoading(false));
    });

  dispatch(setIsBeforeChartLoading(true));
  dispatch(fetchExpediteChart(beforeReqWithRevision))
    .then((beforeChartRes) => {
      const beforeChartEnvelope = beforeChartRes?.data?.data;
      const beforeChartRows = normalizeExpediteChartRows(beforeChartEnvelope);
      if (beforeChartRows?.length) {
        dispatch(setBeforeChart(beforeChartEnvelope));
      }
    })
    .catch((error) => {
      console.warn(
        "fetchExpediteAfterStateForRevision: before chart with revision failed",
        error
      );
    })
    .finally(() => {
      dispatch(setIsBeforeChartLoading(false));
    });

  dispatch(setIsAfterChartLoading(true));
  dispatch(fetchExpediteChart(afterReq))
    .then((afterChartRes) => {
      const afterChartEnvelope = afterChartRes?.data?.data;
      const afterChartRows = normalizeExpediteChartRows(afterChartEnvelope);
      if (afterChartRows?.length) {
        dispatch(setAfterChart(afterChartEnvelope));
      }
    })
    .catch((error) => {
      console.warn(
        "fetchExpediteAfterStateForRevision: after chart with revision failed",
        error
      );
    })
    .finally(() => {
      dispatch(setIsAfterChartLoading(false));
    });
};

/**
 * Run simulate and then fetch after-KPI and after-chart.
 * Stores revision_id in localStorage and Redux.
 */
export const runSimulationAndFetchAfterState = ({
  baseExpeditePayload,
  sessionId,
  changedValues,
  editCardIndex = null,
}) => async (dispatch, getState) => {
  dispatch(setIsSimulating(true));
  dispatch(setIsAfterKpiLoading(false));
  dispatch(setIsAfterChartLoading(false));
  try {
    const simulatePayload = {
      ...baseExpeditePayload,
      session_id: sessionId,
      changed_values: changedValues,
    };
    const simRes = await dispatch(simulateExpediteOrder(simulatePayload));
    if (!simRes?.data?.data?.revision_id) {
      throw new Error("Simulation failed: no revision_id returned");
    }
    const revisionId = simRes.data.data.revision_id;

    // Compute the projected active-article set for step 2 chart/KPI scope.
    // The new card hasn't been dispatched to `generatedOrders` yet (the
    // component does that after awaiting this thunk), so we mimic the
    // add-vs-edit merge here and derive articles from the resulting set.
    const existingGeneratedOrders =
      getState()?.omsReducer?.expediteOrdersService?.generatedOrders || [];
    const projectedCard = { constraints: changedValues || [] };
    const projectedGeneratedOrders =
      editCardIndex != null
        ? existingGeneratedOrders.map((generatedOrder, orderIndex) =>
            orderIndex === editCardIndex ? projectedCard : generatedOrder
          )
        : [...existingGeneratedOrders, projectedCard];
    const activeArticlesOverride = getExpediteActiveArticles(
      baseExpeditePayload?.data || [],
      projectedGeneratedOrders
    );

    dispatch(setExpediteFlowStep(2));
    dispatch(
      fetchExpediteAfterStateForRevision({
        baseExpeditePayload,
        sessionId,
        revisionId,
        activeArticlesOverride,
      })
    );

    return { success: true, revisionId };
  } catch (err) {
    return { success: false };
  } finally {
    dispatch(setIsSimulating(false));
  }
};

/**
 * Build session/start body from deep-dive filter panel state (dropdown filters,
 * week range) merged onto `baseExpeditePayload`.
 */
export const buildExpediteSessionStartPayloadFromState = (getState) => {
  const svc = getState()?.omsReducer?.expediteOrdersService;
  const base = svc?.baseExpeditePayload;
  if (!base) return null;

  const weekRange = svc.deepDiveWeekRange;
  const filtersFromPayload = svc.deepDiveFiltersPayload?.filters;
  const rawPayloadFilters =
    Array.isArray(filtersFromPayload) && filtersFromPayload.length > 0
      ? cloneDeep(filtersFromPayload)
      : cloneDeep(base.filters || []);

  const activeArticles = getExpediteActiveArticles(
    base.data,
    svc.generatedOrders
  );
  const payloadFilters = ensureExpediteArticleScope(
    rawPayloadFilters,
    activeArticles
  );

  const date_filter = cloneDeep(base.date_filter || []);
  if (
    weekRange &&
    typeof weekRange === "object" &&
    weekRange.attribute_name &&
    (weekRange.start_date != null || weekRange.end_date != null)
  ) {
    const idx = date_filter.findIndex(
      (d) => d?.attribute_name === weekRange.attribute_name
    );
    if (idx >= 0) {
      date_filter[idx] = { ...date_filter[idx], ...weekRange };
    } else {
      date_filter.push(weekRange);
    }
  }

  return {
    filters: payloadFilters,
    date_filter,
    transform_flag: base.transform_flag ?? true,
    data: base.data,
  };
};

/**
 * Re-fetch expedite session data after deep-dive filters are applied.
 * Merges `deepDiveFiltersPayload` + week range, posts to session/start, then
 * refreshes KPI, chart, and constraints (before + after when on step 2).
 */
export const refetchExpediteSessionOnFilterApply = () => async (
  dispatch,
  getState
) => {
  const svc = getState().omsReducer.expediteOrdersService;
  const previousSessionId = svc.sessionId;
  let sessionId = previousSessionId;
  const sessionStartPayload = buildExpediteSessionStartPayloadFromState(
    getState
  );
  if (!sessionId || !sessionStartPayload) return;

  dispatch(clearRecoveryWindowChart());

  let revisionId =
    svc.revisionId ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem(EXPEDITE_LS_KEYS.REVISION_ID)) ||
    null;

  dispatch(setDeepDiveTableLoader(true));
  dispatch(setIsBeforeKpiLoading(true));
  dispatch(setIsBeforeChartLoading(true));
  dispatch(setIsConstraintsLoading(true));
  if (revisionId) {
    dispatch(setIsAfterKpiLoading(true));
    dispatch(setIsAfterChartLoading(true));
  }

  try {
    const startRes = await dispatch(startExpediteSession(sessionStartPayload));
    const newSessionId = startRes?.data?.data?.session_id;
    if (newSessionId) {
      sessionId = newSessionId;
      dispatch(setSessionId(newSessionId));
      localStorage.setItem(EXPEDITE_LS_KEYS.SESSION_ID, newSessionId);
    }
    dispatch(setBaseExpeditePayload(sessionStartPayload));

    // New session = new server cache; prior revision_id is not valid on it.
    if (newSessionId && newSessionId !== previousSessionId) {
      revisionId = null;
      dispatch(setAfterKpi(null));
      dispatch(setAfterChart(null));
    }

    const beforePayload = {
      ...sessionStartPayload,
      session_id: sessionId,
      is_simulated: false,
      ...(revisionId ? { revision_id: revisionId } : {}),
    };
    const afterPayload = revisionId
      ? {
          ...sessionStartPayload,
          session_id: sessionId,
          is_simulated: true,
          revision_id: revisionId,
        }
      : null;

    const settled = await Promise.allSettled([
      dispatch(fetchExpediteKpi(beforePayload)),
      dispatch(fetchExpediteChart(beforePayload)),
      dispatch(fetchExpediteConstraints(beforePayload)),
      ...(afterPayload
        ? [
            dispatch(fetchExpediteKpi(afterPayload)),
            dispatch(fetchExpediteChart(afterPayload)),
          ]
        : []),
    ]);

    const [
      beforeKpiSettled,
      beforeChartSettled,
      constraintsSettled,
      afterKpiSettled,
      afterChartSettled,
    ] = settled;

    if (
      beforeKpiSettled?.status === "fulfilled" &&
      beforeKpiSettled.value?.data?.data
    ) {
      dispatch(setBeforeKpi(beforeKpiSettled.value.data.data));
    } else if (beforeKpiSettled?.status === "rejected") {
      console.warn(
        "refetchExpediteSessionOnFilterApply: before KPI failed",
        beforeKpiSettled.reason
      );
    }

    if (beforeChartSettled?.status === "fulfilled") {
      const beforeEnvelope = beforeChartSettled.value?.data?.data;
      const beforeRows = normalizeExpediteChartRows(beforeEnvelope);
      if (beforeRows?.length) {
        dispatch(setBeforeChart(beforeEnvelope));
      }
    } else if (beforeChartSettled?.status === "rejected") {
      console.warn(
        "refetchExpediteSessionOnFilterApply: before chart failed",
        beforeChartSettled.reason
      );
    }

    if (constraintsSettled?.status === "fulfilled") {
      const constraintsData = constraintsSettled.value?.data?.data?.data;
      if (constraintsData) {
        dispatch(setConstraintDefaults(constraintsData));
      }
    } else if (constraintsSettled?.status === "rejected") {
      console.warn(
        "refetchExpediteSessionOnFilterApply: constraints failed",
        constraintsSettled.reason
      );
    }

    if (revisionId && afterKpiSettled) {
      if (
        afterKpiSettled.status === "fulfilled" &&
        afterKpiSettled.value?.data?.data
      ) {
        dispatch(setAfterKpi(afterKpiSettled.value.data.data));
      } else if (afterKpiSettled.status === "rejected") {
        console.warn(
          "refetchExpediteSessionOnFilterApply: after KPI failed",
          afterKpiSettled.reason
        );
      }
    }

    if (revisionId && afterChartSettled) {
      if (afterChartSettled.status === "fulfilled") {
        const afterEnvelope = afterChartSettled.value?.data?.data;
        const afterRows = normalizeExpediteChartRows(afterEnvelope);
        if (afterRows?.length) {
          dispatch(setAfterChart(afterEnvelope));
        }
      } else if (afterChartSettled.status === "rejected") {
        console.warn(
          "refetchExpediteSessionOnFilterApply: after chart failed",
          afterChartSettled.reason
        );
      }
    }
  } catch (err) {
    console.warn("refetchExpediteSessionOnFilterApply failed", err);
  } finally {
    dispatch(setIsBeforeKpiLoading(false));
    dispatch(setIsAfterKpiLoading(false));
    dispatch(setIsBeforeChartLoading(false));
    dispatch(setIsAfterChartLoading(false));
    dispatch(setIsConstraintsLoading(false));
    dispatch(setDeepDiveTableLoader(false));
  }
};

/** @alias refetchExpediteSessionOnFilterApply */
export const refetchExpediteSessionCharts = refetchExpediteSessionOnFilterApply;

/** @deprecated Use `refetchExpediteSessionOnFilterApply` */
export const refetchExpediteSessionBeforeChart = refetchExpediteSessionOnFilterApply;
