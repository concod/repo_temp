export const VIEW_SETTINGS_VIEW_TYPE = {
  CHECKBOX_LIST: "checkbox-list",
  TOGGLE: "toggle"
};

export const VIEW_SETTINGS_ACCESSOR_TYPE = {
  COLUMN: "column",
  ROW: "row"
};

export const VIEW_SETTINGS = [
  {
    title: "Timeline Hierarchy",
    key: "timeline",
    viewType: VIEW_SETTINGS_VIEW_TYPE.CHECKBOX_LIST,
    accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.COLUMN,
    options: [
      { label: "Weeks", category: "week", checked: true },
      { label: "Month", category: "month", checked: true },
      { label: "Quarter", category: "quarter", checked: true },
      { label: "Half year", category: "half_year", checked: true },
      { label: "Year", category: "year", checked: true }
    ]
  },
  {
    title: "Product Hierarchy",
    key: "product",
    viewType: VIEW_SETTINGS_VIEW_TYPE.CHECKBOX_LIST,
    accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.ROW,
    options: [
      { label: "Department", category: "l1_name", checked: true },
      { label: "Class", category: "l2_name", checked: true }
    ]
  },
  {
    title: "Channel Hierarchy",
    key: "channel",
    viewType: VIEW_SETTINGS_VIEW_TYPE.CHECKBOX_LIST,
    accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.COLUMN,
    options: [
      { label: "Individual", category: "individual", checked: true }, // Individual
      { label: "Total", category: "total", checked: true } // Omni
    ]
  },
  {
    title: "Show values as",
    key: "showValues",
    viewType: VIEW_SETTINGS_VIEW_TYPE.CHECKBOX_LIST,
    accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.COLUMN,
    options: [
      { label: "Absolute", category: "absolute", checked: true },
      { label: "Channel contr(C%)", category: "channel-cont", checked: true },
      { label: "Class contr(%)", category: "class-cont", checked: true }
    ]
  }
  // {
  //   title: 'Version',
  //   key: 'version',
  //   viewType: VIEW_SETTINGS_VIEW_TYPE.TOGGLE,
  //   accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.ROW,
  //   selected: false
  // },
  // {
  //   title: 'Variance',
  //   key: 'variance',
  //   viewType: VIEW_SETTINGS_VIEW_TYPE.TOGGLE,
  //   accessorType: VIEW_SETTINGS_ACCESSOR_TYPE.ROW,
  //   selected: false
  // },
];
