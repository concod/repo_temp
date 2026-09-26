import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  RETAIL_EVENTS,
  RETAIL_EVENTS_ACTIVATE_OR_DEACTIVATE,
  RETAIL_EVENTS_ERROR_RECORDS,
  RETAIL_EVENTS_TEMPLATE,
  RETAIL_EVENTS_UPLOAD,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const ERROR_EXPORT_HEADERS = [
  "region",
  "holiday_name_feed",
  "primary_date",
  "preholiday_days",
  "postholiday_days",
  "category",
  "holiday_name_normalised",
  "error_column",
  "error_reason",
];

export const inventorySmartRetailEventsService = createSlice({
  name: "inventorySmartRetailEventsService",
  initialState: {
    inventorysmartFilterLoader: false,
    inventoryRetailEventsFilterConfig: [],
    selectedFilters: [],
    isFiltersValid: false,
  },
  reducers: {
    setInventorysmartFilterLoader: (state, action) => {
      state.inventorysmartFilterLoader = action.payload;
    },
    setInventoryRetailEventsFilterConfig: (state, action) => {
      state.inventoryRetailEventsFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    resetRetailEventsStore: (state, _action) => {
      state.inventorysmartFilterLoader = false;
      state.inventoryRetailEventsFilterConfig = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
    },
  },
});

export const {
  setInventorysmartFilterLoader,
  setInventoryRetailEventsFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  resetRetailEventsStore,
} = inventorySmartRetailEventsService.actions;

/** GET — retail events upload template metadata (headers + example row) */
export const fetchRetailEventsTemplate = () => {
  return axiosInstance({
    url: RETAIL_EVENTS_TEMPLATE,
    method: "GET",
  });
};

/**
 * Fetch template metadata and convert to xlsx/csv for download.
 * Mirrors generateFilterTemplate (filterUpload/utils.js).
 */
export const downloadRetailEventsTemplate = async (fileType = "xlsx") => {
  const response = await fetchRetailEventsTemplate();
  if (!response?.data?.status) {
    throw new Error(response?.data?.message || "Failed to fetch template");
  }

  const {
    headers = [],
    example_row = {},
    file_name,
  } = response.data.data || {};

  const exampleValues = headers.map((header) => example_row[header] ?? "");
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleValues]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const bookType = fileType === "csv" ? "csv" : "xlsx";
  const workbookOutput = XLSX.write(workbook, {
    bookType,
    type: "array",
  });

  const fallbackName =
    bookType === "csv"
      ? "retail_events_template.csv"
      : "retail_events_template.xlsx";
  const filename = file_name
    ? bookType === "csv"
      ? file_name.replace(/\.xlsx$/i, ".csv")
      : file_name
    : fallbackName;

  const mimeType =
    bookType === "csv"
      ? "text/csv;charset=utf-8"
      : "application/octet-stream";

  saveAs(new Blob([workbookOutput], { type: mimeType }), filename);
};

/** POST multipart — upload excel/csv retail events file */
export const uploadRetailEvents = (formData) => {
  return axiosInstance({
    url: RETAIL_EVENTS_UPLOAD,
    method: "POST",
    data: formData,
  });
};

/** POST — staging (rejected) rows for an upload batch; is_download=true returns a file/url */
export const fetchRetailEventsErrorRecords = (payload) => () => {
  return axiosInstance({
    url: RETAIL_EVENTS_ERROR_RECORDS,
    method: "POST",
    data: payload, //in payload, is_download is true, then it will json response of the data
    // isV3: true,
  });
};

export const downloadRetailEventsErrorRecords = async (
  batchId,
  fileType = "xlsx"
) => {
  const response = await fetchRetailEventsErrorRecords({
    batch_id: batchId,
    is_download: true,
    meta: {
      search: [],
      sort: [],
      range: [],
      limit: { limit: 10000, page: 1 },
    },
  })();

  if (!response?.data?.status) {
    throw new Error(
      response?.data?.message || "Failed to fetch error records"
    );
  }

  const rows = response?.data?.data?.rows || [];
  if (!rows.length) {
    throw new Error("No error rows to download");
  }

  const headers = ERROR_EXPORT_HEADERS;
  const sheetRows = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");

  const bookType = fileType === "csv" ? "csv" : "xlsx";
  const workbookOutput = XLSX.write(workbook, {
    bookType,
    type: "array",
  });
  const filename =
    bookType === "csv"
      ? "retail_events_with_errors.csv"
      : "retail_events_with_errors.xlsx";
  const mimeType =
    bookType === "csv"
      ? "text/csv;charset=utf-8"
      : "application/octet-stream";

  saveAs(new Blob([workbookOutput], { type: mimeType }), filename);
};
/** POST — fetch retail events main table data */
export const getRetailEventsList = (payload) => () => {
  return axiosInstance({
    url: RETAIL_EVENTS,
    method: "POST",
    data: payload,
  });
};

/** POST — activate or deactivate retail events */
export const activateOrDeactivateRetailEvents = (payload) => () => {
  return axiosInstance({
    url: RETAIL_EVENTS_ACTIVATE_OR_DEACTIVATE,
    method: "POST",
    data: payload,
  });
};

export default inventorySmartRetailEventsService.reducer;
