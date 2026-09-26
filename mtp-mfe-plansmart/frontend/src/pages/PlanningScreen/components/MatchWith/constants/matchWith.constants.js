export const fields = [
  {
    column_name: "match_with",
    label: "Match with",
    display_type: "dropdown",
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    dimension: "plan",
    options: [
      {
        value: "LY",
        label: "LY"
      },
      {
        value: "LLY",
        label: "LLY"
      },
      {
        value: "OP",
        label: "OP"
      }
    ],
    extra: {
      showPlaceholderWithRatio: true
    }
  },
  {
    column_name: "category",
    label: "Category",
    display_type: "dropdown",
    is_mandatory: false,
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    dimension: "plan",
    options: [
      {
        value: "Select all",
        label: "Select all"
      },
      {
        value: "Margin",
        label: "Margin"
      },
      {
        value: "Sales",
        label: "Sales"
      }
    ],
    extra: {
      showPlaceholderWithRatio: true
    }
  },
  {
    column_name: "kpi",
    label: "KPI",
    display_type: "dropdown",
    is_mandatory: false,
    is_multiple_selection: false,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    is_required: false,
    is_deleted: false,
    options: [
      {
        value: "Option1",
        label: "Option1"
      },
      {
        value: "Option2",
        label: "Option2"
      },
      {
        value: "Option3",
        label: "Option3"
      }
    ]
  }
];
