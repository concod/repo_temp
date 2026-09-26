export const VIEW_MANAGEMENT_API_URLS = {
  TEMPLATE_DATA_API_URL: "/inventory-smart/oms/views/templates",
  SAVE_VIEW_API_URL: "/inventory-smart/oms/views/create",
  VIEW_LIST_API_URL: "/inventory-smart/oms/views/list",
  VIEW_DETAIL_API_URL: "/inventory-smart/oms/views/details",
  SCREEN_NAME_ID_MAPPING_URL: "/inventory-smart/oms/views/screens",
  USER_ROLE_API_URL: "/inventory-smart/oms/views/user-type",
  SAVE_VIEW_STATE_API_URL: "/inventory-smart/oms/views/state",
};

export const SET_AS_DEFAULT = {
  API_URL: "inventory-smart/oms/views",
  SUCCESS_MSG: "Current view is set as default view",
  ERROR_MSG: "Error in setting current View As default",
};

export const UNSET_AS_DEFAULT_SUCCESS_MESSAGE =
  "The current view is unset as the default";

export const RENAME_VIEW = {
  API_URL: "inventory-smart/oms/views",
  SUCCESS_MSG: "Name is successfully updated",
  ERROR_MSG: "Failed to rename the view. Please try again later.",
};

export const MAX_VIEW_COUNT = 50;

export const TABLE_SETTINGS_VIEW_TYPE = {
  CHECKBOX_LIST: "checkbox-list",
  TOGGLE: "toggle",
};

export const TABLE_SETTINGS_ACCESSOR_TYPE = {
  COLUMN: "column",
  ROW: "row",
};

export const TABLE_SETTINGS_CATEGORY = {
  PRODUCT_KEY: "product",
  VERSION_KEY: "version",
  VARIANCE_KEY: "variance",
};

export const REPLACE_VIEW = {
  API_URL: "/inventory-smart/oms/views/update",
  SUCCESS_MSG: "View updated successfully",
};

export const dividerConstants = ["Metrics", "Versions"];

export const VIEW_SAVE_SUCCESS_MSG = "View saved successfully";

export const VIEW_MANAGEMENT_PANEL_ENABLED_ICON_TOOLTIP = "View management";
export const VIEW_MANAGEMENT_PANEL_DISABLED_ICON_TOOLTIP =
  "Please select a view from current view dropdown";
