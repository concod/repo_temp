export const DEFAULT_ROUNDOFF = 2;

export const IGNORE_ROUNDOFF = ["int"];

export const ascendingOrderLabel = {
  str: "agGrid.sort.aToZ",
  list: "agGrid.sort.aToZ",
  int: "agGrid.sort.byAsc",
  float: "agGrid.sort.byAsc",
  percentage: "agGrid.sort.byAsc",
  dollar: "agGrid.sort.byAsc",
  link: "agGrid.sort.byAsc",
  DateTimeField: "agGrid.sort.oldestToNewest",
  attribute: "agGrid.sort.aToZ",
  date: "agGrid.sort.oldestToNewest",
  array: "agGrid.sort.aToZ",
  datetime: "agGrid.sort.oldestToNewest",
  bool: "agGrid.sort.byFalse",
  trend: "agGrid.sort.byAsc",
  "cell-tag": "agGrid.sort.byAsc",
  "progress-bar": "agGrid.sort.byAsc",
  "table-chart": "agGrid.sort.byAsc",
  euro: "agGrid.sort.byAsc",
};

export const descendingOrderLabel = {
  str: "agGrid.sort.zToA",
  list: "agGrid.sort.zToA",
  int: "agGrid.sort.byDesc",
  float: "agGrid.sort.byDesc",
  percentage: "agGrid.sort.byDesc",
  dollar: "agGrid.sort.byDesc",
  link: "agGrid.sort.byDesc",
  DateTimeField: "agGrid.sort.newestToOldest",
  attribute: "agGrid.sort.zToA",
  date: "agGrid.sort.newestToOldest",
  array: "agGrid.sort.zToA",
  datetime: "agGrid.sort.newestToOldest",
  bool: "agGrid.sort.byTrue",
  trend: "agGrid.sort.byDesc",
  "cell-tag": "agGrid.sort.byDesc",
  "progress-bar": "agGrid.sort.byDesc",
  "table-chart": "agGrid.sort.byDesc",
  euro: "agGrid.sort.byDesc",
};

export const initialRadioValues = [
  {
    id: "a-z",
    label: "agGrid.sort.aZ",
    value: "a-z",
  },
  {
    id: "z-a",
    label: "agGrid.sort.zA",
    value: "z-a",
  },
];

export const sortLabelValues = {
  int: {
    asc: {
      label: "agGrid.sort.byAsc",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.byDesc",
      value: "desc",
    },
  },
  float: {
    asc: {
      label: "agGrid.sort.byAsc",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.byDesc",
      value: "desc",
    },
  },
  percentage: {
    asc: {
      label: "agGrid.sort.byAsc",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.byDesc",
      value: "desc",
    },
  },
  link: {
    asc: {
      label: "agGrid.sort.byAsc",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.byDesc",
      value: "desc",
    },
  },
  str: {
    asc: {
      label: "agGrid.sort.aToZ",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.zToA",
      value: "desc",
    },
  },
  date: {
    asc: {
      label: "agGrid.sort.oldestToNewest",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.newestToOldest",
      value: "desc",
    },
  },
  DateTimeField: {
    asc: {
      label: "agGrid.sort.oldestToNewest",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.newestToOldest",
      value: "desc",
    },
  },
  datetime: {
    asc: {
      label: "agGrid.sort.oldestToNewest",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.newestToOldest",
      value: "desc",
    },
  },
  bool: {
    asc: {
      label: "agGrid.sort.byFalse",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.byTrue",
      value: "desc",
    },
  },
  array: {
    asc: {
      label: "agGrid.sort.aToZ",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.zToA",
      value: "desc",
    },
  },
  list: {
    asc: {
      label: "agGrid.sort.aToZ",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.zToA",
      value: "desc",
    },
  },
  attribute: {
    asc: {
      label: "agGrid.sort.aToZ",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.zToA",
      value: "desc",
    },
  },
  chip: {
    asc: {
      label: "agGrid.sort.aToZ",
      value: "asc",
    },
    desc: {
      label: "agGrid.sort.zToA",
      value: "desc",
    },
  },
};

// To be customised in future as it varies from client to client
export const levelsArray = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "l4_name",
  "l5_name",
  "l6_name",
  "l7_name",
  "l8_name"
];

// to add additional column types later based on use case of the table
export const columnActionTypes = [
  "bool",
  "ToogleField",
  "edit_icon",
  "delete_icon",
  "chart_icon",
  "add_icon",
  "download_icon",
  "info_icon",
];

export const actionTypesToNotEdit = [
  ...columnActionTypes,
  "link",
  "int",
  "float",
  "percentage",
  "dollar",
  "euro",
  "list",
  "dynamic-list",
  "review_btn",
  "datetime",
];

export const textFilterOptions = [
  { label: "agGrid.filter.contains", value: "contains" },
  { label: "agGrid.filter.equals", value: "equals" },
];

export const textFilterCollectiveTypes = ["str", "link", "list"];

export const numberFilterOptions = [
  { label: "agGrid.filter.equals", value: "equals" },
  // { label: "Not Equals", value: "notEqual" },
  { label: "agGrid.filter.lessThanOrEqual", value: "lessThanOrEqual" },
  { label: "agGrid.filter.greaterThanOrEqual", value: "greaterThanOrEqual" },
  { label: "agGrid.filter.inRange", value: "inRange" },
];

