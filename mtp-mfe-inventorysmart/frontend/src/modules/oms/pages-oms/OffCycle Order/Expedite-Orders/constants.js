/** Maximum number of Choice+DC selections allowed for the expedite flow. */
export const EXPEDITE_SELECTION_CAP = 50;

/** Page heading shown below breadcrumbs on the expedite orders screen (step 1). */
export const EXPEDITE_PAGE_TITLE = "Compare Scenarios";

/** Page heading for the notification "After" view (modified lead time). */
export const EXPEDITE_PAGE_TITLE_AFTER = "Modified Lead Time Lost Sales";

/** Override-card title: legacy/before vs notification "After" view. */
export const EXPEDITE_CTA_TITLE = "Override The Default Lead Time";
export const EXPEDITE_CTA_TITLE_AFTER = "Override The Modified Lead Time";

/** Off-cycle CTA button label: legacy/before vs notification "After" view. */
export const EXPEDITE_CREATE_OFF_CYCLE_LABEL = "Create Off Cycle Order";
export const EXPEDITE_CREATE_OFF_CYCLE_LABEL_AFTER =
  "Regenerate Off Cycle Order";

/** Width for compact page-header deep-dive filter dropdowns. */
export const EXPEDITE_COMPACT_FILTER_DROPDOWN_WIDTH = 240;

/** Deep-dive view options for expedite orders. */
export const EXPEDITE_ORDERS_DEEPDIVE_VIEWS = [
  {
    label: "Default Lead Time",
    value: "default_lead_time",
  },
  {
    label: "Faster Shipment",
    value: "faster_shipment",
  },
];

/** Step-1 dual-metric KPI cards rendered in HeaderKPIPanel. */
export const EXPEDITE_LOST_SALES_KPI_CARDS = [
  {
    key: "lost_sales",
    title: "Lost Sales Avoided",
    iconType: "PR2",
    accentColor: "#3BB273",
    trackColor: "#E8F5EE",
    metrics: [
      {
        key: "units",
        label: "Units",
        isCurrency: false,
        dotColor: "#3BB273",
      },
      {
        key: "revenue",
        label: "Revenue",
        isCurrency: true,
        dotColor: "#FFB1B1",
      },
    ],
  },
  {
    key: "recoverable_sales",
    title: "Recoverable",
    iconType: "RV1",
    accentColor: "#F59E5C",
    trackColor: "#FCEDE0",
    metrics: [
      {
        key: "units",
        label: "Units",
        isCurrency: false,
        dotColor: "#F59E5C",
      },
      {
        key: "revenue",
        label: "Revenue",
        isCurrency: true,
        dotColor: "#FFB1B1",
      },
    ],
  },
];

/** Keys used to store expedite flow state in localStorage. */
export const EXPEDITE_LS_KEYS = {
  /** Minimal alert payload: { choiceDcCombinations, filters, dateFilter, dashboardFilters } */
  ALERT_PAYLOAD: "omsExpediteAlertPayload",
  /** session_id returned by /session/start */
  SESSION_ID: "omsExpediteSessionId",
  /** revision_id returned by /simulate */
  REVISION_ID: "omsExpediteRevisionId",
  /** Bottom-sheet grid: selected rows + edited values after a successful Generate. */
  BOTTOM_SHEET_DATA: "omsExpediteBottomSheetData",
  /** Array of generated order card summaries for step-2 carousel. */
  GENERATED_ORDERS: "omsExpediteGeneratedOrders",
  /** Article+loc pairs for expedite off-cycle bottom sheet (separate from ALERT_PAYLOAD). */
  OFF_CYCLE_ARTICLE_LOC_PAYLOAD: "omsExpediteOffCycleArticleLocPayload",
  /** Currently selected metric card key for filtering deep dive data */
  SELECTED_METRIC_CARD: "omsExpediteSelectedMetricCard",
};

