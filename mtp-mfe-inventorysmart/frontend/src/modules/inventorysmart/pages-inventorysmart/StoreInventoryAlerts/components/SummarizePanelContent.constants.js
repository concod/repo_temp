export const THEME = {
  blue:   { bg: "#dbeafe", value: "#1e3a8a", label: "#4b5563" },
  red:    { bg: "#fce7f3", value: "#9d174d", label: "#4b5563" },
  yellow: { bg: "#fef9c3", value: "#92400e", label: "#4b5563" },
  green:  { bg: "#dcfce7", value: "#14532d", label: "#4b5563" },
};

export const QC_COLUMN_FLEX = {
  check:    4,
  status:   0.5,
  severity: 0.5,
  detail:   6,
};
export const TABLE_TEXT_FLEX    = 2;
export const TABLE_NUMERIC_FLEX = 1;

export const ERROR_TYPES = {
  ERROR_422: "422",
  ERROR_500: "500",
  ERROR_NETWORK: "network",
};

export const ERROR_MESSAGES = {
  [ERROR_TYPES.ERROR_422]: {
    title: "Failed to load summary",
  },
  [ERROR_TYPES.ERROR_500]: {
    title: "Something went wrong !",
    subtitle: "There is an internal server error. Please try again.",
  },
  [ERROR_TYPES.ERROR_NETWORK]: {
    title: "Failed to load summary",
    subtitle: "Please check your connection and try again.",
  },
};

export const LOADER_TEXT = "Fetching Aggregated Summary...";
