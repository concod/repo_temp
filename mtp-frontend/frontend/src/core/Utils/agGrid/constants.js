export const DEFAULT_ROUNDOFF = 2;

export const IGNORE_ROUNDOFF = ["int"];

export const ascendingOrderLabel = {
  str: "Sort A to Z",
  list: "Sort A to Z",
  chip: "Sort A to Z",
  int: "Sort by asc",
  float: "Sort by asc",
  percentage: "Sort by asc",
  dollar: "Sort by asc",
  link: "Sort by asc",
  DateTimeField: "Least Recent",
  attribute: "Sort A to Z",
  date: "Least Recent",
  array: "Sort A to Z",
  datetime: "Sort by asc",
  bool: "Sort by false",
};

export const descendingOrderLabel = {
  str: "Sort Z to A",
  list: "Sort Z to A",
  chip: "Sort Z to A",
  int: "Sort by desc",
  float: "Sort by desc",
  percentage: "Sort by desc",
  dollar: "Sort by desc",
  link: "Sort by desc",
  DateTimeField: "Most Recent",
  attribute: "Sort Z to A",
  date: "Most Recent",
  array: "Sort Z to A",
  datetime: "Sort by desc",
  bool: "Sort by true",
};

// To be customised in future as it varies from client to client
export const levelsArray = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "l4_name",
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
  "list",
  "dynamic-list",
  "review_btn",
  "datetime",
];

export const textFilterOptions = [
  { label: "Contains", value: "contains" },
  { label: "Equals", value: "equals" },
];

export const textFilterCollectiveTypes = ["str", "link", "list"];

export const numberFilterOptions = [
  { label: "Equals", value: "equals" },
  // { label: "Not Equals", value: "notEqual" },
  { label: "Less Than or Equal", value: "lessThanOrEqual" },
  { label: "Greater Than or Equal", value: "greaterThanOrEqual" },
  { label: "Range", value: "inRange" },
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

export const PINNED_VIEWPORT_THRESHOLD = 0.9;

export const AUTO_TRIGGERED_SOURCES = ["api", "autosizeColumns", "sizeColumnsToFit"];
 