import moment from "moment";
import { RETAIL_EVENTS_DATE_FORMAT } from "./constants";

const shiftDate = (date, days) => {
  if (!date) return null;
  const parsed = moment(date, RETAIL_EVENTS_DATE_FORMAT);
  return parsed.isValid()
    ? parsed.add(days, "days").format(RETAIL_EVENTS_DATE_FORMAT)
    : null;
};

/**
 * MTP-155204 §12: Start date = primary_date - preholiday_days,
 * End date = primary_date + postholiday_days (derived on the UI only).
 */
export const withDerivedDates = (rows = []) =>
  rows.map((row) => ({
    ...row,
    start_date: shiftDate(row.primary_date, -(Number(row.preholiday_days) || 0)),
    end_date: shiftDate(row.primary_date, Number(row.postholiday_days) || 0),
  }));

/** Normalise the upload API payload (`response.data.data`) into a summary. */
export const getUploadSummary = (data = {}) => {
  const total = Number(data.total_rows ?? data.total ?? 0);
  const rejected = Number(
    data.invalid_count ??
      data.rejected_rows ??
      data.rejected ??
      data.error_count ??
      0
  );
  const success = Number(
    data.valid_count ??
      data.success_rows ??
      data.successful_rows ??
      data.success ??
      total - rejected
  );
  return { batchId: data.batch_id ?? null, total, success, rejected };
};

/** AC-25 message, falling back to the Figma copy when nothing was rejected. */
export const getUploadMessage = ({ total, success, rejected }) =>
  rejected > 0
    ? `${success} of ${total} rows successfully uploaded, ${rejected} rejected`
    : `Successfully uploaded ${success} rows`;

/** Column names flagged as invalid on a staging row (`error_column` is CSV). */
export const getRowErrorColumns = (row) => {
  const errors =
    row?.error_column ??
    row?.errors ??
    row?.error_columns ??
    row?.validation_errors;
  if (!errors) return [];
  if (typeof errors === "string") {
    return errors
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
  }
  if (Array.isArray(errors)) {
    return errors
      .map((error) =>
        typeof error === "string"
          ? error
          : error?.column ?? error?.column_name ?? error?.field
      )
      .filter(Boolean);
  }
  return typeof errors === "object" ? Object.keys(errors) : [];
};

export const isErrorCell = (params) =>
  getRowErrorColumns(params?.data).includes(params?.colDef?.field);

/** Staging list lives under `data.rows` (not `data` directly). */
export const getStagingRows = (response) =>
  response?.data?.data?.rows || response?.data?.data || [];

/** Append an is_active filter for the Activated / Deactivated tab. */
export const withActiveStatusFilter = (filters = [], isActive) => [
  ...filters,
  {
    attribute_name: "is_active",
    operator: "in",
    filter_type: "cascaded",
    dimension: "Product",
    values: [isActive],
  },
];

/**
 * Payload for /activate-or-deactivate.
 * Select-all-records → set_all with the current grid filter body;
 * otherwise send the selected row ids.
 */
export const buildSetAllPayload = ({
  gridApi,
  deactivate,
  filters = [],
  uniqueRowId,
}) => {
  const setAll = Boolean(gridApi?.isSelectAllRecords);
  const ids = setAll
    ? []
    : (gridApi?.getSelectedRows?.() || []).map((row) => row[uniqueRowId]);
  const filterBody =
    gridApi?.gridOptionsWrapper?.gridOptions?.filterBody || {};

  return {
    ids,
    set_all: setAll,
    deactivate,
    filters,
    meta: setAll ? filterBody : {},
  };
};
