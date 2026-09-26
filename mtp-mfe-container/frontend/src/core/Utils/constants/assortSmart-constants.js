export const DASHBOARD = "/assort-smart/plan-dashboard";
export const CLUSTER_DASHBOARD = "/assort-smart/cluster-dashboard";
export const common = {
  __Multiple_Value: "(s)",
  __Assortment: "AssortSmart",
  __ConfirmBtnText: "Yes",
  __RejectBtnText: "No",
  __LaterBtnText: "Later",
  __Select_Drops: "Select # of drops",
  __Drop: "Drop",
  __Attribute_Text: "Attribute",
  __Month_Text: "Month",
  __Month_mapping_list: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  __compare_yr_constants: ["LY", "LLY", "LLLY"],
  __seed_with_constants: ["IAF", "LY", "LLY"],
  __number_of_drops: 2,
  __default_column_attributes: {
    is_aggregated: false,
    is_editable: false,
    is_frozen: false,
    is_hidden: false,
    is_required: false,
    is_row_span: false,
    is_searchable: false,
  },
  __create_plan_selling_period_enabled_start_days: ["Sunday"],
  __create_plan_selling_period_enabled_end_days: ["Saturday"],
  __create_plan_seasons: ["Summer", "Fall", "Spring", "Winter"],
  __sub_channel_wholesale: ["Amazon", "Key_Account", "Specialty"],
  __MojoHelpdesk_Link:
    "https://impactanalytics.mojohelpdesk.com/login/create_request#/ticket-form/66734",
  __Finalize_Steps: ["2.4", "3"],
  __Plan_stage: { "Working Plan": 0, "Scenario Plan": 2 },
};

export const ASSORTSMART_CLUSTER_INPUT_CONSTANTS = {
  SIDENAV_SECTIONS: {
    FILTER_CONFIGURATOR: 'Filter configurator',
    CREATE_PLAN_FORM_BUILDER: 'Create Plan form builder',
    DASHBOARD_CONFIGURATOR: 'Dashboard configurator',
    DEFAULT_ATTRIBUTES_CONFIGURATOR: 'Default attributes configurator',
    CLUSTERING_HYPER_PARAMETER : 'Clustering hyper parameter',
    CLUSTER_BREAKDOWN_CONFIGURATOR : 'Cluster breakdown configurator'
  }
};

export const DEFAULT_ATTRIBUTE_CONSTANTS = {
  CONFIRMATION_MODAL_CONSTANTS: {
    TITLE: "Are you sure you want to switch the tab?",
    CONTENT: "Saved changes will be lost.",
    CANCEL_BUTTON: "Cancel",
    OK_BUTTON: "Ok",
  },
  APPLY_ATTRIBUTE_SETTING: "Apply attribute setting for a specific time period?",
  SELECT_FILTERS_TITLE: "Select filters to display list of attributes.",
  SELECT_VALID_ATTRIBUTES_TITLE: "Select a list of attributes valid for the product hierarchy",
  DEFAULT_ATTRIBUTE_PREVIEW_TITLE: "Default attribute preview table",
  APPLY_BUTTON: "Apply",
  SAVE_BUTTON: "Save",
  ATTRIBUTES_INFO_TITLE: 'Attributes can be: ',
  ATTRIBUTE_INFO_TEXT: [
    {
      checkbox: { checked: true, disabled: true },
      text: "Selected by default for clustering",
    },
    {
      checkbox: { checked: false, disabled: true },
      text: "Presented but not considered by default for clustering ",
    },
    {
      checkbox: null,
      text: "NA - Not applicable for the product hierarchy combination.",
      isBold: true,
    },
  ],
  SNACK_MESSAGES : {
    DEFAULT_ATTRIBUTE_API : {
      SUCCESS : 'Default attributes saved successfully',
      ERROR : 'Error saving the default attributes'
    },
    CROSS_FILTER_API : {
      ERROR : 'Error fetching Filter Data'
    },
    CREATE_PLAN_API : {
      ERROR : 'Error fetching Plan Data'
    },
    ASSORT_YEAR_API : {
      ERROR: 'Error fetching Year Data'
    },
    ATTRIBUTE_LIST_API : {
      ERROR: 'Error fetching Attribute list'
    },
    SAVE_DEFAULT_ATTRIBUTES_API : {
      ERROR: 'Error Saving default Attributes'
    },
    ASSORT_SEASON_API : {
      ERROR: 'Error fetching season options'
    },
    FETCH_DEFAULT_ATTRIBUTES_API : {
      ERROR: 'Error fetching default attributes'
    },
    SET_CLUSTER_HYPERPARAMETER_DATA_API : {
      ERROR: 'Failed to apply the hyperParameter filters'
    },
    UPDATE_CLUSTER_HYPERPARAMETER_DATA_API : {
      SUCCESS : 'Cluster hyper parameter data saved successfully',
      ERROR: 'Error saving the cluster hyper parameter data'
    },
    WEIGHTAGE_SELECTION_ERROR : {
      ERROR: `Weightage selection shoudn't exceed "100"`
    },
    GET_CLUSTER_HYPERMETER_DATA_API : {
      ERROR: 'Error fetching the cluster hyper parameter data'
    },
    MAX_VALUE_ERROR : {
      ERROR: 'Max value cannot be less than Min value'
    }
  },
  SNACK_MESSAGE_VARIANTS : {
    ERROR: 'error',
    SUCCESS : 'success'
  }
};