export const collectiveTypes = {
  str: {
    filterOptions: textFilterOptions,
    fieldType: "TextField",
    paramType: "text",
  },
  int: {
    filterOptions: numberFilterOptions,
    fieldType: "IntegerField",
    paramType: "number",
  },
  percentage: {
    filterOptions: numberFilterOptions,
    fieldType: "IntegerField",
    paramType: "number",
  },
  dollar: {
    filterOptions: numberFilterOptions,
    fieldType: "IntegerField",
    paramType: "number",
  },
  link: {
    filterOptions: textFilterOptions,
    fieldType: "TextField",
    paramType: "text",
  },
  list: {
    filterOptions: textFilterOptions,
    fieldType: "TextField",
    paramType: "list",
  },
  float: {
    filterOptions: numberFilterOptions,
    fieldType: "IntegerField",
    paramType: "number",
  },
  date: {
    filterOptions: numberFilterOptions,
    fieldType: "DateTimeField",
    paramType: "date",
  },
  chip: {
    filterOptions: textFilterOptions,
    fieldType: "TextField",
    paramType: "text",
  },
};

export const matchDropdown = {
  isClearable: false,
  isDisabled: false,
  isMulti: false,
  isSearchable: false,
  label: "",
  options: [
    { label: "All", value: "and" },
    { label: "Any", value: "or" },
  ],
  required: false,
};

export const groupExpandedIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>`;

export const groupContractedIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>`;

export const fontSizesArray = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium (default)" },
  { value: "large", label: "Large" },
];
export const numericValuesArray = [
  { value: "full", label: "Full Number" },
  { value: "thousand", label: "In K (Thousands)" },
  { value: "million", label: "In Mn (Millions)" },
  { value: "billion", label: "In Bn (Billions)" },
];

export const EXCEL_DOWNLOAD_FILTERS_HEADING = [
  { value: "Filter Dimension:", type: "String" },
  { value: "Filters", type: "String" },
];

export const FORMAT_DROPDOWN = [
  {
    column_name: "table_format",
    filter_keyword: "table_format",
    accessor: "table_format",
    default_value: null,
    dimension: "table",
    display_type: "dropdown",
    field_type: "dropdown",
    initialData: [],
    is_mandatory: false,
    is_multiple_selection: false,
    isMulti: false,
    label: "Table Format",
    level: 1,
    range_max: null,
    range_min: null,
    type: "cascaded",
    isDisabled: false,
    isClearable: false,
    is_clearable: false,
    display_order: 1,
    autoSize: false,
  },
];

export const dateTypeColumns = ["date", "DateTimeField", "dateStr", "datetime"];

export const summarizedByDropdownOptions = [
  {
    label: "SUM",
    value: "sum",
  },
  {
    label: "FIRST",
    value: "first",
  },
  {
    label: "LAST",
    value: "last",
  },
  {
    label: "COUNT",
    value: "count",
  },
  {
    label: "AVERAGE",
    value: "avg",
  },
  {
    label: "MAX",
    value: "max",
  },
  {
    label: "MIN",
    value: "min",
  },
];

export const initialTotalSubtotalConfig = {
  columns: {
    isCheckboxTicked: {
      total: true,
      subtotal: true,
    },
    dropdownData: {
      total: [],
      subtotal: [],
    },
    selectedOptions: {
      total: {},
      subtotal: {},
    },
  },
  rows: {
    isCheckboxTicked: {
      total: true,
      subtotal: true,
    },
    dropdownData: {
      total: [],
      subtotal: [],
    },
    selectedOptions: {
      total: {},
      subtotal: {},
    },
  },
};

export const PINNED_VIEWPORT_THRESHOLD = 0.9;

// Keys used for table navigation
export const KEYBOARD_NAVIGATION_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

// Column types that can have numerical values
export const NUMBER_CELL_TYPES = [
  "int",
  "percentage",
  "float",
  "dollar",
  "euro",
  "number",
];

// Custom column types used by core
export const COLUMN_TYPES = {
  str: {},
  date: {},
  datetime: {},
  link: {},
  action: {},
  int: {},
  chat: {},
  bool: {},
  list: {},
  "dynamic-list": {},
  ToogleField: {},
  daterangepicker: {},
  percentage: {},
  float: {},
  dollar: {},
  delete_icon: {},
  edit_icon: {},
  review_icon: {},
  review_btn: {},
  chart_icon: {},
  lockable: {},
  percent_range: {},
  formatted_number: {},
  add_icon: {},
  DateTimeField: {},
  dateStr: {},
  download_icon: {},
  multiple_daterangepicker: {},
  rangeSlider: {},
  info_icon: {},
  dynamic_cell: {},
  tags_input: {},
  image: {},
  "progress-bar":{},
  "table-chart":{},
  "cell-tag":{},
  "box-plot":{}
};

export const chatExtraData = {
  chatCount: 0,
  eventCount: 0,
  totalEventsCount: 0,
  resolvedEventsCount: 0,
  eventsFound: false,
  tableName: "",
  uniqueRowId: "",
};

export const SKELETON_ROW_COUNT = 5;
export const DEFAULT_ROW_HEIGHT = 46;
export const SKELETON_LOADER_HEIGHT = 18;

export const cellNonNavigationActions = new Set([
  "expandNestingOneLevel",
  "collapseNestingOneLevel",
  "expandEntireNesting",
  "collapseEntireNesting",
  "expandNestingAllChildren",
  "collapseNestingAllChildren",
]);

export const defaultDeleteViewPrompt = "agGrid.deleteViewPrompt";

export const SELECTION_TYPES = { NONE: "none", PARTIAL: "partial", ALL: "all" };