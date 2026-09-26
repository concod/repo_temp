// Template Data API URL
export const TEMPLATE_DATA_API_URL = "/plan-smart/views/templates";

// Save View API URL
export const SAVE_VIEW_API_URL = "/plan-smart/views/create";

// Save View Toast Messages
export const VIEW_SAVE_SUCCESS_MSG = "View saved successfully";

// Status-Screen Mapping
export const STATUS_SCREEN_MAPPING = {
  0: "pre-season",
  2: "pre-season/scenario-plan",
  3: "in-season/scenario-forecast",
  4: "in-season",
  9: "target-plan"
};

//Listing view names API URL
export const VIEW_LIST_API_URL = "plan-smart/views/list";

// View Detail API URL
export const VIEW_DETAIL_API_URL = "/plan-smart/views/details";

//Set As Default API URL And Toast Messages
export const SET_AS_DEFAULT = {
  API_URL: "plan-smart/views",
  SUCCESS_MSG: "Current view is set as default view",
  ERROR_MSG: "Error in setting current View As default"
};
//Unset as Default View Success Message
export const UNSET_AS_DEFAULT_SUCCESS_MESSAGE =
  "The current view is unset as the default";

//Rename view API URL And Toast Messages
export const RENAME_VIEW = {
  API_URL: "plan-smart/views",
  SUCCESS_MSG: "Name is successfully updated",
  ERROR_MSG: "Failed to rename the view. Please try again later."
};

// User role Api URL
export const USER_ROLE_API_URL = "/plan-smart/views/user-type";

// Maximum number of views that can be created per user per screen
export const MAX_VIEW_COUNT = 25;

//Table setting constants
export const TABLE_SETTINGS_VIEW_TYPE = {
  CHECKBOX_LIST: "checkbox-list",
  TOGGLE: "toggle"
};

export const TABLE_SETTINGS_ACCESSOR_TYPE = {
  COLUMN: "column",
  ROW: "row"
};

export const TABLE_SETTINGS_CATEGORY = {
  PRODUCT_KEY: "product",
  VERSION_KEY: "version",
  VARIANCE_KEY: "variance"
};

// Screens Name and Id Mapping URL
export const SCREEN_NAME_ID_MAPPING_URL = "/plan-smart/views/screens";

//replace view api URL
export const REPLACE_VIEW = {
  API_URL: "/plan-smart/views/update",
  SUCCESS_MSG: "View updated successfully"
};

// Show Hide metric constants
export const dividerConstants = ["Metrics", "Versions"];

// VIew Management Panel Icon Tooltip constants
export const VIEW_MANAGEMENT_PANEL_ENABLED_ICON_TOOLTIP = "View management";
export const VIEW_MANAGEMENT_PANEL_DISABLED_ICON_TOOLTIP =
  "Please select a view from current view dropdown";
