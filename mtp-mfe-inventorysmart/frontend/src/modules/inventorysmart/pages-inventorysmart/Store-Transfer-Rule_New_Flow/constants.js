export const STEP_META = [
  {
    label: "Rule name",
    description: "",
    primaryButtonLabel: "Go To Store Selection >",
    secondaryButtonLabel: "< Back",
  },
  {
    label: "Store selection",
    description: "",
    primaryButtonLabel: "Save Rule >",
    secondaryButtonLabel: "< Back",
  },
];

export const FULFILMENT_TYPE = {
  NEED_BASED: "NEED_BASED",
  FIXED_PUSH: "FIXED_PUSH",
};

export const FULFILMENT_TYPE_OPTIONS = [
  {
    value: FULFILMENT_TYPE.NEED_BASED,
    label: "Need Based",
    description: "Adjust inventory to meet forecasted demand",
  },
  {
    value: FULFILMENT_TYPE.FIXED_PUSH,
    label: "Fixed Push",
    description: "Empty inventory from selected stores",
  },
];

export const DESCRIPTION_MAX_LENGTH = 300;

export const DEFAULT_FORM_STATE = {
  ruleName: "",
  description: "",
  fulfilmentType: FULFILMENT_TYPE.NEED_BASED,
};

export const DEFAULT_STORE_SELECTION_TABS = [
  { label: "Store groups", value: "store_groups" },
  { label: "Hierarchy", value: "hierarchy" },
  { label: "Attributes", value: "attributes" },
  // { label: "Upload", value: "upload" },
];

export const STORE_SELECTION_TAB = {
  STORE_GROUPS: "store_groups",
  HIERARCHY: "hierarchy",
  ATTRIBUTES: "attributes",
  UPLOAD: "upload",
};

export const NO_GEOGRAPHICAL_RESTRICTION = {
  label: "No restriction",
  value: "no_restriction",
};

export const STORE_GROUP_GEOGRAPHICAL_RESTRICTION_VALUE = "store_group";

export const DEFAULT_STORE_SELECTION_OPTIONS = {
  attribute_filters: [],
  hierarchy_filters: [],
  filter_by_attributes: [],
  geographical_restrictions: [],
};

export const STORE_TRANSFER_STORE_GROUP_FILTER_PAYLOAD = {
  tab: STORE_SELECTION_TAB.STORE_GROUPS,
  get: "store_groups",
};

export const POOL_EXCLUDE_STORES_GET = "store_codes";

export const POOL_METHOD_TAB = {
  GROUPS: "groups",
  HIERARCHY: "hierarchy",
};

export const DEFAULT_POOL_METHOD_TABS = [
  { label: "groups", value: "groups" },
  { label: "Hierarchy", value: "hierarchy" },
];

export const SOURCE_DESTINATION_RESTRICTIONS_ACCORDION_ID =
  "source-destination-restrictions";

export const FIXED_PUSH_SOURCE_DESTINATION_WARNING_MESSAGE =
  "Fixed Push empties Source stores into Destinations. A store can't ship to itself, so stores picked for both default to Source and drop from Destinations.";

export const GRADE_FILTER_FIELD = {
  label: "Grade filter",
  column: "psa_name",
};

export const STORE_SELECTION_TAB_SWITCH_PROMPT = {
  title: "Leave This Tab?",
  description:
    "Switching tabs will delete your current changes. Only one tab can be configured.",
  primaryButtonLabel: "Cancel",
  secondaryButtonLabel: "Discard",
};
