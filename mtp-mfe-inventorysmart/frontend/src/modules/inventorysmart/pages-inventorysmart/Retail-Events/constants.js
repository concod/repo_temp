export const RETAIL_EVENTS_FILTER_CONFIG_KEY = "retailEventsFilterConfiguration";
// Reuses the Product Supersession product filter screen until a dedicated
// "Inventorysmart Configurations Retail Events" screen is configured.
export const RETAIL_EVENTS_SAVED_FILTER_SCREEN =
  "Inventorysmart Configurations Product Supersession";

/** Backend table-config names used with getColumnsAg (`table_name=`). */
export const RETAIL_EVENTS_TABLE_NAME = "inventorysmart_oms_retail_events";
export const RETAIL_EVENTS_STAGING_TABLE_NAME =
  "inventorysmart_oms_retail_events_staging";
export const RETAIL_EVENTS_UNIQUE_ROW_ID = "id";
export const RETAIL_EVENTS_STAGING_UNIQUE_ROW_ID = "row_number";
export const RETAIL_EVENTS_TEMPLATE_FILE_TYPES = ["xlsx", "csv"];
export const RETAIL_EVENTS_DATE_FORMAT = "YYYY-MM-DD";

export const RETAIL_EVENTS_TABS = {
  ACTIVATED: "activated",
  DEACTIVATED: "deactivated",
};

/**
 * Fallback column config (MTP-155204 "UI Display Names") used when the backend
 * has no table config for RETAIL_EVENTS_TABLE_NAME. start_date / end_date are
 * derived on the FE (see utils.withDerivedDates), so they are not server sortable.
 */
export const RETAIL_EVENTS_DEFAULT_COLUMNS = [
  { column_name: "region", label: "Region" },
  { column_name: "holiday_name_feed", label: "Event uploaded" },
  { column_name: "holiday_name_normalised", label: "Event Name" },
  { column_name: "primary_date", label: "Primary date" },
  {
    column_name: "start_date",
    label: "Start date",
    is_sortable: false,
    is_searchable: false,
  },
  {
    column_name: "end_date",
    label: "End date",
    is_sortable: false,
    is_searchable: false,
  },
  { column_name: "category", label: "Category" },
].map((column, index) => ({
  type: "str",
  is_hidden: false,
  is_editable: false,
  is_sortable: true,
  is_searchable: true,
  order_of_display: index + 1,
  ...column,
}));

export const RETAIL_EVENTS_MESSAGES = {
  tableHeader: "Events Data",
  uploadTitle: "Upload Retail Events",
  previewTitle: "Preview",
  deactivateTitle: "Deactivate events?",
  activateTitle: "Activate events?",
  deactivateBody:
    "Selected events will be deactivated and stop rendering in charts after the next scheduled refresh.",
  activateBody: "Selected events will be re-activated.",
  setAllSuccess: "Events updated successfully",
  downloadStarted: "Download started",
  downloadEmpty: "No error rows to download",
};
