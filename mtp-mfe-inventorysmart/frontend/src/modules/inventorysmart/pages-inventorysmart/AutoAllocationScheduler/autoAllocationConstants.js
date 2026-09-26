export const FREQUENCY_OPTIONS = [
  {
    label: "Daily",
    value: "daily",
  },
  {
    label: "Weekly",
    value: "weekly",
  },
  {
    label: "Monthly",
    value: "monthly",
  },
  {
    label: "Quarterly",
    value: "quarterly",
  },
  {
    label: "Yearly",
    value: "yearly",
  },
];

export const MONTHLY_FREQUENCY_TYPE = [
  {
    label: "Date",
    value: "date",
  },
  {
    label: "Day",
    value: "day",
  },
];

export const THRESHOLD_SELECTION_OPTIONS = [
  {
    label: "Condition",
    field_type: "list",
    accessor: "condition",
    isDisabled: false,
    options: [
      {
        label: "<=",
        value: "<=",
      },
      {
        label: "<",
        value: "<",
      },
    ],
  },
  {
    label: "Threshold (0 to 1)",
    field_type: "TextField",
    accessor: "threshold",
    isDisabled: false,
  },
];

export const AUTO_RELEASE_OPTIONS = [
  {
    field_type: "list",
    accessor: "autoRelease",
    isDisabled: false,
    options: [
      {
        label: "Release Right Away",
        value: "release-right-away",
      },
      {
        label: "Review & Release",
        value: "review-and-release",
      },
    ],
  },
];

export const WEEK_DAYS_SELECTION_CONST = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const MONTH_SELECTION_CONST = [1, 2, 3];
export const WEEK_DAYS = [1, 2, 3, 4, 5];
export const NO_OF_DAYS_IN_MONTH = 31;
export const NEVER_ENDING_DATE = "2049-12-31";
