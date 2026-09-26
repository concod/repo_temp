//API URLs

export const OTB_REPORT_FILTER_CONFIG =
  "/core/filter-configuration/screen/plansmart%20otb%20report";
export const ROLLUP_REPORT_FILTER_CONFIG =
  "/core/filter-configuration/screen/plansmart%20rollup%20report";
export const ECECUTIVE_REPORT_FILTER_CONFIG =
  "/core/filter-configuration/screen/plansmart%20executive%20report";
export const GENERATE_REPORT_URL = "/plan-smart/download/otb_report_new";

export const FORM_LABEL = "Report Filter";
export const REPORT_LABEL = "Report Types";

export const API_CALL_TYPE = {
  MODEL: "MODEL",
  PLANSMART: "PLANSMART"
};

export const FORM_FIELDS = {
  START_YEAR: "start_year",
  START_MONTH: "start_month",
  END_YEAR: "end_year",
  END_MONTH: "end_month",
  CHANNEL: "channel",
  L0_NAME: "l0_name",
  L1_NAME: "l1_name",
  L2_NAME: "l2_name"
};

export const DATE_SELECTION_ERROR_MESSAGE =
  "start date should be before the end date";

export const SUCCESS_MESSAGE =
  "Download initiated, We will notify you once it is successful";

export const ERROR_MESSAGE = {
  FETCH_FILTER: "Error in fetching filters for OTB report",
  FORM_FIELDS_DATA: "Error in fetching filter dropdown Data",
  DOWNLOAD_REPORT: "Error occurred while downloading the report"
};
