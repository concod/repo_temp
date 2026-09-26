export const SAVE_TABLE_VIEW = [
  {
    label: "Table View Name",
    accessor: "view_name",
    field_type: "TextField",
    required: true,
    maxLengthLimit: 40,
  },
  {
    label: "View Type",
    field_type: "radioGroup",
    required: true,
    accessor: "view_type",
    options: [
      {
        value: "global",
        label: "Global",
        isDisabled: false,
      },
      { value: "personal", label: "Personal", isDisabled: false },
    ],
  },
  {
    accessor: "view_setting",
    label: "",
    attribute_type: "create_plan",
    column_name: "settings",
    field_type: "checkBoxGroup",
    options: [
      {
        label: "Set as default",
        value: "is_default",
      },
    ],
  },
];

export const COLUMN_SETTINGS_TABLE = [
  {
    label: "Column Menu",
    column_name: "menu",
    width: 50,
  },
];
