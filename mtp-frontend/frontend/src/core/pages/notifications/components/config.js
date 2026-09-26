export const PRIMARY_EVENT_FIELDS = [
  {
    label: "Role",
    required: true,
    isMulti: true,
    field_type: "dropdown",
    options: [],
    accessor: "role_codes",
  },
  {
    label: "Workflow/Configuration",
    required: true,
    field_type: "dropdown",
    options: [],
    accessor: "products",
  },
  {
    label: "Module",
    required: true,
    field_type: "dropdown",
    options: [],
    accessor: "screen",
  },
  {
    label: "Action",
    required: true,
    field_type: "dropdown",
    options: [],
    accessor: "screen_id",
  },
  {
    label: "Department",
    required: true,
    field_type: "dropdown",
    isMulti: true,
    options: [],
    accessor: "departments",
  },
  {
    label: "Channel",
    required: true,
    field_type: "dropdown",
    options: [],
    isMulti: true,
    accessor: "channels",
  },
  {
    label: "Notification Channel",
    required: true,
    field_type: "dropdown",
    options: [],
    isMulti: true,
    accessor: "notification_channel",
  },
];
export const SECONDARY_EVENT_FIELDS = [
  {
    label: "Event Type",
    required: true,
    field_type: "list",
    options: [],
    accessor: "special_classification",
  },
  {
    label: "Define Event (Subject)",
    required: true,
    field_type: "TextField",
    accessor: "subject",
  },
  {
    label: "Event description",
    required: true,
    field_type: "ChipsInput",
    accessor: "description",
    showTag: true,
  },
];

export const HIERARCHY_LEVEL = "l0_name";
