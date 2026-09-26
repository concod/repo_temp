export const ENTRY_CONTEXT_STORAGE_KEY = "oms.orderManagement.entryContext";

export const ENTRY_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;

export const DC_DIMENSION_ID = "DC";

export const PIVOT_PANEL_INVALID_DROP_MESSAGE = (
  lowerRankedId,
  higherRankedId
) => `${lowerRankedId} must appear before ${higherRankedId} in the hierarchy.`;

export const PIVOT_PANEL_EMPTY_MESSAGE =
  "Add at least one hierarchy level before applying.";

/** Minimum closed-trigger width for View Management category Select. */
export const PIVOT_DIMENSION_SELECT_WIDTH = "120px";

/**
 * View Management category allow-list. Only these top-level pivot categories
 * are draggable / droppable in the panel today; Location and Time are still
 * under discussion (DC folds into Product as an alternate hierarchy, and the
 * week/month time axis is driven by the outer toolbar, not the pivot panel).
 * Re-enabling a category later is a single edit here. See learned rule #72.
 */
export const VIEW_MANAGEMENT_VISIBLE_CATEGORIES = ["product", "measures"];

export const BOOTSTRAP_API_PATH = "/oms/views/bootstrap";

export const SSRM_FETCH_API_PATH = "/inventory-smart/oms/order-management/rows";

export const SAVE_PAYLOAD_API_PATH =
  "/inventory-smart/oms/order-management/save";

export const EDIT_API_PATH = "/inventory-smart/oms/order-management/edit";

/** OMS View Management — paths for when BE ships; mocks used until then. */
export const OMS_MATRIX_SUMMARY_PIVOT_DESCRIPTION_PATH =
  "/oms/matrix-summary/pivot-description";

export const OMS_MATRIX_SUMMARY_VIEWS_BASE = "/oms/matrix-summary/views";

/** When true, view-management thunks use mocks only (no Plansmart / live OMS calls). */
export const OMS_VIEW_MANAGEMENT_USE_MOCKS = false;

export const DEFAULT_SSRM_CACHE_BLOCK_SIZE = 50;

/** localStorage key — legacy undo-stack mirror; purged on mount, no longer written. */
export const OM_UNDO_STACK_BACKUP_KEY = "om_undo_stack_backup";

export const SSRM_MAX_BLOCKS_IN_CACHE = 10;

export const FIXED_VALUE_COLUMNS = {
  ORDER_QTY: "order_qty",
};

export const ORDER_QTY_HEADER = "Order Qty";

export const DEFAULT_KPI_FALLBACK = "demand_forecast";

export const ROQ_PLACEMENT_DATE = "roq_placement_date";
export const ROQ_RECEIPT_DATE = "roq_receipt_date";

/** Drilldown matrix BE timeline_selection values (distinct from legacy roq_* tab ids). */
export const DRILLDOWN_TIMELINE_PLACEMENT = "placement";
export const DRILLDOWN_TIMELINE_RECEIPT = "receipt";

export const NAV_PROMPT_COPY = "Any unsaved changes will be lost.";

export const NAV_PROMPT_TITLE = "Are you sure you want to change screens?";