/** Clear all expedite-related localStorage entries. Call this when starting a new flow. */
export const clearExpediteLocalStorage = () => {
  Object.values(EXPEDITE_LS_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

/**
 * Derive the article set that should constrain the Expedite deep-dive view:
 * - Step 2 (one or more generated-order simulations): union of
 *   `constraints[].choice` across all generated orders (choice === article in
 *   this flow — it is what `baseExpeditePayload.data` was populated with and
 *   what each simulation iterates on). This keeps deep-dive narrowed to only
 *   the articles actively being simulated.
 * - Step 1 / no simulations: the alert-page capped `choiceDcCombinations`
 *   (typically up to 50 unique articles) — never the full dashboard filter.
 */
export const getExpediteActiveArticles = (
  choiceDcCombinations,
  generatedOrders
) => {
  if (Array.isArray(generatedOrders) && generatedOrders.length > 0) {
    const uniqueArticles = new Set();
    generatedOrders.forEach((generatedOrder) => {
      (generatedOrder?.constraints || []).forEach((constraintRow) => {
        if (constraintRow?.choice) uniqueArticles.add(constraintRow.choice);
      });
    });
    if (uniqueArticles.size > 0) return Array.from(uniqueArticles);
  }
  return Array.isArray(choiceDcCombinations) ? [...choiceDcCombinations] : [];
};

/**
 * Replace (or inject) the `article` entry inside a deep-dive filters array so
 * the deep-dive view never widens beyond the active article set, even when
 * the alert-payload `filters` carries a broader dashboard article filter
 * (e.g. 581 articles that the user filtered on in the dashboard before
 * picking 50 to expedite).
 *
 * Returns a new array; the input is not mutated.
 */
export const overrideExpediteArticleFilter = (filters, articles) => {
  const safeArticles = Array.isArray(articles) ? [...articles] : [];
  const clonedFilters = Array.isArray(filters)
    ? filters.map((filterEntry) => ({ ...filterEntry }))
    : [];
  const articleFilterIndex = clonedFilters.findIndex(
    (filterEntry) => filterEntry?.attribute_name === "article"
  );
  const articleFilterEntry =
    articleFilterIndex >= 0
      ? {
          ...clonedFilters[articleFilterIndex],
          values: safeArticles,
          operator: "in",
        }
      : {
          attribute_name: "article",
          filter_id: "article",
          filter_type: "cascaded",
          dimension: "product",
          operator: "in",
          values: safeArticles,
        };
  if (articleFilterIndex >= 0) {
    clonedFilters[articleFilterIndex] = articleFilterEntry;
  } else {
    clonedFilters.push(articleFilterEntry);
  }
  return clonedFilters;
};

/**
 * Enforce a minimum article scope before any expedite request goes out.
 *
 * The expedite deep-dive view must never widen beyond the active article set
 * (step 1 = alert-picked `choiceDcCombinations`; step 2 = union of simulated
 * `constraints[].choice`). The user can clear the `article` dropdown in the
 * deep-dive filter panel — that leaves `values: []` in `deepDiveFiltersPayload`,
 * which the backend treats as "no article filter" and returns the full
 * dashboard universe (e.g. 581 articles). This helper guarantees a cleared
 * dropdown still carries the active article set in the outgoing payload,
 * so filter-options / chart / KPI requests stay scoped to the expedite flow.
 *
 * If the user explicitly picked a narrower subset (non-empty values), that
 * subset is kept intact — they're drilling down inside the expedite scope.
 *
 * Returns a new array; the input is not mutated.
 */
export const ensureExpediteArticleScope = (filters, activeArticles) => {
  const safeActiveArticles = Array.isArray(activeArticles)
    ? [...activeArticles]
    : [];
  const clonedFilters = Array.isArray(filters)
    ? filters.map((filterEntry) => ({ ...filterEntry }))
    : [];
  const articleFilterIndex = clonedFilters.findIndex(
    (filterEntry) => filterEntry?.attribute_name === "article"
  );
  if (articleFilterIndex < 0) {
    return overrideExpediteArticleFilter(clonedFilters, safeActiveArticles);
  }
  const existingArticleValues = clonedFilters[articleFilterIndex]?.values;
  const isEmptyValues =
    !Array.isArray(existingArticleValues) || existingArticleValues.length === 0;
  if (isEmptyValues) {
    clonedFilters[articleFilterIndex] = {
      ...clonedFilters[articleFilterIndex],
      values: safeActiveArticles,
      operator: "in",
    };
  }
  return clonedFilters;
};

export const EXPEDITE_SCENARIO_ENABLED_CONFIGS = [
  {
    series: {
      type: "spline",
      color: "#20ACCF",
      dashStyle: "Dash",
      marker: {
        radius: 0,
        states: {
          hover: {
            enabled: true,
          },
        },
        symbol: "circle",
        enabled: false,
      },
      fillOpacity: 0.8,
    },
    leadTime: {
      key: "exp_bop_dc_inv_scenario_enabled",
      label: "Projected DC Inventory - DLT",
    },
    effectiveLeadTime: {
      key: "exp_bop_dc_inv_scenario_enabled_cost",
      label: "Projected DC Inventory Cost - DLT",
    },
  },
  {
    series: {
      type: "column",
      color: "#20ACCF",
    },
    leadTime: {
      key: "first_order_cycle_receipt",
      label: "DLT Order Receipts",
    },
    effectiveLeadTime: {
      key: "first_order_cycle_receipt_cost",
      label: "DLT Order Receipts Cost",
    },
  },
];
