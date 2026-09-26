import React from "react";
import FulfillmentTypeBadgeCell from "./components/FulfillmentTypeBadgeCell";
import { DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN } from "./constants";

const FULFILLMENT_TYPE_COLUMN_KEYS = new Set([
  DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN,
  "fulfilment_type",
]);

const getColumnKeys = (column = {}) =>
  [
    column.column_name,
    column.field,
    column.accessor,
    column.colId,
    column.id,
    column.tc_code,
  ]
    .filter(Boolean)
    .map((key) => String(key).toLowerCase());

export const isFulfillmentTypeColumnDef = (column = {}) => {
  const keys = getColumnKeys(column);

  if (keys.some((key) => FULFILLMENT_TYPE_COLUMN_KEYS.has(key))) {
    return true;
  }

  if (keys.some((key) => key.includes("fulfil") && key.includes("type"))) {
    return true;
  }

  const header = String(
    column.headerName || column.label || column.Header || ""
  ).toLowerCase();
  return header.includes("fulfil") && header.includes("type");
};

const fulfillmentTypeCellRenderer = (cellProps) => (
  <FulfillmentTypeBadgeCell cellProps={cellProps} />
);

const visitColumns = (columns = [], visitor) => {
  columns.forEach((column) => {
    if (column?.sub_headers?.length) {
      visitColumns(column.sub_headers, visitor);
      return;
    }

    if (column?.children?.length) {
      visitColumns(column.children, visitor);
      return;
    }

    visitor(column);
  });
};

export const configureFulfillmentTypeColumnDef = (columns = []) => {
  visitColumns(columns, (column) => {
    if (!isFulfillmentTypeColumnDef(column)) {
      return;
    }

    column.is_editable = false;
    column.editable = false;
    column.type = "str";
  });

  return columns;
};

export const applyFulfillmentTypeBadgeColumn = (columns = []) =>
  columns.map((column) => {
    let nextColumn = { ...column };

    if (nextColumn.children?.length) {
      nextColumn.children = applyFulfillmentTypeBadgeColumn(nextColumn.children);
    }

    if (nextColumn.sub_headers?.length) {
      nextColumn.sub_headers = applyFulfillmentTypeBadgeColumn(
        nextColumn.sub_headers
      );
    }

    if (!isFulfillmentTypeColumnDef(nextColumn)) {
      return nextColumn;
    }

    return {
      ...nextColumn,
      is_editable: false,
      editable: false,
      type: "str",
      cellRenderer: fulfillmentTypeCellRenderer,
    };
  });

export const renderFulfillmentTypeBadge = (cellProps) => {
  const colDef = cellProps?.colDef || cellProps?.column?.colDef;
  if (!isFulfillmentTypeColumnDef(colDef)) {
    return null;
  }

  return <FulfillmentTypeBadgeCell cellProps={cellProps} />;
};

export const patchFulfillmentTypeColumnRenderer = (columns = []) =>
  applyFulfillmentTypeBadgeColumn(columns);
