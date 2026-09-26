export const LOGISTICS_CONFIG_SECTIONS = [
  {
    id: "lead_time",
    title: "Lead time",
    iconType: "lead_time",
  },
  {
    id: "priority",
    title: "Priority",
    iconType: "priority",
  },
  {
    id: "min_transfer_qty",
    title: "Min Transfer Quantity",
    iconType: "min_transfer_qty",
  },
];

export const LOGISTICS_EMPTY_STATE = {
  heading: "No more data to display",
  description: "Click Configure To Set Up",
  primaryButtonLabel: "Configure",
};

export const LOGISTICS_PANEL_METHOD_TABS = [
  { label: "Store groups", value: "store_groups" },
  { label: "Geography", value: "geography" },
  { label: "Distance", value: "distance" },
];

export const LOGISTICS_PANEL_TITLES = {
  lead_time: "Lead time Configuration",
  priority: "Priority Configuration",
  min_transfer_qty: "Min Transfer Quantity Configuration",
};

export const LOGISTICS_METHOD_HELPER_TEXT = {
  lead_time: {
    store_groups: "Any transfer within a group gets this lead time",
    geography: "Only selected levels will be used",
    distance: "Matched to the first range they fall into",
  },
  priority: {
    store_groups: "Any transfer within a group gets this priority",
    geography: "Only selected levels will be used",
    distance: "Matched to the first range they fall into",
  },
  min_transfer_qty: {
    store_groups: "Any transfer within a group gets this min transfer quantity",
    geography: "Only selected levels will be used",
    distance: "Matched to the first range they fall into",
  },
};

export const LOGISTICS_DISTANCE_ADD_RANGE_LABEL = "Add Range";

export const LOGISTICS_STORE_GROUP_PAYLOAD = {
  tab: "store_groups",
  get: "store_groups",
};

export const LOGISTICS_DISTANCE_TO_EDIT_BLOCKED_MESSAGE =
  "Remove the ranges below before changing the input.";

export const LOGISTICS_DISTANCE_TO_LESS_THAN_FROM_MESSAGE =
  "To value cannot be less than From value.";

export const LOGISTICS_METHOD_SELECT_LABEL = {
  store_groups: "Select store groups",
  geography: "Select geography",
  distance: "Select miles",
};

export const LOGISTICS_LEAD_TIME_WARNING =
  "In case of overlapping stores across groups — lowest lead time will be picked.";

export const LOGISTICS_PRIORITY_WARNING =
  "In case of overlapping stores across groups — best rank will be picked.";

export const LOGISTICS_MIN_TRANSFER_QTY_WARNING =
  "In case of overlapping stores across groups — lowest units will be picked.";

export const LOGISTICS_STORE_GROUPS_OVERLAP_WARNING = {
  lead_time: LOGISTICS_LEAD_TIME_WARNING,
  priority: LOGISTICS_PRIORITY_WARNING,
  min_transfer_qty: LOGISTICS_MIN_TRANSFER_QTY_WARNING,
};

export const LOGISTICS_LEAD_TIME_MAX_DAYS = 365;

export const LOGISTICS_LEAD_TIME_MAX_EXCEEDED_MESSAGE =
  "Lead time cannot exceed 365 days.";

export const LOGISTICS_TAB_SWITCH_PROMPT = {
  title: "Leave This Tab?",
  description:
    "Switching tabs will delete your current changes. Only one tab can be configured.",
  primaryButtonLabel: "Cancel",
  secondaryButtonLabel: "Discard",
};

export const getLogisticsPanelTitle = (sectionId) =>
  LOGISTICS_PANEL_TITLES[sectionId] || "Configuration";