// TODO : Remove this once the tabs are integrated with the API
export const DEFAULT_ATTRIBUTE_TABS_CONSTANTS = [
  { label: "Product Attributes", value: 0 },
  { label: "Performance Attributes", value: 1 },
  { label: "Store Attributes", value: 2 },
];

export const STATIC_CLUSTER_HYPER_PARAMETER_FORM = [
  {
      form: [
          {
              accessor: "selectClusteringAlgorithm",
              field_type: "dropdown",
              label: "Algorithm for Clustering",
              autoSize: true,
              required: false,
              options: [],
              isMulti: true,
              isSearchable: false,
              isClearable: false,
          },
      ],
      hasExtraChips: false,
      hasDivider: true,
      formAccessor: "selectClusteringAlgorithm",
      showChips: false,
  },
  {
      form: [
          {
              accessor: "selectErrorMetrics",
              field_type: "dropdown",
              label: "KPI Error Metrics & Weightage Selection",
              autoSize: true,
              required: false,
              options: [],
              isMulti: true,
              isSearchable: false,
              isClearable: false,
          },
      ],
      hasExtraChips: true,
      hasDivider: false,
      formAccessor: "selectErrorMetrics",
      showChips: false,
  },
  {
      form: [
          {
              accessor: "selectWightMethodology",
              field_type: "dropdown",
              label: "",
              autoSize: true,
              required: false,
              options: [],
              isMulti: false,
              isSearchable: false,
              isClearable: false,
          },
      ],
      hasExtraChips: false,
      hasDivider: false,
      formAccessor: "selectWightMethodology",
      showChips: false,
  },
];

export const PRODUCT_CLUSTERING_FIELDS = [
  { key: "productmin", label: "Min" },
  { key: "productmax", label: "Max" },
];

export const PERFORMANCE_CLUSTERING_FIELDS = [
  { key: "perfmin", label: "Min" },
  { key: "perfmax", label: "Max" },
];

export const CLUSTER_HYPER_PARAMETER_CONSTANTS = {
    APPLY_BUTTON_TEXT: "Apply",
    WEIGHTAGE_ALERT: "Weightage selection shouldn't exceed 100",
    PRODUCT_CLUSTERING_TITLE: "Default number of buckets for Product Clustering",
    PERFORMANCE_CLUSTERING_TITLE: "Default number of buckets for Performance Clustering",
};

